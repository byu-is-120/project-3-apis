import axios from "axios";
import fs from "fs";
import base64 from "base-64";
import { URLSearchParams } from "url";
import { retrieveApiKeys } from "../utils/aws-secrets.js";
import https from "https";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// TODO: do top 100 artists, top 100 albums, top 100 songs

const s3 = new S3Client({ region: "us-west-2" });

const GENRE_LIMIT = 10;
const ARTIST_PER_GENRE_LIMIT = 20;
const ALBUM_PER_ARTIST_LIMIT = 5;

const agent = new https.Agent({
  keepAlive: true,
  timeout: 10000,
  maxSockets: 5,
  maxFreeSockets: 5,
});

const axiosClient = axios.create({
  httpAgent: agent,
  httpsAgent: agent,
});

class SpotifyDataCollector {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.baseUrl = "https://api.spotify.com/v1";
    this.existingData = {};
  }

  async getToken() {
    const authUrl = "https://accounts.spotify.com/api/token";
    const authHeader = base64.encode(`${this.clientId}:${this.clientSecret}`);
    const headers = {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const data = new URLSearchParams();
    data.append("grant_type", "client_credentials");

    await axiosClient.post(authUrl, data, { headers }).then((response) => {
      this.token = response.data.access_token;
      console.log("Fetched Spotify token");
    });
  }

  async getExistingData() {
    // Helper function to convert a ReadableStream to a string
    async function streamToString(stream) {
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString("utf-8");
    }

    const getObjectCommand = new GetObjectCommand({
      Bucket: "is120-w25-apis",
      Key: "data/music-api/data.json",
    });

    try {
      const s3Res = await s3.send(getObjectCommand);
      const existingDataJson = await streamToString(s3Res.Body);
      this.existingData = JSON.parse(existingDataJson).data;
    } catch (error) {
      console.error("Error fetching existing data from S3:", error);
      this.existingData = {};
    }
  }

  getHeaders() {
    return { Authorization: `Bearer ${this.token}` };
  }

  getTopGenres(limit = GENRE_LIMIT) {
    const popularGenres = [
      "pop",
      "rock",
      "dance",
      "electronic",
      "latin",
      "indie",
      "r&b",
      "country",
      "folk",
      "metal",
      "jazz",
      "blues",
      "reggae",
      "punk",
      "classical",
      "alternative",
      "disco",
      "soul",
      "funk",
    ];
    return popularGenres.slice(0, limit);
  }

  async makeRequest(url, callback) {
    return await axiosClient
      .get(url, { headers: this.getHeaders() })
      .then((response) => {
        console.log(`Fetched data from URL: ${url}`);
        return callback(response);
      })
      .catch((error) => {
        if (error.code === "ETIMEDOUT") {
          console.warn(`Timeout fetching data from URL: ${url}`);
          return this.delay(1000).then(() => this.makeRequest(url, callback));
        }
        if (error?.response?.status === 429) {
          const retryAfter =
            (error.response.headers?.["retry-after"] || 10) + 1;
          console.warn(`Rate limit exceeded, retrying in ${retryAfter}s...`);
          return this.delay(retryAfter * 1000).then(() =>
            this.makeRequest(url, callback),
          );
        } else {
          throw error;
        }
      });
  }

  async searchArtistsByGenre(genre, limit = ARTIST_PER_GENRE_LIMIT) {
    const endpoint = `${this.baseUrl}/search`;
    const queryParams = new URLSearchParams({
      q: `genre:${genre}`,
      type: "artist",
      limit,
    });
    const url = `${endpoint}?${queryParams.toString()}`;

    return await this.makeRequest(
      url,
      (response) => response.data.artists.items,
    );
  }

  async getArtistAlbums(artistId, genreId, limit = ALBUM_PER_ARTIST_LIMIT) {
    const endpoint = `${this.baseUrl}/artists/${artistId}/albums`;
    const params = new URLSearchParams({
      include_groups: "album",
      limit,
      market: "US",
    });
    const url = `${endpoint}?${params.toString()}`;

    return await this.makeRequest(url, async (response) => {
      const albums = response.data.items;
      const albumDetails = [];
      for (const album of albums.slice(0, limit)) {
        const details = await this.getAlbumDetails(album.id, genreId, artistId);
        if (details) albumDetails.push(details);
      }
      albumDetails.sort((a, b) => b.popularity - a.popularity);
      return albumDetails.slice(0, limit);
    });
  }

  async getAlbumDetails(albumId, genreId, artistId) {
    const url = `${this.baseUrl}/albums/${albumId}`;

    if (this.existingData?.spotify_top_genre_artists) {
      const genre = this.existingData.spotify_top_genre_artists.find(
        (item) => item.genre_name === genreId,
      );

      const artist = genre?.artists?.find((artist) => artist.id === artistId);

      const album = artist?.albums?.find((album) => album.id === albumId);
      if (album) {
        console.log(`Using existing data for album: ${album.name}`);
        return album;
      }
    }

    return this.makeRequest(url, async (response) => {
      const albumData = response.data;
      return {
        id: albumData.id,
        name: albumData.name,
        release_date: albumData.release_date,
        total_tracks: albumData.total_tracks,
        popularity: albumData.popularity || 0,
        album_type: albumData.album_type,
        cover_image: albumData.images[0]?.url || "",
        songs: albumData.tracks.items.map((track) => ({
          name: track.name,
          duration_ms: track.duration_ms,
          track_number: track.track_number,
          preview_url: track.preview_url,
        })),
      };
    });
  }

  async getArtistDetails(artist, genreId) {
    const artistData = {
      id: artist.id,
      name: artist.name,
      popularity: artist.popularity,
      followers: artist.followers.total,
      genres: artist.genres,
      spotify_url: artist.external_urls.spotify,
      image: artist.images[0]?.url || "",
      albums: [],
    };

    artistData.albums = await this.getArtistAlbums(artist.id, genreId);
    return artistData;
  }

  async getGenreArtists(genre) {
    const artists = await this.searchArtistsByGenre(genre);
    const genreData = { genre_name: genre, artists: [] };

    for (const artist of artists.slice(0, ARTIST_PER_GENRE_LIMIT)) {
      const artistData = await this.getArtistDetails(artist, genre);
      genreData.artists.push(artistData);
    }

    genreData.artists.sort((a, b) => b.popularity - a.popularity);
    return genreData;
  }

  async collectAllData() {
    const genres = this.getTopGenres();
    const tasks = genres.map((genre) => this.getGenreArtists(genre));
    const genreResults = await Promise.all(tasks);
    return { spotify_top_genre_artists: genreResults };
  }

  saveToJson(data, filename = "spotify_top_genre_artists.json") {
    fs.writeFileSync(filename, JSON.stringify(data, null, 4), "utf-8");
    console.log(`Data saved to ${filename}`);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export async function GetMusicData() {
  const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret } =
    await retrieveApiKeys();
  const collector = new SpotifyDataCollector(clientId, clientSecret);
  await collector.getToken();
  await collector.getExistingData();
  const data = await collector.collectAllData();
  return {
    data,
    updated: new Date().toISOString(),
  };
}

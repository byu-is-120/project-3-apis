import axios from "axios";
import fs from "fs";
import base64 from "base-64";
import { URLSearchParams } from "url";
import { retrieveApiKeys } from "../utils/aws-secrets.js";
import https from "https";

const GENRE_LIMIT = 10;
const ARTIST_PER_GENRE_LIMIT = 20;
const ALBUM_PER_ARTIST_LIMIT = 5;

const agent = new https.Agent({
  keepAlive: true,
  timeout: 10000,
  maxSockets: 10,
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

  getHeaders() {
    return { Authorization: `Bearer ${this.token}` };
  }

  getTopGenres(limit = GENRE_LIMIT) {
    const popularGenres = [
      "pop",
      "rock",
      "hip hop",
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

  async searchArtistsByGenre(genre, limit = ARTIST_PER_GENRE_LIMIT) {
    const endpoint = `${this.baseUrl}/search`;
    const queryParams = new URLSearchParams({
      q: `genre:${genre}`,
      type: "artist",
      limit,
    });
    const url = `${endpoint}?${queryParams.toString()}`;

    const items = await axios
      .get(url, { headers: this.getHeaders() })
      .then((response) => {
        console.log(`Fetched artists for genre: ${genre}`);
        return response.data.artists.items;
      })
      .catch((error) => {
        if (error.code === "ETIMEDOUT") {
          console.warn(`Timeout fetching album details: ${albumId}`);
          return this.delay(1000).then(() =>
            this.searchArtistsByGenre(albumId),
          );
        }
        if (error?.response?.status === 429) {
          const retryAfter =
            (error.response.headers?.["retry-after"] || 10) + 1;
          console.warn(`Rate limit exceeded, retrying in ${retryAfter}s...`);
          return this.delay(retryAfter * 1000).then(() =>
            this.searchArtistsByGenre(genre, limit),
          );
        } else {
          throw error;
        }
      });

    return items;
  }

  async getArtistAlbums(artistId, limit = ALBUM_PER_ARTIST_LIMIT) {
    const endpoint = `${this.baseUrl}/artists/${artistId}/albums`;
    const params = new URLSearchParams({
      include_groups: "album",
      limit,
      market: "US",
    });
    const url = `${endpoint}?${params.toString()}`;

    return await axios
      .get(url, { headers: this.getHeaders() })
      .then(async (response) => {
        console.log(`Fetched albums for artist: ${artistId}`);
        const albums = response.data.items;
        const albumDetails = [];
        for (const album of albums.slice(0, limit)) {
          const details = await this.getAlbumDetails(album.id);
          if (details) albumDetails.push(details);
        }
        albumDetails.sort((a, b) => b.popularity - a.popularity);
        return albumDetails.slice(0, limit);
      })
      .catch((error) => {
        if (error.code === "ETIMEDOUT") {
          console.warn(`Timeout fetching album details: ${albumId}`);
          return this.delay(1000).then(() => this.getArtistAlbums(albumId));
        }
        if (error?.response?.status === 429) {
          const retryAfter =
            (error.response.headers?.["retry-after"] || 10) + 1;
          console.warn(`Rate limit exceeded, retrying in ${retryAfter}s...`);
          return this.delay(retryAfter * 1000).then(() =>
            this.getArtistAlbums(artistId, limit),
          );
        } else {
          throw error;
        }
      });
  }

  async getAlbumDetails(albumId) {
    const endpoint = `${this.baseUrl}/albums/${albumId}`;

    return await axios
      .get(endpoint, {
        headers: this.getHeaders(),
      })
      .then((response) => {
        console.log(`Fetched details for album: ${albumId}`);
        const albumData = response.data;
        return {
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
      })
      .catch(async (error) => {
        if (error.code === "ETIMEDOUT") {
          console.warn(`Timeout fetching album details: ${albumId}`);
          return this.delay(1000).then(() => this.getAlbumDetails(albumId));
        }
        if (error?.response?.status === 429) {
          const retryAfter =
            (error.response.headers?.["retry-after"] || 10) + 1;
          console.warn(`Rate limit exceeded, retrying in ${retryAfter}s...`);

          return this.delay(retryAfter * 1000).then(() =>
            this.getAlbumDetails(albumId),
          );
        } else {
          throw error;
        }
      });
  }

  async getArtistDetails(artist) {
    const artistData = {
      name: artist.name,
      popularity: artist.popularity,
      followers: artist.followers.total,
      genres: artist.genres,
      spotify_url: artist.external_urls.spotify,
      image: artist.images[0]?.url || "",
      albums: [],
    };

    const albums = await this.getArtistAlbums(artist.id);
    artistData.albums = albums;
    return artistData;
  }

  async getGenreArtists(genre) {
    const artists = await this.searchArtistsByGenre(genre);
    const genreData = { genre_name: genre, artists: [] };

    for (const artist of artists.slice(0, ARTIST_PER_GENRE_LIMIT)) {
      const artistData = await this.getArtistDetails(artist);
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
  const data = await collector.collectAllData();
  return {
    data,
    updated: new Date().toISOString(),
  };
}

import axios from "axios";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import base64 from "base-64";
import { URLSearchParams } from "url";

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

    await axios.post(authUrl, data, { headers }).then((response) => {
      this.token = response.data.access_token;
      console.log("Fetched Spotify token");
    });
  }

  getHeaders() {
    return { Authorization: `Bearer ${this.token}` };
  }

  getTopGenres(limit = 15) {
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

  async searchArtistsByGenre(genre, limit = 50) {
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
        if (error?.response?.status === 429) {
          console.log(
            `Rate limit exceeded, retrying in ${error.response.headers?.["retry-after"]}ms...`,
          );
          return this.delay(
            error.response.headers?.["retry-after"] || 10_000,
          ).then(() => this.searchArtistsByGenre(genre, limit));
        } else {
          throw error;
        }
      });

    return items;
  }

  async getArtistAlbums(artistId, limit = 5) {
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
        if (error?.response?.status === 429) {
          console.log(
            `Rate limit exceeded, retrying in ${error.response.headers?.["retry-after"]}ms...`,
          );
          return this.delay(
            error.response.headers?.["retry-after"] || 10_000,
          ).then(() => this.getArtistAlbums(artistId, limit));
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
        if (error?.response?.status === 429) {
          console.log(
            `Rate limit exceeded, retrying in ${error.response.headers?.["retry-after"]}ms...`,
          );

          return this.delay(
            error.response.headers?.["retry-after"] || 10_000,
          ).then(() => this.getAlbumDetails(albumId));
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

    for (const artist of artists.slice(0, 50)) {
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

  async saveToS3(data, filename = "music-api/data.json") {
    const s3 = new S3Client();
    const bucketName = "is120-w25-apis";
    const params = {
      Bucket: bucketName,
      Key: filename,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    };
    try {
      await s3.send(new PutObjectCommand(params));
      console.log(`Data saved to S3 as ${filename}`);
    } catch (error) {
      console.error("Error saving to S3:", error);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function getSpotifyCredentials() {
  const secretsManager = new SecretsManagerClient();
  const secretName = "is120-project-3-api-keys";

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await secretsManager.send(command);
    const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret } =
      JSON.parse(data.SecretString);
    return { clientId, clientSecret };
  } catch (error) {
    console.error("Error retrieving Spotify credentials:", error);
    throw error;
  }
}

async function main() {
  const { clientId, clientSecret } = await getSpotifyCredentials();
  const collector = new SpotifyDataCollector(clientId, clientSecret);
  await collector.getToken();
  const data = await collector.collectAllData();
  collector.saveToS3(data);

  console.log("Data collection completed.");
}

main().catch(console.error);

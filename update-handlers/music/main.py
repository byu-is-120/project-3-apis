import requests
import asyncio
import boto3
import json
import time
import base64
from urllib.parse import urlencode
import os


class SpotifyDataCollector:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = None
        self.base_url = "https://api.spotify.com/v1"
        self.get_token()

    async def get_token(self):
        """Get Spotify API access token"""
        auth_url = "https://accounts.spotify.com/api/token"
        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"grant_type": "client_credentials"}

        response = requests.post(auth_url, headers=headers, data=data)
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            print("Successfully obtained Spotify access token")
        else:
            print(f"Error getting token: {response.status_code}")
            print(response.text)

    def get_headers(self):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {self.token}"}

    def get_top_genres(self, limit=15):
        """Get the most popular genres on Spotify"""
        # Spotify doesn't have a direct endpoint for popular genres,
        # so we'll use a curated list of popular music genres
        popular_genres = [
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
        ]
        return popular_genres[:limit]

    async def search_artists_by_genre(self, genre, limit=50):
        """Search for top artists in a specific genre"""
        endpoint = f"{self.base_url}/search"
        query_params = {"q": f"genre:{genre}", "type": "artist", "limit": limit}
        url = f"{endpoint}?{urlencode(query_params)}"

        response = requests.get(url, headers=self.get_headers())
        if response.status_code == 200:
            return response.json()["artists"]["items"]
        else:
            print(f"Error searching artists for genre {genre}: {response.status_code}")
            if response.status_code == 401:
                # Token expired, get a new one
                self.get_token()
                return await self.search_artists_by_genre(genre, limit)
            if response.status_code == 429:
                # Rate limit exceeded, wait and retry
                print("Rate limit exceeded, waiting for 60 seconds...")
                time.sleep(response.headers.get("Retry-After", 5))
                return await self.search_artists_by_genre(genre, limit)
            return []

    async def get_artist_albums(self, artist_id, limit=5):
        """Get top albums for an artist"""
        print(f"Fetching albums for artist: {artist_id}")
        endpoint = f"{self.base_url}/artists/{artist_id}/albums"
        params = {"include_groups": "album", "limit": limit, "market": "US"}
        url = f"{endpoint}?{urlencode(params)}"

        response = requests.get(url, headers=self.get_headers())
        if response.status_code == 200:
            albums = response.json()["items"]
            # Sort by popularity (need to get details for each album)
            album_details = []
            for album in albums[:limit]:
                details = await self.get_album_details(album["id"])
                if details:
                    album_details.append(details)

            # Sort by popularity and take top 5
            album_details.sort(key=lambda x: x.get("popularity", 0), reverse=True)
            return album_details[:limit]
        else:
            print(
                f"Error getting albums for artist {artist_id}: {response.status_code}"
            )
            if response.status_code == 401:
                self.get_token()
                return await self.get_artist_albums(artist_id, limit)
            if response.status_code == 429:
                # Rate limit exceeded, wait and retry
                print("Rate limit exceeded, waiting for 60 seconds...")
                time.sleep(response.headers.get("Retry-After", 5))
                return await self.get_artist_albums(artist_id, limit)
            return []

    async def get_album_details(self, album_id):
        print(f"Fetching details for album: {album_id}")
        """Get detailed information about an album including tracks"""
        endpoint = f"{self.base_url}/albums/{album_id}"

        response = requests.get(endpoint, headers=self.get_headers())
        if response.status_code == 200:
            album_data = response.json()

            # Create a simplified album structure
            album = {
                "name": album_data["name"],
                "release_date": album_data["release_date"],
                "total_tracks": album_data["total_tracks"],
                "popularity": album_data.get("popularity", 0),
                "album_type": album_data["album_type"],
                "cover_image": (
                    album_data["images"][0]["url"] if album_data["images"] else ""
                ),
                "songs": [],
            }

            # Add simplified track information
            for track in album_data["tracks"]["items"]:
                song = {
                    "name": track["name"],
                    "duration_ms": track["duration_ms"],
                    "track_number": track["track_number"],
                    "preview_url": track["preview_url"],
                }
                album["songs"].append(song)

            return album
        else:
            print(f"Error getting album details for {album_id}: {response.status_code}")
            if response.status_code == 401:
                self.get_token()
                return await self.get_album_details(album_id)
            if response.status_code == 429:
                # Rate limit exceeded, wait and retry
                print("Rate limit exceeded, waiting for 60 seconds...")
                time.sleep(response.headers.get("Retry-After", 5))
                return await self.get_album_details(album_id)
            return None

    async def get_artist_details(self, artist):
        print(f"Fetching details for artist: {artist['name']}")

        # Create simplified artist structure
        artist_data = {
            "name": artist["name"],
            "popularity": artist["popularity"],
            "followers": artist["followers"]["total"],
            "genres": artist["genres"],
            "spotify_url": artist["external_urls"]["spotify"],
            "image": artist["images"][0]["url"] if artist["images"] else "",
            "albums": [],
        }

        # Get top albums
        albums = await self.get_artist_albums(artist["id"])
        artist_data["albums"] = albums
        return artist_data

    async def get_genre_artists(self, genre):
        """Get artists for a specific genre"""
        print(f"Fetching artists for genre: {genre}")
        artists = await self.search_artists_by_genre(genre)
        genre_data = {"genre_name": genre, "artists": []}

        tasks = [self.get_artist_details(artist) for artist in artists[:50]]
        genre_data["artists"] = await asyncio.gather(*tasks)

        # Sort artists by popularity
        genre_data["artists"].sort(key=lambda x: x["popularity"], reverse=True)
        return genre_data

    async def collect_all_data(self):
        """Collect data for top artists across popular genres"""
        genres = self.get_top_genres()
        tasks = [self.get_genre_artists(genre) for genre in genres]
        result = {"spotify_top_genre_artists": await asyncio.gather(*tasks)}

        return result

    def save_to_json(self, data, filename="spotify_top_genre_artists.json"):
        """Save collected data to a JSON file with nice formatting"""
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        print(f"Data saved to {filename}")

    async def save_to_s3(self, data, filename="spotify_top_genre_artists.json"):
        """Save collected data to a JSON file with nice formatting"""
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        print(f"Data saved to {filename}")


async def get_spotify_credentials():
    """Get spotify credentials from aws secrets manager"""

    # Initialize a session using Boto3
    session = boto3.session.Session()
    client = session.client(
        service_name="secretsmanager",
        region_name="us-west-2",  # Change to your region
    )

    # Replace 'your_secret_name' with the name of your secret

    secret_name = "is120-project-3-api-keys"

    try:
        get_secret_value_response_json = client.get_secret_value(
            SecretId=secret_name
        ).get("SecretString")
        get_secret_value_response = json.loads(get_secret_value_response_json)
        client_id = get_secret_value_response["SPOTIFY_CLIENT_ID"]
        client_secret = get_secret_value_response["SPOTIFY_CLIENT_SECRET"]
    except Exception as e:
        print(f"Error retrieving secret: {e}")
        raise e

    return client_id, client_secret


async def main():
    start_time = time.time()
    # You need to set these environment variables or replace with your actual credentials
    client_id, client_secret = await get_spotify_credentials()

    collector = SpotifyDataCollector(client_id, client_secret)
    data = await collector.collect_all_data()
    collector.save_to_json(data)
    end_time = time.time()

    print(f"Data collection completed in {end_time - start_time:.2f} seconds")

    # Print sample of the data structure
    print("\nSample of the collected data structure:")
    if data["spotify_top_genre_artists"]:
        genre = data["spotify_top_genre_artists"][0]
        print(f"Genre: {genre['genre_name']}")
        if genre["artists"]:
            artist = genre["artists"][0]
            print(f"Top artist: {artist['name']}")
            if artist["albums"]:
                album = artist["albums"][0]
                print(f"Top album: {album['name']}")
                if album["songs"]:
                    print(f"First song: {album['songs'][0]['name']}")


if __name__ == "__main__":
    asyncio.run(main())

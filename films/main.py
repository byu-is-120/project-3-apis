import requests
import json
import time
import os
from datetime import datetime

class TMDbMovieCollector:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "https://image.tmdb.org/t/p/original"
        
    def get_popular_movies(self, page=1, limit=20):
        """Get popular movies from TMDb"""
        endpoint = f"{self.base_url}/movie/popular"
        params = {
            "api_key": self.api_key,
            "language": "en-US",
            "page": page
        }
        
        response = requests.get(endpoint, params=params)
        if response.status_code == 200:
            return response.json()["results"][:limit]
        else:
            print(f"Error getting popular movies: {response.status_code}")
            return []
    
    def get_top_rated_movies(self, page=1, limit=20):
        """Get top rated movies from TMDb"""
        endpoint = f"{self.base_url}/movie/top_rated"
        params = {
            "api_key": self.api_key,
            "language": "en-US",
            "page": page
        }
        
        response = requests.get(endpoint, params=params)
        if response.status_code == 200:
            return response.json()["results"][:limit]
        else:
            print(f"Error getting top rated movies: {response.status_code}")
            return []
    
    def get_movie_by_genre(self, genre_id, page=1, limit=20):
        """Get movies by genre"""
        endpoint = f"{self.base_url}/discover/movie"
        params = {
            "api_key": self.api_key,
            "with_genres": genre_id,
            "sort_by": "popularity.desc",
            "page": page
        }
        
        response = requests.get(endpoint, params=params)
        if response.status_code == 200:
            return response.json()["results"][:limit]
        else:
            print(f"Error getting movies for genre {genre_id}: {response.status_code}")
            return []
    
    def get_movie_details(self, movie_id):
        """Get detailed information about a movie"""
        endpoint = f"{self.base_url}/movie/{movie_id}"
        params = {
            "api_key": self.api_key,
            "language": "en-US",
            "append_to_response": "credits,images,videos,reviews,keywords,release_dates"
        }
        
        response = requests.get(endpoint, params=params)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error getting details for movie {movie_id}: {response.status_code}")
            return None
    
    def get_movie_genres(self):
        """Get list of movie genres from TMDb"""
        endpoint = f"{self.base_url}/genre/movie/list"
        params = {
            "api_key": self.api_key,
            "language": "en-US"
        }
        
        response = requests.get(endpoint, params=params)
        if response.status_code == 200:
            return response.json()["genres"]
        else:
            print(f"Error getting genres: {response.status_code}")
            return []
    
    def format_movie_data(self, movie_details):
        """Format movie details in a beginner-friendly structure"""
        # Get US certification if available
        certification = "Not Rated"
        if "release_dates" in movie_details and "results" in movie_details["release_dates"]:
            for country in movie_details["release_dates"]["results"]:
                if country["iso_3166_1"] == "US":
                    for release in country["release_dates"]:
                        if release.get("certification"):
                            certification = release["certification"]
                            break
                    break
        
        # Format crew - get director and producers
        director = "Unknown"
        producers = []
        if "credits" in movie_details and "crew" in movie_details["credits"]:
            for crew_member in movie_details["credits"]["crew"]:
                if crew_member["job"] == "Director":
                    director = crew_member["name"]
                elif crew_member["job"] == "Producer":
                    producers.append(crew_member["name"])
        
        # Format cast - get top actors
        cast = []
        if "credits" in movie_details and "cast" in movie_details["credits"]:
            for actor in movie_details["credits"]["cast"][:10]:  # Top 10 billed actors
                cast.append({
                    "name": actor["name"],
                    "character": actor["character"],
                    "profile_photo": f"{self.image_base_url}{actor['profile_path']}" if actor.get("profile_path") else None
                })
        
        # Get production companies
        production_companies = []
        for company in movie_details.get("production_companies", []):
            company_data = {
                "name": company["name"],
                "country": company.get("origin_country", "Unknown")
            }
            if company.get("logo_path"):
                company_data["logo"] = f"{self.image_base_url}{company['logo_path']}"
            production_companies.append(company_data)
        
        # Get photos (backdrops)
        photos = []
        if "images" in movie_details and "backdrops" in movie_details["images"]:
            for image in movie_details["images"]["backdrops"][:5]:  # Limit to 5 images
                photos.append(f"{self.image_base_url}{image['file_path']}")
        
        # Get trailer
        trailer_url = None
        if "videos" in movie_details and "results" in movie_details["videos"]:
            for video in movie_details["videos"]["results"]:
                if video["type"] == "Trailer" and video["site"] == "YouTube":
                    trailer_url = f"https://www.youtube.com/watch?v={video['key']}"
                    break
        
        # Format keywords
        keywords = []
        if "keywords" in movie_details and "keywords" in movie_details["keywords"]:
            keywords = [keyword["name"] for keyword in movie_details["keywords"]["keywords"]]
        
        # Create formatted movie data
        formatted_movie = {
            "id": movie_details["id"],
            "title": movie_details["title"],
            "tagline": movie_details.get("tagline", ""),
            "overview": movie_details.get("overview", ""),
            "release_date": movie_details.get("release_date", ""),
            "runtime_minutes": movie_details.get("runtime", 0),
            "certification": certification,
            "genres": [genre["name"] for genre in movie_details.get("genres", [])],
            "poster_url": f"{self.image_base_url}{movie_details['poster_path']}" if movie_details.get("poster_path") else None,
            "backdrop_url": f"{self.image_base_url}{movie_details['backdrop_path']}" if movie_details.get("backdrop_path") else None,
            "photos": photos,
            "trailer_url": trailer_url,
            "vote_average": movie_details.get("vote_average", 0),
            "vote_count": movie_details.get("vote_count", 0),
            "popularity": movie_details.get("popularity", 0),
            "budget_usd": movie_details.get("budget", 0),
            "revenue_usd": movie_details.get("revenue", 0),
            "profit_margin": calculate_profit_margin(movie_details.get("budget", 0), movie_details.get("revenue", 0)),
            "director": director,
            "producers": producers,
            "production_companies": production_companies,
            "cast": cast,
            "original_language": movie_details.get("original_language", ""),
            "keywords": keywords,
            "homepage": movie_details.get("homepage", "")
        }
        
        return formatted_movie

def calculate_profit_margin(budget, revenue):
    """Calculate profit margin percentage"""
    if budget <= 0 or revenue <= 0:
        return None
    profit = revenue - budget
    return round((profit / budget) * 100, 2)

def collect_movies_data(api_key, num_movies=100):
    """Collect data for movies across different categories"""
    collector = TMDbMovieCollector(api_key)
    
    # Get genres
    genres = collector.get_movie_genres()
    
    result = {
        "collection_date": datetime.now().strftime("%Y-%m-%d"),
        "total_movies": 0,
        "categories": {
            "popular": [],
            "top_rated": [],
            "by_genre": {}
        }
    }
    
    # Get popular movies
    print("Collecting popular movies...")
    popular_movies = []
    page = 1
    while len(popular_movies) < num_movies:
        batch = collector.get_popular_movies(page=page, limit=20)
        if not batch:
            break
        popular_movies.extend(batch)
        page += 1
        if page > 5:  # Limit to 5 pages (100 movies)
            break
    
    # Get top rated movies
    print("Collecting top rated movies...")
    top_rated_movies = []
    page = 1
    while len(top_rated_movies) < num_movies:
        batch = collector.get_top_rated_movies(page=page, limit=20)
        if not batch:
            break
        top_rated_movies.extend(batch)
        page += 1
        if page > 5:  # Limit to 5 pages (100 movies)
            break
    
    # Process movies and get details
    processed_ids = set()
    
    print("Processing popular movies...")
    for movie in popular_movies[:num_movies]:
        if movie["id"] in processed_ids:
            continue
            
        print(f"  Getting details for: {movie['title']}")
        movie_details = collector.get_movie_details(movie["id"])
        if movie_details:
            formatted_movie = collector.format_movie_data(movie_details)
            result["categories"]["popular"].append(formatted_movie)
            processed_ids.add(movie["id"])
        time.sleep(0.25)  # Rate limiting
    
    print("Processing top rated movies...")
    for movie in top_rated_movies[:num_movies]:
        if movie["id"] in processed_ids:
            continue
            
        print(f"  Getting details for: {movie['title']}")
        movie_details = collector.get_movie_details(movie["id"])
        if movie_details:
            formatted_movie = collector.format_movie_data(movie_details)
            result["categories"]["top_rated"].append(formatted_movie)
            processed_ids.add(movie["id"])
        time.sleep(0.25)  # Rate limiting
    
    # Get movies by genre (top 10 genres, 10 movies each)
    print("Processing movies by genre...")
    top_genres = sorted(genres, key=lambda x: x["id"])[:10]
    for genre in top_genres:
        genre_name = genre["name"]
        genre_id = genre["id"]
        result["categories"]["by_genre"][genre_name] = []
        
        print(f"  Collecting {genre_name} movies...")
        genre_movies = collector.get_movie_by_genre(genre_id, limit=10)
        
        for movie in genre_movies:
            if movie["id"] in processed_ids:
                continue
                
            print(f"    Getting details for: {movie['title']}")
            movie_details = collector.get_movie_details(movie["id"])
            if movie_details:
                formatted_movie = collector.format_movie_data(movie_details)
                result["categories"]["by_genre"][genre_name].append(formatted_movie)
                processed_ids.add(movie["id"])
            time.sleep(0.25)  # Rate limiting
    
    # Update total count
    result["total_movies"] = len(processed_ids)
    
    return result

def save_to_json(data, filename="tmdb_movie_data.json"):
    """Save collected data to a JSON file with nice formatting"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
    print(f"Data saved to {filename}")

def main():
    # Get TMDb API key from environment variable or replace with your actual key
    api_key = os.environ.get("TMDB_API_KEY", "YOUR_TMDB_API_KEY_HERE")
    
    # Collect movie data (adjust number as needed - more will take longer)
    movies_data = collect_movies_data(api_key, num_movies=50)
    
    # Save to JSON file
    save_to_json(movies_data)
    
    # Print summary
    print(f"\nCollection complete!")
    print(f"Total movies collected: {movies_data['total_movies']}")
    print(f"Popular movies: {len(movies_data['categories']['popular'])}")
    print(f"Top rated movies: {len(movies_data['categories']['top_rated'])}")
    print("Movies by genre:")
    for genre, movies in movies_data['categories']['by_genre'].items():
        print(f"  {genre}: {len(movies)}")

if __name__ == "__main__":
    main()

import requests
import json
import time
from datetime import datetime, timedelta
import os

class ESPNDataFetcher:
    def __init__(self):
        self.base_url = "https://site.api.espn.com/apis/site/v2/sports"
        self.leagues = {
            "nfl": {"name": "Football", "abbrev": "nfl"},
            "nba": {"name": "Basketball", "abbrev": "nba"}, 
            "mlb": {"name": "Baseball", "abbrev": "mlb"},
            "nhl": {"name": "Hockey", "abbrev": "nhl"}
        }
        self.all_data = {}
        
    def fetch_teams(self, league):
        """Fetch all teams for a given league"""
        url = f"{self.base_url}/{self.leagues[league]['name'].lower()}/{league}/teams"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error fetching {league} teams: {response.status_code}")
            return None
    
    def fetch_team_details(self, league, team_id):
        """Fetch detailed info for a specific team"""
        url = f"{self.base_url}/{self.leagues[league]['name'].lower()}/{league}/teams/{team_id}"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error fetching details for team {team_id}: {response.status_code}")
            return None
    
    def fetch_roster(self, league, team_id):
        """Fetch roster info for a specific team"""
        url = f"{self.base_url}/{self.leagues[league]['name'].lower()}/{league}/teams/{team_id}/roster"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error fetching roster for team {team_id}: {response.status_code}")
            return None
    
    def fetch_recent_games(self, league, team_id, limit=5):
        """Fetch the last 5 games for a team"""
        # Get current date and date 3 months ago for search range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        # Format dates for the API
        start_str = start_date.strftime("%Y%m%d")
        end_str = end_date.strftime("%Y%m%d")
        
        url = f"{self.base_url}/{self.leagues[league]['name'].lower()}/{league}/teams/{team_id}/schedule"
        params = {
            "dates": f"{start_str}-{end_str}",
        }
        
        response = requests.get(url, params=params)
        if response.status_code == 200:
            games_data = response.json()
            recent_games = []
            
            # Extract completed games and sort by date (most recent first)
            if 'events' in games_data:
                completed_games = [game for game in games_data['events'] 
                                  if game.get('status', {}).get('type', {}).get('completed', False)]
                completed_games.sort(key=lambda x: x.get('date', ''), reverse=True)
                
                # Take the most recent 'limit' games
                recent_games = completed_games[:limit]
            
            return recent_games
        else:
            print(f"Error fetching games for team {team_id}: {response.status_code}")
            return []
    
    def collect_all_data(self):
        """Collect data for all leagues and teams"""
        for league in self.leagues:
            print(f"Fetching {league.upper()} data...")
            self.all_data[league] = {"teams": []}
            
            teams_data = self.fetch_teams(league)
            if not teams_data or 'sports' not in teams_data:
                continue
                
            # Process each team
            for team in teams_data['sports'][0]['leagues'][0]['teams']:
                team_info = team['team']
                team_id = team_info['id']
                
                print(f"  Processing {team_info['displayName']}...")
                
                # Get basic team info
                team_data = {
                    "id": team_id,
                    "name": team_info['displayName'],
                    "abbreviation": team_info.get('abbreviation', ''),
                    "nickname": team_info.get('nickname', ''),
                    "location": team_info.get('location', ''),
                    "logo": team_info.get('logos', [{}])[0].get('href', '') if team_info.get('logos') else '',
                    "colors": team_info.get('colors', []),
                    "record": team_info.get('record', {}).get('items', [{}])[0].get('summary', '') if team_info.get('record') else '',
                    "links": team_info.get('links', []),
                }
                
                # Get detailed roster information
                roster_data = self.fetch_roster(league, team_id)
                if roster_data and 'athletes' in roster_data:
                    team_data['roster'] = []
                    for athlete in roster_data['athletes']:
                        if 'items' in athlete:
                            for player in athlete['items']:
                                player_info = {
                                    "id": player.get('id', ''),
                                    "fullName": player.get('fullName', ''),
                                    "jersey": player.get('jersey', ''),
                                    "position": player.get('position', {}).get('abbreviation', ''),
                                    "headshot": player.get('headshot', {}).get('href', '') if player.get('headshot') else '',
                                    "height": player.get('height', ''),
                                    "weight": player.get('weight', ''),
                                    "age": player.get('age', ''),
                                    "experience": player.get('experience', {}).get('years', 0) if player.get('experience') else 0,
                                }
                                team_data['roster'].append(player_info)
                
                # Get recent games
                recent_games = self.fetch_recent_games(league, team_id)
                if recent_games:
                    team_data['recent_games'] = []
                    for game in recent_games:
                        game_info = {
                            "id": game.get('id', ''),
                            "date": game.get('date', ''),
                            "name": game.get('name', ''),
                            "shortName": game.get('shortName', ''),
                            "venue": game.get('competitions', [{}])[0].get('venue', {}).get('fullName', '') if game.get('competitions') else '',
                        }
                        
                        # Add score information
                        if game.get('competitions') and len(game['competitions']) > 0:
                            competition = game['competitions'][0]
                            if 'competitors' in competition and len(competition['competitors']) > 0:
                                game_info['scores'] = []
                                for competitor in competition['competitors']:
                                    score_info = {
                                        "team": competitor.get('team', {}).get('displayName', ''),
                                        "score": competitor.get('score', ''),
                                        "winner": competitor.get('winner', False),
                                    }
                                    game_info['scores'].append(score_info)
                        
                        team_data['recent_games'].append(game_info)
                
                # Add a small delay to avoid hitting rate limits
                time.sleep(0.2)
                
                # Add team data to the league
                self.all_data[league]['teams'].append(team_data)
            
            print(f"Completed {league.upper()} data collection")
    
    def save_to_json(self, filename="espn_sports_data.json"):
        """Save all collected data to a JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.all_data, f, indent=2)
        print(f"Data saved to {filename}")

if __name__ == "__main__":
    fetcher = ESPNDataFetcher()
    fetcher.collect_all_data()
    fetcher.save_to_json()

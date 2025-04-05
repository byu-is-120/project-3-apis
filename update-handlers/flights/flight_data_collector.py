import json
import random
import datetime
from math import radians, sin, cos, sqrt, atan2


class FlightDataGenerator:
    def __init__(self):
        # Initialize variables
        self.collection_date = datetime.datetime.now().strftime("%Y-%m-%d")

        # Data containers
        self.airlines_data = []
        self.airports_data = []
        self.popular_routes_data = []

        # Configuration
        self.num_airlines = random.randint(30, 40)
        self.num_airports = random.randint(40, 50)
        self.num_popular_routes = 50
        self.routes_per_airline = 10
        self.busiest_routes_per_airport = 10

        # Initialize random seed for reproducibility
        random.seed(42)

        # Load static data
        self.load_static_data()

    def generate_data(self):
        """Generate the complete flight data structure."""
        # Select a subset of airlines and airports
        selected_airline_codes = random.sample(
            list(self.all_airlines.keys()), self.num_airlines)
        selected_airport_codes = random.sample(
            list(self.all_airports.keys()), self.num_airports)

        # Initialize airlines data
        self.airlines_data = self.initialize_airlines(selected_airline_codes)

        # Initialize airports data
        self.airports_data = self.initialize_airports(selected_airport_codes)

        # Generate routes for airlines
        self.generate_airline_routes()

        # Generate busiest routes for airports
        self.generate_airport_busiest_routes()

        # Generate popular routes data
        self.popular_routes_data = self.generate_popular_routes()

        # Compile final data structure
        flight_data = {
            'collection_date': self.collection_date,
            'airlines': self.airlines_data,
            'airports': self.airports_data,
            'popular_routes': self.popular_routes_data
        }

        return flight_data

    def initialize_airlines(self, airline_codes):
        """Initialize the airlines data with selected airlines."""
        airlines = []

        for airline_code in airline_codes:
            airline_info = self.all_airlines[airline_code].copy()

            # Add airline_id
            airline_info['airline_id'] = airline_code

            # Add alliance information
            airline_info['alliance'] = self.alliances.get(airline_code)

            # Add recent performance metrics
            airline_info['recent_performance'] = {
                'on_time_percentage': round(random.uniform(75, 95), 1),
                'cancellation_rate': round(random.uniform(0.5, 3.0), 1),
                'average_delay_minutes': round(random.uniform(5, 30)),
                'customer_satisfaction': round(random.uniform(3.0, 4.8), 1)
            }

            # Initialize empty routes list (to be populated later)
            airline_info['routes'] = []

            airlines.append(airline_info)

        return airlines

    def initialize_airports(self, airport_codes):
        """Initialize the airports data with selected airports."""
        airports = []

        for airport_code in airport_codes:
            airport_info = self.all_airports[airport_code].copy()

            # Add IATA code
            airport_info['iata_code'] = airport_code

            # Generate random serving airlines (5-15 airlines)
            serving_airlines_count = random.randint(
                5, min(15, self.num_airlines))
            serving_airlines = random.sample(
                [airline['airline_id'] for airline in self.airlines_data], serving_airlines_count)
            airport_info['airlines_serving'] = serving_airlines

            # Generate random amenities (5-10 amenities)
            amenities_count = random.randint(5, 10)
            airport_info['amenities'] = random.sample(
                self.common_amenities, amenities_count)

            # Initialize empty busiest routes list (to be populated later)
            airport_info['busiest_routes'] = []

            # Add performance stats
            airport_info['performance_stats'] = {
                'average_departure_delay': round(random.uniform(5, 25), 1),
                'average_arrival_delay': round(random.uniform(5, 20), 1),
                'security_wait_time_minutes': random.randint(5, 30)
            }

            airports.append(airport_info)

        return airports

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points in miles using Haversine formula."""
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        # Radius of earth in miles
        radius = 3959

        # Calculate distance
        distance = radius * c

        return distance

    def generate_airline_routes(self):
        """Generate routes for each airline."""
        airport_codes = [airport['iata_code']
                         for airport in self.airports_data]

        for airline in self.airlines_data:
            airline_id = airline['airline_id']
            routes = []

            # For each airline, get airports where this airline operates
            serving_airports = [
                a['iata_code'] for a in self.airports_data if airline_id in a['airlines_serving']]

            # If not enough serving airports, use all airports
            if len(serving_airports) < 4:
                serving_airports = airport_codes

            # Generate route pairs
            potential_routes = []
            for i in range(len(serving_airports)):
                for j in range(i + 1, len(serving_airports)):
                    potential_routes.append(
                        (serving_airports[i], serving_airports[j]))

            # Shuffle pairs and take up to routes_per_airline
            random.shuffle(potential_routes)
            selected_routes = potential_routes[:self.routes_per_airline]

            # Generate data for each route
            for origin, destination in selected_routes:
                route_id = f"{airline_id}-{origin}-{destination}"

                # Get airport locations
                origin_airport = next(
                    a for a in self.airports_data if a['iata_code'] == origin)
                destination_airport = next(
                    a for a in self.airports_data if a['iata_code'] == destination)

                # Calculate distance
                distance = self.calculate_distance(
                    origin_airport['location']['latitude'],
                    origin_airport['location']['longitude'],
                    destination_airport['location']['latitude'],
                    destination_airport['location']['longitude']
                )

                # Generate flight data
                most_recent_flight, next_flight = self.generate_flights(
                    airline_id, distance)

                route = {
                    'origin': origin,
                    'destination': destination,
                    'route_id': route_id,
                    'distance_miles': int(distance),
                    'most_recent_flight': most_recent_flight,
                    'next_flight': next_flight
                }

                routes.append(route)

            # Add routes to airline
            airline['routes'] = routes

    def generate_flights(self, airline_id, distance):
        """Generate realistic flight data based on distance."""
        # Calculate realistic flight duration based on distance
        # Rough estimate: 500mph + 30 min for takeoff/landing
        duration_minutes = int(distance / 8) + 30

        # Generate realistic departure and arrival times
        hours = random.choice(
            [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
        minutes = random.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])

        # Create today's flight
        today = datetime.datetime.now()
        departure_time = today.replace(
            hour=hours, minute=minutes, second=0, microsecond=0)
        arrival_time = departure_time + \
            datetime.timedelta(minutes=duration_minutes)

        flight_number = f"{airline_id}{random.randint(100, 9999)}"
        aircraft = random.choice(self.aircraft_types)
        status = random.choice(
            ['Scheduled', 'On Time', 'Delayed', 'Scheduled'])

        most_recent_flight = {
            'flight_number': flight_number,
            'departure': departure_time.isoformat(),
            'arrival': arrival_time.isoformat(),
            'duration_minutes': duration_minutes,
            'aircraft': aircraft,
            'status': status,
            'terminals': {
                'departure': random.choice(['A', 'B', 'C', 'D', 'E', 'F', 'T', 'S']),
                'arrival': str(random.randint(1, 9))
            },
            'on_time_percentage': random.randint(70, 95)
        }

        # Generate next day's flight
        next_day_departure = departure_time + datetime.timedelta(days=1)
        next_day_arrival = arrival_time + datetime.timedelta(days=1)

        next_flight = {
            'flight_number': flight_number,
            'departure': next_day_departure.isoformat(),
            'arrival': next_day_arrival.isoformat(),
            'duration_minutes': duration_minutes,
            'aircraft': aircraft,
            'status': random.choice(['Scheduled', 'On Time', 'Delayed', 'Scheduled']),
            'terminals': most_recent_flight['terminals'],
            'on_time_percentage': most_recent_flight['on_time_percentage']
        }

        return most_recent_flight, next_flight

    def generate_airport_busiest_routes(self):
        """Generate busiest routes for each airport."""
        for airport in self.airports_data:
            airport_code = airport['iata_code']
            busiest_routes = []

            # Find all routes where this airport is the origin
            potential_destinations = []

            for airline in self.airlines_data:
                for route in airline['routes']:
                    if route['origin'] == airport_code and route['destination'] not in [r['destination'] for r in busiest_routes]:
                        potential_destinations.append(route['destination'])

            # If we don't have enough routes, find other airports
            other_airports = [a['iata_code']
                              for a in self.airports_data if a['iata_code'] != airport_code]
            random.shuffle(other_airports)

            for dest in other_airports:
                if dest not in potential_destinations and len(potential_destinations) < self.busiest_routes_per_airport:
                    potential_destinations.append(dest)

            # Use up to busiest_routes_per_airport destinations
            for i in range(min(self.busiest_routes_per_airport, len(potential_destinations))):
                destination = potential_destinations[i]

                # Generate a new route entry
                busy_route = {
                    'destination': destination,
                    'flights_per_day': random.randint(5, 50),
                    'airlines': random.sample(airport['airlines_serving'], min(3, len(airport['airlines_serving'])))
                }

                busiest_routes.append(busy_route)

            # Add busiest routes to airport
            airport['busiest_routes'] = busiest_routes

    def generate_popular_routes(self):
        """Generate popular routes data."""
        popular_routes = []

        # Get all airports
        airports = self.airports_data

        # Generate pairs of origin-destination (focus on major hubs)
        pairs = []
        for i in range(len(airports)):
            for j in range(i + 1, len(airports)):
                # Calculate a "popularity score" based on number of gates and airlines serving
                score = (airports[i]['gates'] + airports[j]['gates']) * 2
                score += len(airports[i]['airlines_serving']) + \
                    len(airports[j]['airlines_serving'])

                pairs.append((airports[i], airports[j], score))

        # Sort pairs by popularity score
        pairs.sort(key=lambda x: x[2], reverse=True)

        # Take the top num_popular_routes pairs
        for i in range(min(self.num_popular_routes, len(pairs))):
            origin, destination, _ = pairs[i]

            # Calculate distance
            distance = self.calculate_distance(
                origin['location']['latitude'],
                origin['location']['longitude'],
                destination['location']['latitude'],
                destination['location']['longitude']
            )

            # Determine serving airlines
            serving_airlines = list(set(origin['airlines_serving']) & set(
                destination['airlines_serving']))
            if len(serving_airlines) < 3:
                # Add some major airlines if not enough common ones
                major_airlines = ['AA', 'DL', 'UA', 'LH', 'BA']
                for airline in major_airlines:
                    if airline not in serving_airlines:
                        serving_airlines.append(airline)
                        if len(serving_airlines) >= 5:
                            break

            # Calculate price based on distance
            base_economy = int(100 + distance * 0.1)

            # Generate route data
            route = {
                'route_id': f"{origin['city'].replace(' ', '')}-{destination['city'].replace(' ', '')}",
                'origin_city': origin['city'],
                'destination_city': destination['city'],
                'distance_miles': int(distance),
                'airlines_serving': serving_airlines[:5],  # Top 5 airlines
                'flights_per_day': random.randint(10, 60),
                'average_price': {
                    'economy': base_economy,
                    'premium_economy': int(base_economy * 1.6),
                    'business': int(base_economy * 3.5),
                    'first': int(base_economy * 6)
                },
                'average_duration_minutes': int(distance / 8) + 30,
                'best_time_to_book_days': random.randint(21, 60)
            }

            popular_routes.append(route)

        return popular_routes

    def load_static_data(self):
        """Load static data about airlines, airports, alliances, and amenities."""
        # Major alliance mappings
        self.alliances = {
            'DL': 'SkyTeam',
            'AF': 'SkyTeam',
            'KL': 'SkyTeam',
            'AZ': 'SkyTeam',
            'KE': 'SkyTeam',
            'UX': 'SkyTeam',
            'MU': 'SkyTeam',
            'UA': 'Star Alliance',
            'LH': 'Star Alliance',
            'NH': 'Star Alliance',
            'CA': 'Star Alliance',
            'SQ': 'Star Alliance',
            'TG': 'Star Alliance',
            'SK': 'Star Alliance',
            'OS': 'Star Alliance',
            'LX': 'Star Alliance',
            'AA': 'Oneworld',
            'BA': 'Oneworld',
            'QF': 'Oneworld',
            'CX': 'Oneworld',
            'JL': 'Oneworld',
            'AY': 'Oneworld',
            'IB': 'Oneworld',
            'QR': 'Oneworld',
            'WN': None,  # Southwest - no alliance
            'B6': None,  # JetBlue - no alliance
            'AS': 'Oneworld',  # Alaska - now part of Oneworld
            'F9': None,  # Frontier - no alliance
            'NK': None,  # Spirit - no alliance
            'EK': None,  # Emirates - no alliance
            'EY': None,  # Etihad - no alliance
            'WS': None,  # WestJet - no alliance
            'AC': 'Star Alliance',  # Air Canada
            'AM': 'SkyTeam',  # Aeromexico
            'BR': 'Star Alliance',  # EVA Air
            'CI': None,  # China Airlines
            'MH': 'Oneworld',  # Malaysia Airlines
            'SU': 'SkyTeam',  # Aeroflot
            'TK': 'Star Alliance',  # Turkish Airlines
            'VS': None,  # Virgin Atlantic
            'WY': None,  # Oman Air
            'ET': 'Star Alliance',  # Ethiopian Airlines
            'LA': 'Oneworld',  # LATAM
        }

        # Airlines data
        self.all_airlines = {
            'DL': {
                'name': 'Delta Air Lines',
                'country': 'United States',
                'headquarters': 'Atlanta, Georgia',
                'website': 'https://www.delta.com',
                'fleet_size': 850,
                'destinations': 325,
                'logo': 'https://example.com/logos/delta.png'
            },
            'AA': {
                'name': 'American Airlines',
                'country': 'United States',
                'headquarters': 'Fort Worth, Texas',
                'website': 'https://www.aa.com',
                'fleet_size': 914,
                'destinations': 350,
                'logo': 'https://example.com/logos/american.png'
            },
            'UA': {
                'name': 'United Airlines',
                'country': 'United States',
                'headquarters': 'Chicago, Illinois',
                'website': 'https://www.united.com',
                'fleet_size': 857,
                'destinations': 342,
                'logo': 'https://example.com/logos/united.png'
            },
            'WN': {
                'name': 'Southwest Airlines',
                'country': 'United States',
                'headquarters': 'Dallas, Texas',
                'website': 'https://www.southwest.com',
                'fleet_size': 735,
                'destinations': 121,
                'logo': 'https://example.com/logos/southwest.png'
            },
            'B6': {
                'name': 'JetBlue Airways',
                'country': 'United States',
                'headquarters': 'New York, New York',
                'website': 'https://www.jetblue.com',
                'fleet_size': 280,
                'destinations': 100,
                'logo': 'https://example.com/logos/jetblue.png'
            },
            'AS': {
                'name': 'Alaska Airlines',
                'country': 'United States',
                'headquarters': 'Seattle, Washington',
                'website': 'https://www.alaskaair.com',
                'fleet_size': 330,
                'destinations': 115,
                'logo': 'https://example.com/logos/alaska.png'
            },
            'F9': {
                'name': 'Frontier Airlines',
                'country': 'United States',
                'headquarters': 'Denver, Colorado',
                'website': 'https://www.flyfrontier.com',
                'fleet_size': 110,
                'destinations': 100,
                'logo': 'https://example.com/logos/frontier.png'
            },
            'NK': {
                'name': 'Spirit Airlines',
                'country': 'United States',
                'headquarters': 'Miramar, Florida',
                'website': 'https://www.spirit.com',
                'fleet_size': 175,
                'destinations': 83,
                'logo': 'https://example.com/logos/spirit.png'
            },
            'LH': {
                'name': 'Lufthansa',
                'country': 'Germany',
                'headquarters': 'Cologne, Germany',
                'website': 'https://www.lufthansa.com',
                'fleet_size': 280,
                'destinations': 220,
                'logo': 'https://example.com/logos/lufthansa.png'
            },
            'BA': {
                'name': 'British Airways',
                'country': 'United Kingdom',
                'headquarters': 'London, England',
                'website': 'https://www.britishairways.com',
                'fleet_size': 277,
                'destinations': 183,
                'logo': 'https://example.com/logos/british_airways.png'
            },
            'AF': {
                'name': 'Air France',
                'country': 'France',
                'headquarters': 'Paris, France',
                'website': 'https://www.airfrance.com',
                'fleet_size': 224,
                'destinations': 201,
                'logo': 'https://example.com/logos/air_france.png'
            },
            'KL': {
                'name': 'KLM Royal Dutch Airlines',
                'country': 'Netherlands',
                'headquarters': 'Amstelveen, Netherlands',
                'website': 'https://www.klm.com',
                'fleet_size': 120,
                'destinations': 145,
                'logo': 'https://example.com/logos/klm.png'
            },
            'EK': {
                'name': 'Emirates',
                'country': 'United Arab Emirates',
                'headquarters': 'Dubai, UAE',
                'website': 'https://www.emirates.com',
                'fleet_size': 269,
                'destinations': 157,
                'logo': 'https://example.com/logos/emirates.png'
            },
            'QF': {
                'name': 'Qantas',
                'country': 'Australia',
                'headquarters': 'Sydney, Australia',
                'website': 'https://www.qantas.com',
                'fleet_size': 133,
                'destinations': 85,
                'logo': 'https://example.com/logos/qantas.png'
            },
            'SQ': {
                'name': 'Singapore Airlines',
                'country': 'Singapore',
                'headquarters': 'Singapore',
                'website': 'https://www.singaporeair.com',
                'fleet_size': 130,
                'destinations': 64,
                'logo': 'https://example.com/logos/singapore.png'
            },
            'CX': {
                'name': 'Cathay Pacific',
                'country': 'Hong Kong',
                'headquarters': 'Hong Kong',
                'website': 'https://www.cathaypacific.com',
                'fleet_size': 155,
                'destinations': 77,
                'logo': 'https://example.com/logos/cathay.png'
            },
            'JL': {
                'name': 'Japan Airlines',
                'country': 'Japan',
                'headquarters': 'Tokyo, Japan',
                'website': 'https://www.jal.com',
                'fleet_size': 167,
                'destinations': 95,
                'logo': 'https://example.com/logos/jal.png'
            },
            'NH': {
                'name': 'All Nippon Airways',
                'country': 'Japan',
                'headquarters': 'Tokyo, Japan',
                'website': 'https://www.ana.co.jp',
                'fleet_size': 211,
                'destinations': 97,
                'logo': 'https://example.com/logos/ana.png'
            },
            'TK': {
                'name': 'Turkish Airlines',
                'country': 'Turkey',
                'headquarters': 'Istanbul, Turkey',
                'website': 'https://www.turkishairlines.com',
                'fleet_size': 389,
                'destinations': 304,
                'logo': 'https://example.com/logos/turkish.png'
            },
            'EY': {
                'name': 'Etihad Airways',
                'country': 'United Arab Emirates',
                'headquarters': 'Abu Dhabi, UAE',
                'website': 'https://www.etihad.com',
                'fleet_size': 102,
                'destinations': 68,
                'logo': 'https://example.com/logos/etihad.png'
            },
            'QR': {
                'name': 'Qatar Airways',
                'country': 'Qatar',
                'headquarters': 'Doha, Qatar',
                'website': 'https://www.qatarairways.com',
                'fleet_size': 234,
                'destinations': 160,
                'logo': 'https://example.com/logos/qatar.png'
            },
            'AC': {
                'name': 'Air Canada',
                'country': 'Canada',
                'headquarters': 'Montreal, Canada',
                'website': 'https://www.aircanada.com',
                'fleet_size': 169,
                'destinations': 217,
                'logo': 'https://example.com/logos/aircanada.png'
            },
            'AM': {
                'name': 'Aeromexico',
                'country': 'Mexico',
                'headquarters': 'Mexico City, Mexico',
                'website': 'https://www.aeromexico.com',
                'fleet_size': 118,
                'destinations': 90,
                'logo': 'https://example.com/logos/aeromexico.png'
            },
            'AZ': {
                'name': 'ITA Airways',
                'country': 'Italy',
                'headquarters': 'Rome, Italy',
                'website': 'https://www.itaspa.com',
                'fleet_size': 52,
                'destinations': 45,
                'logo': 'https://example.com/logos/ita.png'
            },
            'LA': {
                'name': 'LATAM Airlines',
                'country': 'Chile',
                'headquarters': 'Santiago, Chile',
                'website': 'https://www.latamairlines.com',
                'fleet_size': 320,
                'destinations': 144,
                'logo': 'https://example.com/logos/latam.png'
            },
            'VS': {
                'name': 'Virgin Atlantic',
                'country': 'United Kingdom',
                'headquarters': 'Crawley, UK',
                'website': 'https://www.virginatlantic.com',
                'fleet_size': 40,
                'destinations': 33,
                'logo': 'https://example.com/logos/virgin.png'
            },
            'WS': {
                'name': 'WestJet',
                'country': 'Canada',
                'headquarters': 'Calgary, Canada',
                'website': 'https://www.westjet.com',
                'fleet_size': 124,
                'destinations': 108,
                'logo': 'https://example.com/logos/westjet.png'
            },
            'SK': {
                'name': 'SAS Scandinavian Airlines',
                'country': 'Sweden',
                'headquarters': 'Stockholm, Sweden',
                'website': 'https://www.flysas.com',
                'fleet_size': 135,
                'destinations': 123,
                'logo': 'https://example.com/logos/sas.png'
            },
            'ET': {
                'name': 'Ethiopian Airlines',
                'country': 'Ethiopia',
                'headquarters': 'Addis Ababa, Ethiopia',
                'website': 'https://www.ethiopianairlines.com',
                'fleet_size': 130,
                'destinations': 125,
                'logo': 'https://example.com/logos/ethiopian.png'
            },
            'KE': {
                'name': 'Korean Air',
                'country': 'South Korea',
                'headquarters': 'Seoul, South Korea',
                'website': 'https://www.koreanair.com',
                'fleet_size': 169,
                'destinations': 125,
                'logo': 'https://example.com/logos/korean.png'
            },
            'CA': {
                'name': 'Air China',
                'country': 'China',
                'headquarters': 'Beijing, China',
                'website': 'https://www.airchina.com',
                'fleet_size': 428,
                'destinations': 201,
                'logo': 'https://example.com/logos/airchina.png'
            },
            'MU': {
                'name': 'China Eastern Airlines',
                'country': 'China',
                'headquarters': 'Shanghai, China',
                'website': 'https://www.ceair.com',
                'fleet_size': 570,
                'destinations': 220,
                'logo': 'https://example.com/logos/chinaeastern.png'
            },
            'CI': {
                'name': 'China Airlines',
                'country': 'Taiwan',
                'headquarters': 'Taipei, Taiwan',
                'website': 'https://www.china-airlines.com',
                'fleet_size': 88,
                'destinations': 95,
                'logo': 'https://example.com/logos/chinaairlines.png'
            },
            'BR': {
                'name': 'EVA Air',
                'country': 'Taiwan',
                'headquarters': 'Taipei, Taiwan',
                'website': 'https://www.evaair.com',
                'fleet_size': 85,
                'destinations': 67,
                'logo': 'https://example.com/logos/evaair.png'
            },
            'MH': {
                'name': 'Malaysia Airlines',
                'country': 'Malaysia',
                'headquarters': 'Kuala Lumpur, Malaysia',
                'website': 'https://www.malaysiaairlines.com',
                'fleet_size': 81,
                'destinations': 59,
                'logo': 'https://example.com/logos/malaysia.png'
            },
            'TG': {
                'name': 'Thai Airways',
                'country': 'Thailand',
                'headquarters': 'Bangkok, Thailand',
                'website': 'https://www.thaiairways.com',
                'fleet_size': 82,
                'destinations': 84,
                'logo': 'https://example.com/logos/thai.png'
            },
            'SU': {
                'name': 'Aeroflot',
                'country': 'Russia',
                'headquarters': 'Moscow, Russia',
                'website': 'https://www.aeroflot.ru',
                'fleet_size': 186,
                'destinations': 146,
                'logo': 'https://example.com/logos/aeroflot.png'
            },
            'OS': {
                'name': 'Austrian Airlines',
                'country': 'Austria',
                'headquarters': 'Vienna, Austria',
                'website': 'https://www.austrian.com',
                'fleet_size': 82,
                'destinations': 130,
                'logo': 'https://example.com/logos/austrian.png'
            },
            'LX': {
                'name': 'Swiss International Air Lines',
                'country': 'Switzerland',
                'headquarters': 'Basel, Switzerland',
                'website': 'https://www.swiss.com',
                'fleet_size': 105,
                'destinations': 102,
                'logo': 'https://example.com/logos/swiss.png'
            }
        }

        # Airports data
        self.all_airports = {
            'ATL': {
                'name': 'Hartsfield-Jackson Atlanta International Airport',
                'city': 'Atlanta',
                'state': 'Georgia',
                'country': 'United States',
                'website': 'https://www.atl.com',
                'terminals': 7,
                'gates': 192,
                'location': {'latitude': 33.6407, 'longitude': -84.4277},
            },
            'LAX': {
                'name': 'Los Angeles International Airport',
                'city': 'Los Angeles',
                'state': 'California',
                'country': 'United States',
                'website': 'https://www.flylax.com',
                'terminals': 9,
                'gates': 146,
                'location': {'latitude': 33.9416, 'longitude': -118.4085},
            },
            'ORD': {
                'name': 'O\'Hare International Airport',
                'city': 'Chicago',
                'state': 'Illinois',
                'country': 'United States',
                'website': 'https://www.flychicago.com/ohare',
                'terminals': 4,
                'gates': 191,
                'location': {'latitude': 41.9742, 'longitude': -87.9073},
            },
            'DFW': {
                'name': 'Dallas/Fort Worth International Airport',
                'city': 'Dallas',
                'state': 'Texas',
                'country': 'United States',
                'website': 'https://www.dfwairport.com',
                'terminals': 5,
                'gates': 165,
                'location': {'latitude': 32.8998, 'longitude': -97.0403},
            },
            'DEN': {
                'name': 'Denver International Airport',
                'city': 'Denver',
                'state': 'Colorado',
                'country': 'United States',
                'website': 'https://www.flydenver.com',
                'terminals': 1,
                'gates': 115,
                'location': {'latitude': 39.8561, 'longitude': -104.6737},
            },
            'JFK': {
                'name': 'John F. Kennedy International Airport',
                'city': 'New York',
                'state': 'New York',
                'country': 'United States',
                'website': 'https://www.jfkairport.com',
                'terminals': 6,
                'gates': 128,
                'location': {'latitude': 40.6413, 'longitude': -73.7781},
            },
            'SFO': {
                'name': 'San Francisco International Airport',
                'city': 'San Francisco',
                'state': 'California',
                'country': 'United States',
                'website': 'https://www.flysfo.com',
                'terminals': 4,
                'gates': 115,
                'location': {'latitude': 37.7749, 'longitude': -122.4194},
            },
            'SEA': {
                'name': 'Seattle-Tacoma International Airport',
                'city': 'Seattle',
                'state': 'Washington',
                'country': 'United States',
                'website': 'https://www.portseattle.org/sea-tac',
                'terminals': 1,
                'gates': 90,
                'location': {'latitude': 47.4502, 'longitude': -122.3088},
            },
            'LAS': {
                'name': 'Harry Reid International Airport',
                'city': 'Las Vegas',
                'state': 'Nevada',
                'country': 'United States',
                'website': 'https://www.harryreidairport.com',
                'terminals': 2,
                'gates': 110,
                'location': {'latitude': 36.0840, 'longitude': -115.1537},
            },
            'MCO': {
                'name': 'Orlando International Airport',
                'city': 'Orlando',
                'state': 'Florida',
                'country': 'United States',
                'website': 'https://www.orlandoairports.net',
                'terminals': 4,
                'gates': 129,
                'location': {'latitude': 28.4312, 'longitude': -81.3081},
            },
            'MIA': {
                'name': 'Miami International Airport',
                'city': 'Miami',
                'state': 'Florida',
                'country': 'United States',
                'website': 'https://www.miami-airport.com',
                'terminals': 3,
                'gates': 131,
                'location': {'latitude': 25.7932, 'longitude': -80.2906},
            },
            'CLT': {
                'name': 'Charlotte Douglas International Airport',
                'city': 'Charlotte',
                'state': 'North Carolina',
                'country': 'United States',
                'website': 'https://www.cltairport.com',
                'terminals': 1,
                'gates': 115,
                'location': {'latitude': 35.2144, 'longitude': -80.9473},
            },
            'PHX': {
                'name': 'Phoenix Sky Harbor International Airport',
                'city': 'Phoenix',
                'state': 'Arizona',
                'country': 'United States',
                'website': 'https://www.skyharbor.com',
                'terminals': 3,
                'gates': 120,
                'location': {'latitude': 33.4352, 'longitude': -112.0101},
            },
            'IAH': {
                'name': 'George Bush Intercontinental Airport',
                'city': 'Houston',
                'state': 'Texas',
                'country': 'United States',
                'website': 'https://www.fly2houston.com',
                'terminals': 5,
                'gates': 130,
                'location': {'latitude': 29.9902, 'longitude': -95.3368},
            },
            'BOS': {
                'name': 'Boston Logan International Airport',
                'city': 'Boston',
                'state': 'Massachusetts',
                'country': 'United States',
                'website': 'https://www.massport.com/logan-airport',
                'terminals': 4,
                'gates': 102,
                'location': {'latitude': 42.3656, 'longitude': -71.0096},
            },
            'DTW': {
                'name': 'Detroit Metropolitan Wayne County Airport',
                'city': 'Detroit',
                'state': 'Michigan',
                'country': 'United States',
                'website': 'https://www.metroairport.com',
                'terminals': 2,
                'gates': 129,
                'location': {'latitude': 42.2162, 'longitude': -83.3554},
            },
            'MSP': {
                'name': 'Minneapolis−Saint Paul International Airport',
                'city': 'Minneapolis',
                'state': 'Minnesota',
                'country': 'United States',
                'website': 'https://www.mspairport.com',
                'terminals': 2,
                'gates': 131,
                'location': {'latitude': 44.8848, 'longitude': -93.2223},
            },
            'LHR': {
                'name': 'London Heathrow Airport',
                'city': 'London',
                'state': '',
                'country': 'United Kingdom',
                'website': 'https://www.heathrow.com',
                'terminals': 4,
                'gates': 115,
                'location': {'latitude': 51.4700, 'longitude': -0.4543},
            },
            'CDG': {
                'name': 'Paris Charles de Gaulle Airport',
                'city': 'Paris',
                'state': '',
                'country': 'France',
                'website': 'https://www.parisaeroport.fr',
                'terminals': 3,
                'gates': 104,
                'location': {'latitude': 49.0097, 'longitude': 2.5479},
            },
            'FRA': {
                'name': 'Frankfurt Airport',
                'city': 'Frankfurt',
                'state': '',
                'country': 'Germany',
                'website': 'https://www.frankfurt-airport.com',
                'terminals': 2,
                'gates': 142,
                'location': {'latitude': 50.0379, 'longitude': 8.5622},
            },
            'AMS': {
                'name': 'Amsterdam Airport Schiphol',
                'city': 'Amsterdam',
                'state': '',
                'country': 'Netherlands',
                'website': 'https://www.schiphol.nl',
                'terminals': 1,
                'gates': 165,
                'location': {'latitude': 52.3105, 'longitude': 4.7683},
            },
            'MAD': {
                'name': 'Adolfo Suárez Madrid–Barajas Airport',
                'city': 'Madrid',
                'state': '',
                'country': 'Spain',
                'website': 'https://www.aena.es/en/madrid-barajas-airport',
                'terminals': 4,
                'gates': 104,
                'location': {'latitude': 40.4983, 'longitude': -3.5676},
            },
            'FCO': {
                'name': 'Leonardo da Vinci–Fiumicino Airport',
                'city': 'Rome',
                'state': '',
                'country': 'Italy',
                'website': 'https://www.adr.it/fiumicino',
                'terminals': 4,
                'gates': 85,
                'location': {'latitude': 41.8003, 'longitude': 12.2389},
            },
            'BCN': {
                'name': 'Barcelona–El Prat Airport',
                'city': 'Barcelona',
                'state': '',
                'country': 'Spain',
                'website': 'https://www.aena.es/en/barcelona-airport',
                'terminals': 2,
                'gates': 67,
                'location': {'latitude': 41.2974, 'longitude': 2.0833},
            },
            'LGW': {
                'name': 'London Gatwick Airport',
                'city': 'London',
                'state': '',
                'country': 'United Kingdom',
                'website': 'https://www.gatwickairport.com',
                'terminals': 2,
                'gates': 66,
                'location': {'latitude': 51.1537, 'longitude': -0.1821},
            },
            'MUC': {
                'name': 'Munich Airport',
                'city': 'Munich',
                'state': '',
                'country': 'Germany',
                'website': 'https://www.munich-airport.com',
                'terminals': 2,
                'gates': 90,
                'location': {'latitude': 48.3537, 'longitude': 11.7860},
            },
            'IST': {
                'name': 'Istanbul Airport',
                'city': 'Istanbul',
                'state': '',
                'country': 'Turkey',
                'website': 'https://www.istairport.com',
                'terminals': 1,
                'gates': 143,
                'location': {'latitude': 41.2608, 'longitude': 28.7418},
            },
            'SYD': {
                'name': 'Sydney Airport',
                'city': 'Sydney',
                'state': 'New South Wales',
                'country': 'Australia',
                'website': 'https://www.sydneyairport.com.au',
                'terminals': 3,
                'gates': 65,
                'location': {'latitude': -33.9399, 'longitude': 151.1753},
            },
            'MEL': {
                'name': 'Melbourne Airport',
                'city': 'Melbourne',
                'state': 'Victoria',
                'country': 'Australia',
                'website': 'https://www.melbourneairport.com.au',
                'terminals': 4,
                'gates': 56,
                'location': {'latitude': -37.6690, 'longitude': 144.8410},
            },
            'HND': {
                'name': 'Tokyo Haneda Airport',
                'city': 'Tokyo',
                'state': '',
                'country': 'Japan',
                'website': 'https://tokyo-haneda.com',
                'terminals': 3,
                'gates': 114,
                'location': {'latitude': 35.5494, 'longitude': 139.7798},
            },
            'NRT': {
                'name': 'Narita International Airport',
                'city': 'Tokyo',
                'state': '',
                'country': 'Japan',
                'website': 'https://www.narita-airport.jp',
                'terminals': 3,
                'gates': 96,
                'location': {'latitude': 35.7719, 'longitude': 140.3929},
            },
            'ICN': {
                'name': 'Incheon International Airport',
                'city': 'Seoul',
                'state': '',
                'country': 'South Korea',
                'website': 'https://www.airport.kr',
                'terminals': 2,
                'gates': 128,
                'location': {'latitude': 37.4602, 'longitude': 126.4407},
            },
            'PEK': {
                'name': 'Beijing Capital International Airport',
                'city': 'Beijing',
                'state': '',
                'country': 'China',
                'website': 'https://www.bcia.com.cn',
                'terminals': 3,
                'gates': 120,
                'location': {'latitude': 40.0799, 'longitude': 116.6031},
            },
            'PVG': {
                'name': 'Shanghai Pudong International Airport',
                'city': 'Shanghai',
                'state': '',
                'country': 'China',
                'website': 'https://www.shanghaiairport.com',
                'terminals': 2,
                'gates': 98,
                'location': {'latitude': 31.1443, 'longitude': 121.8083},
            },
            'HKG': {
                'name': 'Hong Kong International Airport',
                'city': 'Hong Kong',
                'state': '',
                'country': 'China',
                'website': 'https://www.hongkongairport.com',
                'terminals': 2,
                'gates': 90,
                'location': {'latitude': 22.3080, 'longitude': 113.9185},
            },
            'SIN': {
                'name': 'Singapore Changi Airport',
                'city': 'Singapore',
                'state': '',
                'country': 'Singapore',
                'website': 'https://www.changiairport.com',
                'terminals': 4,
                'gates': 140,
                'location': {'latitude': 1.3644, 'longitude': 103.9915},
            },
            'BKK': {
                'name': 'Suvarnabhumi Airport',
                'city': 'Bangkok',
                'state': '',
                'country': 'Thailand',
                'website': 'https://www.suvarnabhumiairport.com',
                'terminals': 1,
                'gates': 107,
                'location': {'latitude': 13.6900, 'longitude': 100.7501},
            },
            'KUL': {
                'name': 'Kuala Lumpur International Airport',
                'city': 'Kuala Lumpur',
                'state': '',
                'country': 'Malaysia',
                'website': 'https://www.klia.com.my',
                'terminals': 2,
                'gates': 115,
                'location': {'latitude': 2.7456, 'longitude': 101.7099},
            },
            'DEL': {
                'name': 'Indira Gandhi International Airport',
                'city': 'Delhi',
                'state': '',
                'country': 'India',
                'website': 'https://www.newdelhiairport.in',
                'terminals': 3,
                'gates': 130,
                'location': {'latitude': 28.5561, 'longitude': 77.1000},
            },
            'BOM': {
                'name': 'Chhatrapati Shivaji Maharaj International Airport',
                'city': 'Mumbai',
                'state': '',
                'country': 'India',
                'website': 'https://www.csmia.aero',
                'terminals': 2,
                'gates': 78,
                'location': {'latitude': 19.0896, 'longitude': 72.8656},
            },
            'DXB': {
                'name': 'Dubai International Airport',
                'city': 'Dubai',
                'state': '',
                'country': 'United Arab Emirates',
                'website': 'https://www.dubaiairports.ae',
                'terminals': 3,
                'gates': 184,
                'location': {'latitude': 25.2532, 'longitude': 55.3657},
            },
            'DOH': {
                'name': 'Hamad International Airport',
                'city': 'Doha',
                'state': '',
                'country': 'Qatar',
                'website': 'https://dohahamadairport.com',
                'terminals': 1,
                'gates': 140,
                'location': {'latitude': 25.2609, 'longitude': 51.6138},
            },
            'AUH': {
                'name': 'Abu Dhabi International Airport',
                'city': 'Abu Dhabi',
                'state': '',
                'country': 'United Arab Emirates',
                'website': 'https://www.abudhabiairport.ae',
                'terminals': 3,
                'gates': 65,
                'location': {'latitude': 24.4330, 'longitude': 54.6511},
            },
            'GRU': {
                'name': 'São Paulo/Guarulhos International Airport',
                'city': 'São Paulo',
                'state': '',
                'country': 'Brazil',
                'website': 'https://www.gru.com.br',
                'terminals': 3,
                'gates': 95,
                'location': {'latitude': -23.4356, 'longitude': -46.4731},
            },
            'MEX': {
                'name': 'Mexico City International Airport',
                'city': 'Mexico City',
                'state': '',
                'country': 'Mexico',
                'website': 'https://www.aicm.com.mx',
                'terminals': 2,
                'gates': 85,
                'location': {'latitude': 19.4361, 'longitude': -99.0719},
            },
            'YYZ': {
                'name': 'Toronto Pearson International Airport',
                'city': 'Toronto',
                'state': 'Ontario',
                'country': 'Canada',
                'website': 'https://www.torontopearson.com',
                'terminals': 2,
                'gates': 112,
                'location': {'latitude': 43.6777, 'longitude': -79.6248},
            },
            'YVR': {
                'name': 'Vancouver International Airport',
                'city': 'Vancouver',
                'state': 'British Columbia',
                'country': 'Canada',
                'website': 'https://www.yvr.ca',
                'terminals': 3,
                'gates': 80,
                'location': {'latitude': 49.1967, 'longitude': -123.1815},
            },
        }

        self.common_amenities = [
            'free_wifi', 'lounges', 'dining', 'shopping', 'charging_stations',
            'duty_free', 'currency_exchange', 'rental_cars', 'prayer_rooms',
            'children_play_areas', 'pet_relief_areas', 'smoking_areas',
            'spa_services', 'showers', 'medical_services'
        ]

        # Common aircraft types
        self.aircraft_types = [
            'Boeing 737-800', 'Boeing 737-900', 'Boeing 747-400',
            'Boeing 777-200', 'Boeing 777-300', 'Boeing 787-8',
            'Boeing 787-9', 'Boeing 767-300', 'Boeing 767-400',
            'Airbus A319', 'Airbus A320', 'Airbus A321',
            'Airbus A330-200', 'Airbus A330-300', 'Airbus A350-900',
            'Airbus A380', 'Embraer E170', 'Embraer E190'
        ]

    
    def save_to_json(self, data, filename="flight_data.json"):
        """Save the generated data to a JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        print(f"Data saved to {filename}")


# Main execution
if __name__ == "__main__":
    print("Generating synthetic flight data...")
    generator = FlightDataGenerator()
    flight_data = generator.generate_data()
    generator.save_to_json(flight_data)
    print("Flight data generation complete!")

    # Print some stats
    num_airlines = len(flight_data['airlines'])
    num_airports = len(flight_data['airports'])
    num_routes = sum(len(airline['routes'])
                     for airline in flight_data['airlines'])
    num_popular_routes = len(flight_data['popular_routes'])

    print(f"\nGenerated data includes:")
    print(f"- {num_airlines} airlines")
    print(f"- {num_airports} airports")
    print(f"- {num_routes} airline routes")
    print(f"- {num_popular_routes} popular routes")

    # Initialize random seed for reproducibility
    random.seed(42)

    
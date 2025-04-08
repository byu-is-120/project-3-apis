// TODO:
//  flight logos on box/s3

class FlightDataGenerator {
  constructor() {
    // Initialize variables
    this.collectionDate = new Date().toISOString().split("T")[0];

    // Data containers
    this.airlinesData = [];
    this.airportsData = [];
    this.popularRoutesData = [];

    // Configuration
    this.numAirlines = this.getRandomInt(30, 40);
    this.numAirports = this.getRandomInt(40, 50);
    this.numPopularRoutes = 50;
    this.routesPerAirline = 10;
    this.busiestRoutesPerAirport = 10;

    // maybe set a ranomd seed?

    // Load static data
    this.loadStaticData();
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  generateData() {
    // Select a subset of airlines and airports
    const allAirlineCodes = Object.keys(this.allAirlines);
    const allAirportCodes = Object.keys(this.allAirports);

    const selectedAirlineCodes = this.getRandomSample(
      allAirlineCodes,
      this.numAirlines,
    );
    const selectedAirportCodes = this.getRandomSample(
      allAirportCodes,
      this.numAirports,
    );

    // Initialize data
    this.airlinesData = this.initializeAirlines(selectedAirlineCodes);
    this.airportsData = this.initializeAirports(selectedAirportCodes);

    // Generate routes for airlines
    this.generateAirlineRoutes();

    // Generate busiest routes for airports
    this.generateAirportBusiestRoutes();

    // Generate popular routes data
    this.popularRoutesData = this.generatePopularRoutes();

    // Compile final data structure
    const flightData = {
      collection_date: this.collectionDate,
      airlines: this.airlinesData,
      airports: this.airportsData,
      popular_routes: this.popularRoutesData,
    };

    return flightData;
  }

  initializeAirlines(airlineCodes) {
    const airlines = [];

    for (const airlineCode of airlineCodes) {
      const airlineInfo = { ...this.allAirlines[airlineCode] };

      airlineInfo.airline_id = airlineCode;

      airlineInfo.alliance = this.alliances[airlineCode] || null;

      airlineInfo.recent_performance = {
        on_time_percentage: this.roundToDecimal(this.getRandomFloat(75, 95), 1),
        cancellation_rate: this.roundToDecimal(
          this.getRandomFloat(0.5, 3.0),
          1,
        ),
        average_delay_minutes: Math.round(this.getRandomFloat(5, 30)),
        customer_satisfaction: this.roundToDecimal(
          this.getRandomFloat(3.0, 4.8),
          1,
        ),
      };

      airlineInfo.routes = [];

      airlines.push(airlineInfo);
    }

    return airlines;
  }

  initializeAirports(airportCodes) {
    const airports = [];

    for (const airportCode of airportCodes) {
      const airportInfo = { ...this.allAirports[airportCode] };

      airportInfo.iata_code = airportCode;

      const servingAirlinesCount = this.getRandomInt(
        5,
        Math.min(15, this.numAirlines),
      );
      const allAirlineIds = this.airlinesData.map(
        (airline) => airline.airline_id,
      );
      const servingAirlines = this.getRandomSample(
        allAirlineIds,
        servingAirlinesCount,
      );
      airportInfo.airlines_serving = servingAirlines;

      const amenitiesCount = this.getRandomInt(5, 10);
      airportInfo.amenities = this.getRandomSample(
        this.commonAmenities,
        amenitiesCount,
      );

      airportInfo.busiest_routes = [];

      airportInfo.performance_stats = {
        average_departure_delay: this.roundToDecimal(
          this.getRandomFloat(5, 25),
          1,
        ),
        average_arrival_delay: this.roundToDecimal(
          this.getRandomFloat(5, 20),
          1,
        ),
        security_wait_time_minutes: this.getRandomInt(5, 30),
      };

      airports.push(airportInfo);
    }

    return airports;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Convert latitude and longitude from degrees to radians
    lat1 = this.toRadians(lat1);
    lon1 = this.toRadians(lon1);
    lat2 = this.toRadians(lat2);
    lon2 = this.toRadians(lon2);

    // Haversine formula
    const dlon = lon2 - lon1;
    const dlat = lat2 - lat1;
    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Radius of earth in miles
    const radius = 3959;

    // Calculate distance
    const distance = radius * c;

    return distance;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  generateAirlineRoutes() {
    const airportCodes = this.airportsData.map((airport) => airport.iata_code);

    for (const airline of this.airlinesData) {
      const airlineId = airline.airline_id;
      const routes = [];

      // For each airline, get airports where this airline operates
      const servingAirports = this.airportsData
        .filter((a) => a.airlines_serving.includes(airlineId))
        .map((a) => a.iata_code);

      // If not enough serving airports, use all airports
      const airportsToUse =
        servingAirports.length < 4 ? airportCodes : servingAirports;

      // Generate route pairs
      const potentialRoutes = [];
      for (let i = 0; i < airportsToUse.length; i++) {
        for (let j = i + 1; j < airportsToUse.length; j++) {
          potentialRoutes.push([airportsToUse[i], airportsToUse[j]]);
        }
      }

      // Shuffle pairs and take up to routesPerAirline
      this.shuffleArray(potentialRoutes);
      const selectedRoutes = potentialRoutes.slice(0, this.routesPerAirline);

      // Generate data for each route
      for (const [origin, destination] of selectedRoutes) {
        const routeId = `${airlineId}-${origin}-${destination}`;

        // Get airport locations
        const originAirport = this.airportsData.find(
          (a) => a.iata_code === origin,
        );
        const destinationAirport = this.airportsData.find(
          (a) => a.iata_code === destination,
        );

        // Calculate distance
        const distance = this.calculateDistance(
          originAirport.location.latitude,
          originAirport.location.longitude,
          destinationAirport.location.latitude,
          destinationAirport.location.longitude,
        );

        // Generate flight data
        const [mostRecentFlight, nextFlight] = this.generateFlights(
          airlineId,
          distance,
        );

        const route = {
          origin: origin,
          destination: destination,
          route_id: routeId,
          distance_miles: Math.round(distance),
          most_recent_flight: mostRecentFlight,
          next_flight: nextFlight,
        };

        routes.push(route);
      }

      // Add routes to airline
      airline.routes = routes;
    }
  }

  generateFlights(airlineId, distance) {
    // Calculate realistic flight duration based on distance
    // Rough estimate: 500mph + 30 min for takeoff/landing
    const durationMinutes = Math.round(distance / 8) + 30;

    // Generate realistic departure and arrival times
    const hours = this.getRandomChoice([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    const minutes = this.getRandomChoice([
      0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
    ]);

    // Create today's flight
    const today = new Date();
    const departureTime = new Date(today);
    departureTime.setHours(hours, minutes, 0, 0);

    const arrivalTime = new Date(
      departureTime.getTime() + durationMinutes * 60000,
    );

    const flightNumber = `${airlineId}${this.getRandomInt(100, 9999)}`;
    const aircraft = this.getRandomChoice(this.aircraftTypes);
    const status = this.getRandomChoice([
      "Scheduled",
      "On Time",
      "Delayed",
      "Scheduled",
    ]);

    const terminals = {
      departure: this.getRandomChoice(["A", "B", "C", "D", "E", "F", "T", "S"]),
      arrival: this.getRandomInt(1, 9).toString(),
    };

    const onTimePercentage = this.getRandomInt(70, 95);

    const mostRecentFlight = {
      flight_number: flightNumber,
      departure: departureTime.toISOString(),
      arrival: arrivalTime.toISOString(),
      duration_minutes: durationMinutes,
      aircraft: aircraft,
      status: status,
      terminals: terminals,
      on_time_percentage: onTimePercentage,
    };

    // Generate next day's flight
    const nextDayDeparture = new Date(departureTime);
    nextDayDeparture.setDate(nextDayDeparture.getDate() + 1);

    const nextDayArrival = new Date(arrivalTime);
    nextDayArrival.setDate(nextDayArrival.getDate() + 1);

    const nextFlight = {
      flight_number: flightNumber,
      departure: nextDayDeparture.toISOString(),
      arrival: nextDayArrival.toISOString(),
      duration_minutes: durationMinutes,
      aircraft: aircraft,
      status: this.getRandomChoice([
        "Scheduled",
        "On Time",
        "Delayed",
        "Scheduled",
      ]),
      terminals: terminals,
      on_time_percentage: onTimePercentage,
    };

    return [mostRecentFlight, nextFlight];
  }

  generateAirportBusiestRoutes() {
    for (const airport of this.airportsData) {
      const airportCode = airport.iata_code;
      const busiestRoutes = [];

      // Find all routes where this airport is the origin
      const potentialDestinations = [];

      for (const airline of this.airlinesData) {
        for (const route of airline.routes) {
          if (
            route.origin === airportCode &&
            !busiestRoutes.some((r) => r.destination === route.destination)
          ) {
            potentialDestinations.push(route.destination);
          }
        }
      }

      // If we don't have enough routes, find other airports
      const otherAirports = this.airportsData
        .filter((a) => a.iata_code !== airportCode)
        .map((a) => a.iata_code);

      this.shuffleArray(otherAirports);

      for (const dest of otherAirports) {
        if (
          !potentialDestinations.includes(dest) &&
          potentialDestinations.length < this.busiestRoutesPerAirport
        ) {
          potentialDestinations.push(dest);
        }
      }

      // Use up to busiestRoutesPerAirport destinations
      for (
        let i = 0;
        i <
        Math.min(this.busiestRoutesPerAirport, potentialDestinations.length);
        i++
      ) {
        const destination = potentialDestinations[i];

        // Generate a new route entry
        const busyRoute = {
          destination: destination,
          flights_per_day: this.getRandomInt(5, 50),
          airlines: this.getRandomSample(
            airport.airlines_serving,
            Math.min(3, airport.airlines_serving.length),
          ),
        };

        busiestRoutes.push(busyRoute);
      }

      // Add busiest routes to airport
      airport.busiest_routes = busiestRoutes;
    }
  }

  generatePopularRoutes() {
    const popularRoutes = [];

    // Get all airports
    const airports = this.airportsData;

    // Generate pairs of origin-destination (focus on major hubs)
    const pairs = [];
    for (let i = 0; i < airports.length; i++) {
      for (let j = i + 1; j < airports.length; j++) {
        // Calculate a "popularity score" based on number of gates and airlines serving
        const score =
          (airports[i].gates + airports[j].gates) * 2 +
          airports[i].airlines_serving.length +
          airports[j].airlines_serving.length;

        pairs.push([airports[i], airports[j], score]);
      }
    }

    // Sort pairs by popularity score
    pairs.sort((a, b) => b[2] - a[2]);

    // Take the top numPopularRoutes pairs
    for (let i = 0; i < Math.min(this.numPopularRoutes, pairs.length); i++) {
      const [origin, destination, _] = pairs[i];

      // Calculate distance
      const distance = this.calculateDistance(
        origin.location.latitude,
        origin.location.longitude,
        destination.location.latitude,
        destination.location.longitude,
      );

      // Determine serving airlines
      let servingAirlines = origin.airlines_serving.filter((airline) =>
        destination.airlines_serving.includes(airline),
      );

      if (servingAirlines.length < 3) {
        // Add some major airlines if not enough common ones
        const majorAirlines = ["AA", "DL", "UA", "LH", "BA"];
        for (const airline of majorAirlines) {
          if (!servingAirlines.includes(airline)) {
            servingAirlines.push(airline);
            if (servingAirlines.length >= 5) {
              break;
            }
          }
        }
      }

      // Calculate price based on distance
      const baseEconomy = Math.round(100 + distance * 0.1);

      // Generate route data
      const route = {
        route_id: `${origin.city.replace(
          /\s+/g,
          "",
        )}-${destination.city.replace(/\s+/g, "")}`,
        origin_city: origin.city,
        destination_city: destination.city,
        distance_miles: Math.round(distance),
        airlines_serving: servingAirlines.slice(0, 5), // Top 5 airlines
        flights_per_day: this.getRandomInt(10, 60),
        average_price: {
          economy: baseEconomy,
          premium_economy: Math.round(baseEconomy * 1.6),
          business: Math.round(baseEconomy * 3.5),
          first: Math.round(baseEconomy * 6),
        },
        average_duration_minutes: Math.round(distance / 8) + 30,
        best_time_to_book_days: this.getRandomInt(21, 60),
      };

      popularRoutes.push(route);
    }

    return popularRoutes;
  }

  loadStaticData() {
    // Major alliance mappings
    this.alliances = {
      DL: "SkyTeam",
      AF: "SkyTeam",
      KL: "SkyTeam",
      AZ: "SkyTeam",
      KE: "SkyTeam",
      UX: "SkyTeam",
      MU: "SkyTeam",
      UA: "Star Alliance",
      LH: "Star Alliance",
      NH: "Star Alliance",
      CA: "Star Alliance",
      SQ: "Star Alliance",
      TG: "Star Alliance",
      SK: "Star Alliance",
      OS: "Star Alliance",
      LX: "Star Alliance",
      AA: "Oneworld",
      BA: "Oneworld",
      QF: "Oneworld",
      CX: "Oneworld",
      JL: "Oneworld",
      AY: "Oneworld",
      IB: "Oneworld",
      QR: "Oneworld",
      AS: "Oneworld", // Alaska - now part of Oneworld
      AC: "Star Alliance", // Air Canada
      AM: "SkyTeam", // Aeromexico
      BR: "Star Alliance", // EVA Air
      MH: "Oneworld", // Malaysia Airlines
      SU: "SkyTeam", // Aeroflot
      TK: "Star Alliance", // Turkish Airlines
      ET: "Star Alliance", // Ethiopian Airlines
      LA: "Oneworld", // LATAM
    };

    // Airlines data
    this.allAirlines = {
      DL: {
        name: "Delta Air Lines",
        country: "United States",
        headquarters: "Atlanta, Georgia",
        website: "https://www.delta.com",
        fleet_size: 850,
        destinations: 325,
        logo: "https://example.com/logos/delta.png",
      },
      AA: {
        name: "American Airlines",
        country: "United States",
        headquarters: "Fort Worth, Texas",
        website: "https://www.aa.com",
        fleet_size: 914,
        destinations: 350,
        logo: "https://example.com/logos/american.png",
      },
      UA: {
        name: "United Airlines",
        country: "United States",
        headquarters: "Chicago, Illinois",
        website: "https://www.united.com",
        fleet_size: 857,
        destinations: 342,
        logo: "https://example.com/logos/united.png",
      },
      WN: {
        name: "Southwest Airlines",
        country: "United States",
        headquarters: "Dallas, Texas",
        website: "https://www.southwest.com",
        fleet_size: 735,
        destinations: 121,
        logo: "https://example.com/logos/southwest.png",
      },
      B6: {
        name: "JetBlue Airways",
        country: "United States",
        headquarters: "New York, New York",
        website: "https://www.jetblue.com",
        fleet_size: 280,
        destinations: 100,
        logo: "https://example.com/logos/jetblue.png",
      },
      AS: {
        name: "Alaska Airlines",
        country: "United States",
        headquarters: "Seattle, Washington",
        website: "https://www.alaskaair.com",
        fleet_size: 330,
        destinations: 115,
        logo: "https://example.com/logos/alaska.png",
      },
      F9: {
        name: "Frontier Airlines",
        country: "United States",
        headquarters: "Denver, Colorado",
        website: "https://www.flyfrontier.com",
        fleet_size: 110,
        destinations: 100,
        logo: "https://example.com/logos/frontier.png",
      },
      NK: {
        name: "Spirit Airlines",
        country: "United States",
        headquarters: "Miramar, Florida",
        website: "https://www.spirit.com",
        fleet_size: 175,
        destinations: 83,
        logo: "https://example.com/logos/spirit.png",
      },
      LH: {
        name: "Lufthansa",
        country: "Germany",
        headquarters: "Cologne, Germany",
        website: "https://www.lufthansa.com",
        fleet_size: 280,
        destinations: 220,
        logo: "https://example.com/logos/lufthansa.png",
      },
      BA: {
        name: "British Airways",
        country: "United Kingdom",
        headquarters: "London, England",
        website: "https://www.britishairways.com",
        fleet_size: 277,
        destinations: 183,
        logo: "https://example.com/logos/british_airways.png",
      },
      AF: {
        name: "Air France",
        country: "France",
        headquarters: "Paris, France",
        website: "https://www.airfrance.com",
        fleet_size: 224,
        destinations: 201,
        logo: "https://example.com/logos/air_france.png",
      },
      KL: {
        name: "KLM Royal Dutch Airlines",
        country: "Netherlands",
        headquarters: "Amstelveen, Netherlands",
        website: "https://www.klm.com",
        fleet_size: 120,
        destinations: 145,
        logo: "https://example.com/logos/klm.png",
      },
      EK: {
        name: "Emirates",
        country: "United Arab Emirates",
        headquarters: "Dubai, UAE",
        website: "https://www.emirates.com",
        fleet_size: 269,
        destinations: 157,
        logo: "https://example.com/logos/emirates.png",
      },
      QF: {
        name: "Qantas",
        country: "Australia",
        headquarters: "Sydney, Australia",
        website: "https://www.qantas.com",
        fleet_size: 133,
        destinations: 85,
        logo: "https://example.com/logos/qantas.png",
      },
      SQ: {
        name: "Singapore Airlines",
        country: "Singapore",
        headquarters: "Singapore",
        website: "https://www.singaporeair.com",
        fleet_size: 130,
        destinations: 64,
        logo: "https://example.com/logos/singapore.png",
      },
      CX: {
        name: "Cathay Pacific",
        country: "Hong Kong",
        headquarters: "Hong Kong",
        website: "https://www.cathaypacific.com",
        fleet_size: 155,
        destinations: 77,
        logo: "https://example.com/logos/cathay.png",
      },
      JL: {
        name: "Japan Airlines",
        country: "Japan",
        headquarters: "Tokyo, Japan",
        website: "https://www.jal.com",
        fleet_size: 167,
        destinations: 95,
        logo: "https://example.com/logos/jal.png",
      },
      NH: {
        name: "All Nippon Airways",
        country: "Japan",
        headquarters: "Tokyo, Japan",
        website: "https://www.ana.co.jp",
        fleet_size: 211,
        destinations: 97,
        logo: "https://example.com/logos/ana.png",
      },
      TK: {
        name: "Turkish Airlines",
        country: "Turkey",
        headquarters: "Istanbul, Turkey",
        website: "https://www.turkishairlines.com",
        fleet_size: 389,
        destinations: 304,
        logo: "https://example.com/logos/turkish.png",
      },
      EY: {
        name: "Etihad Airways",
        country: "United Arab Emirates",
        headquarters: "Abu Dhabi, UAE",
        website: "https://www.etihad.com",
        fleet_size: 102,
        destinations: 68,
        logo: "https://example.com/logos/etihad.png",
      },
      QR: {
        name: "Qatar Airways",
        country: "Qatar",
        headquarters: "Doha, Qatar",
        website: "https://www.qatarairways.com",
        fleet_size: 234,
        destinations: 160,
        logo: "https://example.com/logos/qatar.png",
      },
      AC: {
        name: "Air Canada",
        country: "Canada",
        headquarters: "Montreal, Canada",
        website: "https://www.aircanada.com",
        fleet_size: 169,
        destinations: 217,
        logo: "https://example.com/logos/aircanada.png",
      },
      AM: {
        name: "Aeromexico",
        country: "Mexico",
        headquarters: "Mexico City, Mexico",
        website: "https://www.aeromexico.com",
        fleet_size: 118,
        destinations: 90,
        logo: "https://example.com/logos/aeromexico.png",
      },
      AZ: {
        name: "ITA Airways",
        country: "Italy",
        headquarters: "Rome, Italy",
        website: "https://www.itaspa.com",
        fleet_size: 52,
        destinations: 45,
        logo: "https://example.com/logos/ita.png",
      },
      LA: {
        name: "LATAM Airlines",
        country: "Chile",
        headquarters: "Santiago, Chile",
        website: "https://www.latamairlines.com",
        fleet_size: 320,
        destinations: 144,
        logo: "https://example.com/logos/latam.png",
      },
      VS: {
        name: "Virgin Atlantic",
        country: "United Kingdom",
        headquarters: "Crawley, UK",
        website: "https://www.virginatlantic.com",
        fleet_size: 40,
        destinations: 33,
        logo: "https://example.com/logos/virgin.png",
      },
      WS: {
        name: "WestJet",
        country: "Canada",
        headquarters: "Calgary, Canada",
        website: "https://www.westjet.com",
        fleet_size: 124,
        destinations: 108,
        logo: "https://example.com/logos/westjet.png",
      },
      SK: {
        name: "SAS Scandinavian Airlines",
        country: "Sweden",
        headquarters: "Stockholm, Sweden",
        website: "https://www.flysas.com",
        fleet_size: 135,
        destinations: 123,
        logo: "https://example.com/logos/sas.png",
      },
      ET: {
        name: "Ethiopian Airlines",
        country: "Ethiopia",
        headquarters: "Addis Ababa, Ethiopia",
        website: "https://www.ethiopianairlines.com",
        fleet_size: 130,
        destinations: 125,
        logo: "https://example.com/logos/ethiopian.png",
      },
      KE: {
        name: "Korean Air",
        country: "South Korea",
        headquarters: "Seoul, South Korea",
        website: "https://www.koreanair.com",
        fleet_size: 169,
        destinations: 125,
        logo: "https://example.com/logos/korean.png",
      },
      CA: {
        name: "Air China",
        country: "China",
        headquarters: "Beijing, China",
        website: "https://www.airchina.com",
        fleet_size: 428,
        destinations: 201,
        logo: "https://example.com/logos/airchina.png",
      },
      MU: {
        name: "China Eastern Airlines",
        country: "China",
        headquarters: "Shanghai, China",
        website: "https://www.ceair.com",
        fleet_size: 570,
        destinations: 220,
        logo: "https://example.com/logos/chinaeastern.png",
      },
      CI: {
        name: "China Airlines",
        country: "Taiwan",
        headquarters: "Taipei, Taiwan",
        website: "https://www.china-airlines.com",
        fleet_size: 88,
        destinations: 95,
        logo: "https://example.com/logos/chinaairlines.png",
      },
      BR: {
        name: "EVA Air",
        country: "Taiwan",
        headquarters: "Taipei, Taiwan",
        website: "https://www.evaair.com",
        fleet_size: 85,
        destinations: 67,
        logo: "https://example.com/logos/evaair.png",
      },
      MH: {
        name: "Malaysia Airlines",
        country: "Malaysia",
        headquarters: "Kuala Lumpur, Malaysia",
        website: "https://www.malaysiaairlines.com",
        fleet_size: 81,
        destinations: 59,
        logo: "https://example.com/logos/malaysia.png",
      },
      TG: {
        name: "Thai Airways",
        country: "Thailand",
        headquarters: "Bangkok, Thailand",
        website: "https://www.thaiairways.com",
        fleet_size: 82,
        destinations: 84,
        logo: "https://example.com/logos/thai.png",
      },
      SU: {
        name: "Aeroflot",
        country: "Russia",
        headquarters: "Moscow, Russia",
        website: "https://www.aeroflot.ru",
        fleet_size: 186,
        destinations: 146,
        logo: "https://example.com/logos/aeroflot.png",
      },
      OS: {
        name: "Austrian Airlines",
        country: "Austria",
        headquarters: "Vienna, Austria",
        website: "https://www.austrian.com",
        fleet_size: 82,
        destinations: 130,
        logo: "https://example.com/logos/austrian.png",
      },
      LX: {
        name: "Swiss International Air Lines",
        country: "Switzerland",
        headquarters: "Basel, Switzerland",
        website: "https://www.swiss.com",
        fleet_size: 105,
        destinations: 102,
        logo: "https://example.com/logos/swiss.png",
      },
    };

    // Airports data
    this.allAirports = {
      ATL: {
        name: "Hartsfield-Jackson Atlanta International Airport",
        city: "Atlanta",
        state: "Georgia",
        country: "United States",
        website: "https://www.atl.com",
        terminals: 7,
        gates: 192,
        location: { latitude: 33.6407, longitude: -84.4277 },
      },
      LAX: {
        name: "Los Angeles International Airport",
        city: "Los Angeles",
        state: "California",
        country: "United States",
        website: "https://www.flylax.com",
        terminals: 9,
        gates: 146,
        location: { latitude: 33.9416, longitude: -118.4085 },
      },
      ORD: {
        name: "O'Hare International Airport",
        city: "Chicago",
        state: "Illinois",
        country: "United States",
        website: "https://www.flychicago.com/ohare",
        terminals: 4,
        gates: 191,
        location: { latitude: 41.9742, longitude: -87.9073 },
      },
      DFW: {
        name: "Dallas/Fort Worth International Airport",
        city: "Dallas",
        state: "Texas",
        country: "United States",
        website: "https://www.dfwairport.com",
        terminals: 5,
        gates: 165,
        location: { latitude: 32.8998, longitude: -97.0403 },
      },
      DEN: {
        name: "Denver International Airport",
        city: "Denver",
        state: "Colorado",
        country: "United States",
        website: "https://www.flydenver.com",
        terminals: 1,
        gates: 115,
        location: { latitude: 39.8561, longitude: -104.6737 },
      },
      JFK: {
        name: "John F. Kennedy International Airport",
        city: "New York",
        state: "New York",
        country: "United States",
        website: "https://www.jfkairport.com",
        terminals: 6,
        gates: 128,
        location: { latitude: 40.6413, longitude: -73.7781 },
      },
      SFO: {
        name: "San Francisco International Airport",
        city: "San Francisco",
        state: "California",
        country: "United States",
        website: "https://www.flysfo.com",
        terminals: 4,
        gates: 115,
        location: { latitude: 37.7749, longitude: -122.4194 },
      },
      SEA: {
        name: "Seattle-Tacoma International Airport",
        city: "Seattle",
        state: "Washington",
        country: "United States",
        website: "https://www.portseattle.org/sea-tac",
        terminals: 1,
        gates: 90,
        location: { latitude: 47.4502, longitude: -122.3088 },
      },
      LAS: {
        name: "Harry Reid International Airport",
        city: "Las Vegas",
        state: "Nevada",
        country: "United States",
        website: "https://www.harryreidairport.com",
        terminals: 2,
        gates: 110,
        location: { latitude: 36.084, longitude: -115.1537 },
      },
      MCO: {
        name: "Orlando International Airport",
        city: "Orlando",
        state: "Florida",
        country: "United States",
        website: "https://www.orlandoairports.net",
        terminals: 4,
        gates: 129,
        location: { latitude: 28.4312, longitude: -81.3081 },
      },
      MIA: {
        name: "Miami International Airport",
        city: "Miami",
        state: "Florida",
        country: "United States",
        website: "https://www.miami-airport.com",
        terminals: 3,
        gates: 131,
        location: { latitude: 25.7932, longitude: -80.2906 },
      },
      CLT: {
        name: "Charlotte Douglas International Airport",
        city: "Charlotte",
        state: "North Carolina",
        country: "United States",
        website: "https://www.cltairport.com",
        terminals: 1,
        gates: 115,
        location: { latitude: 35.2144, longitude: -80.9473 },
      },
      PHX: {
        name: "Phoenix Sky Harbor International Airport",
        city: "Phoenix",
        state: "Arizona",
        country: "United States",
        website: "https://www.skyharbor.com",
        terminals: 3,
        gates: 120,
        location: { latitude: 33.4352, longitude: -112.0101 },
      },
      IAH: {
        name: "George Bush Intercontinental Airport",
        city: "Houston",
        state: "Texas",
        country: "United States",
        website: "https://www.fly2houston.com",
        terminals: 5,
        gates: 130,
        location: { latitude: 29.9902, longitude: -95.3368 },
      },
      BOS: {
        name: "Boston Logan International Airport",
        city: "Boston",
        state: "Massachusetts",
        country: "United States",
        website: "https://www.massport.com/logan-airport",
        terminals: 4,
        gates: 102,
        location: { latitude: 42.3656, longitude: -71.0096 },
      },
      DTW: {
        name: "Detroit Metropolitan Wayne County Airport",
        city: "Detroit",
        state: "Michigan",
        country: "United States",
        website: "https://www.metroairport.com",
        terminals: 2,
        gates: 129,
        location: { latitude: 42.2162, longitude: -83.3554 },
      },
      MSP: {
        name: "Minneapolis−Saint Paul International Airport",
        city: "Minneapolis",
        state: "Minnesota",
        country: "United States",
        website: "https://www.mspairport.com",
        terminals: 2,
        gates: 131,
        location: { latitude: 44.8848, longitude: -93.2223 },
      },
      LHR: {
        name: "London Heathrow Airport",
        city: "London",
        state: "",
        country: "United Kingdom",
        website: "https://www.heathrow.com",
        terminals: 4,
        gates: 115,
        location: { latitude: 51.47, longitude: -0.4543 },
      },
      CDG: {
        name: "Paris Charles de Gaulle Airport",
        city: "Paris",
        state: "",
        country: "France",
        website: "https://www.parisaeroport.fr",
        terminals: 3,
        gates: 104,
        location: { latitude: 49.0097, longitude: 2.5479 },
      },
      FRA: {
        name: "Frankfurt Airport",
        city: "Frankfurt",
        state: "",
        country: "Germany",
        website: "https://www.frankfurt-airport.com",
        terminals: 2,
        gates: 142,
        location: { latitude: 50.0379, longitude: 8.5622 },
      },
      AMS: {
        name: "Amsterdam Airport Schiphol",
        city: "Amsterdam",
        state: "",
        country: "Netherlands",
        website: "https://www.schiphol.nl",
        terminals: 1,
        gates: 165,
        location: { latitude: 52.3105, longitude: 4.7683 },
      },
      MAD: {
        name: "Adolfo Suárez Madrid–Barajas Airport",
        city: "Madrid",
        state: "",
        country: "Spain",
        website: "https://www.aena.es/en/madrid-barajas-airport",
        terminals: 4,
        gates: 104,
        location: { latitude: 40.4983, longitude: -3.5676 },
      },
      FCO: {
        name: "Leonardo da Vinci–Fiumicino Airport",
        city: "Rome",
        state: "",
        country: "Italy",
        website: "https://www.adr.it/fiumicino",
        terminals: 4,
        gates: 85,
        location: { latitude: 41.8003, longitude: 12.2389 },
      },
      BCN: {
        name: "Barcelona–El Prat Airport",
        city: "Barcelona",
        state: "",
        country: "Spain",
        website: "https://www.aena.es/en/barcelona-airport",
        terminals: 2,
        gates: 67,
        location: { latitude: 41.2974, longitude: 2.0833 },
      },
      LGW: {
        name: "London Gatwick Airport",
        city: "London",
        state: "",
        country: "United Kingdom",
        website: "https://www.gatwickairport.com",
        terminals: 2,
        gates: 66,
        location: { latitude: 51.1537, longitude: -0.1821 },
      },
      MUC: {
        name: "Munich Airport",
        city: "Munich",
        state: "",
        country: "Germany",
        website: "https://www.munich-airport.com",
        terminals: 2,
        gates: 90,
        location: { latitude: 48.3537, longitude: 11.786 },
      },
      IST: {
        name: "Istanbul Airport",
        city: "Istanbul",
        state: "",
        country: "Turkey",
        website: "https://www.istairport.com",
        terminals: 1,
        gates: 143,
        location: { latitude: 41.2608, longitude: 28.7418 },
      },
      SYD: {
        name: "Sydney Airport",
        city: "Sydney",
        state: "New South Wales",
        country: "Australia",
        website: "https://www.sydneyairport.com.au",
        terminals: 3,
        gates: 65,
        location: { latitude: -33.9399, longitude: 151.1753 },
      },
      MEL: {
        name: "Melbourne Airport",
        city: "Melbourne",
        state: "Victoria",
        country: "Australia",
        website: "https://www.melbourneairport.com.au",
        terminals: 4,
        gates: 56,
        location: { latitude: -37.669, longitude: 144.841 },
      },
      HND: {
        name: "Tokyo Haneda Airport",
        city: "Tokyo",
        state: "",
        country: "Japan",
        website: "https://tokyo-haneda.com",
        terminals: 3,
        gates: 114,
        location: { latitude: 35.5494, longitude: 139.7798 },
      },
      NRT: {
        name: "Narita International Airport",
        city: "Tokyo",
        state: "",
        country: "Japan",
        website: "https://www.narita-airport.jp",
        terminals: 3,
        gates: 96,
        location: { latitude: 35.7719, longitude: 140.3929 },
      },
      ICN: {
        name: "Incheon International Airport",
        city: "Seoul",
        state: "",
        country: "South Korea",
        website: "https://www.airport.kr",
        terminals: 2,
        gates: 128,
        location: { latitude: 37.4602, longitude: 126.4407 },
      },
      PEK: {
        name: "Beijing Capital International Airport",
        city: "Beijing",
        state: "",
        country: "China",
        website: "https://www.bcia.com.cn",
        terminals: 3,
        gates: 120,
        location: { latitude: 40.0799, longitude: 116.6031 },
      },
      PVG: {
        name: "Shanghai Pudong International Airport",
        city: "Shanghai",
        state: "",
        country: "China",
        website: "https://www.shanghaiairport.com",
        terminals: 2,
        gates: 98,
        location: { latitude: 31.1443, longitude: 121.8083 },
      },
      HKG: {
        name: "Hong Kong International Airport",
        city: "Hong Kong",
        state: "",
        country: "China",
        website: "https://www.hongkongairport.com",
        terminals: 2,
        gates: 90,
        location: { latitude: 22.308, longitude: 113.9185 },
      },
      SIN: {
        name: "Singapore Changi Airport",
        city: "Singapore",
        state: "",
        country: "Singapore",
        website: "https://www.changiairport.com",
        terminals: 4,
        gates: 140,
        location: { latitude: 1.3644, longitude: 103.9915 },
      },
      BKK: {
        name: "Suvarnabhumi Airport",
        city: "Bangkok",
        state: "",
        country: "Thailand",
        website: "https://www.suvarnabhumiairport.com",
        terminals: 1,
        gates: 107,
        location: { latitude: 13.69, longitude: 100.7501 },
      },
      KUL: {
        name: "Kuala Lumpur International Airport",
        city: "Kuala Lumpur",
        state: "",
        country: "Malaysia",
        website: "https://www.klia.com.my",
        terminals: 2,
        gates: 115,
        location: { latitude: 2.7456, longitude: 101.7099 },
      },
      DEL: {
        name: "Indira Gandhi International Airport",
        city: "Delhi",
        state: "",
        country: "India",
        website: "https://www.newdelhiairport.in",
        terminals: 3,
        gates: 130,
        location: { latitude: 28.5561, longitude: 77.1 },
      },
      BOM: {
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
        state: "",
        country: "India",
        website: "https://www.csmia.aero",
        terminals: 2,
        gates: 78,
        location: { latitude: 19.0896, longitude: 72.8656 },
      },
      DXB: {
        name: "Dubai International Airport",
        city: "Dubai",
        state: "",
        country: "United Arab Emirates",
        website: "https://www.dubaiairports.ae",
        terminals: 3,
        gates: 184,
        location: { latitude: 25.2532, longitude: 55.3657 },
      },
      DOH: {
        name: "Hamad International Airport",
        city: "Doha",
        state: "",
        country: "Qatar",
        website: "https://dohahamadairport.com",
        terminals: 1,
        gates: 140,
        location: { latitude: 25.2609, longitude: 51.6138 },
      },
      AUH: {
        name: "Abu Dhabi International Airport",
        city: "Abu Dhabi",
        state: "",
        country: "United Arab Emirates",
        website: "https://www.abudhabiairport.ae",
        terminals: 3,
        gates: 65,
        location: { latitude: 24.433, longitude: 54.6511 },
      },
      GRU: {
        name: "São Paulo/Guarulhos International Airport",
        city: "São Paulo",
        state: "",
        country: "Brazil",
        website: "https://www.gru.com.br",
        terminals: 3,
        gates: 95,
        location: { latitude: -23.4356, longitude: -46.4731 },
      },
      MEX: {
        name: "Mexico City International Airport",
        city: "Mexico City",
        state: "",
        country: "Mexico",
        website: "https://www.aicm.com.mx",
        terminals: 2,
        gates: 85,
        location: { latitude: 19.4361, longitude: -99.0719 },
      },
      YYZ: {
        name: "Toronto Pearson International Airport",
        city: "Toronto",
        state: "Ontario",
        country: "Canada",
        website: "https://www.torontopearson.com",
        terminals: 2,
        gates: 112,
        location: { latitude: 43.6777, longitude: -79.6248 },
      },
      YVR: {
        name: "Vancouver International Airport",
        city: "Vancouver",
        state: "British Columbia",
        country: "Canada",
        website: "https://www.yvr.ca",
        terminals: 3,
        gates: 80,
        location: { latitude: 49.1967, longitude: -123.1815 },
      },
    };

    this.commonAmenities = [
      "free_wifi",
      "lounges",
      "dining",
      "shopping",
      "charging_stations",
      "duty_free",
      "currency_exchange",
      "rental_cars",
      "prayer_rooms",
      "children_play_areas",
      "pet_relief_areas",
      "smoking_areas",
      "spa_services",
      "showers",
      "medical_services",
    ];

    // Common aircraft types
    this.aircraftTypes = [
      "Boeing 737-800",
      "Boeing 737-900",
      "Boeing 747-400",
      "Boeing 777-200",
      "Boeing 777-300",
      "Boeing 787-8",
      "Boeing 787-9",
      "Boeing 767-300",
      "Boeing 767-400",
      "Airbus A319",
      "Airbus A320",
      "Airbus A321",
      "Airbus A330-200",
      "Airbus A330-300",
      "Airbus A350-900",
      "Airbus A380",
      "Embraer E170",
      "Embraer E190",
    ];
  }

  // Helper methods
  getRandomSample(array, size) {
    const shuffled = [...array];
    this.shuffleArray(shuffled);
    return shuffled.slice(0, size);
  }

  getRandomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  roundToDecimal(value, decimals) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }
}

// Export the function to generate and return flight data
export async function GetFlightData() {
  console.log("Generating synthetic flight data...");
  const generator = new FlightDataGenerator();
  const flightData = generator.generateData();
  console.log("Flight data generation complete!");

  // Print some stats
  const numAirlines = flightData.airlines.length;
  const numAirports = flightData.airports.length;
  const numRoutes = flightData.airlines.reduce(
    (sum, airline) => sum + airline.routes.length,
    0,
  );
  const numPopularRoutes = flightData.popular_routes.length;

  console.log("\nGenerated data includes:");
  console.log(`- ${numAirlines} airlines`);
  console.log(`- ${numAirports} airports`);
  console.log(`- ${numRoutes} airline routes`);
  console.log(`- ${numPopularRoutes} popular routes`);

  return {
    data: flightData,
    updated: new Date().toISOString(),
  };
}

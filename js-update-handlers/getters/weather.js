// Helper function to get random number within a range
function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random float within a range
function getRandomFloatInRange(min, max, decimals = 1) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

// Helper function to determine if a year is a leap year
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Helper function to get the number of days in a month
function getDaysInMonth(month, year) {
  const daysInMonth = {
    1: 31, // January
    2: isLeapYear(year) ? 29 : 28, // February
    3: 31, // March
    4: 30, // April
    5: 31, // May
    6: 30, // June
    7: 31, // July
    8: 31, // August
    9: 30, // September
    10: 31, // October
    11: 30, // November
    12: 31, // December
  };
  return daysInMonth[month];
}

// Define seasons by month - adjusted for more gradual transitions
function getSeasonParameters(month, dayOfMonth, daysInMonth) {
  // Core season months
  if (month === 1 || month === 12) return "deepWinter";
  if (month === 2) return "lateWinter";
  if (month === 3) return "earlySpring";
  if (month === 4 || month === 5) return "spring";
  if (month === 6) return "earlySummer";
  if (month === 7 || month === 8) return "summer";
  if (month === 9) return "earleFall";
  if (month === 10 || month === 11) return "fall";

  // Default fallback
  return "spring";
}

// Weather parameters by season with more refined categories
const weatherParams = {
  deepWinter: {
    lowF: { min: -10, max: 20 },
    highF: { min: 10, max: 35 },
    precipitation: { min: 0, max: 6, probability: 0.4 },
    humidity: { min: 0.2, max: 0.55 },
    wind: { min: 1, max: 12, highProbability: 0.2 },
    forecasts: {
      sunny: 0.15,
      clear: 0.1,
      "partly cloudy": 0.2,
      cloudy: 0.2,
      rain: 0.05,
      snow: 0.2,
      "snow storm": 0.08,
      fog: 0.01,
      thunderstorm: 0.01,
    },
  },
  lateWinter: {
    lowF: { min: -5, max: 25 },
    highF: { min: 20, max: 40 },
    precipitation: { min: 0, max: 5, probability: 0.35 },
    humidity: { min: 0.2, max: 0.5 },
    wind: { min: 1, max: 10, highProbability: 0.2 },
    forecasts: {
      sunny: 0.2,
      clear: 0.1,
      "partly cloudy": 0.2,
      cloudy: 0.2,
      rain: 0.1,
      snow: 0.15,
      "snow storm": 0.03,
      fog: 0.01,
      thunderstorm: 0.01,
    },
  },
  earlySpring: {
    lowF: { min: 25, max: 40 },
    highF: { min: 40, max: 60 },
    precipitation: { min: 0, max: 4, probability: 0.4 },
    humidity: { min: 0.15, max: 0.5 },
    wind: { min: 1, max: 10, highProbability: 0.25 },
    forecasts: {
      sunny: 0.25,
      clear: 0.15,
      "partly cloudy": 0.2,
      cloudy: 0.15,
      rain: 0.15,
      snow: 0.05,
      "snow storm": 0.01,
      fog: 0.02,
      thunderstorm: 0.02,
    },
  },
  spring: {
    lowF: { min: 35, max: 52 },
    highF: { min: 55, max: 76 },
    precipitation: { min: 0, max: 3, probability: 0.35 },
    humidity: { min: 0.15, max: 0.45 },
    wind: { min: 1, max: 9, highProbability: 0.2 },
    forecasts: {
      sunny: 0.3,
      clear: 0.15,
      "partly cloudy": 0.2,
      cloudy: 0.15,
      rain: 0.12,
      snow: 0.02,
      "snow storm": 0,
      fog: 0.02,
      thunderstorm: 0.04,
    },
  },
  earlySummer: {
    lowF: { min: 45, max: 65 },
    highF: { min: 70, max: 90 },
    precipitation: { min: 0, max: 2.5, probability: 0.25 },
    humidity: { min: 0.1, max: 0.4 },
    wind: { min: 1, max: 8, highProbability: 0.15 },
    forecasts: {
      sunny: 0.35,
      clear: 0.2,
      "partly cloudy": 0.15,
      cloudy: 0.1,
      rain: 0.1,
      snow: 0,
      "snow storm": 0,
      fog: 0.02,
      thunderstorm: 0.08,
    },
  },
  summer: {
    lowF: { min: 55, max: 88 },
    highF: { min: 85, max: 104 },
    precipitation: { min: 0, max: 2, probability: 0.15 },
    humidity: { min: 0.1, max: 0.35 },
    wind: { min: 1, max: 7, highProbability: 0.1 },
    forecasts: {
      sunny: 0.45,
      clear: 0.25,
      "partly cloudy": 0.15,
      cloudy: 0.05,
      rain: 0.05,
      snow: 0,
      "snow storm": 0,
      fog: 0.01,
      thunderstorm: 0.04,
    },
  },
  earleFall: {
    lowF: { min: 40, max: 60 },
    highF: { min: 65, max: 80 },
    precipitation: { min: 0, max: 3, probability: 0.25 },
    humidity: { min: 0.15, max: 0.45 },
    wind: { min: 1, max: 8, highProbability: 0.15 },
    forecasts: {
      sunny: 0.3,
      clear: 0.2,
      "partly cloudy": 0.2,
      cloudy: 0.15,
      rain: 0.1,
      snow: 0,
      "snow storm": 0,
      fog: 0.02,
      thunderstorm: 0.03,
    },
  },
  fall: {
    lowF: { min: 25, max: 45 },
    highF: { min: 45, max: 65 },
    precipitation: { min: 0, max: 4, probability: 0.3 },
    humidity: { min: 0.15, max: 0.5 },
    wind: { min: 1, max: 10, highProbability: 0.2 },
    forecasts: {
      sunny: 0.25,
      clear: 0.15,
      "partly cloudy": 0.2,
      cloudy: 0.15,
      rain: 0.15,
      snow: 0.05,
      "snow storm": 0.01,
      fog: 0.02,
      thunderstorm: 0.02,
    },
  },
};

// Function to get a random forecast based on season probabilities
function getRandomForecast(season) {
  const forecasts = weatherParams[season].forecasts;
  const forecastOptions = Object.keys(forecasts);
  const probabilities = Object.values(forecasts);

  let cumulativeProbability = 0;
  const random = Math.random();

  for (let i = 0; i < forecastOptions.length; i++) {
    cumulativeProbability += probabilities[i];
    if (random <= cumulativeProbability) {
      return forecastOptions[i];
    }
  }

  // Default fallback (should rarely happen)
  return "partly cloudy";
}

// Function to smooth transitions between days
function smoothValue(prevValue, targetValue, smoothingFactor) {
  return prevValue + (targetValue - prevValue) * smoothingFactor;
}

// Function to determine if a weather event (cold front, warm front) should occur
function shouldTriggerWeatherEvent(day, month) {
  // Weather events are more common during season transitions
  const isTransitionMonth = [3, 5, 9, 11].includes(month);

  // Base probability
  let probability = 0.03; // 3% chance on a normal day

  // Increase probability during transition months
  if (isTransitionMonth) {
    probability = 0.08; // 8% chance during transition months
  }

  return Math.random() < probability;
}

// Generate weather data for the specified years
export async function GetWeatherData() {
  const weatherData = {};
  const years = [2022, 2023, 2024, 2025];
  const currentDate = new Date();

  // Weather state tracking variables for continuity
  let prevLowF = 30; // Initialize with a reasonable value
  let prevHighF = 45; // Initialize with a reasonable value
  let weatherTrend = 0; // 0 = neutral, positive = warming, negative = cooling
  let weatherEventDuration = 0; // Used to track cold/warm fronts
  let weatherEventIntensity = 0; // How strong the event is
  let prevForecast = "partly cloudy"; // Start with a neutral forecast
  let prevHumidity = 0.3; // Start with a moderate humidity
  let prevWind = 3; // Start with a light wind

  // Continuity settings
  const dayToDay = {
    lowTempContinuity: 0.7, // How much previous day affects today's low temp
    highTempContinuity: 0.6, // How much previous day affects today's high temp
    humidityContinuity: 0.6, // How much previous day affects today's humidity
    windContinuity: 0.5, // How much previous day affects today's wind
  };

  // Year-to-year continuity - carry over end of previous year to start of next
  let yearEndWeather = {
    lowF: null,
    highF: null,
    forecast: null,
    humidity: null,
    wind: null,
  };

  // Loop through each year
  years.forEach((year) => {
    weatherData[year] = {};

    // Determine how many months to generate
    const monthCount = year === 2025 ? currentDate.getMonth() + 1 : 12;

    // If we have data from the previous year's end, use it
    if (yearEndWeather.lowF !== null) {
      prevLowF = yearEndWeather.lowF;
      prevHighF = yearEndWeather.highF;
      prevForecast = yearEndWeather.forecast;
      prevHumidity = yearEndWeather.humidity;
      prevWind = yearEndWeather.wind;
    }

    // Loop through each month
    for (let month = 1; month <= monthCount; month++) {
      weatherData[year][month] = {};

      // Get days in this month
      const daysInMonth = getDaysInMonth(month, year);

      // Determine how many days to generate
      let dayCount = daysInMonth;

      // For current month in 2025, only generate up to current day
      if (year === 2025 && month === currentDate.getMonth() + 1) {
        dayCount = currentDate.getDate();
      }

      // Loop through each day
      for (let day = 1; day <= dayCount; day++) {
        // Get season parameters for this day
        const season = getSeasonParameters(month, day, daysInMonth);
        const params = weatherParams[season];

        // Check for weather events (cold fronts, warm fronts)
        if (
          weatherEventDuration <= 0 &&
          shouldTriggerWeatherEvent(day, month)
        ) {
          // Start a new weather event
          weatherEventDuration = getRandomInRange(2, 5); // Events last 2-5 days

          // Determine if it's warming or cooling trend
          const isWarmingEvent = Math.random() < 0.5;
          weatherEventIntensity = isWarmingEvent
            ? getRandomInRange(5, 15)
            : -getRandomInRange(5, 15);

          weatherTrend = weatherEventIntensity;
        }

        // Apply ongoing weather events
        if (weatherEventDuration > 0) {
          weatherEventDuration--;

          // Weather trends diminish over time
          if (weatherEventDuration === 0) {
            weatherTrend = 0; // Reset trend when event ends
          }
        }

        // Base temperature ranges adjusted by trends
        const baseLowMin = params.lowF.min + weatherTrend;
        const baseLowMax = params.lowF.max + weatherTrend;
        const baseHighMin = params.highF.min + weatherTrend;
        const baseHighMax = params.highF.max + weatherTrend;

        // Generate target temperatures with seasonal parameters
        let targetLowF = getRandomInRange(baseLowMin, baseLowMax);
        let targetHighF = getRandomInRange(
          Math.max(baseHighMin, targetLowF + 10),
          baseHighMax,
        );

        // Apply day-to-day continuity to smooth temperature changes
        let lowF = Math.round(
          smoothValue(prevLowF, targetLowF, dayToDay.lowTempContinuity),
        );
        let highF = Math.round(
          smoothValue(prevHighF, targetHighF, dayToDay.highTempContinuity),
        );

        // Ensure lowF is always less than highF
        if (lowF >= highF) {
          highF = lowF + getRandomInRange(8, 15);
        }

        // Determine forecast - with continuity from previous day
        let forecast;
        if (
          Math.random() < 0.7 &&
          !["snow storm", "thunderstorm", "snow"].includes(prevForecast)
        ) {
          // 70% chance to maintain similar forecast type for continuity
          const forecastGroups = {
            clear: ["clear", "sunny"],
            sunny: ["sunny", "clear"],
            "partly cloudy": ["partly cloudy", "cloudy", "clear"],
            cloudy: ["cloudy", "partly cloudy", "rain"],
            rain: ["rain", "cloudy", "thunderstorm"],
            snow: ["snow", "cloudy", "snow storm"],
            "snow storm": ["snow storm", "snow", "cloudy"],
            fog: ["fog", "cloudy", "partly cloudy"],
            thunderstorm: ["thunderstorm", "rain", "cloudy"],
          };

          // Get similar forecast options based on previous forecast
          const options =
            forecastGroups[prevForecast] || forecastGroups["partly cloudy"];

          // Pick one of the similar forecasts
          forecast = options[Math.floor(Math.random() * options.length)];
        } else {
          // Get a completely new forecast based on season
          forecast = getRandomForecast(season);
        }

        // Generate precipitation based on forecast
        let precipitation = 0;
        if (forecast !== "sunny" && forecast !== "clear") {
          if (Math.random() < params.precipitation.probability) {
            if (forecast === "rain" || forecast === "snow") {
              precipitation = getRandomFloatInRange(
                0.1,
                params.precipitation.max,
              );
            } else if (
              forecast === "snow storm" ||
              forecast === "thunderstorm"
            ) {
              precipitation = getRandomFloatInRange(
                1.5,
                params.precipitation.max,
              );
            } else if (forecast === "cloudy") {
              precipitation =
                Math.random() < 0.3
                  ? getRandomFloatInRange(0.1, params.precipitation.max / 2)
                  : 0;
            } else if (forecast === "partly cloudy") {
              precipitation =
                Math.random() < 0.1
                  ? getRandomFloatInRange(0.1, params.precipitation.max / 3)
                  : 0;
            }
          }
        }

        // Generate target humidity - Provo has generally low humidity
        const baseHumidityMin =
          precipitation > 0
            ? Math.min(0.9, params.humidity.min + 0.1)
            : params.humidity.min;
        const baseHumidityMax =
          precipitation > 0
            ? Math.min(0.9, params.humidity.max + 0.2)
            : params.humidity.max;

        const targetHumidity = getRandomFloatInRange(
          baseHumidityMin,
          baseHumidityMax,
          2,
        );

        // Apply humidity continuity
        let humidity = smoothValue(
          prevHumidity,
          targetHumidity,
          dayToDay.humidityContinuity,
        );

        // Adjust humidity based on precipitation - stronger correlation
        if (precipitation > 0) {
          // Higher precipitation = higher humidity
          const humidityIncrease = Math.min(0.35, precipitation * 0.08);
          humidity = Math.min(0.9, humidity + humidityIncrease);
        }

        // Round humidity to 2 decimal places
        humidity = parseFloat(humidity.toFixed(2));

        // Generate target wind with continuity
        let targetWind;
        if (
          Math.random() < params.wind.highProbability ||
          ["thunderstorm", "snow storm"].includes(forecast)
        ) {
          targetWind = getRandomInRange(5, params.wind.max);
        } else {
          targetWind = getRandomInRange(params.wind.min, 5);
        }

        // Apply wind continuity
        let wind = Math.round(
          smoothValue(prevWind, targetWind, dayToDay.windContinuity),
        );

        // Higher winds during storms
        if (forecast === "snow storm" || forecast === "thunderstorm") {
          wind = Math.max(wind, getRandomInRange(4, params.wind.max));
        }

        // Store the day's weather
        weatherData[year][month][day] = {
          lowF,
          highF,
          precipitation: parseFloat(precipitation.toFixed(1)),
          humidity,
          wind,
          forecast,
        };

        // Update previous values for next day's continuity
        prevLowF = lowF;
        prevHighF = highF;
        prevForecast = forecast;
        prevHumidity = humidity;
        prevWind = wind;

        // If this is the last day of the year, store data for next year's continuity
        if (month === 12 && day === 31) {
          yearEndWeather = {
            lowF,
            highF,
            forecast,
            humidity,
            wind,
          };
        }
      }
    }
  });

  return {
    data: weatherData,
    updated: currentDate.toISOString(),
  };
}

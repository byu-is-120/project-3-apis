import axios from "axios";
import { retrieveApiKeys } from "../utils/aws-secrets.js";

// Load environment variables

let API_KEY = "";
const ZIP_CODE = "84602"; // Provo, UT
// const CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const HISTORICAL_WEATHER_URL =
  "https://api.openweathermap.org/data/3.0/onecall/timemachine";
const GEO_URL = "http://api.openweathermap.org/geo/1.0/zip";

let LAT = null;
let LON = null;

export async function GetWeatherData() {
  try {
    const keys = await retrieveApiKeys();
    API_KEY = keys.OPEN_WEATHER_MAP_API_KEY;

    // Get Coordinates for ZIP code
    [LAT, LON] = await getCoordinatesFromZip(ZIP_CODE);
    console.log(`Retrieved coordinates for ${ZIP_CODE}: ${LAT}, ${LON}`);

    // Get Date Ranges
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Exclude today

    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    // Fetch Weather Data
    return await gatherWeatherData(startDate, endDate);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Get coordinates for ZIP code
async function getCoordinatesFromZip(zip) {
  try {
    const { data } = await axios.get(GEO_URL, {
      params: { zip: `${zip},US`, appid: API_KEY },
    });
    return [data.lat, data.lon];
  } catch (error) {
    console.error(`Error getting coordinates for ZIP ${zip}:`, error.message);
    return [40.2338, -111.6585]; // Default to Provo, UT
  }
}

// Gather Weather Data
async function gatherWeatherData(startDate, endDate) {
  let weatherData = {};

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear().toString();
    const month = currentDate.toLocaleString("en-US", { month: "long" });

    weatherData[year] = {};
    weatherData[year][month] = {};

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Get recent 5 days
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    let dayDate = new Date(today);
    dayDate.setDate(today.getDate() - i);
    const dayYear = dayDate.getFullYear().toString();
    const dayMonth = dayDate.toLocaleString("en-US", { month: "long" });
    const dayDay = dayDate.getDate().toString();

    if (!weatherData[dayYear]) weatherData[dayYear] = {};
    if (!weatherData[dayYear][dayMonth]) weatherData[dayYear][dayMonth] = {};
    if (!weatherData[dayYear][dayMonth][dayDay])
      weatherData[dayYear][dayMonth][dayDay] = {};

    await fetchWeatherForDate(weatherData, dayDate);
  }

  // Get one day per past month (15th)
  let sampleDate = new Date(today.getFullYear(), today.getMonth(), 0);
  while (sampleDate >= startDate) {
    let midMonth = new Date(
      sampleDate.getFullYear(),
      sampleDate.getMonth(),
      15,
    );
    const midMonthYear = midMonth.getFullYear().toString();
    const midMonthMonth = midMonth.toLocaleString("en-US", { month: "long" });
    const midMonthDay = midMonth.getDate().toString();

    if (!weatherData[midMonthYear]) weatherData[midMonthYear] = {};
    if (!weatherData[midMonthYear][midMonthMonth])
      weatherData[midMonthYear][midMonthMonth] = {};
    if (!weatherData[midMonthYear][midMonthMonth][midMonthDay])
      await fetchWeatherForDate(weatherData, midMonth);

    const sampleYear = sampleDate.getFullYear().toString();

    const sampleMonth = sampleDate.toLocaleString("en-US", { month: "long" });
    const sampleDay = sampleDate.getDate().toString();
    weatherData[sampleYear][sampleMonth][sampleDay] = GenerateDataFromSample(
      weatherData[midMonthYear][midMonthMonth][midMonthDay],
      sampleDate.getDate(),
    );

    sampleDate.setDate(sampleDate.getDate() - 1);
  }

  return weatherData;
}

function GenerateDataFromSample(sample, day) {
  // Generate simulated data for a day based on a sample from the same month
  // This provides more realistic data than completely random simulation
  const dayData = { ...sample };

  // Add some daily variation
  const dayFactor = 0.9 + (day / 30) * 0.2; // 0.9-1.1 based on day of month
  const randFactor = Math.random() * 0.1 + 0.95; // 0.95-1.05 random factor

  // Modify temperature values
  if (dayData.lowF) {
    dayData.lowF = Math.round(dayData.lowF * dayFactor * randFactor);
  }
  if (dayData.highF) {
    dayData.highF = Math.round(dayData.highF * dayFactor * randFactor);
  }
  if (dayData.feelsLike) {
    dayData.feelsLike = Math.round(dayData.feelsLike * dayFactor * randFactor);
  }

  // Vary precipitation
  if (dayData.precipitation) {
    const precipFactor = Math.random() * 1.5 + 0.5; // 0.5-2.0
    dayData.precipitation = Math.round(dayData.precipitation * precipFactor);
  }

  // Vary humidity
  if (dayData.humidity) {
    const humidFactor = Math.random() * 0.3 + 0.85; // 0.85-1.15
    dayData.humidity = Math.min(1, Math.round(dayData.humidity * humidFactor));
  }

  // Occasionally change the forecast
  if (Math.random() < 0.3) {
    const forecasts = [
      "clear",
      "partly cloudy",
      "cloudy",
      "rain",
      "snow",
      "thunderstorm",
    ];
    dayData.forecast = forecasts[Math.floor(Math.random() * forecasts.length)];
  }

  // Mark as derived from sample
  dayData.derived = true;

  return dayData;
}

// Fetch weather data for a specific date
async function fetchWeatherForDate(weatherData, date) {
  const year = date.getFullYear().toString();
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate().toString();

  if (!weatherData[year][month][day]) {
    console.log(`Fetching data for ${date.toISOString().split("T")[0]}`);
    weatherData[year][month][day] = await getDayWeather(date);
  }
}

// Fetch weather for a specific day
async function getDayWeather(date) {
  const timestamp = Math.floor(date.getTime() / 1000);
  const params = {
    lat: LAT,
    lon: LON,
    dt: timestamp,
    appid: API_KEY,
    units: "imperial",
  };

  await new Promise((resolve) => setTimeout(resolve, 1200)); // Rate limit

  return await axios
    .get(HISTORICAL_WEATHER_URL, { params })
    .then(parseWeatherData)
    .catch((error) => {
      console.warn(
        `API error for ${date.toISOString().split("T")[0]}:`,
        error.message,
      );
      return simulateWeatherData(date);
    });
}

// Parse historical weather data
function parseWeatherData(data) {
  const weather = data?.data?.[0] || {};
  return {
    lowF: weather.temp?.min || weather.temp,
    highF: weather.temp?.max || weather.temp,
    precipitation: weather.rain?.["1h"] || 0,
    humidity: (weather.humidity || 0) / 100,
    forecast: weather.weather?.[0]?.description || "unknown",
    wind: weather.wind_speed,
    sunrise: weather.sunrise
      ? new Date(weather.sunrise * 1000).toLocaleTimeString()
      : null,
    sunset: weather.sunset
      ? new Date(weather.sunset * 1000).toLocaleTimeString()
      : null,
  };
}

// Simulate weather data (fallback)
function simulateWeatherData() {
  return {
    lowF: Math.floor(Math.random() * 20) + 30,
    highF: Math.floor(Math.random() * 20) + 50,
    precipitation: Math.random() < 0.3 ? Math.random() * 0.5 : 0,
    humidity: Math.random() * 0.5 + 0.3,
    forecast: ["clear", "cloudy", "rain", "snow"][
      Math.floor(Math.random() * 4)
    ],
  };
}

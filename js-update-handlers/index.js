import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  GetFlightData,
  GetWeatherData,
  GetSportsData,
  // GetMusicData,
} from "./getters/index.js";

export async function handler() {
  const [
    flightsData,
    weatherData,
    sportsData,
    // musicData,
  ] = await Promise.all([
    GetFlightData(),
    GetWeatherData(),
    GetSportsData(),
    // GetMusicData(),
  ]);

  const flights = {
    data: flightsData,
    api: "flights-api",
  };

  const weather = {
    data: weatherData,
    api: "weather-api",
  };

  const sports = {
    data: sportsData,
    api: "sports-api",
  };

  // const music = {
  //   data: musicData,
  //   api: "music-api",
  // };

  await Promise.all([
    UploadToS3(flights),
    UploadToS3(weather),
    UploadToS3(sports),
    // UploadToS3(music),
  ]);
}

async function UploadToS3(data) {
  const s3 = new S3Client({ region: "us-west-2" });
  const bucketName = "is120-w25-apis";
  const key = `data/${data.api}/data.json`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: JSON.stringify(data.data),
    ContentType: "application/json",
  });

  try {
    await s3.send(command);
    console.log(`Data uploaded to S3 at ${key}`);
  } catch (error) {
    console.error("Error uploading data to S3:", error);
  }
}

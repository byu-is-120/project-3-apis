import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  GetFlightData,
  GetWeatherData,
  GetSportsData,
  GetMusicData,
} from "./getters/index.js";

export async function handler() {
  await Promise.all([
    GetFlightData().then((data) => UploadToS3(data, "flights-api")),
    GetWeatherData().then((data) => UploadToS3(data, "weather-api")),
    GetSportsData().then((data) => UploadToS3(data, "sports-api")),
    GetMusicData().then((data) => UploadToS3(data, "music-api")),
  ]);
}

async function UploadToS3(data, folder) {
  const s3 = new S3Client({ region: "us-west-2" });
  const bucketName = "is120-w25-apis";
  const key = `data/${folder}/data.json`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: "application/json",
  });

  try {
    await s3.send(command);
    console.log(`Data uploaded to S3 at ${key}`);
  } catch (error) {
    console.error("Error uploading data to S3:", error);
  }
}

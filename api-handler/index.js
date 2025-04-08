import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// WARN: Be careful changing the format of this FILE_KEY line. It'll mess up the deployment.
// You can change the text inside the quotes, but nothing outside the quotes.
// Check out the `sed` command in `./zip.sh` for details.
const FILE_KEY = "data/weather-api/data.json";

const s3 = new S3Client({ region: "us-west-2" });

export async function handler() {
  const getObjectCommand = new GetObjectCommand({
    Bucket: "is120-w25-apis",
    Key: FILE_KEY,
  });

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  };

  try {
    const s3Res = await s3.send(getObjectCommand);
    response.body = await streamToString(s3Res.Body);
  } catch (error) {
    console.error("Error fetching data from S3:", error);
    response.statusCode = 500;
    response.headers["Cache-Control"] = "no-cache";
    response.body = JSON.stringify({
      message: "Error fetching data from S3",
      error: error.message,
    });
  }

  return response;
}

// Helper function to convert a ReadableStream to a string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

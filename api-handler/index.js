import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-west-2" });

export async function handler() {
  const getObjectCommand = new GetObjectCommand({
    Bucket: "is120-w25-apis",
    Key: "data/weather-api/data.json",
  });

  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
  };

  try {
    const s3Res = await s3.send(getObjectCommand);
    response.body = await streamToString(s3Res.Body);
  } catch (error) {
    console.error("Error fetching data from S3:", error);
    response.statusCode = 500;
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

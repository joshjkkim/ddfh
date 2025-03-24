import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(request) {
  // Parse the query parameters from the request URL
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  
  if (!filename) {
    return new Response(JSON.stringify({ error: "Filename is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // Configure the S3 client using environment variables
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Create the command to put an object in your bucket
  const command = new PutObjectCommand({
    Bucket: 'ddfh',
    Key: filename,
    ContentType: "application/octet-stream",
    // Include checksums if required:
    ChecksumCRC32: "AAAAAA==", // Replace with your computed checksum
    ChecksumAlgorithm: "CRC32",
  });

  try {
    // Generate the pre-signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 30 });
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return new Response(JSON.stringify({ error: "Error generating URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import pool from "../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get("shareId");

  if (!shareId) {
    return new Response(JSON.stringify({ error: "Share ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = await pool.connect()

  const results = await client.query(
    `SELECT s3_key FROM file_metadata WHERE share_id = $1`,
    [shareId]
  )

  if(results.rows.length === 0) {
    return new Response(JSON.stringify({ error: "Cannot find any matching Share IDs"}), {
      status: 404,
      headers: {"Content-Type": "application/json"}
    })
  } 

  // Initialize the S3 client using environment variables
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Create a command to get the object from your S3 bucket
  const urlPromises = results.rows.map(async (row) => {
    const filename = row.s3_key;
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: filename,
    });
    // Generate a pre-signed URL valid for 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  });

  const urls = await Promise.all(urlPromises);
  try {
    console.log(urls)
    return new Response(JSON.stringify({ urls }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return new Response(JSON.stringify({ error: "Error generating URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release()
  }
}

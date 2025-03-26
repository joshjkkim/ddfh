import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  const fileSizeParam = searchParams.get("filesize");

  if (!filename) {
    return new Response(JSON.stringify({ error: "Filename is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  if (!fileSizeParam) {
    return new Response(JSON.stringify({ error: "File size is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const fileSize = parseInt(fileSizeParam, 10);
  const MaxFileSize = 5 * 1024 * 1024 * 1024; // 5GB
  if (fileSize > MaxFileSize) {
    return new Response(
      JSON.stringify({ error: "File size exceeds allowed limit" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Configure S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Set up the parameters for pre-signed POST with a content-length-range condition.
  const params = {
    Bucket: process.env.AWS_S3_BUCKET, // your bucket name from env
    Key: filename,
    Conditions: [
      ["content-length-range", 0, MaxFileSize]
    ],
    Expires: 60, // valid for 60 seconds
  };

  try {
    const presignedPost = await createPresignedPost(s3Client, params);
    return new Response(JSON.stringify(presignedPost), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating pre-signed POST:", error);
    return new Response(JSON.stringify({ error: "Error generating URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

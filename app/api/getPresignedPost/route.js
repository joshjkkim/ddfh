import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Helper: Validate PoW using challenge and nonce.
function validateProofOfWork(challenge, nonce, expectedTarget) {
  const hash = crypto.createHash("sha256")
    .update(challenge + nonce)
    .digest("hex");

  // Ensure expectedTarget has the "0x" prefix.
  const formattedTarget = expectedTarget.startsWith("0x") ? expectedTarget : "0x" + expectedTarget;
  
  return BigInt("0x" + hash) <= BigInt(formattedTarget);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let filename = searchParams.get("filename");
  const fileSizeParam = searchParams.get("filesize");
  const fileAmountParam = searchParams.get("fileamount");
  const nonce = searchParams.get("nonce");
  const challenge = searchParams.get("challenge");
  const powToken = searchParams.get("powToken");

  // Validate essential parameters.
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
  if (!nonce || !challenge || !powToken) {
    return new Response(JSON.stringify({ error: "Missing proof-of-work parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let powPayload;
  try {
    // Verify the token. This ensures the challenge and target haven't been tampered with.
    powPayload = jwt.verify(powToken, process.env.POW_SECRET);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid or expired PoW token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ensure the challenge matches the token data.
  if (powPayload.challenge !== challenge) {
    return new Response(JSON.stringify({ error: "Challenge mismatch" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const expectedTarget = powPayload.target;

  // Validate the provided nonce.
  if (!validateProofOfWork(challenge, nonce, expectedTarget)) {
    return new Response(JSON.stringify({ error: "Invalid proof-of-work solution" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sanitize the filename (allow only alphanumerics, dots, underscores, and dashes).
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, "");

  const fileAmount = parseInt(fileAmountParam, 10) || 0;
  let session;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  // Session check: non-logged in users are limited to fewer file uploads.
  if (!token && fileAmount > 4) {
    return new Response(
      JSON.stringify({ error: "No session token found" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  } else if (token) {
    try {
      session = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  if (session && fileAmount > 10) {
    return new Response(
      JSON.stringify({ error: "Cannot upload more than 10 files" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const fileSize = parseInt(fileSizeParam, 10);
  const MaxFileSize = 5 * 1024 * 1024 * 1024; // 5GB
  if (fileSize > MaxFileSize) {
    return new Response(
      JSON.stringify({ error: "File size exceeds allowed limit" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Configure S3 client.
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Set up pre-signed POST parameters.
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: filename,
    Conditions: [
      ["content-length-range", 0, MaxFileSize]
    ],
    Expires: 60, // 60 seconds validity.
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

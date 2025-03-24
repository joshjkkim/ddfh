import { Client } from "pg";
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Helper to generate a unique key for each image upload
const generateKey = (prefix, originalName) => {
  const ext = originalName.split(".").pop();
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
};

export async function PUT(request) {
  try {
    // Parse the form data
    const formData = await request.formData();
    const username = formData.get("username");
    const bio = formData.get("bio") || null;
    
    // Get the token from the request's cookies
    const cookieStore = await cookies();
    const token = await cookieStore.get('token')?.value;
   
    if (!token) {
      return new Response(JSON.stringify({ error: "No session token found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let session;
    try {
      session = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure the token's username matches the username being updated
    if (session.username !== username) {
      return new Response(JSON.stringify({ error: "You can only update your own profile." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Set up S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Connect to Postgres to fetch existing user record
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    // Get current avatar and banner keys (if any)
    const selectQuery = `SELECT avatar_key, banner_key FROM users WHERE username = $1`;
    const selectResult = await client.query(selectQuery, [username]);
    const currentAvatarKey = selectResult.rows[0]?.avatar_key;
    const currentBannerKey = selectResult.rows[0]?.banner_key;

    // Handle file uploads
    let avatarKey = null;
    let bannerKey = null;

    // Handle Avatar Upload
    const avatarFile = formData.get("avatar_img");
    if (avatarFile && typeof avatarFile.arrayBuffer === "function") {
      const avatarFilename = avatarFile.name;
      avatarKey = generateKey(`${username}-avatar`, avatarFilename);
      const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer());
      const putAvatarCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: avatarKey,
        Body: avatarBuffer,
        ContentType: avatarFile.type,
      });
      await s3Client.send(putAvatarCommand);
      
      // Delete old avatar if it exists
      if (currentAvatarKey) {
        const deleteAvatarCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: currentAvatarKey,
        });
        await s3Client.send(deleteAvatarCommand);
      }
    }

    // Handle Banner Upload
    const bannerFile = formData.get("banner_img");
    if (bannerFile && typeof bannerFile.arrayBuffer === "function") {
      const bannerFilename = bannerFile.name;
      bannerKey = generateKey(`${username}-banner`, bannerFilename);
      const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer());
      const putBannerCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: bannerKey,
        Body: bannerBuffer,
        ContentType: bannerFile.type,
      });
      await s3Client.send(putBannerCommand);
      
      // Delete old banner if it exists
      if (currentBannerKey) {
        const deleteBannerCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: currentBannerKey,
        });
        await s3Client.send(deleteBannerCommand);
      }
    }

    // Update the user record in PostgreSQL.
    // Use COALESCE to retain existing values if no new file was uploaded.
    const updateQuery = `
      UPDATE users
      SET bio = $1,
          avatar_key = COALESCE($2, avatar_key),
          banner_key = COALESCE($3, banner_key)
      WHERE username = $4
      RETURNING username, bio, avatar_key, banner_key
    `;
    const values = [bio, avatarKey, bannerKey, username];
    const result = await client.query(updateQuery, values);
    await client.end();

    return new Response(JSON.stringify({ user: result.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

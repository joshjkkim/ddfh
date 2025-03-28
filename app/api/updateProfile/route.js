import pool from '../../lib/db';
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
  const client = await pool.connect(); // initialize client at the start
  try {
    // Parse the form data
    const formData = await request.formData();
    const newUsername = formData.get("newUsername");
    const oldUsername = formData.get("oldUsername");
    const bio = formData.get("bio") || null;
    const instagram = formData.get("instagram") || null;
    const email = formData.get("email") || null;
    const discord = formData.get("discord") || null;
    const youtube = formData.get("youtube") || null;
    const twitter = formData.get("twitter") || null;
    const telegram = formData.get("telegram") || null;
    
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

    // Ensure the token's username matches the oldUsername provided in the form
    if (session.username !== oldUsername) {
      return new Response(JSON.stringify({ error: "You can only update your own profile." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If the username is changing, check for uniqueness
    if (newUsername !== oldUsername) {
      const checkQuery = `SELECT id FROM users WHERE username = $1`;
      const checkResult = await client.query(checkQuery, [newUsername]);
      if (checkResult.rowCount > 0 && checkResult.rows[0].id !== session.id) {
        // A different user already has the new username
        return new Response(
          JSON.stringify({ error: "Username already exists" }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    
    // Set up S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Get current avatar and banner keys for the old username
    const selectQuery = `SELECT avatar_key, banner_key FROM users WHERE username = $1`;
    const selectResult = await client.query(selectQuery, [oldUsername]);
    const currentAvatarKey = selectResult.rows[0]?.avatar_key;
    const currentBannerKey = selectResult.rows[0]?.banner_key;

    // Handle file uploads
    let avatarKey = null;
    let bannerKey = null;

    // Handle Avatar Upload
    const avatarFile = formData.get("avatar_img");
    if (avatarFile && typeof avatarFile.arrayBuffer === "function") {
      const avatarFilename = avatarFile.name;
      // Use the new username for S3 key if changed
      avatarKey = generateKey(`${newUsername}-avatar`, avatarFilename);
      const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer());
      const putAvatarCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: avatarKey,
        Body: avatarBuffer,
        ContentType: avatarFile.type,
      });
      await s3Client.send(putAvatarCommand);
      
      // Delete old avatar if exists
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
      bannerKey = generateKey(`${newUsername}-banner`, bannerFilename);
      const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer());
      const putBannerCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: bannerKey,
        Body: bannerBuffer,
        ContentType: bannerFile.type,
      });
      await s3Client.send(putBannerCommand);
      
      // Delete old banner if exists
      if (currentBannerKey) {
        const deleteBannerCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: currentBannerKey,
        });
        await s3Client.send(deleteBannerCommand);
      }
    }

    // Update the user record in PostgreSQL.
    const updateQuery = `
      UPDATE users
      SET username = $1,
          bio = $2,
          avatar_key = COALESCE($3, avatar_key),
          banner_key = COALESCE($4, banner_key),
          email = $6,
          discord = $7,
          telegram = $8,
          instagram = $9,
          twitter = $10,
          youtube = $11
      WHERE username = $5
      RETURNING username, bio, avatar_key, banner_key
    `;
    const values = [newUsername, bio, avatarKey, bannerKey, oldUsername, email, discord, telegram, instagram, twitter, youtube];
    const result = await client.query(updateQuery, values);
    client.release();

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

import pool from "../../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request, { params }) {
  let { threadTitle } = await params; // threadTitle from URL params
  threadTitle = decodeURIComponent(threadTitle);
  console.log(threadTitle);
  // Parse JSON body for post data
  let { shareableLink, panelKey, description } = await request.json();

  let shareId
  if(shareableLink && panelKey) {
    const url = new URL(shareableLink)
    const pathname = url.pathname; // "/share/4a7vxumwf2z"
    const parts = pathname.split("/"); 
    shareId = parts[2];
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "No session token found" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let session;
  try {
    session = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = await pool.connect();

  try {

    const threadQuery = `
      SELECT id, allowed_roles FROM threads
      WHERE title = $1
    `;
    const threadResult = await client.query(threadQuery, [threadTitle]);
    if (threadResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Thread not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const allowedRoles = threadResult.rows[0].allowed_roles;
    if (!allowedRoles || allowedRoles.length === 0) {
      // If no roles are allowed, perhaps this thread is disabled.
      return new Response(
        JSON.stringify({ error: "Thread not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const userRoleResult = await client.query(
      `SELECT * FROM users WHERE id = $1 AND username = $2`, 
      [session.id, session.username]
    );
    if (userRoleResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!allowedRoles.includes(userRoleResult.rows[0].role)) {
      return new Response(
        JSON.stringify({ error: "You are not authorized to post in this thread." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const threadId = threadResult.rows[0].id;

    // For batch file uploads: if both shareableLink and panelKey are provided,
    // look up all files that match the panelKey.
    let realFiles = [];
    if (shareableLink && panelKey) {
      try {
        // Validate that shareableLink is a valid URL
        new URL(shareableLink);
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid file URL" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      realFiles = await client.query(
        `SELECT id, file_size, s3_key, original_filename FROM file_metadata WHERE panel_key = $1 AND share_id = $2`,
        [panelKey, shareId]
      );
      if (realFiles.rows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Incorrect proof of file ownership" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      // For content-only posts, force both fields to be null
      shareableLink = null;
      panelKey = null;
    }

    // Rate limiting: Ensure user has waited 30 minutes between posts
    const checkQuery = `
      SELECT EXTRACT(EPOCH FROM (NOW() - last_post)) AS time_diff 
      FROM users 
      WHERE id = $1
    `;
    const checkResult = await client.query(checkQuery, [session.id]);
    if (checkResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const timeDiffInSeconds = checkResult.rows[0].time_diff;
    if (timeDiffInSeconds < 1800) {
      return new Response(
        JSON.stringify({ error: "You can only post once every 30 minutes." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    await client.query(`UPDATE users SET last_post = NOW() WHERE id = $1`, [session.id]);

    // Compute total file size for the batch (if batch upload)
    let rows = realFiles.rows || realFiles;
    let totalFileSize = null;
    if (rows.length > 0) {
      totalFileSize = rows.reduce(
        (sum, file) => sum + parseInt(file.file_size, 10),
        0 
      );
    }

    let fileNames = [];
    if (rows.length > 0) {
      fileNames = realFiles.rows.map(file => file.original_filename);
    }
    console.log("File Size", totalFileSize)
    // Insert the post into the posts table.
    // For marketplace posts, is_marketplace is true and file-related fields are provided.
    const insertQuery = `
      INSERT INTO posts 
        (thread_id, author_id, content, is_marketplace, share_file_key, file_size, original_filenames)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, content, created_at
    `;
    const values = [
      threadId,
      session.id,
      description || "",
      true, // is_marketplace flag set to true
      shareableLink, // may be null for content-only posts
      totalFileSize,
      fileNames
    ];
    const result = await client.query(insertQuery, values);

    // Update the user's post count
    await client.query(
      `UPDATE users SET post_count = post_count + 1 WHERE username = $1`,
      [session.username]
    );

    // Return the post along with file details for the batch.
    return new Response(
      JSON.stringify({ 
        post: result.rows[0],
        files: realFiles.rows  // Each row includes id, file_size, s3_key, and original_filename
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating marketplace post:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
}

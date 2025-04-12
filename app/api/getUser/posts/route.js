// /app/api/user/[username]/posts/route.js
import pool from "../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

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

  // Create and connect the PostgreSQL client.
  const client = await pool.connect();

  try {
    // First, get the user's id based on the username.
    const userQuery = "SELECT id FROM users WHERE username = $1";
    const userResult = await client.query(userQuery, [username]);
    if (userResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = userResult.rows[0].id;

    // Now, get all posts authored by this user.
    const postsQuery = `
      SELECT p.id, p.thread_id, p.content, p.created_at, p.updated_at, p.is_marketplace, p.share_file_key, p.parent_post_id,
             u.username AS author_username
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.author_id = $1
      ORDER BY p.created_at DESC
    `;
    const postsResult = await client.query(postsQuery, [userId]);

    return new Response(JSON.stringify(postsResult.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user's posts:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

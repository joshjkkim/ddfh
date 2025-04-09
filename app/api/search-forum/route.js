import pool from "../../lib/db";
import { cookies } from 'next/headers';
import jwt from "jsonwebtoken";
import crypto from "crypto";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  // Enforce a maximum length for search queries
  if (search.length > 100) {
    return new Response(JSON.stringify({ error: "Request is too long, 100 characters max" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  const client = await pool.connect();

  try {
    const query = `
        SELECT *
        FROM posts
        WHERE content ILIKE '%' || $1 || '%'
        AND is_marketplace = true
        ORDER BY created_at DESC
        LIMIT 50
    `;
    const result = await client.query(query, [search]);

    await client.release();
    return new Response(JSON.stringify({ posts: result.rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    await client.release();
    console.error("Error querying posts:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch posts" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// /app/api/user/[username]/posts/route.js
import { Client } from "pg";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

  // Create and connect the PostgreSQL client.
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

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
    await client.end();
  }
}

// /app/api/thread/route.js
import pool from "../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = decodeURIComponent(searchParams.get("title"));
  
  if (!title) {
    return new Response(JSON.stringify({ error: "No title provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = await pool.connect();

  try {
    // Query thread data based on the title (ensure titles/slugs are unique)
    const threadQuery = `
      SELECT t.id, t.title, t.description, t.created_at, u.username AS created_by_username, u.avatar_key AS created_by_username_pfp
      FROM threads t
      JOIN users u ON t.created_by = u.id
      WHERE t.title = $1
    `;
    const threadResult = await client.query(threadQuery, [title]);
    if (threadResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const thread = threadResult.rows[0];

    // Query posts for this thread
    const postsQuery = `
      SELECT p.id, p.content, p.created_at, p.updated_at, p.share_file_key, u.username AS author_username, u.avatar_key AS author_pfp
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.thread_id = $1 AND p.is_marketplace = TRUE
      ORDER BY p.updated_at DESC
    `;
    const postsResult = await client.query(postsQuery, [thread.id]);
    const posts = postsResult.rows;

    return new Response(JSON.stringify({ thread, posts }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

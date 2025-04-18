// /app/api/thread/[threadTitle]/[postId]/route.js
import pool from "../../../../lib/db";

export async function GET(request, { params }) {
  const { threadTitle, postId } = await params;

  const client = await pool.connect();

  try {
    // Query for the post details using postId.
    const postQuery = `
      SELECT p.id, p.thread_id, p.content, p.title, p.created_at, p.share_file_key, p.file_size, p.author_id, p.original_filenames, u.username AS author_username, u.avatar_key AS author_pfp
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = $1 AND p.is_marketplace = TRUE
    `;
    const postResult = await client.query(postQuery, [postId]);
    if (postResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const post = postResult.rows[0];

    // Optionally, if you have threaded replies, fetch replies to this post.
    const repliesQuery = `
      SELECT p.id, p.content, p.created_at, p.author_id, u.username AS author_username, u.avatar_key AS author_pfp
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.parent_post_id = $1
      ORDER BY p.created_at ASC
    `;
    const repliesResult = await client.query(repliesQuery, [postId]);
    const replies = repliesResult.rows;

    return new Response(JSON.stringify({ post, replies }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching post info:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

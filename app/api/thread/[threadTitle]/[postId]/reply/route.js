// /app/api/thread/[threadTitle]/[postId]/reply/route.js
import pool from "../../../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request, { params }) {
  const { threadTitle, postId } = params;

  // Parse JSON body for reply content
  const { content } = await request.json();
  if (!content) {
    return new Response(JSON.stringify({ error: "Reply content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the session token from cookies
  const cookieStore = await cookies();
  const token = await cookieStore.get("token")?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "No session token found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify token (assuming it includes user.id and user.username)
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
    // Ensure the parent post exists and get its thread_id.
    const parentQuery = `SELECT thread_id FROM posts WHERE id = $1`;
    const parentResult = await client.query(parentQuery, [postId]);
    if (parentResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Parent post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const threadId = parentResult.rows[0].thread_id;

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
    
    // If the time difference is less than 30 minutes (1800 seconds), return an error
    if (timeDiffInSeconds < 1800) {
      return new Response(
        JSON.stringify({ error: "You can only post once every 30 minutes." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert the reply into the posts table.
    // Here, parent_post_id is set to postId to link the reply to the parent.
    const insertQuery = `
      INSERT INTO posts (thread_id, author_id, content, parent_post_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, created_at
    `;
    const values = [threadId, session.id, content, postId];
    const result = await client.query(insertQuery, values);

    // Update the parent's updated_at field to NOW() to indicate new activity.
    const updateParentQuery = `UPDATE posts SET updated_at = NOW() WHERE id = $1`;
    await client.query(updateParentQuery, [postId]);

    const updatePostAuthor = `UPDATE users SET last_post = NOW() WHERE id = $1`;
    await client.query(updatePostAuthor, [session.id]);

    return new Response(JSON.stringify({ reply: result.rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating reply:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

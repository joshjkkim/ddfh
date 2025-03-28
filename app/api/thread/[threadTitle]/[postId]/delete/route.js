// /app/thread/[threadTitle]/[postId]/delete/route.js
import pool from "../../../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function DELETE(request, { params } ) {
    const { threadTitle, postId } = params;

  // Retrieve the session token from cookies
  const cookieStore = cookies();
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

  const client = await pool.connect()

  try {
    // Check if the post exists and retrieve its author_id
    const selectQuery = `SELECT author_id FROM posts WHERE id = $1`;
    const selectResult = await client.query(selectQuery, [postId]);
    if (selectResult.rowCount === 0) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const selectRole = await client.query(
      `SELECT * FROM users WHERE id = $1 AND username = $2`, [session.id, session.username]
    )

    const postAuthorId = selectResult.rows[0].author_id.toString();

    // Ensure the session's user is the owner of the post
    if (session.id.toString() !== postAuthorId && selectRole.rows[0].role !== "moderator" && selectRole.rows[0].role !== "admin") {
      return new Response(
        JSON.stringify({ error: "You can only delete your own posts." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete the post from the database
    const deleteQuery = `DELETE FROM posts WHERE id = $1 RETURNING *`;
    const deleteResult = await client.query(deleteQuery, [postId]);

    return new Response(
      JSON.stringify({
        message: "Post deleted successfully.",
        deletedPost: deleteResult.rows[0],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting post:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await client.release();
  }
}

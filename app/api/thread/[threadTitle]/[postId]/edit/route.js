import { Client } from "pg";
import { cookies } from 'next/headers';
import jwt from "jsonwebtoken";

export async function PUT(request, { params } ) {
      const formStuff = await request.formData();
      const postId = formStuff.get("id");
      const formData = formStuff.get("content")
    
      // Retrieve the session token from cookies
      const cookieStore = await cookies();
      const token = await cookieStore.get("token")?.value;
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
    
      // Connect to PostgreSQL
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
    
      try {
        // Check if the post exists and retrieve its author_id
        const selectQuery = `SELECT author_id, id FROM posts WHERE id = $1`;
        const selectResult = await client.query(selectQuery, [postId]);
        if (selectResult.rowCount === 0) {
          return new Response(
            JSON.stringify({ error: "Post not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        const postAuthorId = selectResult.rows[0].author_id.toString();
    
        // Ensure the session's user is the owner of the post
        if (session.id.toString() !== postAuthorId) {
          return new Response(
            JSON.stringify({ error: "You can only edit your own posts." }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }

        // Delete the post from the database
        const updateQuery = `
            UPDATE posts
            SET content = $1
            WHERE id = $2
            RETURNING content
        `;
        const values = [formData, postId];
        const result = await client.query(updateQuery, values);
    
        return new Response(
          JSON.stringify({
            message: "Post edited successfully.",
            deletedPost: result.rows[0],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error editing post:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      } finally {
        await client.end();
      }
    }
    
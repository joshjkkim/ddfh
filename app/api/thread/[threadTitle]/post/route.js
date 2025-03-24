// /app/thread/[threadTitle]/post/route.js
import { Client } from "pg";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request, { params }) {
  const { threadTitle } = await params; // Get threadTitle from URL params

  // Parse JSON body for marketplace post data
  const { shareableLink, panelKey, description } = await request.json();

  const url = new URL(shareableLink);
  const fileName = url.searchParams.get("filename");

  // Get session token from cookies
  const cookieStore = await cookies();
  const token = await cookieStore.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "No session token found" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Verify token (assuming it contains user.id and user.username)
  let session;
  try {
    session = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Connect to PostgreSQL
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    // Look up the thread by title (ensure titles or slugs are unique)
    const threadQuery = `
      SELECT id FROM threads
      WHERE title = $1
    `;
    const threadResult = await client.query(threadQuery, [threadTitle]);
    if (threadResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Thread not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const threadId = threadResult.rows[0].id;

    const realFile = await client.query(
      `SELECT id, file_size FROM file_metadata WHERE s3_key = $1 AND panel_key = $2`,
      [fileName, panelKey]
    )

    if (realFile.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Incorrect proof of file ownership" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    const updatePostAuthor = `UPDATE users SET last_post = NOW() WHERE id = $1`;
    await client.query(updatePostAuthor, [session.id]);


    // Insert the marketplace post into the posts table
    // Assuming your posts table has columns: thread_id, author_id, content, is_marketplace, share_file_key, panel_key
    const insertQuery = `
      INSERT INTO posts 
        (thread_id, author_id, content, is_marketplace, share_file_key, file_size)
      VALUES 
        ($1, $2, $3, $4, $5, $6)
      RETURNING id, content, created_at
    `;
    const values = [
      threadId,
      session.id,
      description || "",
      true, // is_marketplace is true for market posts
      shareableLink,
      realFile.rows[0].file_size
    ];
    const result = await client.query(insertQuery, values);

    await client.query(
      `UPDATE users
       SET post_count = post_count + 1
       WHERE username = $1`,
      [session.username]
    );

    return new Response(
      JSON.stringify({ post: result.rows[0] }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating marketplace post:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    await client.end();
  }
}

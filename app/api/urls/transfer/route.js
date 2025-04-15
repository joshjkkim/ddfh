import pool from "../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
  const body = await request.json();
  const recipient = body.recipient;
  const shortUrlKey = body.shorturlkey;

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
    // Verify that the current session is the owner of the short URL
    const isOwner = await client.query(
      `SELECT id FROM shortened_urls WHERE owner_id = $1 AND short_url_key = $2`,
      [session.id, shortUrlKey]
    );

    if (isOwner.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Only the owner of this short URL key can transfer it" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check the time difference since the link was last updated (1 hour required)
    const checkQuery = `
      SELECT EXTRACT(EPOCH FROM (NOW() - updated_at)) AS time_diff 
      FROM shortened_urls 
      WHERE short_url_key = $1
    `;
    const checkResult = await client.query(checkQuery, [shortUrlKey]);
    if (checkResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Shortened key not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const timeDiffInSeconds = checkResult.rows[0].time_diff;
    if (timeDiffInSeconds < 3600) {  // 3600 seconds = 1 hour
      return new Response(
        JSON.stringify({ error: "You can only update this link once an hour" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const recipientQuery = `SELECT id FROM users WHERE username = $1`;
    const recipientResult = await client.query(recipientQuery, [recipient]);
    if (recipientResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Recipient user not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const recipientId = recipientResult.rows[0].id;

    // Update the updated_at timestamp to NOW()
    await client.query(
      `UPDATE shortened_urls SET updated_at = NOW() WHERE short_url_key = $1`,
      [shortUrlKey]
    );

    // Lookup the recipient's id from the users table using their username
    

    // Update the owner_id for the shortened URL to the recipient's id
    await client.query(
      `UPDATE shortened_urls SET owner_id = $1 WHERE short_url_key = $2`,
      [recipientId, shortUrlKey]
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error transferring ownership:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
}

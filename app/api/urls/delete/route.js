import pool from "../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
  const body = await request.json();
  const confirm = body.confirm
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

  if(confirm !== shortUrlKey) {
    return new Response(
        JSON.stringify({ error: "Confirmation Invalid" }),
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
        JSON.stringify({ error: "Only the owner of this short URL key can delete it" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    await client.query(
        `DELETE FROM shortened_urls WHERE short_url_key = $1`,
        [shortUrlKey]
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting key:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
}

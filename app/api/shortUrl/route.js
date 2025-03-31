import pool from "../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
  const body = await request.json();
  const fullLink = body.fullLink;
  const shortUrlKey = body.shortUrlKey;
  const shareId = body.shareId

  console.log(shareId)
  const client = await pool.connect();

  try {

    const customCheckQuery = `SELECT id FROM shortened_urls WHERE short_url_key = $1`;
    const customCheckResult = await client.query(customCheckQuery, [shortUrlKey]);
    if (customCheckResult.rowCount > 0) {
      await client.release();
      return new Response(
        JSON.stringify({ error: "Custom URL key already taken" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const uniqueUrl = await client.query(
      `SELECT * FROM shortened_urls WHERE full_link = $1`, [fullLink]
    )

    if (uniqueUrl.rowCount > 0) {
      await client.release();
      return new Response(
        JSON.stringify({ error: "Shortened URL already made for this link!" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const insertQuery = `
      INSERT INTO shortened_urls (short_url_key, share_id, full_link)
      VALUES (
        $1,
        $2,
        $3
      )
      RETURNING short_url_key
    `;
    const res = await client.query(insertQuery, [shortUrlKey, shareId, fullLink]);
    await client.release();
    return new Response(
      JSON.stringify({ shortUrlKey: res.rows[0].short_url_key }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    await client.release();
    console.error("DB Insert Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

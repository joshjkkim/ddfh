
import pool from "../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const cookieStore = await cookies();
  const token = await cookieStore.get('token')?.value;
  
  if (!token) {
    return new Response(JSON.stringify({ error: "No session token found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

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
    const userQuery = "SELECT id FROM users WHERE id = $1";
    const userResult = await client.query(userQuery, [id]);
    if (userResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = userResult.rows[0].id;

    // Now, get all posts authored by this user.
    const reputationQuery = `
    SELECT 
      r.id, 
      r.receiver_id, 
      u_receiver.username AS receiver_username, 
      r.giver_id, 
      u_giver.username AS giver_username, 
      r.amount, 
      r.message, 
      r.date_given
    FROM reputation r
    JOIN users u_receiver ON r.receiver_id = u_receiver.id
    JOIN users u_giver ON r.giver_id = u_giver.id
    WHERE r.receiver_id = $1
    ORDER BY r.date_given DESC
  `;

    const reputationResult = await client.query(reputationQuery, [userId]);

    return new Response(JSON.stringify(reputationResult.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user's reputation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

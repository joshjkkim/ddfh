import pool from "../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
const body = await request.json();

if (!body.recipient || !body.giver) {
    return new Response(JSON.stringify({ error: "recipient and giver are required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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

    if(session.username !== body.giver) {
        return new Response(
            JSON.stringify({ error: "You can only delete your own reputation you give" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
        );
    }

    const client = await pool.connect();
  
  try {
    const recip = await client.query(
      `SELECT id, username FROM users WHERE username = $1`,
      
      [body.recipient]
    );

    if (recip.rowCount === 0) {
      return new Response(JSON.stringify({ error: "No user found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const amount = await client.query(
        `DELETE FROM reputation WHERE receiver_id = $1 AND giver_id = $2 RETURNING amount`,
        [recip.rows[0].id, session.id]
    );

    await client.query(
        `UPDATE users SET reputation = reputation - $2 WHERE id = $1`,
        [recip.rows[0].id, amount.rows[0].amount]
    )

    return new Response(JSON.stringify({
        status: 200,
        headers: { "Content-Type": "application/json" },
    }));

  } catch (err) {
    console.error("Error fetching metadata:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

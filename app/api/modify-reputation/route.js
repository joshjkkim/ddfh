import pool from "../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
const body = await request.json();

if (!body.recipient || !body.reputation || !body.message) {
    return new Response(JSON.stringify({ error: "recipient, reputation, and message are required." }), {
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

    if(session.username == body.recipient) {
        return new Response(
            JSON.stringify({ error: "You cannot modify your own reputation" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
        );
    }

    const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT id, username FROM users WHERE username = $1`,
      
      [body.recipient]
    );

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "No user found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const alreadyGiven = await client.query(
        `SELECT * FROM reputation WHERE giver_id = $1 AND receiver_id = $2`,
        
        [session.id, result.rows[0].id]
    );

    if (alreadyGiven.rowCount !== 0) {
    return new Response(JSON.stringify({ error: "You cannot add reputation for a user twice" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
    });
    }

    const correctAmount = await client.query(
        `SELECT role FROM users WHERE username = $1`,
        
        [session.username]
    );

    if(correctAmount.rows[0].role == "user" && Math.abs(body.reputation) !== 1) {
        return new Response(JSON.stringify({ error: "Incorrect reputation amount" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    } else if (correctAmount.rows[0].role == "moderator" && Math.abs(body.reputation) !== 2) {
        return new Response(JSON.stringify({ error: "Incorrect reputation amount" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    } else if (correctAmount.rows[0].role == "admin" && Math.abs(body.reputation) !== 3) {
        return new Response(JSON.stringify({ error: "Incorrect reputation amount" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }

    await client.query(
        `UPDATE users
         SET reputation = reputation + $2
         WHERE username = $1`,
        [body.recipient, body.reputation]
    );

    const res = await client.query(
        `INSERT INTO reputation (receiver_id, giver_id, amount, message)
         VALUES ($1, $2, $3, $4)
         RETURNING receiver_id`,
        [result.rows[0].id, session.id, body.reputation, body.message]
    );

    return new Response(JSON.stringify({ id: res.rows[0].receiver_id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });

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

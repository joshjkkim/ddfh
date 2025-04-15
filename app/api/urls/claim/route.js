import pool from "../../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
    
    const body = await request.json();
    const client = await pool.connect();


    try {

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


    const validKeyRegex = /^[a-zA-Z0-9]{1,16}$/;

    if (!validKeyRegex.test(body.key)) {
        return new Response(JSON.stringify({ error: "Key must be 1-16 characters long and contain only letters and numbers." }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }

    const result = await client.query(
        `SELECT id FROM shortened_urls WHERE short_url_key = $1`,
        [body.key]
    )

    if (result.rows.length > 0) {
        return new Response(JSON.stringify({ error: "Key already taken" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }

    const isMaxed = await client.query(
        `SELECT role, num_short_keys FROM users WHERE id = $1`,
        [session.id]
    )

    if (isMaxed.rows[0].role === "user" && isMaxed.rows[0].num_short_keys >= 3) {
        return new Response(JSON.stringify({ error: "You have maxed your amount of preclaims for your account" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    } else if (isMaxed.rows[0].role === "moderator" && isMaxed.rows[0].num_short_keys >= 5) {
        return new Response(JSON.stringify({ error: "You have maxed your amount of preclaims for your account" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    } else if (isMaxed.rows[0].role === "admin" && isMaxed.rows[0].num_short_keys >= 10) {
        return new Response(JSON.stringify({ error: "You have maxed your amount of preclaims for your account" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }

    const update = await client.query(
        `UPDATE users
         SET num_short_keys = num_short_keys + 1
         WHERE id = $1`,
        [session.id]
    );

    const res = await client.query(
        `INSERT INTO shortened_urls (short_url_key, preclaimed, preclaimer_id, owner_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          body.key,
          true,
          session.id,
          session.id
        ]
    );
    await client.release();
    return new Response(JSON.stringify({ id: res.rows[0].id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    } catch (err) {
        await client.release();
        console.error("DB Insert Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
        });
    }
}
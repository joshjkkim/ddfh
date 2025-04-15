import pool from "../../lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(request) {

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

    const client = await pool.connect()

    try {
        const result = await client.query(
            "SELECT short_url_key, full_link, created_at, updated_at, preclaimed FROM shortened_urls WHERE owner_id = $1",
            [session.id]
        );
    
        if (result.rowCount === 0) {
            return new Response(
            JSON.stringify({ error: "Shortened URL Info not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }
    
        return new Response(
            JSON.stringify(result.rows),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Error fetching user:", err);
        return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
        );
    } finally {
        await client.release();
    }
}

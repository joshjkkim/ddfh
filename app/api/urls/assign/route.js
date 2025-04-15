import pool from "../../../lib/db"
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
    const body = await request.json();
    const shareableLink = body.fullLink;
    const panelKey = body.panelKey;
    const shortUrlKey = body.shorturlkey

    let shareId
    const url = new URL(shareableLink)
    if (url.hostname !== "ddfh.org" || url.protocol !== "https:") {
        return new Response(
          JSON.stringify({ error: "Invalid link. Only https://ddfh.org links are allowed." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const pathname = url.pathname; // "/share/4a7vxumwf2z"
    const parts = pathname.split("/"); 
    shareId = parts[2];

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

        const isOwner = await client.query(
            `SELECT id FROM shortened_urls WHERE owner_id = $1 AND short_url_key = $2`,
            [session.id, shortUrlKey]
        )

        if(isOwner.rows.length === 0) {
            return new Response(
                JSON.stringify({ error: "Only the owner of this short url key can assign it" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        const exists = await client.query(
            `SELECT id FROM file_metadata WHERE share_id = $1 AND panel_key = $2`,
            [shareId, panelKey]
        )

        if(exists.rows.length === 0) {
            return new Response(
                JSON.stringify({ error: "Panel Key invalid OR Link does not exist" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }
        // Rate limiting: Ensure user has waited 30 minutes between posts
        const checkQuery = `
        SELECT EXTRACT(EPOCH FROM (NOW() - updated_at)) AS time_diff 
        FROM shortened_urls 
        WHERE short_url_key = $1
        `;
        const checkResult = await client.query(checkQuery, [shortUrlKey]);
        if (checkResult.rows.length === 0) {
            return new Response(
                JSON.stringify({ error: "Shortened Key not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }
        const timeDiffInSeconds = checkResult.rows[0].time_diff;
        if (timeDiffInSeconds < 3600) {
            return new Response(
                JSON.stringify({ error: "You can only reassign this link once an hour" }),
                { status: 403, headers: { "Content-Type": "application/json" } }
            );
        }
        await client.query(`UPDATE shortened_urls SET updated_at = NOW() WHERE short_url_key = $1`, [shortUrlKey]);
        // Update the user's post count
        await client.query(
        `UPDATE shortened_urls SET full_link = $1 WHERE short_url_key = $2`,
        [shareableLink, shortUrlKey]
        );

        return new Response(
        { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error creating marketplace post:", error);
        return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
        );
    } finally {
        client.release();
    }
}

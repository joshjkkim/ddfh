import pool from "../../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || null;
  const shareId = searchParams.get("shareId") || null;

  if (!id || !shareId) {
    return new Response(
      JSON.stringify({ error: "user id and shareId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = await pool.connect()

  try {
    const result = await client.query(
    "SELECT id FROM shortened_urls WHERE owner_id = $1 AND share_id = $2",
    [id, shareId]
    );

    if (result.rowCount === 0) {
    return new Response(
        JSON.stringify({ error: "id is not the owner id" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
    );
    }

    const userRes = await client.query(
    `SELECT username FROM users WHERE id = $1`,
    [id]
    );
    
    if (userRes.rowCount === 0) {
    return new Response(
        JSON.stringify({ error: "Owner not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
    );
    }
    
    const username = userRes.rows[0].username;
    return new Response(
    JSON.stringify({ username }),
    { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Error fetching owner:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await client.release();
  }
}

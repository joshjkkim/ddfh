// /app/api/getFileMetadata/route.js
import pool from "../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const panelKey = searchParams.get("panelKey");

  if (!panelKey) {
    return new Response(JSON.stringify({ error: "panelKey is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = await pool.connect();

  try {
    
    const result = await client.query(
      `SELECT * FROM file_metadata WHERE panel_key = $1`,
      [panelKey]
    );

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "No metadata found for the provided credentials." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const metadata = result.rows[0];
    return new Response(JSON.stringify(metadata), {
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

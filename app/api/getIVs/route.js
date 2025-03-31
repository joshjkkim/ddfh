import pool from "../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get("shareId")

  if (!shareId) {
    return new Response(
      JSON.stringify({ error: "shareId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = await pool.connect()

  try {
    const result = await client.query(
    "SELECT iv, s3_key FROM file_metadata WHERE share_id = $1",
    [shareId]
    );

    if (result.rowCount === 0) {
        return new Response(
            JSON.stringify({ error: "Files not found" }),
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

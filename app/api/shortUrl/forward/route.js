import pool from "../../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shortUrlKey = searchParams.get("shorturlkey")

  if (!shortUrlKey) {
    return new Response(
      JSON.stringify({ error: "short url key is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = await pool.connect()

  try {
      const result = await client.query(
        "SELECT full_link FROM shortened_urls WHERE short_url_key = $1",
        [shortUrlKey]
      );
  
      if (result.rowCount === 0) {
        return new Response(
          JSON.stringify({ error: "Link not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
  
      return new Response(
        JSON.stringify(result.rows[0]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
  } catch (err) {
    console.error("Error fetching shortened url:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await client.release();
  }
}

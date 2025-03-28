import pool from "../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  // Enforce a maximum length for search queries
  if (search.length > 100) {
    return new Response(JSON.stringify({ error: "Request is too long, 100 characters max" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = await pool.connect();

  try {
    const query = `
        SELECT *
        FROM posts
        WHERE content ILIKE '%' || $1 || '%'
        AND is_marketplace = true
        ORDER BY created_at DESC
        LIMIT 50
    `;
    const result = await client.query(query, [search]);

    await client.release();
    return new Response(JSON.stringify({ posts: result.rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    await client.release();
    console.error("Error querying posts:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch posts" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

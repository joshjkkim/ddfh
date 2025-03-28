// /app/api/threads/route.js
import pool from "../../lib/db";

export async function GET(request) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT t.id, t.title, t.description, t.created_at, t.updated_at, u.username AS created_by_username
      FROM threads t
      JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at ASC
    `);
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching threads:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await client.release();
  }
}

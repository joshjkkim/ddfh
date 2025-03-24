// /app/api/threads/route.js
import { Client } from "pg";

export async function GET(request) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const result = await client.query(`
      SELECT t.id, t.title, t.description, t.created_at, t.updated_at, u.username AS created_by_username
      FROM threads t
      JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
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
    await client.end();
  }
}

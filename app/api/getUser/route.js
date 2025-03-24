import { Client } from 'pg';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return new Response(
      JSON.stringify({ error: "username is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(
      "SELECT username, role, created_at, reputation, post_count, bio, avatar_key, id, banner_key FROM users WHERE username = $1",
      [username]
    );

    if (result.rowCount === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result.rows[0]),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error fetching user:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await client.end();
  }
}

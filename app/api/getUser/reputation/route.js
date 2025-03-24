
import { Client } from "pg";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const userQuery = "SELECT id FROM users WHERE username = $1";
    const userResult = await client.query(userQuery, [username]);
    if (userResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = userResult.rows[0].id;

    // Now, get all posts authored by this user.
    const reputationQuery = `
      SELECT p.id, p.receiver_id, p.receiver_username, p.giver_id, p.giver_username, p.amount, p.message, p.date_given
      FROM reputation p
      WHERE p.receiver_id = $1
      ORDER BY p.date_given DESC
    `;
    const reputationResult = await client.query(reputationQuery, [userId]);

    return new Response(JSON.stringify(reputationResult.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user's reputation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.end();
  }
}

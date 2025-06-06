import pool from "../../lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") || null;
  const id = searchParams.get("id") || null;

  if (!username && !id) {
    return new Response(
      JSON.stringify({ error: "username or id is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = await pool.connect()

  try {
    if(!id) {
      const result = await client.query(
        "SELECT username, role, created_at, reputation, post_count, bio, avatar_key, id, banner_key, email, discord, twitter, instagram, telegram, youtube, num_short_keys, last_online FROM users WHERE username = $1",
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
    } else {
        const result = await client.query(
          "SELECT username, role, created_at, reputation, post_count, bio, avatar_key, id, banner_key, email, discord, twitter, instagram, telegram, youtube FROM users WHERE id = $1",
          [id]
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
    }
    
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

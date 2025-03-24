import { Client } from 'pg';
import bcrypt from 'bcrypt';

export async function POST(request) {
const body = await request.json();

  if (!body.username || !body.password || !body.inviteCode) {
    return new Response(JSON.stringify({ error: "username, password, and invite code are required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT * FROM security_codes WHERE code = $1 AND used = false`,
      
      [body.inviteCode]
    );

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "No code found for the provided invite code." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userMade = await client.query(
        `SELECT * FROM users WHERE username = $1`,
        
        [body.username]
      );
  
      if (userMade.rowCount !== 0) {
        return new Response(JSON.stringify({ error: "Username already taken" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(body.password, saltRounds);

    await client.query(
        `UPDATE security_codes
         SET used = true,
             used_by = $2
         WHERE code = $1`,
        [body.inviteCode, body.username]
    );



    const res = await client.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id`,
        [body.username, passwordHash]
    );

    return new Response(JSON.stringify({ id: res.rows[0].id }), {
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
    await client.end();
  }
}

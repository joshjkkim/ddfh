// /app/api/login/route.js
import { Client } from "pg";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'

export async function POST(request) {
    const body = await request.json();
    const username = body.username
    const password = body.password


  if (!username || !password) {
    return new Response(
      JSON.stringify({ error: "Username and password are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const res = await client.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (res.rowCount === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const user = res.rows[0];

    
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    // Login successful – you could generate a session token or JWT here.
    return new Response(
      JSON.stringify({
        message: "Login successful.",
        token,
        userId: user.id,
        username: user.username,
      }),
      { status: 200, headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `token=${token}; HttpOnly; Path=/; Secure; SameSite=Strict; Max-Age=3600`
      }, }
    );
  } catch (error) {
    console.error("Error during login:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await client.end();
  }
}

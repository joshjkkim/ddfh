// /app/api/login/route.js
import pool from "../../lib/db";
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

  const validPasswordRegex = /^[a-zA-Z0-9!?]{8,}$/;
  const validUsernameRegex = /^[a-zA-Z0-9_]{1,16}$/;

  if (!validUsernameRegex.test(username)) {
    return new Response(JSON.stringify({ error: "Username must be 1-16 characters long and contain only letters, numbers, and underscores." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!validPasswordRegex.test(password)) {
    return new Response(JSON.stringify({ error: "Password must be at least 8 characters and can only contain letters, numbers, ! and ?. Underscores are not allowed." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = await pool.connect();

  try {
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

    await client.query(
      `UPDATE users
       SET last_online = NOW()
       WHERE id = $1`,
      [user.id]
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
    await client.release();
  }
}

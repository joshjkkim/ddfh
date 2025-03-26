
import pool from "../../lib/db";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'

export async function POST(request) {
    const body = await request.json();
    const username = body.username
    const seedPhrase = body.seedPhrase
    const newPassword = body.newPassword


  if (!username || !seedPhrase || !newPassword) {
    return new Response(
      JSON.stringify({ error: "Username, seed phrase, and new password are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = await pool.connect();

  try {
    

    const res = await client.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (res.rowCount === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid recovery." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const user = res.rows[0];

    
    const seedMatch = await bcrypt.compare(seedPhrase, user.seed_phrase);
    if (!seedMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid recovery." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const saltRounds = 10;
    const passHash = await bcrypt.hash(newPassword, saltRounds);

    const newPass = await client.query(
        `UPDATE users
         SET password_hash = $1
         WHERE username = $2
         RETURNING id`,
        [passHash, username]
      );

    const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

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

import pool from '../../lib/db';
import bip39 from 'bip39';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export async function POST(request) {
const body = await request.json();

  if (!body.username || !body.password || !body.inviteCode) {
    return new Response(JSON.stringify({ error: "username, password, and invite code are required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = await pool.connect();


  try {;
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

    const randomBytes = await crypto.randomBytes(16)
    const mnemonic = await bip39.entropyToMnemonic(randomBytes.toString('hex')) 

    const seedHash = await bcrypt.hash(mnemonic, saltRounds);

    const res = await client.query(
        `INSERT INTO users (username, password_hash, seed_phrase)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [body.username, passwordHash, seedHash]
    );

    

    return new Response(JSON.stringify({ id: res.rows[0].id, seed: mnemonic }), {
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
    await client.release();
  }
}

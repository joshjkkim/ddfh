// create-challenge/route.js
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import pool from "../../lib/db";                  // your Neon pool

/* base difficulty targets (BigInt) */
const target20 = BigInt("0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"); // 20 bits
const target24 = BigInt("0x000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff");   // 24 bits

const customTarget = target20 - ((target20 - target24) * BigInt(5)) / BigInt(10);

export async function GET() {
  /* ─── 1. Fetch limits & usage ────────────────────────────────── */
  const client = await pool.connect();
  let usedBytes = 0n;
  let capBytes = 0n;
        // fallback 10 GB

  try {
    const capRes = await client.query(
      `SELECT value
         FROM system
        WHERE option = 'max_upload'
        LIMIT 1`
    );
    
    if (capRes.rowCount === 0) {
      throw new Error("max_upload setting missing in system_limits");
    }
    
    /* 2. Postgres sends numeric/ bigint as string → convert to BigInt */
    capBytes = BigInt(capRes.rows[0].value);  
    // upload_usage for current hour
    const useRes = await client.query(
      `SELECT num_bytes
         FROM upload_usage
     ORDER BY date_start DESC
        LIMIT 1`
    );
    usedBytes = useRes.rowCount ? BigInt(useRes.rows[0].num_bytes) : 0n;
  } finally {
    client.release();
  }

  /* ─── 2. Map usage ratio → PoW target ─────────────────────────── */
  const ratio = Number(usedBytes) / Number(capBytes); // 0 → 1
  console.log(ratio)
  let target;

  if (ratio < 0.3) {
    target = target20 - ((target20 - target24) * BigInt(4)) / BigInt(10)           // easy
  } else if (ratio < 0.6) {
    // linear between 16‑bit and 20‑bit targets
    target = target20 - ((target20 - target24) * BigInt(5)) / BigInt(10)
  } else if (ratio < 0.9) {
    // linear between 20‑bit and 24‑bit targets
    target = target20 - ((target20 - target24) * BigInt(6)) / BigInt(10)
  } else {
    target = target20 - ((target20 - target24) * BigInt(7)) / BigInt(10)
  }

  /* ─── 3. Build challenge & signed PoW token ──────────────────── */
  const challenge = randomBytes(16).toString("hex");
  const token = jwt.sign(
    { challenge, target: target.toString(16) },
    process.env.POW_SECRET,
    { expiresIn: "5m" }
  );

  return new Response(
    JSON.stringify({
      challenge,
      target: target.toString(16),
      powToken: token,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

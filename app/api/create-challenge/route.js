// create-challenge/route.js
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken'

// Define target values as BigInts
const difficulty5Target = BigInt("0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const difficulty6Target = BigInt("0x000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

// Calculate a custom target between them.
// For example, using 75% of the gap between difficulty5 and difficulty6:
const customTarget = difficulty5Target - ((difficulty5Target - difficulty6Target) * BigInt(5)) / BigInt(10);

export async function GET(request) {
  const challenge = randomBytes(16).toString('hex');
  // Return the challenge and the custom target (as a hex string)
  const token = jwt.sign(
    { challenge, target: customTarget.toString(16) },
    process.env.POW_SECRET,
    { expiresIn: "5m" }
  );

  // Return both the challenge data and the signed token.
  return new Response(
    JSON.stringify({ challenge, target: customTarget.toString(16), powToken: token }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

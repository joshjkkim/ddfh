// /utils/solveChallenge.js
import { createHash } from 'crypto';

export const solveChallenge = (challenge, targetHex) => {
  const target = BigInt("0x" + targetHex);
  let nonce = 0;
  const maxTries = 1e9; // Safeguard against infinite loops
  while (nonce < maxTries) {
    const hashHex = createHash('sha256')
      .update(challenge + nonce.toString())
      .digest('hex');
    const hashValue = BigInt("0x" + hashHex);
    if (hashValue < target) {
      console.log(`Challenge solved! Nonce: ${nonce}, Hash: ${hashHex}`);
      return nonce.toString();
    }
    nonce++;
  }
  console.warn("Failed to solve challenge within limit");
  return null;
};

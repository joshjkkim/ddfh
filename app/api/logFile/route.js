import pool from "../../lib/db";

const MaxFileSize = 5 * 1024 * 1024 * 1024; // 5GB

// Function that computes the allowed expiry (in seconds) based on file size
function computeMaxExpiry(fileSize) {
  const maxAllowed = 2592000; // 1 month in seconds
  const minAllowed = 3600;    // 1 hour in seconds
  if (fileSize >= MaxFileSize) return minAllowed;
  const ratio = fileSize / MaxFileSize;
  // Using a logarithmic curve:
  const scaled = 1 - Math.log(1 + ratio) / Math.log(2);
  return Math.floor(minAllowed + (maxAllowed - minAllowed) * scaled);
}

export async function POST(request) {
  const body = await request.json();
  const client = await pool.connect();
  
  try {
    // Compute allowed expiry in seconds for the given file size.
    const allowedExpirySeconds = computeMaxExpiry(body.fileSize);
    
    // Compute maximum allowed expiration timestamp.
    const now = Date.now();
    const providedExpirationTime = new Date(body.expirationTimestamp).getTime();
    const maxAllowedExpirationTime = now + allowedExpirySeconds * 1000;
    
    if (providedExpirationTime > maxAllowedExpirationTime) {
      await client.release();
      return new Response(
        JSON.stringify({ error: "Provided expiration timestamp exceeds maximum allowed based on file size" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // If the check passes, proceed with the insert.
    const res = await client.query(
      `INSERT INTO file_metadata (share_id, original_filename, s3_key, file_size, expiration_timestamp, panel_key, times_accessed, max_accesses, iv)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        body.shareId,
        body.originalFilename,
        body.s3Key,
        body.fileSize,
        body.expirationTimestamp,
        body.panelKey,
        body.timesAccessed,
        body.maxAccesses,
        body.iv
      ]
    );

    await client.query(
      `UPDATE upload_usage
         SET num_bytes = num_bytes + $1
       WHERE date_start = (
             SELECT date_start
               FROM upload_usage
              ORDER BY date_start DESC
              LIMIT 1
       )`,
      [ body.fileSize ]          // bytes just accepted
    );
    await client.release();
    return new Response(JSON.stringify({ id: res.rows[0].id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    await client.release();
    console.error("DB Insert Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

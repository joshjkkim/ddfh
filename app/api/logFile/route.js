import { Client } from 'pg';

export async function POST(request) {

  const body = await request.json();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const res = await client.query(
      `INSERT INTO file_metadata (share_id, original_filename, s3_key, file_size, expiration_timestamp, panel_key, times_accessed, max_accesses)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [body.shareId, body.originalFilename, body.s3Key, body.fileSize, body.expirationTimestamp, body.panelKey, body.timesAccessed, body.maxAccesses]
    );
    await client.end();
    return new Response(JSON.stringify({ id: res.rows[0].id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    await client.end();
    console.error("DB Insert Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

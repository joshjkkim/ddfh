// /app/api/updateAccess/route.js
import pool from '../../lib/db';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get("shareId");

  if (!shareId) {
    return new Response(JSON.stringify({ error: "shareId is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = await pool.connect();

  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Increment the times_accessed column by 1 for the given shareId
    const result = await client.query(
      `UPDATE file_metadata
       SET times_accessed = times_accessed + 1
       WHERE share_id = $1
       RETURNING times_accessed`,
      [shareId]
    );

    const selectResult = await client.query(
        `SELECT id, s3_key 
         FROM file_metadata 
         WHERE share_id = $1 
         AND times_accessed >= max_accesses`,
        [shareId]
    );

    if (selectResult.rowCount === 0) {
        return new Response(JSON.stringify({ error: "No matching record found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
        });
    } else {
        const record = selectResult.rows[0];

    // Delete the file from S3
        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET, // Use your AWS_S3_BUCKET env variable
            Key: record.s3_key,
        });

        await s3Client.send(deleteCommand);
        console.log(`Deleted S3 object: ${record.s3_key}`);

        const result = await client.query(
            `DELETE FROM file_metadata WHERE share_id = $1 RETURNING *`,
            [shareId]
        );

        console.log(`Deleted DB record with id ${result.rows[0].id}`);
    }

    

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "Record not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ times_accessed: result.rows[0].times_accessed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error updating access count:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

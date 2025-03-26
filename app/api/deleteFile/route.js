// /app/api/deleteFile/route.js
import pool from '../../lib/db';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const panelKey = searchParams.get("panelKey");

  if (!panelKey) {
    return new Response(JSON.stringify({ error: "panelKey is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set up S3 client using environment variables
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const client = await pool.connect()

  try {
    // First, select the record to get the S3 key
    const selectResult = await client.query(
      `SELECT id, s3_key FROM file_metadata WHERE panel_key = $1`,
      [panelKey]
    );

    if (selectResult.rowCount === 0) {
      return new Response(JSON.stringify({ error: "No matching record found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const record = selectResult.rows[0];

    // Delete the file from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET, // Use your AWS_S3_BUCKET env variable
      Key: record.s3_key,
    });
    await s3Client.send(deleteCommand);
    console.log(`Deleted S3 object: ${record.s3_key}`);

    // Delete the record from the database
    const result = await client.query(
      `DELETE FROM file_metadata WHERE panel_key = $1 RETURNING *`,
      [panelKey]
    );

    console.log(`Deleted DB record with id ${result.rows[0].id}`);
    return new Response(JSON.stringify({
      message: "File and record deleted successfully.",
      deletedRecord: result.rows[0],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error deleting record or file:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.release();
  }
}

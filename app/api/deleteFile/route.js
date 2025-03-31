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

  const client = await pool.connect();

  try {
    // Select all records with the given panel_key
    const selectResult = await client.query(
      `SELECT id, s3_key FROM file_metadata WHERE panel_key = $1`,
      [panelKey]
    );

    if (selectResult.rowCount === 0) {
      return new Response(JSON.stringify({ error: "No matching records found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const records = selectResult.rows;

    // Delete each file from S3 concurrently
    await Promise.all(records.map(async (record) => {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: record.s3_key,
        });
        await s3Client.send(deleteCommand);
        console.log(`Deleted S3 object: ${record.s3_key}`);
      } catch (s3Error) {
        console.error(`Error deleting S3 object ${record.s3_key}:`, s3Error);
      }
    }));

    // Delete all records from file_metadata with this panel_key
    const result = await client.query(
      `DELETE FROM file_metadata WHERE panel_key = $1 RETURNING *`,
      [panelKey]
    );

    console.log(`Deleted ${result.rowCount} DB record(s) with panel_key ${panelKey}`);
    return new Response(JSON.stringify({
      message: "Files and records deleted successfully.",
      deletedRecords: result.rows,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error deleting records or files:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    client.release();
  }
}

import { Client } from "pg";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(request) {
  // Parse JSON body for title and description
  const { title, description } = await request.json();

  // Get the session token from cookies
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  
  if (!token) {
    return new Response(
      JSON.stringify({ error: "No session token found" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let session;
  try {
    // Verify the token (which contains only user.id and user.username)
    session = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch the full user record from the database using session.id
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let userRecord;
  try {
    const userQuery = "SELECT id, username, role FROM users WHERE id = $1";
    const userResult = await client.query(userQuery, [session.id]);
    if (userResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    userRecord = userResult.rows[0];
  } catch (err) {
    console.error("Error fetching user:", err);
    return new Response(
      JSON.stringify({ error: "Error fetching user" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Only admins can create threads
  if (userRecord.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Only admins can create threads." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Insert the new thread into the database
  try {
    const insertQuery = `
      INSERT INTO threads (title, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, created_at
    `;
    const values = [title, description, userRecord.id];
    const result = await client.query(insertQuery, values);
    return new Response(
      JSON.stringify(result.rows[0]),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating thread:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await client.end();
  }
}

// /app/api/getSession/route.js
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  // Read cookies using Next.js's cookies utility (works in server components)
  const cookieStore = await cookies();
  const token = await cookieStore.get('token')?.value;

  if (!token) {
    return new Response(JSON.stringify({ error: "No session token found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Return the decoded session data (e.g. user id and username)
    return new Response(JSON.stringify({ session: decoded }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

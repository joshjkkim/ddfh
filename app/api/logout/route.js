
export async function GET(request) {
    const response = new Response(
      JSON.stringify({ message: "Logged out successfully." }),
      { status: 200 }
    );
    // Clear the JWT cookie by setting an expired cookie.
    response.headers.set(
      "Set-Cookie",
      "token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure"
    );
    response.headers.set("Content-Type", "application/json");
    return response;
  }
  
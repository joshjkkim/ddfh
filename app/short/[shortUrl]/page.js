// app/short/[shortUrlKey]/page.js

import { redirect } from "next/navigation";

export default async function ShortForward({ params }) {
  const { shortUrl } = await params;
  console.log(shortUrl)
  
  // Fetch the full link from your API
  const res = await fetch(`http://localhost:3000/api/shortUrl/forward?shorturlkey=${shortUrl}`);
  if (!res.ok) {
    // Optionally, handle error by redirecting to an error page
    redirect(`/`)
  }
  const data = await res.json();
  
  // Parse the returned full link into parts
  const fullLink = new URL(data.full_link);
  const path = fullLink.pathname;
  const search = fullLink.search;
  
  redirect(`${path}${search}`);

}

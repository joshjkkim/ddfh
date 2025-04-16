// app/short/[shortUrlKey]/page.js

import { redirect } from "next/navigation";

export default async function ShortForward({ params }) {
  const { shortUrl } = await params;
  
  // Fetch the full link from your API
  const res = await fetch(`https://ddfh.org/api/shortUrl/forward?shorturlkey=${encodeURIComponent(shortUrl)}`);
  console.log(res)
  if (!res.ok) {
    // Optionally, handle error by redirecting to an error page
    redirect(`/`)
  }

  const data = await res.json();

  if(!data.full_link) {
    redirect(`/${data.owner_username}`)
    return;
  }

  // Parse the returned full link into parts
  const fullLink = data.owner_id ? new URL(data.full_link + `?ownerId=${data.owner_id}`) : new URL(data.full_link);
  const path = fullLink.pathname;
  const search = fullLink.search;
  
  redirect(`${path}${search}`);

}
 
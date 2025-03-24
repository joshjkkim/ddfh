// components/Avatar.jsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const getUserAvatar = async (avatarKey) => {
  const avkey = await fetch(`/api/getDownloadURL?filename=${encodeURIComponent(avatarKey)}`);
  if (!avkey.ok) {
    throw new Error(`Error fetching URL: ${avkey.status}`);
  }
  const { url: avUrl } = await avkey.json();
  const avBlob = await fetch(avUrl).then((res) => res.blob());
  const avObjectUrl = URL.createObjectURL(avBlob);
  return avObjectUrl;
};

export default function Avatar({ avatarKey, alt, className }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!avatarKey) return;
    async function fetchAvatar() {
      try {
        const url = await getUserAvatar(avatarKey);
        setAvatarUrl(url);
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    }
    fetchAvatar();
  }, [avatarKey]);

  if (error) return <p>Error loading avatar</p>;
  if (!avatarUrl) return <div className="bg-gray-700 rounded-full animate-pulse" />;

  return (
    <div className="relative w-full h-full">
     <Image 
        src={avatarUrl} 
        alt={alt}
        fill
        unoptimized
        className={`object-cover ${className}`}
        />
    </div>
  );
}

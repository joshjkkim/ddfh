"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const res = await fetch("/api/logout", { method: "GET" });
    if (res.ok) {
      router.push("/login");
    } else {
      console.error("Logout failed");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-500"
    >
      Logout
    </button>
  );
}

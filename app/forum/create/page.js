"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateThreadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
      async function fetchSession() {
        try {
          const res = await fetch("/api/getSession");
          if (res.ok) {
            const data = await res.json()
            setSession(data.session);
          } else {
              router.push("/")
          }
        } catch (err) {
          console.error("Error fetching session:", err);
        }
      }
      fetchSession();
    }, [router]);

    useEffect(() => {
      async function fetchUserData() {
        try {
          const res = await fetch(`/api/getUser?username=${encodeURIComponent(session.username)}`);
          if (res.ok) {
            const data = await res.json();
            if(data.role !== "admin") {
              router.push("/")
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      if (session?.username && !session.role) {
        fetchUserData();
      }
    }, [session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      const res = await fetch("/api/threads/create", {
        method: "POST", // Use POST to create a thread
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error)
      }
      
      // Optionally, you can get the created thread from the response:
      const newThread = await res.json();
      // Redirect back to the forum page (or to the new thread's page)
      router.push("/forum");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <form 
        onSubmit={handleSubmit} 
        className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-lg"
      >
        <h1 className="text-3xl font-bold mb-4">Create New Thread</h1>
        {error && <p className="mb-4 text-red-500">{error}</p>}
        <div className="mb-4">
          <label className="block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
            rows={4}
          ></textarea>
        </div>
        <button 
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium"
        >
          Create Thread
        </button>
      </form>
    </div>
  );
}

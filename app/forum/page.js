"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Header from "../components/Header";

export default function ForumPage() {
  const [threads, setThreads] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch the session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/getSession");
        if (res.ok) {
          const data = await res.json();
          console.log(data.session);
          setSession(data.session);
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    }
    fetchSession();
  }, []);

  // Fetch forum threads from the API
  useEffect(() => {
    async function fetchThreads() {
      try {
        const res = await fetch("/api/threads");
        if (!res.ok) {
          throw new Error("Failed to fetch threads");
        }
        const data = await res.json();
        setThreads(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchThreads();
  }, []);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch(`/api/getUser?username=${encodeURIComponent(session.username)}`);
        if (res.ok) {
          const data = await res.json();
          // Now you have role info: data.role
          setSession((prev) => ({ ...prev, role: data.role }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
    if (session?.username && !session.role) {
      fetchUserData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium">Loading forum threads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <Header session={session} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">Forum Threads</h1>
            <p className="text-gray-400 mt-1">Join the conversation and share your thoughts</p>
          </div>
          
          {session && session.role === "admin" && (
            <button
              onClick={() => router.push("/forum/create")}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Thread
            </button>
          )}
        </div>

        {threads.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xl font-medium text-gray-300">No threads available yet</p>
            <p className="text-gray-500 mt-2">Be the first to start a conversation!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {threads.map((thread) => (
              <Link href={`/thread/${thread.title}`} key={thread.id} className="block">
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5 hover:bg-gray-700/80 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/5 hover:border-gray-600">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-white group-hover:text-purple-400 mb-1">{thread.title}</h2>
                      <p className="text-gray-400 line-clamp-2">{thread.description}</p>
                    </div>
                    <div className="sm:text-right">
                      <div className="inline-block bg-gray-900/60 rounded-full px-3 py-1 text-xs font-medium text-gray-300">
                      Last Posted To: 
                        {new Date(thread.updated_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-medium mr-2">
                        {thread.created_by_username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-400">{thread.created_by_username}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
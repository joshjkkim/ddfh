"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FilePen, CornerDownRight } from "lucide-react";
import Avatar from "../../components/Avatar";
import Link from "next/link";
import Header from "../../components/Header";

export default function ThreadPage() {
  let { threadTitle } = useParams();
  threadTitle = decodeURIComponent(threadTitle)
  const router = useRouter();
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch thread and posts data
  useEffect(() => {
    async function fetchThreadData() {
      try {
        const res = await fetch(`/api/thread?title=${encodeURIComponent(threadTitle)}`);
        if (!res.ok) {
          setError("Failed to fetch thread information")
          return;
        }
        const data = await res.json();
        setThread(data.thread);
        setPosts(data.posts);
        console.log(data.posts)
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (threadTitle) {
      fetchThreadData();
    }
  }, [threadTitle]);

  // Fetch session data to determine if user is logged in
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/getSession");
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
        } else {
          router.push("/")
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      }
    }
    fetchSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium">Loading thread...</p>
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex flex-col items-center justify-center">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl font-bold text-red-400 mb-2">Thread Not Found</p>
          <p className="text-gray-300 mb-6">{error || "The thread you're looking for doesn't seem to exist."}</p>
          <Link href="/forum">
            <div className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
              Back to Forum
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <Header session={session} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/forum">
          <div className="flex items-center text-purple-400 hover:text-purple-300 mb-6 group cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Back to Forum</span>
          </div>
        </Link>
        
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 mb-8 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">{thread.title}</h1>
          <p className="text-gray-300 mb-6 text-lg">{thread.description}</p>
          <div className="flex items-center border-t border-gray-700 pt-4">
            <Link href={`/${thread.created_by_username}`}>
            <div className="w-10 h-10 mr-3 flex-shrink-0">
              <Avatar 
                avatarKey={thread.created_by_username_pfp} 
                alt={`${thread.created_by_username}'s avatar`} 
                className="rounded-full" 
              />
            </div>
            
              <div>
                <div className="font-medium text-gray-200">{thread.created_by_username}</div>
                
                <div className="text-sm text-gray-500">
                  {new Date(thread.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </Link>
          </div>
        </div>
        
        {/* Post Reply Button */}
        {session && (
          <div className="mb-6 flex justify-end">
            <Link href={`/thread/${encodeURIComponent(threadTitle)}/post`}>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                Post Reply
              </button>
            </Link>
          </div>
        )}
        
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              Discussion
              {posts.length > 0 && (
                <span className="ml-2 text-sm bg-purple-600 text-white px-2 py-1 rounded-full">
                  {posts.length}
                </span>
              )}
            </h2>
          </div>
          
          {posts.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p className="text-xl font-medium text-gray-300">No posts yet</p>
                <p className="text-gray-500 mt-2">Be the first to start the discussion!</p>
            </div>
            ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <Link key={post.id} href={`/thread/${encodeURIComponent(threadTitle)}/${post.id}`}>
                  <div className="cursor-pointer bg-gray-800/60 border border-gray-700 rounded-lg p-5 shadow-md hover:bg-gray-700 transition-colors">
                    <div className="flex items-start">
                      <div className="w-10 h-10 mr-3 flex-shrink-0">
                        <Avatar 
                          avatarKey={post.author_pfp} 
                          alt={`${post.author_username}'s avatar`} 
                          className="rounded-full" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                          <div className="font-medium text-gray-200">{post.author_username}</div>
                          <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                            {new Date(post.updated_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-2 text-gray-300 whitespace-pre-line">
                        {post.share_file_key && (
                         <>
                            <span className="font-bold text-2xl inline-flex">
                              <FilePen className="h-6 w-6 mr-1 text-blue-400" />
                              {new URL(post.share_file_key, "http://localhost").searchParams.get("filename").replace(/^[^-]*-/, "")}
                            </span>
                            <br />
                            </>
                          )}
                            <span className="text-md inline-flex">
                              <CornerDownRight className="h-6 w-6 mr-1 text-blue-400" />
                              {post.content}
                            </span>
                          </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            )}
        </div>
      </div>
    </div>
  );
}

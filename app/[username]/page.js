"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  User, MessageSquare, Clock, Diff, Flag, 
  Settings, Shield, IdCard,
  LogOut
} from "lucide-react";
import Header from "../components/Header";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [userStats, setUserStats] = useState({
    posts: 0,
    reputation: 0
  });
  const [avatar, setAvatar] = useState(null);
  const [banner, setBanner] = useState(null);
  const [userPosts, setUserPosts] = useState(null);

  // Fetch user data based on the username in the URL
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/getUser?username=${encodeURIComponent(username)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch user data.");
        }
        const data = await res.json();
        setUser(data);

        if(data.avatar_key) {
            const avkey = await fetch(`/api/getDownloadURL?filename=${encodeURIComponent(data.avatar_key)}`);
            if (!avkey.ok) {
            throw new Error(`Error fetching URL: ${avkey.status}`)
            }

            const { url: avUrl } = await avkey.json();
            const avBlob = await fetch(avUrl).then((res) => res.blob());
            const avObjectUrl = URL.createObjectURL(avBlob);
            setAvatar(avObjectUrl);
        }

        if(data.banner_key) {
            const bakey = await fetch(`/api/getDownloadURL?filename=${encodeURIComponent(data.banner_key)}`);
            if (!bakey.ok) {
            throw new Error(`Error fetching URL: ${bakey.status}`);
            }
    
            const { url: baUrl } = await bakey.json();
            const baBlob = await fetch(baUrl).then((res) => res.blob());
            const baObjectUrl = URL.createObjectURL(baBlob);
            setBanner(baObjectUrl);
    
            console.log(banner)
        }
        // You can also fetch stats in a separate request if needed
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (username) {
      fetchUser();
    }
  }, [username]);

  // Fetch session data from the backend
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/getSession");
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      } finally {
        setSessionLoading(false);
      }
    }
    fetchSession();
  }, [username]);

  useEffect(() => {
    if (activeTab === "posts" && user?.username) {
      async function fetchUserPosts() {
        try {
          const res = await fetch(
            `/api/getUser/posts?username=${encodeURIComponent(user?.username)}`
          );
          if (!res.ok) {
            throw new Error("Failed to fetch user posts");
          }
          const data = await res.json();
          setUserPosts(data);
        } catch (error) {
          console.error(error)
        }
      }
      fetchUserPosts();
    }
  }, [activeTab, user]);
  

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin"></div>
          <p className="text-gray-300 mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl w-full max-w-md text-center">
          <Flag className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Profile Not Found</h2>
          <p className="text-red-400 mb-6">{error || "This user doesn't exist or has been removed."}</p>
          <button 
            onClick={() => router.push('/')} 
            className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const isOwner = session && session.username === username;
  
  const avatarSrc = avatar || "/defaultuser.png";
  const bannerSrc = banner || "/defaultbanner.png";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header session={session}/>
      <div 
        className="w-full h-48 md:h-64 bg-gray-800 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${bannerSrc})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-70"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row">
          <div className="shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-900 overflow-hidden relative bg-gray-800">
              <Image 
                src={avatarSrc} 
                alt={`${username}'s avatar`}
                fill
                className="object-cover"
              />
            </div>
          </div>
          
          <div className="mt-4 md:mt-8 md:ml-6 flex-1">
            <div className="flex flex-wrap items-start justify-between">
              <div>
                <div className="flex items-center">
                  <h1 className="text-3xl font-bold">{user.username}</h1>
                </div>
                <p className="text-gray-400 mt-1">
                  <span className="inline-flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {user.role || "Member"}
                  </span>
                  <span className="inline-flex items-center ml-2">
                    <IdCard className="w-4 h-4 mr-1" />
                    UID: {user.id}
                  </span>
                  <span className="inline-flex items-center ml-4">
                    <Clock className="w-4 h-4 mr-1" />
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 flex space-x-2">
                {isOwner ? (
                  <>
                  <LogoutButton />
                  <button 
                    onClick={() => router.push(`${username}/edit/`)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => router.push(`/reputation?recipient=${username}`)}
                      className="bg-gradient-to-br from-green-600 to-red-600 hover:from-green-400 hover:to-red-400 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors"
                    >
                      <Diff className="w-4 h-4 mr-2" />
                      Reputation
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-gray-300 italic">
                {user.bio || "This user hasn't added a bio yet."}
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 mt-6 gap-6">
          <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700 hover:border-purple-500 transition-colors">
            <p className="text-3xl font-bold text-white">{user.post_count || 0}</p>
            <p className="text-gray-400 text-sm">Posts</p>
          </div>
          <Link href={`/${user.username}/reputation`}>
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700 hover:border-purple-500 transition-colors">
              <p className={`text-3xl font-bold ${user.reputation >= 0 ? "text-green-400" : "text-red-400"}`}>{user.reputation || 0}</p>
              <p className="text-gray-400 text-sm">Reputation</p>
            </div>
          </Link>
        </div>
        
        <div className="mt-8 border-b border-gray-700">
          <nav className="flex space-x-8">
            <button 
              className={`py-4 px-1 font-medium text-sm border-b-2 ${
                activeTab === "posts" 
                  ? "border-purple-500 text-purple-400" 
                  : "border-transparent text-gray-400 hover:text-gray-300"
              } transition-colors`}
              onClick={() => setActiveTab("posts")}
            >
              Posts
            </button>
            <button 
              className={`py-4 px-1 font-medium text-sm border-b-2 ${
                activeTab === "contacts" 
                  ? "border-purple-500 text-purple-400" 
                  : "border-transparent text-gray-400 hover:text-gray-300"
              } transition-colors`}
              onClick={() => setActiveTab("contacts")}
            >
              Contacts
            </button>
          </nav>
        </div>
        
        <div className="mt-6 pb-8">
          
          {activeTab === "posts" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-purple-400" />
                User Posts
              </h2>
              
              {userPosts && userPosts.length === 0 ? (
                <div className="text-center py-6">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No posts to display</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {userPosts && userPosts.map((post) => (
                    
                      <div key={post.id} className="bg-gray-700 p-4 rounded">
                        <Link href={`/thread/${username}/${post.parent_post_id ?? post.id}`}>
                        <p>{post.content}</p>
                        {post.share_file_key && (
                          <div className="bg-gray-700/50 rounded-lg p-3 mb-4 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="text-gray-300 text-sm truncate">{post.share_file_key}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          Posted on {new Date(post.created_at).toLocaleDateString()}
                        </p>
                        <p className={`text-xs ${post.is_marketplace ? "text-green-500 hover:text-green-500" : "text-red-500"}}`}>
                          {post.is_marketplace ? "Market" : "Reply"}
                        </p>
                        </Link>
                      </div>
                    
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === "contacts" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Connected Accounts</h2>
              
              <div className="text-center py-6">
                <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No connected accounts to display</p>
                {isOwner && (
                  <button 
                    onClick={() => router.push('/settings/connections')}
                    className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Connect Accounts
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
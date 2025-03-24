"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  User, MessageSquare, Clock, Diff, Flag, 
  Settings, Shield, Mail, Share2
} from "lucide-react";
import Header from "../components/Header";

export default function ReputationPage() {
 
  const router = useParams();
  const { recipient } = router.query; 
  console.log(recipient)
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

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/getUser?username=${encodeURIComponent(recipient)}`);
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
    
    if (recipient) {
      fetchUser();
    }
  }, [recipient]);

  // Fetch session data from the backend
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
      } finally {
        setSessionLoading(false);
      }
    }
    fetchSession();
  }, [recipient]);

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

  // Check if the logged-in user is viewing their own profile
  const isOwner = session && session.username === recipient;
  
  // Default avatar/banner if not set
  const avatarSrc = avatar || "/defaultuser.png";
  const bannerSrc = banner || "/defaultbanner.png";

  return (
    <div>
        <p>hi</p>
    </div>
  );
}
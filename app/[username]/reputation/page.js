"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation";
import { Flag, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function ReputationPage() {
    const { username } = useParams();
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [avatar, setAvatar] = useState(null);
    const [banner, setBanner] = useState(null)
    const [userReputation, setUserReputation] = useState(null)

    useEffect(() => {
        async function fetchUser() {
          try {
            const res = await fetch(`/api/getUser?username=${encodeURIComponent(username)}`);
            if (!res.ok) {
              throw new Error("Failed to fetch user data.");
            }
            const data = await res.json();
            setUser(data);
            setLoading(true);
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
            }
            setLoading(false)
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

    useEffect(() => {
        if (user?.username) {
        async function fetchUserReputation() {
            try {
            const res = await fetch(
                `/api/getUser/reputation?username=${encodeURIComponent(user?.username)}`
            );
            if (!res.ok) {
                setError("Failed to fetch user's reputations")
            }
            const data = await res.json();
            setUserReputation(data);
            } catch (error) {
            console.error(error)
            }
        }
        fetchUserReputation();
        }
    }, [user]);

    
    if (loading) {
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

    return (
        <div className="relative min-h-screen">
            {/* Background Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center filter brightness-50"
                style={{ 
                    backgroundImage: `url(${banner ?? "/defaultbanner.png"})`,
                }}
            />

            {/* Content Container */}
            <div className="relative z-10 container mx-auto px-4 py-8">
                <Link href={`/${user.username}`}>
                    <div className="flex items-center mb-8 space-x-4 hover:underline hover:text-cyan-800 p-2 rounded-lg">
                        <img 
                            src={avatar ?? "/defaultavatar.png"} 
                            alt={`${user.username}'s avatar`} 
                            className="w-20 h-20 rounded-full border-4 border-white/20 object-cover"
                        />
                        <h1 className="text-3xl font-bold text-white">{user.username}'s Reputation: {user.reputation}</h1>
                    </div>
                </Link>

                {userReputation && userReputation.length === 0 ? (
                    <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-8 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300">No reputation to display</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {userReputation && userReputation.map((reputation) => (
                            <div 
                                key={reputation.giver_username} 
                                className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <Link href={`/${reputation.giver_username}`}>
                                    <p className={`text-lg font-semibold text-purple-300`}><span className={`${reputation.amount >= 0 ? "text-green-400" : "text-red-400"}`}>{reputation.amount}</span> rep from <span className="bg-gray-600 p-1 rounded-lg hover:bg-cyan-800 text-purple-400">{reputation.giver_username}</span></p>
                                    </Link>
                                
                                    <p className="text-xs text-gray-400">
                                        Date Given: {new Date(reputation.date_given).toLocaleDateString()}
                                    </p>
                                </div>
                                {reputation.message && (
                                    <div className="bg-gray-700/50 rounded-lg p-3 mb-2 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        <span className="text-gray-300 text-sm truncate">{reputation.message}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
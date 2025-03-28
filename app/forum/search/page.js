"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "../../components/Header"
import { Search, FileText, Link as LinkIcon, Calendar } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

export default function ForumSearchPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("")
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);
    const [posts, setPosts] = useState(null)

    useEffect(() => {
        async function fetchSession() {
            try {
                setLoading(true);
                const res = await fetch("/api/getSession");
                if (res.ok) {
                    const data = await res.json();
                    setSession(data.session);
                } else {
                    router.push("/");
                }
            } catch (err) {
                console.error("Error fetching session:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, [router]);

    const handleSearch = async (e) => {
        e.preventDefault();
        
        try {
            const res = await fetch(`/api/search-forum?search=${searchQuery}`)
            const data = await res.json()
            setPosts(data.posts);
            setSearched(true);
        } catch (error) {
            setError("Meow")
        }
    }

    if (loading) {
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center text-white"
            >
                <motion.div
                    animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "loop"
                    }}
                >
                    <FileText size={64} className="text-green-500" />
                </motion.div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex items-center justify-center"
            >
                <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="bg-red-900/30 border border-red-500 rounded-lg p-6 max-w-md text-center"
                >
                    <h2 className="text-xl font-bold text-red-400 mb-2">Oops! Something went wrong</h2>
                    <p className="text-gray-300">{error}</p>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => window.location.reload()} 
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                    >
                        Try Again
                    </motion.button>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100"
        >
            <Header session={session}/>
            <div className="container mx-auto px-4 py-12 flex justify-center">
                <motion.form 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    onSubmit={handleSearch} 
                    className="w-full max-w-xl relative"
                >
                    <div className="relative">
                        <input 
                            className="w-full bg-gradient-to-br from-gray-700 to-gray-600 
                                       text-white p-4 pl-12 rounded-lg shadow-lg 
                                       focus:outline-none focus:ring-2 focus:ring-green-500 
                                       transition-all duration-300 ease-in-out"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for Keywords"
                        />
                        <Search 
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
                            size={24} 
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg 
                                   hover:bg-green-700 transition-colors duration-300 
                                   focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        Search
                    </motion.button>
                </motion.form>
            </div>

            <div className="container mx-auto px-4">
                <AnimatePresence>
                    {searched && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                        >
                            <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                                User Posts
                            </h2>
                            
                            {posts && posts.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-6"
                                >
                                    <p className="text-gray-400">No posts to display</p>
                                </motion.div>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                    <AnimatePresence>
                                        {posts && posts.map((post) => (
                                            <motion.div 
                                                key={post.id}
                                                initial={{ opacity: 0, x: -50 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 50 }}
                                                transition={{ duration: 0.3 }}
                                                className="bg-gray-700 p-4 rounded hover:bg-gray-600 transition-colors group"
                                            >
                                                <Link href={`/thread/thread/${post.parent_post_id ?? post.id}`}>
                                                    <div className="flex flex-col space-y-2">
                                                        <p className="text-white group-hover:text-green-400 transition-colors">
                                                            {post.content}
                                                        </p>

                                                        {post.share_file_key && (
                                                            <div className="bg-gray-700/50 rounded-lg p-3 flex items-center">
                                                                <LinkIcon className="h-5 w-5 text-purple-400 mr-2" />
                                                                <span className="text-gray-300 text-sm truncate">
                                                                    {post.share_file_key}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center text-xs text-gray-400">
                                                            <div className="flex items-center space-x-2">
                                                                <Calendar size={12} />
                                                                <span>
                                                                    {new Date(post.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <span 
                                                                className={`px-2 py-1 rounded ${
                                                                    post.is_marketplace 
                                                                        ? "bg-green-500/20 text-green-400" 
                                                                        : "bg-red-500/20 text-red-400"
                                                                }`}
                                                            >
                                                                {post.is_marketplace ? "Market" : "Reply"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>  
    )
}
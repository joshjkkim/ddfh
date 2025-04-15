"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  User, Link as LinkIcon, Clock, Send, Plus, 
  Settings, Copy, RefreshCcw, Trash2, TriangleAlert,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import Link from "next/link";

const validKeyRegex = /^[a-zA-Z0-9]{1,16}$/;

export default function URLsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewURLModal, setShowNewURLModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newURLData, setNewURLData] = useState({ name: ""});
  const [transferData, setTransferData] = useState({ urlId: null, recipientUsername: "" });
  const [assignData, setAssignData] = useState({ urlId: null, fullLink: "", panelKey: "" });
  const [deleteData, setDeleteData] = useState({ urlId: null, confirm: "" });
  const [selectedURL, setSelectedURL] = useState(null);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState([])
  const [maxShortKeys, setMaxShortKeys] = useState();
  const [error, setError] = useState("")
  const [ok, setOk] = useState("")
  
  // Placeholder data - replace with your API fetching logic
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

    useEffect(() => {
        async function fetchUser() {
          try {
            const res = await fetch(`/api/getUser?username=${encodeURIComponent(session.username)}`);
            if (!res.ok) {
              setError("Failed to fetch user data!");

              setTimeout(() => {
                setError("");
              }, 5000)
              throw new Error("Failed to fetch user data.");
            }
            const data = await res.json();
            console.log(data)
            setUser(data);
            setMaxShortKeys(() => {
              if (data.role === 'admin') return 10;
              if (data.role === 'moderator') return 5;
              return 3;
            })
            // You can also fetch stats in a separate request if needed
          } catch (err) {
            setError("Failed to fetch user data!");

              setTimeout(() => {
                setError("");
              }, 5000)
            throw new Error("Error fetching user")
          } finally {
            setLoading(false);
          }
        }
        
        if (session) {
          fetchUser();
        }
      }, [session]);

    useEffect(() => {
    async function fetchLinks() {
        try {
        const res = await fetch(`/api/urls`);
        if (!res.ok) {
          setError("Failed to fetch link");

          setTimeout(() => {
            setError("");
          }, 5000)
          throw new Error("Failed to fetch link.");
        }
        const data = await res.json();
        setUrls(data);
        // You can also fetch stats in a separate request if needed
        } catch (err) {
            setError("Failed to fetch link");

            setTimeout(() => {
              setError("");
            }, 5000)
            throw new Error("Error fetching links")
        } finally {
        setLoading(false);
        }
    }
    if (user) {
        fetchLinks();
    }
    }, [user]);

    const handleClaim = async () => {
    
      try {
        if(!newURLData.name) {
          setError("Must Include url short key");

          setTimeout(() => {
            setError("");
          }, 5000)
          return;
        }

        if (!validKeyRegex.test(newURLData.name)) {
          setError("Must be 0-9 characters only numbers and letters");

          setTimeout(() => {
            setError("");
          }, 5000)
          return;
        }

        const res = await fetch('/api/urls/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: newURLData.name,
          }),
        });

        if(!res.ok) {
          const data = await res.json();
          setError(data.error);

          setTimeout(() => {
            setError("");
          }, 5000)
          return;
        }

        setOk("Claimed Successfully!");

        setTimeout(() => {
          setOk("");
        }, 5000)

        router.refresh();
      } catch (error) {
        setError("Failed to claim key. Please try again.");
  
        setTimeout(() => {
          setError("")
        }, 5000)
      }
      };

      const handleAssign = async () => {

        console.log(assignData)
    
        try {
          if(!assignData.fullLink || assignData.fullLink === selectedURL.full_link) {
            setError("Link has not changed");

            setTimeout(() => {
              setError("");
            }, 5000)
            return;
          }

          if(assignData.urlId !== selectedURL.short_url_key) {
            setError("url key is not the same");

            setTimeout(() => {
              setError("");
            }, 5000)
            return;
          }
  
          const res = await fetch('/api/urls/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shorturlkey: assignData.urlId,
              fullLink: assignData.fullLink,
              panelKey: assignData.panelKey,
            }),
          });


          if (!res.ok) {
            const data = await res.json();
            console.log(data.error)
            setError(data.error);

            setTimeout(() => {
              setError("");
            }, 5000)
            return;
          }

          setOk("Assigned Successfully!");

          setTimeout(() => {
            setOk("");
          }, 5000)

          router.refresh();
        } catch (error) {
          setError("Failed to assign link. Please try again.");
    
          setTimeout(() => {
            setError("")
          }, 5000)
        }
        };

    const handleTransfer = async () => {

      try {
        if(!transferData.recipientUsername) {
          setError("There must be a recipient");

          setTimeout(() => {
            setError("");
          }, 5000)
          return;
        }

        if(transferData.recipientUsername === session.username) {
          setError("You cannot send it to yourself");

          setTimeout(() => {
            setError("");
          }, 5000)
          return;
        }

        const res = await fetch('/api/urls/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shorturlkey: transferData.urlId,
            recipient: transferData.recipientUsername,
          }),
        });


        if (!res.ok) {
          const data = await res.json();
          console.log(data.error)
          setError(data.error);

          setTimeout(() => {
            setError("");
          }, 5000)
          return;
        } 

        setOk("Transferred Successfully!");

        setTimeout(() => {
          setOk("");
        }, 5000)

        router.refresh();
      } catch (error) {
        setError("Failed to transfer link. Please try again.");

        setTimeout(() => {
          setError("")
        }, 5000)
      }
      };

      const handleDelete = async () => {

        try {
  
          if(selectedURL.short_url_key !== deleteData.confirm || deleteData.urlId !== deleteData.confirm) {
            setError("You must confirm the URL correctly");
  
            setTimeout(() => {
              setError("");
            }, 5000)
            return;
          }
  
          const res = await fetch('/api/urls/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shorturlkey: deleteData.urlId,
              confirm: deleteData.confirm,
            }),
          });
  
          if (!res.ok) {
            const data = await res.json();
            console.log(data.error)
            setError(data.error);
  
            setTimeout(() => {
              setError("");
            }, 5000)
            return;
          }

          setOk("Deleted Successfully!");

          setTimeout(() => {
            setOk("");
          }, 5000)
  
          router.refresh();
        } catch (error) {
          setError("Failed to delete key. Please try again.");
  
          setTimeout(() => {
            setError("")
          }, 5000)
        }
        };
  
  // Filter URLs based on active tab and search term - replace with your filtering logic
  const filteredURLs = urls.filter(url => {
    let matchesSearch;
    if(url.short_url_key || url.full_link) {
      matchesSearch = url.short_url_key.includes(searchTerm) || 
                          url.full_link.includes(searchTerm);
    }
    
    
    if (activeTab === "active") {
      return matchesSearch && url.full_link;
    } else if (activeTab === "inactive") {
      return matchesSearch && !url.full_link;
    } else {
      return matchesSearch;
    }
  });

  if (loading) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-gray-900 flex items-center justify-center"
        >
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ 
              scale: [0.8, 1.1, 0.9, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
            className="flex flex-col items-center"
          >
            <div className="w-12 h-12 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin"></div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-300 mt-4"
            >
              Loading profile...
            </motion.p>
          </motion.div>
        </motion.div>
      );
    }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-900 text-gray-100"
    >
      <Header session={session}/>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <LinkIcon className="w-8 h-8 mr-2 text-purple-500" />
              {session.username}'s URLs
            </h1>
            <div className="bg-gray-950 rounded-lg font-bold p-2 mt-2">
              <p className="text-gray-400">You have used preclaims: <span className="text-lg text-white bg-gray-800 p-1 rounded-lg">{user.num_short_keys} / {maxShortKeys}</span></p>
            </div>
          </div>

          {error && 
            <div className="flex justify-center w-full">
              <div className="w-1/2 justify-center mb-6 p-4 bg-red-900 bg-opacity-30 rounded-lg border border-red-500 flex items-start shadow-lg">
                <TriangleAlert className="w-5 h-5 text-red-300 mr-2"/>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          }

          {ok && 
            <div className="flex justify-center w-full">
              <div className="w-1/2 justify-center mb-6 p-4 bg-green-900 bg-opacity-30 rounded-lg border border-green-500 flex items-start shadow-lg">
                <Check className="w-5 h-5 text-green-300 mr-2"/>
                <p className="text-green-300">{ok}</p>
              </div>
            </div>
          }
          
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewURLModal(true)}
              className="mt-4 md:mt-0 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Claim New URL
            </motion.button>
        </motion.div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between mb-6">
              <div className="flex space-x-4">
                <button 
                  className={`py-2 px-4 rounded-md font-medium text-sm ${
                    activeTab === "all" 
                      ? "bg-purple-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } transition-colors`}
                  onClick={() => setActiveTab("all")}
                >
                  All URLs
                </button>
                <button 
                  className={`py-2 px-4 rounded-md font-medium text-sm ${
                    activeTab === "active" 
                      ? "bg-purple-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } transition-colors`}
                  onClick={() => setActiveTab("active")}
                >
                  Active
                </button>
                <button 
                  className={`py-2 px-4 rounded-md font-medium text-sm ${
                    activeTab === "inactive" 
                      ? "bg-purple-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } transition-colors`}
                  onClick={() => setActiveTab("inactive")}
                >
                  Inactive
                </button>
              </div>
              
              <div className="mt-4 md:mt-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search URLs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md py-2 px-4 pl-10 w-full focus:outline-none focus:border-purple-500"
                  />
                  <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3 pl-4">Short URL</th>
                    <th className="pb-3">Full Link</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3">Updated</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredURLs.map((url, index) => (
                    <motion.tr 
                      key={`${url.id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}
                    >
                      <td className="py-4 pl-4">
                        <div className="flex items-center">
                          <span className="font-medium text-purple-400">{url.short_url_key}</span>
                          <button
                            onClick={() => {/* Copy to clipboard logic */}}
                            className="ml-2 text-gray-400 hover:text-white"
                            title="Copy URL"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="max-w-xs truncate text-gray-300">
                          <a href={url.full_link} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400">
                            {url.full_link}
                          </a>
                        </div>
                      </td>
                      <td className="py-4 text-gray-400 text-sm">
                      {new Date(url.created_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-4 text-gray-400 text-sm">
                      {new Date(url.updated_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          url.full_link ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {url.full_link ? 'Assigned' : 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-4 text-right pr-4">
                        <div className="flex justify-end space-x-2">
                            <>
                              <button
                                onClick={() => {
                                  setSelectedURL(url)
                                  setShowAssignModal(true);
                                  setAssignData({ urlId: url.short_url_key, fullLink: url.full_link ?? '' })
                                }}
                                className={`p-1 rounded-md ${
                                  url.full_link ? 'text-yellow-400 hover:bg-yellow-900/30' : 'text-green-400 hover:bg-green-900/30'
                                }`}
                                title={url.full_link ? 'Reassign' : 'Assign'}
                              >
                                <Settings className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedURL(url);
                                  setTransferData({ urlId: url.short_url_key, recipientUsername: '' });
                                  setShowTransferModal(true);
                                }}
                                className="p-1 rounded-md text-blue-400 hover:bg-blue-900/30"
                                title="Transfer URL"
                              >
                                <Send className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedURL(url);
                                  setDeleteData({ urlId: url.short_url_key, confirm: '' });
                                  setShowDeleteModal(true);
                                }}
                                className="p-1 rounded-md text-red-400 hover:bg-red-900/30"
                                title="Delete URL"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* New URL Modal */}
      <AnimatePresence>
        {showNewURLModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-purple-500" />
                  Claim New URL
                </h2>
                <button
                  onClick={() => setShowNewURLModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleClaim();
                setShowNewURLModal(false);
              }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    URL Name
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-700 border border-r-0 border-gray-600 rounded-l-md text-gray-400">
                      ddfh.org/short/
                    </span>
                    <input
                      type="text"
                      value={newURLData.name}
                      onChange={e => setNewURLData({name: e.target.value})}
                      className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-r-md p-2 focus:outline-none focus:border-purple-500"
                      placeholder="placeholder"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewURLModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
                  >
                    Claim URL
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Transfer URL Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Send className="w-5 h-5 mr-2 text-blue-500" />
                  Transfer URL
                </h2>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-700 rounded-md">
                <p className="text-sm text-gray-300">
                  You are transferring the URL: <span className="font-bold text-purple-400">{selectedURL.short_url_key}</span>
                </p>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleTransfer();
                setShowTransferModal(false);
              }}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Recipient Username
                  </label>
                  <input
                    type="text"
                    value={transferData.recipientUsername}
                    onChange={(e) => setTransferData({...transferData, recipientUsername: e.target.value})}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:border-purple-500"
                    placeholder="Enter username"
                    required
                  />
                </div>
                
                <div className="p-3 mb-4 bg-yellow-900/30 border border-yellow-800 rounded-md">
                  <p className="text-yellow-300 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    This action cannot be undone. Once transferred, you will lose ownership of this URL.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                  >
                    Transfer URL
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-500" />
                  Assign URL
                </h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-700 rounded-md">
                <p className="text-sm text-gray-300">
                  You are assigning the URL: <span className="font-bold text-purple-400">{selectedURL.short_url_key}</span>
                </p>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAssign();
                setShowAssignModal(false);
              }}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    DDFH Link
                  </label>
                  <input
                    type="text"
                    value={assignData.fullLink}
                    onChange={(e) => setAssignData({...assignData, fullLink: e.target.value})}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:border-purple-500"
                    placeholder="Enter Full Link"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Panel Key
                  </label>
                  <input
                    type="text"
                    value={assignData.panelKey}
                    onChange={(e) => setAssignData({...assignData, panelKey: e.target.value})}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:border-purple-500"
                    placeholder="Enter Panel Key"
                    required
                  />
                </div>
                
                <div className="p-3 mb-4 bg-yellow-900/30 border border-yellow-800 rounded-md">
                  <p className="text-yellow-300 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    This action has a cooldown of 1 hour!
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                  >
                    Assign URL
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Send className="w-5 h-5 mr-2 text-blue-500" />
                  Transfer URL
                </h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-700 rounded-md">
                <p className="text-sm text-gray-300">
                  You are DELETING the URL: <span className="font-bold text-purple-400">{selectedURL.short_url_key}</span>
                </p>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleDelete();
                setShowDeleteModal(false);
              }}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Retype <span className="p-1 bg-gray-900 rounded-lg text-green-300 shadow-lg text-lg">{deleteData.urlId}</span> to confirm the deletion
                  </label>
                  <input
                    type="text"
                    value={deleteData.confirm}
                    onChange={(e) => setDeleteData({...deleteData, confirm: e.target.value})}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:border-purple-500"
                    placeholder="Repeat Key to Confirm"
                    required
                  />
                </div>
                
                <div className="p-3 mb-4 bg-yellow-900/30 border border-yellow-800 rounded-md">
                  <p className="text-yellow-300 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    This action cannot be undone. Once deleted the URL will drop to the public!
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                  >
                    Delete URL
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Empty State - No URLs */}
      {filteredURLs.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center mt-6"
        >
          <LinkIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-300">No URLs found</h3>
          <p className="text-gray-400 mt-2">
              "Claim your first custom URL to get started!" 
          </p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewURLModal(true)}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2 inline-block" />
              Claim New URL
            </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
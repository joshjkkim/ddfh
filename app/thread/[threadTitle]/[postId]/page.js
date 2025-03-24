"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FileText, FilePen, Trash2, Pencil, Loader2, Save } from "lucide-react";
import Link from "next/link";
import Header from "../../../components/Header";
import Avatar from "../../../components/Avatar";

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function PostDetailPage() {
  const { threadTitle, postId } = useParams();
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState({content: ""})

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/getSession");
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      }
    }
    fetchSession();
  }, []);

  // Fetch the post detail and its replies using the dynamic route parameters
  useEffect(() => {
    async function fetchPostDetail() {
      try {
        const res = await fetch(
          `/api/thread/${encodeURIComponent(threadTitle)}/${encodeURIComponent(postId)}`
        );
        if (!res.ok) {
          setError("Failed to fetch post details")
        }
        const data = await res.json();
        setPost(data.post);
        setReplies(data.replies || []);
        setFormValues({content: data.post.content})
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (threadTitle && postId) {
      fetchPostDetail();
    }
  }, [threadTitle, postId]);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };

  // Delete handler for both main post and replies
  const handleDeletePost = async (deletePostId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(
        `/api/thread/${encodeURIComponent(threadTitle)}/${deletePostId}/delete`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error)
      }
      // If deleting the main post, navigate back to the thread list
      if (deletePostId === post.id) {
        router.push(`/thread/${encodeURIComponent(threadTitle)}`);
      } else {
        // Otherwise, update the replies state
        setReplies(replies.filter(r => r.id !== deletePostId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      content: value
    }));
  };

  const handleEditPost = async () => {
    if (!confirm("Are you sure you want to edit this post?")) return;
    try {
      const formData = new FormData();
      formData.append("id", post.id);
      formData.append("content", formValues.content);
      const res = await fetch(
        `/api/thread/${encodeURIComponent(threadTitle)}/${post.id}/edit`,
        { 
          method: "PUT",
          body: formData,
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error)
      }
      // If deleting the main post, navigate back to the thread list
      //  await router.push(`/thread/${encodeURIComponent(threadTitle)}/${post.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/thread/${encodeURIComponent(threadTitle)}/${encodeURIComponent(postId)}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyContent }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error)
        return;
      }
      const data = await res.json();
      setReplies([...replies, data.reply]);
      setReplyContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium">Loading post details...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex flex-col items-center justify-center">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl font-bold text-red-400 mb-2">Post Not Found</p>
          <p className="text-gray-300 mb-6">{error || "The post you're looking for doesn't seem to exist."}</p>
          <Link href={`/thread/${encodeURIComponent(threadTitle)}`}>
            <div className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
              Back to Thread
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
        {/* Back Button */}
        <Link href={`/thread/${encodeURIComponent(threadTitle)}`}>
          <div className="flex items-center text-purple-400 hover:text-purple-300 mb-6 group cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Back to Thread</span>
          </div>
        </Link>

        {/* Main Post Details */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 shadow-lg mb-8 relative">
          {/* Delete Button for Main Post (if session user is owner) */}
          {session && session.id === post.author_id && (
            <div className="flex gap-5 justify-end">
              <button 
                onClick={() => setEditStatus(!editStatus)}
                className="relative top-4 right-4 text-yellow-500 hover:text-yellow-400"
                title="Edit Post"
              >
                <Pencil className="h-6 w-6" />
              </button>
              <button 
                onClick={() => handleDeletePost(post.id)}
                className="relative top-4 right-4 text-red-500 hover:text-red-400"
                title="Delete Post"
              >
                <Trash2 className="h-6 w-6" />
              </button>
            </div>
          )}
          <div className="flex items-start">
            <div className="w-10 h-10 mr-3 flex-shrink-0">
              <Avatar 
                avatarKey={post.author_pfp} 
                alt={`${post.author_username}'s avatar`} 
                className="rounded-full" 
              />
            </div>
            {!editStatus ? (
              <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{post.author_username}</h1>
              <div className="text-gray-400 text-sm mb-4">
                {new Date(post.created_at).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {post.share_file_key && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4 flex items-center">
                  <button onClick={() => copyToClipboard(post.share_file_key, 'link')} className="overflow-x-auto inline-flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {!copyStatus ? 
                      <span className="text-gray-300 text-sm truncate">{post.share_file_key}</span>
                      :
                      <span className="text-green-300 text-sm truncate">Copied!</span>
                    }
                  </button>
                </div>
              )}
              {post.share_file_key && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <div className="flex items-center mb-1">
                    <FilePen className="h-4 w-4 mr-1 text-blue-400" />
                    <span className="text-md font-medium">File Name</span>
                  </div>
                  <p className="font-bold text-center">
                    {new URL(post.share_file_key, "http://localhost").searchParams.get("filename").replace(/^[^-]*-/, "")}
                  </p>
                </div>
              )}
              {post.file_size && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <div className="flex items-center mb-1">
                    <FileText className="h-4 w-4 mr-1 text-cyan-400" />
                    <span className="text-md font-medium">File Size</span>
                  </div>
                  <p className="font-bold text-center">{formatFileSize(post.file_size)}</p>
                </div>
              )}
              <div className="text-gray-200 whitespace-pre-line text-lg leading-relaxed">{post.content}</div>
            </div>
           ) : (
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{post.author_username}</h1>
              <div className="text-gray-400 text-sm mb-4">
                {new Date(post.created_at).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {post.share_file_key && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4 flex items-center">
                  <button onClick={() => copyToClipboard(post.share_file_key, 'link')} className="overflow-x-auto inline-flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {!copyStatus ? 
                      <span className="text-gray-300 text-sm truncate">{post.share_file_key}</span>
                      :
                      <span className="text-green-300 text-sm truncate">Copied!</span>
                    }
                  </button>
                </div>
              )}
              {post.share_file_key && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <div className="flex items-center mb-1">
                    <FilePen className="h-4 w-4 mr-1 text-blue-400" />
                    <span className="text-md font-medium">File Name</span>
                  </div>
                  <p className="font-bold text-center">
                    {new URL(post.share_file_key, "http://localhost").searchParams.get("filename").replace(/^[^-]*-/, "")}
                  </p>
                </div>
              )}
              {post.file_size && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <div className="flex items-center mb-1">
                    <FileText className="h-4 w-4 mr-1 text-cyan-400" />
                    <span className="text-md font-medium">File Size</span>
                  </div>
                  <p className="font-bold text-center">{formatFileSize(post.file_size)}</p>
                </div>
              )}
              <form onSubmit={handleEditPost}>
                <textarea
                type="text"
                  id="username"
                  name="username"
                  value={formValues.content}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                </textarea>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium flex items-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>
            )}
            
          </div>
        </div>

        {/* Replies Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              Replies
              {replies.length > 0 && (
                <span className="ml-2 text-sm bg-purple-600 text-white px-2 py-1 rounded-full">
                  {replies.length}
                </span>
              )}
            </h2>
          </div>
          
          {replies.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p className="text-xl font-medium text-gray-300">No replies yet</p>
              <p className="text-gray-500 mt-2">Be the first to join the conversation!</p>
            </div>
          ) : (
            <div className="space-y-5 mb-8">
              {replies.map((reply) => (
                <div key={reply.id} className="bg-gray-800/60 border border-gray-700 rounded-lg p-5 relative">
                  {/* Delete Button for Reply if the logged in user is the author */}
                  {session && session.id === reply.author_id && (
                    <button 
                      onClick={() => handleDeletePost(reply.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-400"
                      title="Delete Reply"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    
                  )}
                  <div className="flex items-start">
                    <div className="w-10 h-10 mr-3 flex-shrink-0">
                      <Avatar 
                        avatarKey={reply.author_pfp} 
                        alt={`${reply.author_username}'s avatar`} 
                        className="rounded-full" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div className="font-medium text-gray-200">{reply.author_username}</div>
                        <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                          {new Date(reply.created_at).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <p className="text-gray-300 whitespace-pre-line">{reply.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Leave a Reply</h2>
          <form onSubmit={handleReplySubmit}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts..."
              required
              className="w-full p-4 rounded-lg bg-gray-700/80 border border-gray-600 focus:border-purple-500 focus:ring focus:ring-purple-500/20 focus:outline-none transition-all mb-4 text-gray-100 placeholder-gray-400"
              rows={4}
            ></textarea>
            <button
              type="submit"
              disabled={submitting || !replyContent.trim()}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                submitting || !replyContent.trim()
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-purple-500/20"
              }`}
            >
              {submitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Reply"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

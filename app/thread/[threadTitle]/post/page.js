"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LinkIcon, Key, FileText, AlertCircle, Upload } from "lucide-react";

export default function CreateMarketPostPage() {
  const { threadTitle } = useParams();
  const router = useRouter();
  const decodedThreadTitle = decodeURIComponent(threadTitle);

  const [formData, setFormData] = useState({
    shareableLink: "",
    panelKey: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [session, setSession] = useState(null);
  const MAX_CHAR_COUNT = 500;

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
        console.error("Error fetching session:", err);
      }
    }
    fetchSession();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Update character count for description
    if (name === "description") {
      setCharCount(value.length);
    }
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate shareableLink
    if (!formData.shareableLink) {
      newErrors.shareableLink = "File link is required";
    } else if (!isValidUrl(formData.shareableLink)) {
      newErrors.shareableLink = "Please enter a valid URL";
    }
    
    // Validate panelKey
    if (!formData.panelKey) {
      newErrors.panelKey = "Panel key is required";
    } else if (formData.panelKey.length < 5) {
      newErrors.panelKey = "Panel key must be at least 5 characters";
    }
    
    // Validate description length
    if (formData.description.length > MAX_CHAR_COUNT) {
      newErrors.description = `Description exceeds maximum of ${MAX_CHAR_COUNT} characters`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const res = await fetch(`/api/thread/${encodeURIComponent(threadTitle)}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setErrors(data.error)
      }
      
      // On success, navigate back to the thread page
      router.push(`/thread/${encodeURIComponent(threadTitle)}`);
    } catch (err) {
      setErrors(prev => ({ ...prev, general: err.message }));
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/thread/${encodeURIComponent(threadTitle)}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={handleCancel}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to {decodedThreadTitle}
        </button>
        
        <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Create Marketplace Post</h1>
          <p className="text-gray-400 mb-6">Share your file with the community in "{decodedThreadTitle}"</p>
          
          {errors.general && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-md flex items-start">
              <AlertCircle size={20} className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-red-400">{errors.general}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <LinkIcon size={16} className="mr-2" />
                  Shareable File Link <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="url"
                  name="shareableLink"
                  placeholder="https://your-storage-link.com/your-file"
                  value={formData.shareableLink}
                  onChange={handleChange}
                  className={`w-full p-3 rounded bg-gray-700 border ${
                    errors.shareableLink ? "border-red-500" : "border-gray-600"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.shareableLink && (
                  <p className="mt-1 text-sm text-red-500">{errors.shareableLink}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Provide a public, accessible link to your file (S3, Dropbox, Google Drive, etc.)
                </p>
              </div>
              
              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <Key size={16} className="mr-2" />
                  Panel Key <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="panelKey"
                  placeholder="Enter your panel key"
                  value={formData.panelKey}
                  onChange={handleChange}
                  className={`w-full p-3 rounded bg-gray-700 border ${
                    errors.panelKey ? "border-red-500" : "border-gray-600"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.panelKey && (
                  <p className="mt-1 text-sm text-red-500">{errors.panelKey}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Required for verification purposes
                </p>
              </div>
              
              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <FileText size={16} className="mr-2" />
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Describe your file and what it contains (optional)"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full p-3 rounded bg-gray-700 border ${
                    errors.description ? "border-red-500" : "border-gray-600"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                ></textarea>
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                )}
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    Add details about your file to help others understand what you're sharing
                  </p>
                  <p className={`text-xs ${charCount > MAX_CHAR_COUNT ? "text-red-500" : "text-gray-400"}`}>
                    {charCount}/{MAX_CHAR_COUNT}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="py-3 px-5 rounded-md font-medium bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-3 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Post...
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="mr-2" />
                      Create Marketplace Listing
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
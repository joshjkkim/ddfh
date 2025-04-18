"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  LinkIcon, 
  Key, 
  FileText, 
  AlertCircle, 
  Upload, 
  Info, 
  CheckCircle, 
  Clipboard, 
  Eye,
  EyeOff
} from "lucide-react";

const MAX_CHAR_COUNT = 500;
const MAX_TITLE_COUNT = 50;

export default function CreateMarketPostPage() {
  let { threadTitle } = useParams();
  threadTitle = decodeURIComponent(threadTitle);
  const router = useRouter();
  const decodedThreadTitle = decodeURIComponent(threadTitle);

  const [formData, setFormData] = useState({
    shareableLink: "",
    panelKey: "",
    description: "",
    title: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [titleCharCount, setTitleCharCount] = useState(0);
  const [session, setSession] = useState(null);
  const [isContentOnly, setIsContentOnly] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);


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
    const { name, value, type, checked } = e.target;
  
    // Handle the checkbox toggle separately
    if (type === "checkbox" && name === "isContentOnly") {
      setIsContentOnly(checked);
      // If content-only mode is enabled, clear shareableLink and panelKey
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          shareableLink: "",
          panelKey: ""
        }));
      }
      return;
    }
  
    // Generic formData update
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  
    // Update character count for description
    if (name === "description") {
      setCharCount(value.length);
    }
  
    // Update character count for title
    if (name === "title") {
      setTitleCharCount(value.length);
    }
  
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null
      }));
    }
  };
  

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Only validate shareableLink and panelKey if not in content-only mode
    if (!isContentOnly) {
      if (!formData.shareableLink) {
        newErrors.shareableLink = "File link is required";
      } else if (!isValidUrl(formData.shareableLink)) {
        newErrors.shareableLink = "Please enter a valid URL";
      }
      
      if (!formData.panelKey) {
        newErrors.panelKey = "Panel key is required";
      } else if (formData.panelKey.length < 5) {
        newErrors.panelKey = "Panel key must be at least 5 characters";
      }
    }
    
    // Validate description length
    if (formData.description.length > MAX_CHAR_COUNT) {
      newErrors.description = `Description exceeds maximum of ${MAX_CHAR_COUNT} characters`;
    }

    if (formData.title.length > MAX_TITLE_COUNT) {
      newErrors.title = `Title exceeds maximum of ${MAX_TITLE_COUNT} characters`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    // In content-only mode, send null for shareableLink and panelKey
    const payload = {
      shareableLink: isContentOnly ? null : formData.shareableLink,
      panelKey: isContentOnly ? null : formData.panelKey,
      description: formData.description,
      title: formData.title,
    };

    try {
      const res = await fetch(`/api/thread/${encodeURIComponent(threadTitle)}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setErrors({ general: data.error });
        setLoading(false);
        return;
      }      
      
      setFormSubmitted(true);
      setTimeout(() => {
        // On success, navigate back to the thread page
        router.push(`/thread/${encodeURIComponent(threadTitle)}`);
      }, 1500);
    } catch (err) {
      setErrors((prev) => ({ ...prev, general: err.message }));
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/thread/${encodeURIComponent(threadTitle)}`);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
        
        <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg border border-gray-700">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">Create Marketplace Post</h1>
              <p className="text-gray-400">Share your file with the community in {decodedThreadTitle}</p>
            </div>
            <div className="bg-purple-600/20 rounded-full p-3">
              <Upload size={24} className="text-purple-400" />
            </div>
          </div>
          
          {formSubmitted && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-800 rounded-md flex items-start animate-pulse">
              <CheckCircle size={20} className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-green-400">Post created successfully! Redirecting...</p>
            </div>
          )}
          
          {errors.general && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-md flex items-start">
              <AlertCircle size={20} className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-red-400">{errors.general}</p>
            </div>
          )}

          {/* Toggle for Content-Only Post */}
          <div className="mb-6 flex items-center p-3 bg-gray-700/50 rounded-lg border border-gray-600">
            <input
              type="checkbox"
              name="isContentOnly"
              id="isContentOnly"
              checked={isContentOnly}
              onChange={handleChange}
              className="mr-2 h-4 w-4 accent-purple-600"
            />
            <label htmlFor="isContentOnly" className="text-sm text-gray-300 flex-1">
              Post content only (no file link or panel key)
            </label>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setTooltipVisible(true)}
                onMouseLeave={() => setTooltipVisible(false)}
                className="text-gray-400 hover:text-white"
              >
                <Info size={16} />
              </button>
              {tooltipVisible && (
                <div className="absolute right-0 -bottom-20 w-64 p-3 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10 text-xs text-gray-300">
                  Choose this option if you just want to share text without linking to an external file.
                </div>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {!isContentOnly && (
                <>
                  <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                    <label className="flex items-center text-sm font-medium mb-3 text-purple-300">
                      <LinkIcon size={16} className="mr-2" />
                      Shareable File Link <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        name="shareableLink"
                        placeholder="https://ddfh.org/[shareId]"
                        value={formData.shareableLink}
                        onChange={handleChange}
                        disabled={isContentOnly}
                        className={`w-full p-3 pl-4 pr-12 rounded-md bg-gray-700 border ${
                          errors.shareableLink ? "border-red-500" : "border-gray-600"
                        } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      />
                      {formData.shareableLink && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formData.shareableLink)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                          title="Copy link"
                        >
                          {linkCopied ? 
                            <CheckCircle size={18} className="text-green-500" /> : 
                            <Clipboard size={18} />}
                        </button>
                      )}
                    </div>
                    {errors.shareableLink && (
                      <p className="mt-2 text-sm text-red-500 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.shareableLink}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-red-400 flex items-start">
                      <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      No shortened URLs Here
                    </p>
                  </div>
                  
                  <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                    <label className="flex items-center text-sm font-medium mb-3 text-purple-300">
                      <Key size={16} className="mr-2" />
                      Panel Key <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="panelKey"
                        placeholder="Enter your panel key"
                        value={formData.panelKey}
                        onChange={handleChange}
                        disabled={isContentOnly}
                        className={`w-full p-3 pl-4 pr-12 rounded-md bg-gray-700 border ${
                          errors.panelKey ? "border-red-500" : "border-gray-600"
                        } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.panelKey && (
                      <p className="mt-2 text-sm text-red-500 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.panelKey}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400 flex items-start">
                      <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      Required for verification purposes
                    </p>
                  </div>
                </>
              )}

              <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                <label
                  htmlFor="title"
                  className="flex items-center text-sm font-medium mb-2 text-purple-300"
                >
                  <FileText size={16} className="mr-2" />
                  Title
                </label>
                <textarea
                  id="title"
                  name="title"
                  placeholder="Enter a title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  rows={2}                                // <-- shorter height
                  className={`w-full p-2 rounded-md bg-gray-700 border ${
                    errors.title ? "border-red-500" : "border-gray-600"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.title}
                  </p>
                )}
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-400 flex items-start">
                    <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                    Short headline for your file
                  </p>
                  <p
                    className={`text-xs font-mono ${
                      titleCharCount > MAX_TITLE_COUNT
                        ? "text-red-500"
                        : titleCharCount > MAX_TITLE_COUNT * 0.8
                        ? "text-yellow-500"
                        : "text-gray-400"
                    }`}
                  >
                    {titleCharCount}/{MAX_TITLE_COUNT}
                  </p>
                </div>
              </div>

              {/* Description Field */}
              <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 mt-4">
                <label
                  htmlFor="description"
                  className="flex items-center text-sm font-medium mb-2 text-purple-300"
                >
                  <FileText size={16} className="mr-2" />
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Describe your file and what it contains"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className={`w-full p-3 rounded-md bg-gray-700 border ${
                    errors.description ? "border-red-500" : "border-gray-600"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.description}
                  </p>
                )}
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-400 flex items-start">
                    <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                    Add details about your file to help others understand what you are sharing
                  </p>
                  <p
                    className={`text-xs font-mono ${
                      charCount > MAX_CHAR_COUNT
                        ? "text-red-500"
                        : charCount > MAX_CHAR_COUNT * 0.8
                        ? "text-yellow-500"
                        : "text-gray-400"
                    }`}
                  >
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
                  disabled={loading || formSubmitted}
                  className={`py-3 px-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md font-medium transition-colors flex items-center justify-center ${
                    (loading || formSubmitted) ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Post...
                    </>
                  ) : formSubmitted ? (
                    <>
                      <CheckCircle size={18} className="mr-2" />
                      Post Created!
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
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, MessageCircleWarning, Upload, Shield, Key, Share2, FileText, Lock, RefreshCw, Sparkles, Lollipop, Info, Clock, Eye, EyeClosed, User, UserCheck, Scissors, FolderCog, Folder } from 'lucide-react';
import { generateAESKey, encryptData, exportKey } from "./lib/encrypt"; // adjust path accordingly
import { buf as crc32Buffer } from "crc-32";
import { useRouter } from "next/navigation";
import { solveChallenge } from './utils/solveChallenge';

// ...
// Constants
const MaxFileSize = 5 * 1024 * 1024 * 1024; // 5 GB

// Helper: format seconds into a friendly string
function formatSeconds(seconds) {
  if (seconds >= 86400) {
    const days = Math.round(seconds / 86400);
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

// Helper: compute maximum allowed expiry based on file size.
function computeMaxExpiry(fileSize) {
  const maxAllowed = 2592000; // 1 month in seconds
  const minAllowed = 3600;    // 1 hour in seconds
  if (fileSize >= MaxFileSize) return minAllowed;
  const ratio = fileSize / MaxFileSize;
  // Using a logarithmic curve
  const scaled = 1 - Math.log(1 + ratio) / Math.log(2);
  return Math.floor(minAllowed + (maxAllowed - minAllowed) * scaled);
}

function parseDuration(durationStr) {
  const str = durationStr.trim().toLowerCase();
  const regex = /^(\d+)(s|m|h|d)?$/;
  const match = str.match(regex);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2] || "s";
  switch (unit) {
    case "d": return value * 86400;
    case "h": return value * 3600;
    case "m": return value * 60;
    default: return value;
  }
}

// Helper: generate a secure random panel key (hex string)
function generatePanelKey(length = 32) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function generateShortURL(length = 8) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper: format file size in a human-readable format
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [publicShareLink, setPublicShareLink] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [panelKey, setPanelKey] = useState('');
  const fileInputRef = useRef(null);
  const [expiry, setExpiry] = useState(3600); // default to 1 hour
  const [expiryInput, setExpiryInput] = useState("1h");
  const [progress, setProgress] = useState(0);
  const [maxAccesses, setMaxAccesses] = useState(10);
  const [copyStatus, setCopyStatus] = useState({
    link: false,
    key: false,
    panel: false
  });
  const [showTooltip, setShowTooltip] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [autoDecryptEnabled, setAutoDecryptEnabled] = useState(false);
  const [isShortUrl, setIsShortUrl] = useState(false)
  const [shortUrl, setShortUrl] = useState("");
  const [session, setSession] = useState(null)

  const router = useRouter();

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
        }}
      fetchSession();
    }, []);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const uploadedFile = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(uploadedFile);
  };

  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault();
    const uploadedFile = e.target.files && e.target.files[0];
    handleFile(uploadedFile);
  };

  // Process selected file and compute dynamic expiry
  const handleFile = (uploadedFile) => {
    if (uploadedFile) {
      if (uploadedFile.size > MaxFileSize) {
        alert("File size exceeds the 5 GB limit. Please choose a smaller file.");
        return;
      }
      const allowedExpiry = computeMaxExpiry(uploadedFile.size);
      setExpiry(allowedExpiry);
      setExpiryInput(formatSeconds(allowedExpiry));
      setFile(uploadedFile);
    }
  };

  // Trigger file input click
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  async function computeCRC32Checksum(buffer) {
    const checksum = crc32Buffer(new Uint8Array(buffer));
    const bytes = new Uint8Array(4);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, checksum >>> 0, false);
    return btoa(String.fromCharCode(...bytes));
  }

  // Simulate progress for better UX
  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.floor(Math.random() * 10) + 1;
      });
    }, 300);
  };

  // Handle expiry input change (user-friendly)
  const handleExpiryChange = (e) => {
    const input = e.target.value;
    setExpiryInput(input);
    const parsed = parseDuration(input);
    if (parsed !== null && file) {
      const allowedMax = computeMaxExpiry(file.size);
      setExpiry(parsed > allowedMax ? allowedMax : parsed);
    }
  };

  const shortenUrl = async () => {
    try {
      let shortUrlKey;
      let isCustomUrl = false;
      if(!session || !shortUrl) {
        shortUrlKey = generateShortURL();
      } else {
        shortUrlKey = shortUrl;
        isCustomUrl = true;
      }
      let shareLink = publicShareLink;

      if(autoDecryptEnabled && privateKey) {
        shareLink = `${publicShareLink}&decryptionKey=${privateKey}`;
      }

      const res = await fetch('/api/shortUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortUrlKey,
          fullLink: shareLink,
          isCustomUrl: isCustomUrl
        }),
      });
      if(!res.ok) {
        throw new Error("Failed to shorten URL")
      }
      const data = await res.json();
      setShortUrl(data.shortUrlKey);
      setIsShortUrl(true);
      
    } catch(e) {

    }
  }
  // Upload file with encryption
  const uploadFile = async () => {
    if (!file) return;
    setIsUploading(true);
    simulateProgress();
  
    try {
      const powRes = await fetch('/api/create-challenge');
      if (!powRes.ok) throw new Error('Failed to get challenge');
      const { challenge, target } = await powRes.json();
      console.log(`Challenge received: ${challenge}, Target: ${target}`);
  
      const nonce = solveChallenge(challenge, target);
      if (!nonce) throw new Error('Failed to solve proof-of-work challenge');
      console.log(`Challenge solved with nonce: ${nonce}`);
  
      const key = await generateAESKey();
  
      const fileBuffer = await file.arrayBuffer();
      const { ciphertext, iv } = await encryptData(key, fileBuffer);
      const computedChecksum = await computeCRC32Checksum(ciphertext);
  
      const exportedKey = await exportKey(key);
  
      const shareId = Math.random().toString(36).substring(2, 15);
      const s3Filename = `${shareId}-${file.name}`;
  
      const generatedPanelKey = generatePanelKey();
      setPanelKey(generatedPanelKey);
  
      const res = await fetch(
        `/api/getPresignedPost?filename=${encodeURIComponent(s3Filename)}&filesize=${file.size}&checksum=${computedChecksum}&expiry=${expiry}&nonce=${nonce}&challenge=${encodeURIComponent(challenge)}`
      );
      if (!res.ok) {
        throw new Error("Failed to obtain pre-signed POST");
      }

      const presignedPost = await res.json();
  
      const formData = new FormData();
      // Append all fields from presignedPost.fields
      Object.entries(presignedPost.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      // Note: The field name for S3 must be "file"
      formData.append("file", new Blob([ciphertext], { type: "application/octet-stream" }));
  
      const uploadRes = await fetch(presignedPost.url, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to S3");
      }
  
      setProgress(100);
      setIsUploading(false);
      setIsGeneratingKeys(true);
  
      // Convert IV to base64
      const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
  
      // Optional delay for UI purposes
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      // 🔥 Step 6: Log Metadata to Postgres (Neon)
      const expirationTimestamp = new Date(Date.now() + expiry * 1000).toISOString();
      await fetch('/api/logFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareId,
          originalFilename: file.name,
          s3Key: s3Filename,
          fileSize: file.size,
          expirationTimestamp,
          panelKey: generatedPanelKey,
          timesAccessed: 0,
          maxAccesses: maxAccesses,
        }),
      });
  
      // 🔥 Step 7: Display Share Link and Keys
      setPublicShareLink(
        `http://localhost:3000/share/${shareId}?filename=${encodeURIComponent(s3Filename)}&iv=${encodeURIComponent(ivBase64)}`
      );
      setPrivateKey(exportedKey);
      setIsGeneratingKeys(false);
      setUploadComplete(true);
    } catch (error) {
      console.error("Error during file upload:", error);
      setIsUploading(false);
      setIsGeneratingKeys(false);
      alert("Failed to upload file. Please try again.");
    }
  };

  // Copy text to clipboard with feedback
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };

  // Reset the form
  const resetForm = () => {
    setFile(null);
    setUploadComplete(false);
    setPublicShareLink('');
    setPrivateKey('');
    setPanelKey('');
    setProgress(0);
    setExpiry(3600);
    setExpiryInput("1h");
    setMaxAccesses(10);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100">
      <div className="container mx-auto px-4 py-16">
        <header className="mb-16 text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <Lollipop className="h-12 w-12 text-cyan-400 mr-2" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              DDFH
            </h1>
          </div>
          <p className="text-gray-300 max-w-xl mx-auto text-lg">
            End-to-end encrypted file hosting with zero knowledge architecture.
            Your files remain private, only accessible with the right key.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center bg-gray-800/40 px-3 py-1 rounded-full">
              <Shield className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-xs text-gray-300">Zero-knowledge</span>
            </div>
            <div className="flex items-center bg-gray-800/40 px-3 py-1 rounded-full">
              <Lock className="h-4 w-4 text-yellow-400 mr-1" />
              <span className="text-xs text-gray-300">End-to-end encrypted</span>
            </div>
            <div className="flex items-center bg-gray-800/40 px-3 py-1 rounded-full">
              <Clock className="h-4 w-4 text-cyan-400 mr-1" />
              <span className="text-xs text-gray-300">Time-limited sharing</span>
            </div>
          </div>
        </header>
        
        <div className="flex flex-row justify-center gap-3" >
          <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/panel")}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-800 hover:to-green-600 hover:scale-110 text-white rounded-full transition-all ease-in-out duration-200 min-w-[150px] text-center justify-center"
            onMouseEnter={() => setIsHovered(true)}  // Set hover state to true when mouse enters
            onMouseLeave={() => setIsHovered(false)}  // Set hover state to false when mouse leaves
          >
            {isHovered ? (
              <Eye className="h-5 w-5 mr-2" />
            ) : (
              <EyeClosed className="h-5 w-5 mr-2" />
            )}
            <strong>Go to Panel</strong>
          </button>
          </div>

          <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/login")}
            className="inline-flex px-4 py-2 bg-gradient-to-r from-green-600 via-green-400 to-green-600 hover:from-green-800 hover:via-green-600 hover:to-green-800 hover:scale-110 text-white rounded-full transition-all ease-in-out duration-200 min-w-[150px] justify-center"
            onMouseEnter={() => setIsHovered(true)}  // Set hover state to true when mouse enters
            onMouseLeave={() => setIsHovered(false)}  // Set hover state to false when mouse leaves
          >
            {isHovered ? (
              <UserCheck className="h-5 w-5 mr-2" />
            ) : (
              <User className="h-5 w-5 mr-2" />
            )}
            <strong>Login: <span className="text-sm">{session ? session.username : "Logged Out"}</span></strong>
          </button>
          </div>

          <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/faq")}
            className="inline-flex px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-600 hover:to-green-800 hover:scale-110 text-white rounded-full transition-all ease-in-out duration-200 min-w-[150px] justify-center"
            onMouseEnter={() => setIsHovered(true)}  // Set hover state to true when mouse enters
            onMouseLeave={() => setIsHovered(false)}  // Set hover state to false when mouse leaves
          >
            {isHovered ? (
              <MessageCircleWarning className="h-5 w-5 mr-2" />
            ) : (
              <MessageCircleQuestion className="h-5 w-5 mr-2" />
            )}
            <strong>FAQ</strong>
          </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto relative">
          {!uploadComplete ? (
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-gray-700/50">
              <div 
                className={`border-2 border-dashed rounded-lg p-10 text-center transition-all duration-300 ${dragActive 
                  ? 'border-cyan-400 bg-gray-700/80' 
                  : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={openFileDialog}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleChange}
                />
                
                <div className="relative">
                  <div className={`mx-auto h-24 w-24 rounded-full bg-gradient-to-r ${dragActive ? 'from-cyan-500/20 to-purple-500/20 animate-pulse' : 'from-gray-700/20 to-gray-600/20'} flex items-center justify-center transition-all duration-300`}>
                    <Upload className={`h-12 w-12 transition-all duration-300 ${dragActive ? 'text-cyan-400 scale-110' : 'text-gray-400'}`} />
                  </div>
                </div>
                
                {file ? (
                  <div className="mt-6">
                    <p className="text-xl font-medium mb-2 text-cyan-300">{file.name}</p>
                    <p className="text-gray-400 mb-6">{formatFileSize(file.size)}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label htmlFor="expiry" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          URL Expiry:
                          <div 
                            className="ml-1 relative" 
                            onMouseEnter={() => setShowTooltip("expiry")} 
                            onMouseLeave={() => setShowTooltip("")}
                          >
                            <Info className="h-3 w-3 text-gray-500" />
                            {showTooltip === "expiry" && (
                              <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-gray-800 rounded-md text-xs z-10">
                                Link will expire after this time. Format: 1h (hour), 1d (day), 30m (minutes).
                              </div>
                            )}
                          </div>
                        </label>
                        <input
                          type="text"
                          id="expiry"
                          value={expiryInput}
                          placeholder="e.g. 1h, 2d, 30m"
                          onClick={(e) => e.stopPropagation()}
                          onChange={handleExpiryChange}
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/70 text-gray-100 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="maxAccesses" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          Max Accesses:
                          <div 
                            className="ml-1 relative" 
                            onMouseEnter={() => setShowTooltip("access")} 
                            onMouseLeave={() => setShowTooltip("")}
                          >
                            <Info className="h-3 w-3 text-gray-500" />
                            {showTooltip === "access" && (
                              <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-gray-800 rounded-md text-xs z-10">
                                Maximum number of times this file can be accessed.
                              </div>
                            )}
                          </div>
                        </label>
                        <input
                          type="number"
                          id="maxAccesses"
                          value={maxAccesses}
                          placeholder="e.g. 5"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setMaxAccesses(parseInt(e.target.value) || 999)}
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/70 text-gray-100 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {file && (
                      <p className="text-xs text-gray-400 mb-4">
                        Maximum allowed expiry for this file is {formatSeconds(computeMaxExpiry(file.size))}.
                        {expiry !== null && (
                          <span> Current setting: {formatSeconds(expiry)}.</span>
                        )}
                      </p>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        uploadFile();
                      }}
                      disabled={isUploading}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-medium py-3 px-8 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 transform hover:scale-105"
                    >
                      <div className="flex items-center justify-center">
                        {isUploading ? (
                          <>
                            <RefreshCw className="animate-spin h-5 w-5 mr-3" />
                            <span>Encrypting...</span>
                          </>
                        ) : (
                          <>
                            <Shield className="h-5 w-5 mr-3" />
                            <span>Encrypt & Upload</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-2xl font-medium mb-2 text-cyan-200">Drop your file here</p>
                    <p className="text-gray-400">or click to browse</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300">Up to 5GB</span>
                      <span className="px-3 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300">Auto-expiry</span>
                      <span className="px-3 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300">Encrypted</span>
                    </div>
                  </div>
                )}
              </div>
              
              {(isUploading || isGeneratingKeys) && (
                <div className="mt-8 p-4 bg-gray-700/70 rounded-md border border-gray-600/50">
                  {isUploading && (
                    <div>
                      <div className="flex items-center mb-2">
                        <RefreshCw className="animate-spin h-5 w-5 mr-3 text-cyan-400" />
                        <span>{progress < 50 ? "Encrypting data locally..." : "Uploading securely..."}</span>
                      </div>
                      
                      <div className="w-full bg-gray-800 rounded-full h-2.5 mb-4 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{progress < 50 ? "Encrypting" : "Uploading"}</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  )}
                  
                  {isGeneratingKeys && (
                    <div className="flex items-center">
                      <Key className="h-5 w-5 mr-3 text-yellow-400 animate-pulse" />
                      <span>Generating secure encryption keys...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-gray-700/50">
            <div className="text-center mb-8">
              <div className="mx-auto h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Shield className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">File Encrypted &amp; Uploaded!</h2>
              <p className="text-gray-300">Your file has been securely encrypted and is ready to share</p>
              <div className="mt-2 py-1 px-4 bg-gray-700/40 inline-block rounded-full text-xs text-gray-300">
                Expires in {formatSeconds(expiry)}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Public Share Link */}
              <div className="bg-gray-700/70 p-4 rounded-lg border border-gray-600/50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <Share2 className="h-5 w-5 mr-2 text-cyan-400" />
                    <span className="font-medium">Public Share Link</span>
                  </div>
                  <button 
                    onClick={() =>
                      copyToClipboard(
                        autoDecryptEnabled
                          ? `${publicShareLink}&decryptionKey=${privateKey}`
                          : publicShareLink,
                        'link'
                      )
                    }
                    className={`text-cyan-400 hover:text-cyan-300 hover:scale-110 text-sm ${copyStatus.link ? 'bg-green-800/50' : 'bg-gray-800/50'} px-3 py-1 rounded-full transition-all ease-in-out duration-200`}
                  >
                    {copyStatus.link ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-800/80 p-3 rounded-md text-sm font-mono break-all max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                  {autoDecryptEnabled
                          ? `${publicShareLink}&decryptionKey=${privateKey}`
                          : publicShareLink}
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center">
                  <Share2 className="h-3 w-3 mr-1" />
                  Anyone with this link can download the encrypted file BUT not the decrypted file
                </p>
                {/* Automatic Decryption Toggle */}
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center">
                    <FolderCog className="h-5 w-5 mr-2 text-cyan-400" />
                    <span className="font-medium">Automatic Decryption</span>
                  </div>
                  <button 
                    onClick={() => setAutoDecryptEnabled(!autoDecryptEnabled)}
                    className="text-sm px-3 py-1 rounded-full transition-all ease-in-out duration-200 bg-gray-800/50 text-cyan-400 hover:bg-cyan-600 hover:text-white"
                  >
                    {autoDecryptEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center">
                    <Scissors className="h-5 w-5 mr-2 text-cyan-400" />
                    <span className="font-medium">Shortened URL</span>
                  </div>
                  <button 
                    onClick={() => shortenUrl()}
                    className={`text-sm px-3 py-1 rounded-full transition-all ease-in-out duration-200 bg-gray-800/50 text-cyan-400 ${isShortUrl ? "hover:bg-red-600" : "hover:bg-cyan-600"} hover:text-white`}
                    disabled={isShortUrl}
                  >
                    Shorten URL?
                  </button>
                  {session && (
                    <div className="mt-4">
                      <label className="flex items-center text-sm font-medium mb-2">
                        <Share2 size={16} className="mr-2" />
                        Custom Short URL Key
                      </label>
                      <input
                        type="text"
                        value={shortUrl}
                        onChange={(e) => setShortUrl(e.target.value)}
                        placeholder="Enter your custom key"
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="mt-1 text-xs text-gray-400">Only available to valid users.</p>
                    </div>
                  )}
                </div>
                
                {isShortUrl && shortUrl && (
                  <>
                    <button 
                      onClick={() =>
                        copyToClipboard(
                          `http://localhost:3000/short/${shortUrl}`,
                          'short'
                        )
                      }
                      className={`text-cyan-400 hover:text-cyan-300 hover:scale-110 text-sm ${copyStatus.short ? 'bg-green-800/50' : 'bg-gray-800/50'} px-3 py-1 rounded-full transition-all ease-in-out duration-200`}
                    >
                      {copyStatus.short ? 'Copied!' : 'Copy'}
                    </button>
                    <div className="bg-gray-800/80 p-3 rounded-md text-sm font-mono break-all max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800 mt-4">
                      http://localhost:3000/short/{shortUrl}
                    </div>
                  </>
                )}

                
              </div>
              
              <div className="bg-gray-700/70 p-4 rounded-lg border border-gray-600/50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <Key className="h-5 w-5 mr-2 text-yellow-400" />
                    <span className="font-medium">Private Decryption Key</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(privateKey, 'key')}
                    className={`text-cyan-400 hover:text-cyan-300 hover:scale-110 text-sm ${copyStatus.key ? 'bg-green-800/50' : 'bg-gray-800/50'} px-3 py-1 rounded-full transition-all ease-in-out duration-200`}
                  >
                    {copyStatus.key ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-800/80 p-3 rounded-md text-sm font-mono break-all max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                  {privateKey}
                </div>
                <p className="text-xs text-red-400 mt-2 flex items-center">
                  <Lock className="h-3 w-3 mr-1" />
                  Save this key securely! It cannot be recovered and is required to decrypt your file.
                </p>
              </div>
              
              <div className="bg-gray-700/70 p-4 rounded-lg border border-gray-600/50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <Key className="h-5 w-5 mr-2 text-green-400" />
                    <span className="font-medium">Panel Key</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(panelKey, 'panel')}
                    className={`text-cyan-400 hover:text-cyan-300 hover:scale-110 text-sm ${copyStatus.panel ? 'bg-green-800/50' : 'bg-gray-800/50'} px-3 py-1 rounded-full transition-all duration-300 ease-in-out`}
                  >
                    {copyStatus.panel ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-800/80 p-3 rounded-md text-sm font-mono break-all max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                  {panelKey}
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  Use this panel key to access your dashboard and monitor your file activity.
                </p>
              </div>
              
              <div className="bg-gray-700/70 p-4 rounded-lg border border-gray-600/50">
                <div className="flex items-center mb-2">
                  <FileText className="h-5 w-5 mr-2 text-purple-400" />
                  <span className="font-medium">Panel Info</span>
                </div>
                <div className="flex space-x-2 text-sm text-gray-300">
                  <div className="flex-1 bg-gray-800/50 p-3 rounded-md">
                    <div className="flex items-center mb-1">
                      <Eye className="h-4 w-4 mr-1 text-cyan-400" />
                      <span className="text-xs font-medium">Access Limit</span>
                    </div>
                    <p className="text-lg font-bold text-center">{maxAccesses}</p>
                  </div>
                  <div className="flex-1 bg-gray-800/50 p-3 rounded-md">
                    <div className="flex items-center mb-1">
                      <Clock className="h-4 w-4 mr-1 text-cyan-400" />
                      <span className="text-xs font-medium">Expires in</span>
                    </div>
                    <p className="text-lg font-bold text-center">{formatSeconds(expiry)}</p>
                  </div>
                  <div className="flex-1 bg-gray-800/50 p-3 rounded-md">
                    <div className="flex items-center mb-1">
                      <FileText className="h-4 w-4 mr-1 text-cyan-400" />
                      <span className="text-xs font-medium">File Size</span>
                    </div>
                    <p className="text-lg font-bold text-center">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => console.log("Reset form or upload another file")}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 px-6 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transform hover:scale-105 mt-6"
              >
                <div className="flex items-center justify-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Upload Another File
                </div>
              </button>
            </div>
          </div>
          )}
          
          <div className="mt-12 text-center text-gray-400 text-sm">
           
            <p className="mt-2">
              © {new Date().getFullYear()} DDFH. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
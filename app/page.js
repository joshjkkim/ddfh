"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, MessageCircleWarning, Upload, Shield, Key, Share2, FileText, Lock, 
  RefreshCw, Sparkles, Lollipop, Info, Clock, Eye, EyeClosed, User, UserCheck, Scissors, FolderCog, FileDigit, Tag, Cog, CookingPot, 
  TriangleAlert, PencilLine, CloudUpload} from 'lucide-react';
import { generateAESKey, encryptData, exportKey } from "./lib/encrypt"; // adjust path accordingly
import { buf as crc32Buffer } from "crc-32";
import { useRouter } from "next/navigation";
import { solveChallenge } from './utils/solveChallenge';
import formatFileSize from './utils/format';
import Link from 'next/link';


// ...
// Constants
const MaxFileSize = 5 * 1024 * 1024 * 1024; // 5 GB
const maxAllowed = 2592000; // 1 month in seconds
const minAllowed = 3600;    // 1 hour in seconds
const maxChar = 100000;
const DEFAULT_MAX = 999999;

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

function sanitize(msg) {
  // Ensure we always have a string
  const text = String(msg);
  // Strip out any `<` or `>` so injected tags won’t render
  return text.replace(/[<>]/g, "");
}


// Helper: compute maximum allowed expiry based on file size.
function computeMaxExpiry(fileSize) {
  
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

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [publicShareLink, setPublicShareLink] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [panelKey, setPanelKey] = useState('');
  const fileInputRef = useRef(null);
  const [expiry, setExpiry] = useState(3600); // default to 1 hour
  const [expiryInput, setExpiryInput] = useState("1h");
  const [totalFileSize, setTotalFileSize] = useState(0)
  const [progress, setProgress] = useState(0);
  const [maxAccesses, setMaxAccesses] = useState(10);
  const [maxAccessesInput, setMaxAccessesInput] = useState("");
  const [copyStatus, setCopyStatus] = useState({
    link: false,
    key: false,
    panel: false
  });
  const [showTooltip, setShowTooltip] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [autoDecryptEnabled, setAutoDecryptEnabled] = useState(false);
  const [isShortUrl, setIsShortUrl] = useState({ auto: false, decrypted: false })
  const [shortUrl, setShortUrl] = useState("");
  const [session, setSession] = useState(null)
  const [shareId, setShareId] = useState(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [error, setError] = useState("")
  const [mode, setMode] = useState("file")
  const [pasteText, setPasteText] = useState("")
  const [pasteChar, setPasteChar] = useState(0)
  const [shouldUpload, setShouldUpload] = useState(false)

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
          setError("Failed to fetch error!");

          setTimeout(() => {
            setError("")
          }, 5000)
        }}
      fetchSession();
    }, []);

  useEffect(() => {
    if(shouldUpload) {
      uploadFiles();
      setShouldUpload(false);
    }
  }, [files, shouldUpload]);

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
  
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      // Check file limits based on session status
      if (session && totalFiles + droppedFiles.length > 10) {
        setError("Users max file upload is 10 files");

        setTimeout(() => {
          setError("")
        }, 5000)
        return;
      } else if (!session && totalFiles + droppedFiles.length > 4) {
        setError("Anon max file upload is 4 files");

        setTimeout(() => {
          setError("")
        }, 5000)
        return;
      }
      // Update total files count
      setTotalFiles(totalFiles + droppedFiles.length);
  
      // Process each dropped file
      let totalBatchSize = 0;
      Array.from(droppedFiles).forEach((file) => {
        handleFile(file);
        totalBatchSize += file.size;
      });
  
      // Update the total file size for the batch
      setTotalFileSize(totalFileSize + totalBatchSize);
    }
  };
  

  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault();
    const uploadedFiles = e.target.files;
    if(session && totalFiles + uploadedFiles.length > 10) {
      setError("User max file upload is 10 files");

      setTimeout(() => {
        setError("")
      }, 5000)
      return;
    } else if (!session && totalFiles + uploadedFiles.length > 4) {
      setError("Anon max file upload is 4 files");

      setTimeout(() => {
        setError("")
      }, 5000)
      return
    }
    setTotalFiles(totalFiles + uploadedFiles.length)
    if (uploadedFiles && uploadedFiles.length > 0) {
      let totalBatchSize = 0;
      Array.from(uploadedFiles).forEach((file) => {
        handleFile(file);
        totalBatchSize += file.size;
      });

      setTotalFileSize(totalFileSize + totalBatchSize);
    }
  };

  const handlePasteChange = (e) => {
    setPasteText(e.target.value);
    setPasteChar(e.target.value.length);
  }

  const handleMaxAccessesChange = (e) => {
    const raw = e.target.value;
  
    setMaxAccessesInput(raw);
  
    if (raw === "") {
      return;
    }
  
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setMaxAccesses(parsed);
    }
  };

  // Process selected file and compute dynamic expiry
  const handleFile = (uploadedFile) => {
    if (uploadedFile) {
      if (uploadedFile.size > MaxFileSize) {
        setError("File size exceeds the 5 GB limit. Please choose a smaller file.");

        setTimeout(() => {
          setError("")
        }, 5000)
        return;
      }
      const fileMetadata = {
        file: uploadedFile,
        size: uploadedFile.size
      };
      setFiles((prevFiles) => [...prevFiles, fileMetadata]);
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
    if(mode == "paste") {
      setExpiry(parsed > maxAllowed ? allowedMax : parsed);
    } else if (parsed !== null && files.length > 0) {
      const allowedMax = computeMaxExpiry(totalFileSize);
      setExpiry(parsed > allowedMax ? allowedMax : parsed);
    }
  };

  const shortenUrl = async () => {
    try {
      let shortUrlKey;
      if(!shortUrl || !shareId) {
        return;
      } else {
        shortUrlKey = shortUrl;
      }
      let shareLink = publicShareLink;

      if(autoDecryptEnabled && privateKey) {
        shareLink = `${publicShareLink}#decryptionKey=${privateKey}`;
      }

      const res = await fetch('/api/shortUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortUrlKey,
          fullLink: shareLink,
          shareId: shareId,
        }),
      });
      if(!res.ok) {
        setError("Failed to shorten the URL");

        setTimeout(() => {
          setError("")
        }, 5000)
      }
      const data = await res.json();
      setShortUrl(data.shortUrlKey);
      if(autoDecryptEnabled) {
        setIsShortUrl({auto: true, decrypted: isShortUrl.decrypted})
      } else {
        setIsShortUrl({auto: isShortUrl.auto, decrypted: true});
      }
      
      
    } catch(e) {

    }
  }

  const uploadTextSnippet = () => {
    const content = pasteText.trim();
    if (!content) return;

    const blob = new Blob([content], { type: "text/plain" });
    const snippetFile = new File([blob], "snippet.txt", {
      type: "text/plain",
    });

    const wrapper = {
      file: snippetFile,
      size: snippetFile.size,
    };

    setFiles((prev) => [...prev, wrapper]);

    setShouldUpload(true);
  };
  
  // Upload file with encryption
  const uploadFiles = async () => {
    if (files.length <= 0) return;

    if (pasteChar > maxChar) {
      setError("100,000 Character Max Limit for Pastes!")

      return;
    }

    if (session && files.length > 10) {
      return;
    } else if (!session && files.length > 4) {
      return;
    }
    setIsUploading(true);
    simulateProgress();
  
    try {
      const powRes = await fetch('/api/create-challenge');
      if (!powRes.ok) {
        setError("Failed to get challenge!");

        setTimeout(() => {
          setError("")
        }, 5000)
      }
      const { challenge, target, powToken } = await powRes.json();
      console.log(powToken)
      console.log(`Challenge received: ${challenge}, Target: ${target}`);
  
      const nonce = solveChallenge(challenge, target);
      if (!nonce) {
        setError("Failed to solve challenge!");

        setTimeout(() => {
          setError("")
        }, 5000)
      }
      console.log(`Challenge solved with nonce: ${nonce}`);
  
      const key = await generateAESKey();
      const bs = new Uint8Array(8);
      window.crypto.getRandomValues(bs);
      const share = Array.from(bs).map(b => b.toString(36).padStart(2, "0")).join("").substring(0, 12);
      setShareId(share)
      const generatedPanelKey = generatePanelKey();
      setPanelKey(generatedPanelKey);

      for (const file of files) {
        const fileBuffer = await file.file.arrayBuffer();
        const { ciphertext, iv } = await encryptData(key, fileBuffer);
        const computedChecksum = await computeCRC32Checksum(ciphertext);
        
        const s3Filename = `${share}-${file.file.name}`;
        const fileSize    = file.file.size;        // use each file’s own size
        const contentType = file.file.type || "application/octet-stream";
    
        const params = new URLSearchParams({
          filename:    s3Filename,
          filesize:    fileSize.toString(),
          contentType: contentType,
          fileamount:  files.length.toString(),
          checksum:    computedChecksum,
          expiry:      expiry.toString(),
          nonce:       nonce.toString(),
          challenge:   challenge,
          powToken:    powToken,
        });
      
        const res = await fetch(`/api/getPresignedPost?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          setError("Failed to obtain PreSigned POST!", sanitize(data.error));

          setTimeout(() => {
            setError("")
          }, 5000)
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
          setError("Failed to upload file!");

          setTimeout(() => {
            setError("")
          }, 5000)
        }
    
        const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
    
        // Optional delay for UI purposes
        await new Promise(resolve => setTimeout(resolve, 1000));
    
        const expirationTimestamp = new Date(Date.now() + expiry * 1000).toISOString();
        await fetch('/api/logFile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shareId: share,
            originalFilename: file.file.name,
            s3Key: s3Filename,
            iv: ivBase64,
            fileSize: file.size,
            expirationTimestamp,
            panelKey: generatedPanelKey,
            timesAccessed: 0,
            maxAccesses: maxAccesses,
          }),
        });
      }

      setProgress(100);
      setIsUploading(false);
      setIsGeneratingKeys(true);
      setPasteText("");
  
      const exportedKey = await exportKey(key);
      
  
      setPublicShareLink(
        `https://ddfh.org/share/${share}`
      );
      setPrivateKey(exportedKey);
      setIsGeneratingKeys(false);
      setUploadComplete(true);
      
    } catch (error) {
      setIsUploading(false);
      setIsGeneratingKeys(false);
      setError("Failed to upload file. Please try again.");

      setTimeout(() => {
        setError("")
      }, 5000)
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100">
      <div className="container mx-auto px-4 py-16">
      <header className="mb-16 text-center px-4">
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="relative mb-2">
            <Lollipop className="h-12 w-12 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
            DDFH
          </h1>
        </div>
        <p className="text-gray-300 max-w-md md:max-w-xl mx-auto text-base md:text-lg">
          End-to-end encrypted file hosting with zero knowledge architecture.
          Your files remain private, only accessible with the right key.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-4">
          <div className="flex items-center bg-gray-800/40 px-2 py-1 rounded-full">
            <Shield className="h-4 w-4 text-green-400 mr-1" />
            <span className="text-xs text-gray-300">Zero-knowledge</span>
          </div>
          <div className="flex items-center bg-gray-800/40 px-2 py-1 rounded-full">
            <Lock className="h-4 w-4 text-yellow-400 mr-1" />
            <span className="text-xs text-gray-300">End-to-end encrypted</span>
          </div>
          <div className="flex items-center bg-gray-800/40 px-2 py-1 rounded-full">
            <Clock className="h-4 w-4 text-cyan-400 mr-1" />
            <span className="text-xs text-gray-300">Time-Limited Access</span>
          </div>
          <div className="flex items-center bg-gray-800/40 px-2 py-1 rounded-full">
            <FileDigit className="h-4 w-4 text-orange-400 mr-1" />
            <span className="text-xs text-gray-300">Max Accesses</span>
          </div>
          <div className="flex items-center bg-gray-800/40 px-2 py-1 rounded-full">
            <CookingPot className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-xs text-gray-300">Batch File Uploads</span>
          </div>
          <div className="flex items-center bg-gray-800/40 px-2 py-1 rounded-full">
            <Tag className="h-4 w-4 text-purple-400 mr-1" />
            <span className="text-xs text-gray-300">Custom URL Shorteners</span>
          </div>
          <div className="flex items-center bg-gray-800/40 px-2 py-1 rounded-full">
            <Cog className="h-4 w-4 text-red-400 mr-1" />
            <span className="text-xs text-gray-300">Anonymous Panel Control</span>
          </div>
        </div>
      </header>

      {error && 
        <div className="flex justify-center">
          <div className="w-1/3 justify-center mb-6 p-4 bg-red-900 bg-opacity-30 rounded-lg border border-red-500 flex items-start shadow-lg">
            <TriangleAlert className="w-5 h-5 text-red-300 mr-2"/>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      }
      
      
        
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-4">
          <div className="mt-8 text-center w-full sm:w-auto">
            <button
              onClick={() => router.push("/panel")}
              className="w-full sm:min-w-[150px] inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-800 hover:to-green-600 hover:scale-105 text-white rounded-full transition-all ease-in-out duration-200"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {isHovered ? (
                <Eye className="h-5 w-5 mr-2" />
              ) : (
                <EyeClosed className="h-5 w-5 mr-2" />
              )}
              <strong>Go to Panel</strong>
            </button>
          </div>

          <div className="mt-8 text-center w-full sm:w-auto">
            <button
              onClick={() => router.push("/login")}
              className="w-full sm:min-w-[150px] inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-600 via-green-400 to-green-600 hover:from-green-800 hover:via-green-600 hover:to-green-800 hover:scale-105 text-white rounded-full transition-all ease-in-out duration-200"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {isHovered ? (
                <UserCheck className="h-5 w-5 mr-2" />
              ) : (
                <User className="h-5 w-5 mr-2" />
              )}
              <strong>
                Login: <span className="text-sm">{session ? session.username : "Logged Out"}</span>
              </strong>
            </button>
          </div>

          <div className="mt-8 text-center w-full sm:w-auto">
            <button
              onClick={() => router.push("/faq")}
              className="w-full sm:min-w-[150px] inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-600 hover:to-green-800 hover:scale-105 text-white rounded-full transition-all ease-in-out duration-200"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
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

        <div className="justify-center items-center flex flex-col sm:flex-row justify-center gap-3 mb-4">
          {isUploading || uploadComplete ? (
            <button
            onClick={() => setMode(mode == "file" ? "paste" : "file")}
            className={`w-1/4 sm:min-w-[150px] inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r hover:scale-105 text-white rounded-full transition-all ease-in-out duration-200 from-red-800 to-red-600`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={uploadComplete || isUploading}
          >
            <strong>DISABLED</strong>
            <MessageCircleWarning className="w-6 h-6 ml-2"/>
          </button>
          ) : (
            <button
              onClick={() => setMode(mode == "file" ? "paste" : "file")}
              className={`w-3/8 sm:min-w-[150px] inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r hover:scale-105 text-white rounded-full transition-all ease-in-out duration-200 
                ${mode == "file" ? "from-cyan-600 to-purple-800 hover:from-cyan-400 hover:to-purple-600" : "from-purple-800 to-cyan-600 hover:from-purple-600 hover:to-cyan-400"}`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={uploadComplete || isUploading}
            >
              {mode === "file" ? (
                <PencilLine className="h-5 w-5 mr-2" />
              ) : (
                <CloudUpload className="h-5 w-5 mr-2" />
              )}
              <strong>{mode === "file" ? "Switch to Paste" : "Switch to File Upload"}</strong>
            </button>
          )}
        </div>

        <div className="max-w-screen mx-auto relative">
          {!uploadComplete && mode == "file" ? (
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
                  multiple
                  className="hidden"
                  onChange={handleChange}
                />
                
                <div className="relative">
                  <div className={`mx-auto h-24 w-24 rounded-full bg-gradient-to-r ${dragActive ? 'from-cyan-500/20 to-purple-500/20 animate-pulse' : 'from-gray-700/20 to-gray-600/20'} flex items-center justify-center transition-all duration-300`}>
                    <Upload className={`h-12 w-12 transition-all duration-300 ${dragActive ? 'text-cyan-400 scale-110' : 'text-gray-400'}`} />
                  </div>
                </div>
                
                {files.length > 0 ? (
                  <div className="mt-6 space-y-6">
                    {/* List all selected files */}
                    <div className="space-y-4">
                      {files.map((file, index) => (
                        <div key={index} className="border p-4 rounded">
                          <p className="text-xl font-medium text-cyan-300">{file.file.name}</p>
                          <p className="text-gray-400">{formatFileSize(file.file.size)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Global settings for the entire batch */}
                    <p>{formatFileSize(totalFileSize)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        
                        <label
                          htmlFor="global-expiry"
                          className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
                        >
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
                          id="global-expiry"
                          value={expiryInput}
                          placeholder="e.g. 1h, 2d, 30m"
                          onClick={(e) => e.stopPropagation()}
                          onChange={handleExpiryChange}  // This now updates the global expiry for the batch
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/70 text-gray-100 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="global-maxAccesses"
                          className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
                        >
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
                                Maximum number of times these files can be accessed.
                              </div>
                            )}
                          </div>
                        </label>
                        <input
                          type="text"
                          id="global-maxAccesses"
                          value={maxAccessesInput}
                          placeholder="Default: 10"
                          onClick={(e) => e.stopPropagation()}
                          onChange={handleMaxAccessesChange}
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/70 text-gray-100 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Display maximum allowed expiry computed for the batch */}
                    <p className="text-xs text-gray-400 mb-4">
                      Maximum allowed expiry for the batch is{" "}
                      {formatSeconds(computeMaxExpiry(totalFileSize))}
                      {expiry !== null && <span> Current setting: {formatSeconds(expiry)}.</span>}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Greatest Amount of Accesses is: {DEFAULT_MAX}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        uploadFiles(); // Upload all files using the global settings
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
                            <span>Encrypt & Upload All</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                ) :  (
                  <div className="mt-4">
                    <p className="text-2xl font-medium mb-2 text-cyan-200">Drop your files here</p>
                    <p className="text-gray-400">or click to browse</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300">Up to 5GB Total Batch</span>
                      <span className="px-3 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300">4 Files For Anon, 10 For Users</span>
                      <span className="px-3 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300">Decryption and Panel Keys</span>
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
          ) : !uploadComplete && mode == "paste" ? (
            <div className="w-full">
              <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-gray-700/50">
                <label
                  htmlFor="paste-content"
                  className="block text-sm font-medium text-purple-300 mb-2"
                >
                  Paste Your Text
                </label>
                <textarea
                  id="paste-content"
                  name="pasteContent"
                  placeholder="Write or paste your text here…"
                  value={pasteText}
                  onChange={handlePasteChange}
                  rows={10}
                  className="w-full h-64 p-4 bg-gray-700/70 text-gray-100 placeholder-gray-400 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={isUploading}
                />
                  <div className="p-2 text-purple-300">
                    <p><span className="font-bold">Character Count: </span>{pasteChar} / {maxChar}</p>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      
                  <div>
                    
                    <label
                      htmlFor="global-expiry"
                      className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
                    >
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
                      id="global-expiry"
                      value={expiryInput}
                      placeholder="e.g. 1h, 2d, 30m"
                      onClick={(e) => e.stopPropagation()}
                      onChange={handleExpiryChange}  // This now updates the global expiry for the batch
                      className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/70 text-gray-100 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="global-maxAccesses"
                      className="block text-sm font-medium text-gray-300 mb-2 flex items-center"
                    >
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
                            Maximum number of times these files can be accessed.
                          </div>
                        )}
                      </div>
                    </label>
                    <input
                      type="number"
                      id="global-maxAccesses"
                      value={maxAccesses}
                      placeholder="e.g. 5"
                      onClick={(e) => e.stopPropagation()}
                      onChange={handleMaxAccessesChange}
                      className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/70 text-gray-100 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {isUploading &&
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
                }

                <button
                  onClick={uploadTextSnippet}
                  disabled={isUploading}
                  className="mt-4 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-800 hover:from-cyan-500 hover:to-purple-700 text-white font-medium rounded-full shadow-lg transition transform hover:scale-105 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <CloudUpload className="h-5 w-5 mr-2" />
                      Encrypt & Upload Text
                    </>
                  )}
                </button>
              </div>
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
                          ? `${publicShareLink}#decryptionKey=${privateKey}`
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
                          ? `${publicShareLink}#decryptionKey=${privateKey}`
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
                      <button 
                        onClick={() => shortenUrl()}
                        className={`mt-2 text-sm px-3 py-1 rounded-full transition-all ease-in-out duration-200 bg-gray-800/50 text-cyan-400 ${isShortUrl.auto && isShortUrl.decrypted ? "hover:bg-red-600" : "hover:bg-cyan-600"} hover:text-white`}
                        disabled={isShortUrl.auto && isShortUrl.decrypted}
                      >
                        Shorten URL?
                    </button>
                    </div>
                </div>
                
                {(isShortUrl.auto || isShortUrl.decrypted) && shortUrl && (
                  <>
                    <button 
                      onClick={() =>
                        copyToClipboard(
                          `https://ddfh.org/s/${shortUrl}`,
                          'short'
                        )
                      }
                      className={`text-cyan-400 hover:text-cyan-300 hover:scale-110 text-sm ${copyStatus.short ? 'bg-green-800/50' : 'bg-gray-800/50'} px-3 py-1 rounded-full transition-all ease-in-out duration-200`}
                    >
                      {copyStatus.short ? 'Copied!' : 'Copy'}
                    </button>
                    <div className="bg-gray-800/80 p-3 rounded-md text-sm font-mono break-all max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800 mt-4">
                      https://ddfh.org/s/{shortUrl}
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
                    <p className="text-lg font-bold text-center">{formatFileSize(totalFileSize)}</p>
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
          <Link href="https://t.me/dumdumFH">
            <span className="w-1/2 p-2 hover:text-blue-500 hover:underline hover:bg-gray-900 rounded-lg shadow-lg transition-all duration-300 ease-out">
            
              Join The Telegram: t.me/dumdumFH
              
              </span>
              </Link>
            </p>
            
           
            <p className="mt-2">
              © {new Date().getFullYear()} DDFH. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
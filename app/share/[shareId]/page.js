"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { importKey } from "../../lib/encrypt"; // Adjust path accordingly
import { Key, Lock, Download, AlertTriangle, Eye, CheckCircle, Lollipop, FileText } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function SharePage() {
  const params = useParams();
  const shareId = params.shareId;
  const searchParams = useSearchParams();
  const filename = searchParams.get("filename");
  const ivBase64 = searchParams.get("iv");

  const [decryptionKey, setDecryptionKey] = useState(searchParams.get("decryptionKey") ?? "");
  const [encryptedFileUrl, setEncryptedFileUrl] = useState("");
  const [previewText, setPreviewText] = useState(""); // for text files
  const [previewUrl, setPreviewUrl] = useState(""); // for blob URLs (images, pdf, etc.)
  const [error, setError] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionProgress, setDecryptionProgress] = useState(0);
  const [decryptionSuccess, setDecryptionSuccess] = useState(false);
  const [isUrlFetching, setIsUrlFetching] = useState(false);

  const didDecrypt = useRef(false);

  const getIVFromBase64 = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // Utility: Determine file type from filename extension
  const getFileType = (filename) => {
    if (!filename) return "text";
    const extension = filename.split('.').pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)) return "image";
    if (extension === "pdf") return "pdf";
    if (["txt", "md", "json", "csv", "log", "js", "jsx", "ts", "tsx", "html", "css", "py", "java", "c", "cpp"].includes(extension)) return "text";
    return "binary";
  };

  // Simulate decryption progress
  const simulateProgress = () => {
    setDecryptionProgress(0);
    const interval = setInterval(() => {
      setDecryptionProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.floor(Math.random() * 5) + 1;
      });
    }, 100);
    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (filename) {
      const fetchPresignedUrl = async () => {
        try {
          setIsUrlFetching(true);
          const res = await fetch(`/api/getDownloadURL?filename=${encodeURIComponent(filename)}`);
          if (!res.ok) {
            setError(`Error fetching new Url ${res.status}`)
            return;
          }
          const { url } = await res.json();
          setEncryptedFileUrl(url);
        } catch (err) {
          console.error("Error fetching URL:", err);
          setError("Failed to get the download URL. Please try again later.");
        } finally {
          setIsUrlFetching(false);
        }
      };
      fetchPresignedUrl();
    }
  }, [filename]);

  useEffect(() => {
    if (decryptionKey && encryptedFileUrl && !didDecrypt.current) {
      didDecrypt.current = true;
      handleDecrypt();
    }
  }, [decryptionKey, encryptedFileUrl]);

  const handleDecrypt = async () => {
    try {
      if (!decryptionKey.trim()) {
        setError("Please enter your decryption key.");
        return;
      }
      
      setIsDecrypting(true);
      setError(null);
      const cleanupProgress = simulateProgress();
      
      if (!ivBase64) {
        setError("IV is missing form the URL")
        return;
      }
      
      const iv = getIVFromBase64(decodeURIComponent(ivBase64));
      const cryptoKey = await importKey(decryptionKey);
      const res = await fetch(encryptedFileUrl);
      
      if (!res.ok) {
        setError(`Failed to fetch encrypted file: ${res.status}`)
        return;
      }
      
      const encryptedBuffer = await res.arrayBuffer();

      // Decrypt returns an ArrayBuffer
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        encryptedBuffer
      );

      const fileType = getFileType(filename);
      
      if (fileType === "text") {
        // Decode the ArrayBuffer to a string
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decryptedBuffer);
        setPreviewText(decryptedText);
      } else {
        let mimeType = "application/octet-stream"; // default
        if (fileType === "pdf") mimeType = "application/pdf";
        else if (fileType === "image") {
          const extension = filename.split('.').pop().toLowerCase();
          mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        }
        const blob = new Blob([decryptedBuffer], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        setPreviewUrl(blobUrl);
      }
      
      // Complete the progress bar and mark as success
      setDecryptionProgress(100);
      setDecryptionSuccess(true);
      if (shareId) {
        fetch(`/api/updateAccess?shareId=${shareId}`)
          .then((res) => res.json())
          .then((data) => console.log("Access count updated:", data))
          .catch((err) => console.error("Failed to update access count", err));
      }
      cleanupProgress();
    } catch (err) {
      console.error("Decryption error:", err);
      setError("Decryption failed. Please check your key and try again.");
      setDecryptionSuccess(false);
      setDecryptionProgress(0);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleDecrypt();
    }
  };

  // Get file icon based on type
  const getFileIcon = () => {
    if (!filename) return <FileText className="w-12 h-12 text-gray-500" />;
    
    const fileType = getFileType(filename);
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (fileType) {
      case "image":
        return <img src="/image.svg" alt="Image file" className="w-12 h-12" />;
      case "pdf":
        return <img src="/pdf.svg" alt="PDF file" className="w-12 h-12" />;
      case "text":
        return <img src="/text.svg" alt="Text file" className="w-12 h-12" />;
      default:
        return <img src="/file.svg" alt="File" className="w-12 h-12" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-900 text-gray-100 p-0 m-0 overflow-hidden relative"
    > 
      <header className="py-4 px-6 bg-gradient-to-r from-cyan-950 via-blue-950 to-purple-950 bg-opacity-70 backdrop-blur-sm border-b border-gray-700">
        <Link href="/">
        <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center mb-3 cursor-pointer"
          >
          <div className="relative mt-2">
            <Lollipop className="h-12 w-12 text-cyan-400 mr-2" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
            DDFH
          </h1>
        </motion.div>
      </Link>
      </header>
      
      <div className="max-w-4xl mx-auto pt-8 px-6 pb-12 relative z-10">
        <div className="bg-gray-800 bg-opacity-80 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <div className="flex items-center justify-center bg-gray-700 bg-opacity-40 rounded-lg p-4">
              {getFileIcon()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Secure File Preview</h1>
              {filename && (
                <div className="mb-1">
                  <span className="text-gray-400">File: </span>
                  <span className="font-medium text-lg">{filename}</span>
                </div>
              )}
              {shareId && (
                <div className="mb-1">
                  <span className="text-gray-400">Share ID: </span>
                  <span className="font-mono text-sm">{shareId}</span>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-30 rounded-lg border border-red-800 flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}
          
          {!decryptionSuccess ? (
            <div className="space-y-6">
              <div>
                <label className="block mb-2 font-medium text-gray-300">Enter your decryption key:</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-grow">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      value={decryptionKey}
                      onChange={(e) => setDecryptionKey(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Paste your decryption key here"
                      className="w-full p-3 pl-10 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      disabled={isDecrypting}
                    />
                  </div>
                  <button
                    onClick={handleDecrypt}
                    disabled={isDecrypting || !encryptedFileUrl || isUrlFetching}
                    className={`px-5 py-3 rounded-lg flex items-center justify-center ${
                      isDecrypting || !encryptedFileUrl || isUrlFetching
                        ? 'bg-gray-700 cursor-not-allowed' 
                        : 'bg-cyan-600 hover:bg-cyan-700'
                    } transition-colors duration-200 min-w-32`}
                  >
                    {isDecrypting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Decrypting</span>
                      </>
                    ) : isUrlFetching ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-5 h-5 mr-2" />
                        <span>Decrypt & Preview</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {isDecrypting && (
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-gray-400">Decrypting file...</p>
                    <p className="text-sm text-gray-400">{decryptionProgress}%</p>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${decryptionProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-green-900 bg-opacity-30 rounded-lg border border-green-800 flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-green-300">File decrypted successfully!</p>
            </div>
          )}
          
          <AnimatePresence>
            {(previewText || previewUrl) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8"
              >
          {(previewText || previewUrl) && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">File Preview</h2>
                {previewUrl && (
                  <a 
                    href={previewUrl} 
                    download={filename} 
                    className="flex items-center text-cyan-400 hover:text-cyan-300 bg-gray-700 bg-opacity-50 hover:bg-opacity-70 px-3 py-2 rounded-lg transition-all duration-200"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </a>
                )}
              </div>
              
              <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900 shadow-md">
                {(() => {
                  const fileType = getFileType(filename);
                  
                  if (fileType === "image") {
                    return (
                      <div className="flex justify-center p-4 bg-gradient-to-b from-gray-800 to-gray-900">
                        <img 
                          src={previewUrl} 
                          alt="Decrypted preview" 
                          className="max-w-full max-h-[70vh] object-contain rounded-md shadow-lg"
                        />
                      </div>
                    );
                  } else if (fileType === "pdf") {
                    return (
                      <div className="h-[600px] w-full">
                        <embed
                          src={previewUrl}
                          type="application/pdf"
                          width="100%"
                          height="100%"
                          className="border-0"
                        />
                      </div>
                    );
                  } else if (fileType === "text") {
                    return (
                      <pre className="p-4 overflow-x-auto whitespace-pre-wrap text-gray-300 font-mono text-sm">
                        {previewText}
                      </pre>
                    );
                  } else {
                    return (
                      <div className="p-12 text-center">
                        <div className="mb-6 text-gray-400">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-70" />
                          <p className="text-lg">Preview not available for this file type</p>
                        </div>
                        <a 
                          href={previewUrl} 
                          download={filename} 
                          className="inline-flex items-center text-cyan-400 hover:text-cyan-300 bg-gray-800 hover:bg-gray-700 border border-cyan-800 rounded-lg px-6 py-3 transition-colors duration-200"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download File
                        </a>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
          </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="text-center mt-8 text-gray-500 text-sm space-y-1">
          <p>This file is encrypted with AES-GCM encryption.</p>
          <p>Only someone with the correct key can access the contents.</p>
        </div>
      </div>
    </motion.div>
  );
}
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { importKey } from "../../lib/encrypt"; // Adjust path accordingly
import { Key, Download, AlertTriangle, Eye, CheckCircle, Lollipop, FileText } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function SharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const shareId = params.shareId;

  const [decryptionKey, setDecryptionKey] = useState(searchParams.get("decryptionKey") ?? "");
  const [encryptedFileUrls, setEncryptedFileUrls] = useState([]);
  const [decryptedFiles, setDecryptedFiles] = useState([]); // Array of decrypted file objects
  const [error, setError] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionProgress, setDecryptionProgress] = useState(0);
  const [decryptionSuccess, setDecryptionSuccess] = useState(false);
  const [isUrlFetching, setIsUrlFetching] = useState(false);

  const didDecrypt = useRef(false);

  // Helper: Convert Base64 string to Uint8Array
  const getIVFromBase64 = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // Utility: Determine file type based on file extension
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

  // Fetch encrypted file URLs for this shareId
  useEffect(() => {
    if (shareId) {
      const fetchPresignedUrl = async () => {
        try {
          setIsUrlFetching(true);
          const res = await fetch(`/api/getDownloadURL?shareId=${encodeURIComponent(shareId)}`);
          if (!res.ok) {
            setError(`Error fetching URLs: ${res.status}`);
            return;
          }
          console.log(res)
          const data = await res.json();
          console.log("DONE")
          setEncryptedFileUrls(data.urls);
        } catch (err) {
          console.error("Error fetching URLs:", err);
          setError("Failed to get the download URLs. Please try again later.");
        } finally {
          setIsUrlFetching(false);
        }
      };
      fetchPresignedUrl();
    }
  }, [shareId]);

  // Trigger decryption once decryptionKey and encryptedFileUrls are available
  useEffect(() => {
    if (decryptionKey && encryptedFileUrls.length > 0 && !didDecrypt.current) {
      didDecrypt.current = true;
      handleDecrypt();
    }
  }, [decryptionKey, encryptedFileUrls]);

  const handleDecrypt = async () => {
    try {
      if (!decryptionKey.trim()) {
        setError("Please enter your decryption key.");
        return;
      }

      setIsDecrypting(true);
      setError(null);
      const cleanupProgress = simulateProgress();

      // Fetch IVs and filenames associated with this shareId
      const ivRes = await fetch(`/api/getIVs?shareId=${encodeURIComponent(shareId)}`);
      if (!ivRes.ok) {
        throw new Error("Failed to fetch IV data");
      }
      const ivData = await ivRes.json();
      if (!Array.isArray(ivData) || ivData.length === 0) {
        setError("No IV data found for this shareId.");
        return;
      }

      // Ensure we have as many IV entries as encrypted URLs
      if (ivData.length !== encryptedFileUrls.length) {
        setError("Mismatch in IV data and file URLs.");
        return;
      }

      // Decrypt each file concurrently
      const fileDecryptionPromises = encryptedFileUrls.map(async (encryptedFileUrl, index) => {
        const ivBase64 = ivData[index].iv;
        const filename = ivData[index].s3_key; // each item corresponds to a file
        if (!ivBase64 || !filename) {
          setError("Missing IV or filename data for decryption.");
          throw new Error("Missing IV or filename.");
        }

        const iv = getIVFromBase64(decodeURIComponent(ivBase64));
        const cryptoKey = await importKey(decryptionKey);

        const res = await fetch(encryptedFileUrl);
        if (!res.ok) {
          setError(`Failed to fetch encrypted file: ${res.status}`);
          throw new Error(`Failed to fetch encrypted file: ${res.status}`);
        }

        const encryptedBuffer = await res.arrayBuffer();
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          cryptoKey,
          encryptedBuffer
        );

        const fileType = getFileType(filename);
        if (fileType === "text") {
          const decoder = new TextDecoder();
          const decryptedText = decoder.decode(decryptedBuffer);
          return { filename, fileType, decryptedText };
        } else {
          let mimeType = "application/octet-stream"; // default
          if (fileType === "pdf") mimeType = "application/pdf";
          else if (fileType === "image") {
            const extension = filename.split('.').pop().toLowerCase();
            mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
          }
          const blob = new Blob([decryptedBuffer], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          return { filename, fileType, previewUrl: blobUrl };
        }
      });

      const decryptedResults = await Promise.all(fileDecryptionPromises);
      setDecryptedFiles(decryptedResults);

      setDecryptionProgress(100);
      setDecryptionSuccess(true);

      if (shareId) {
        await fetch(`/api/updateAccess?shareId=${encodeURIComponent(shareId)}`);
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
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">File Preview</h1>
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
                    disabled={isDecrypting || isUrlFetching}
                    className={`px-5 py-3 rounded-lg flex items-center justify-center ${
                      isDecrypting || isUrlFetching
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
                    <p className="text-sm text-gray-400">Decrypting files...</p>
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
              <p className="text-green-300">Files decrypted successfully!</p>
            </div>
          )}
          
          <AnimatePresence>
            {decryptedFiles.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8"
              >
                <h2 className="text-xl font-semibold mb-4">Decrypted Files</h2>
                {decryptedFiles.map((file, index) => (
                  <div key={index} className="mb-6 border border-gray-700 rounded-lg overflow-hidden bg-gray-900 shadow-md">
                    <div className="p-4 flex items-center justify-between">
                      <p className="font-medium text-cyan-300">{file.filename}</p>
                      <a 
                        href={file.fileType === "text" 
                          ? `data:text/plain;charset=utf-8,${encodeURIComponent(file.decryptedText)}`
                          : file.previewUrl} 
                        download={file.filename} 
                        className="flex items-center text-cyan-400 hover:text-cyan-300 bg-gray-700 bg-opacity-50 hover:bg-opacity-70 px-3 py-2 rounded-lg transition-all duration-200"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </div>
                    {file.fileType === "text" ? (
                      <pre className="p-4 overflow-x-auto whitespace-pre-wrap text-gray-300 font-mono text-sm">
                        {file.decryptedText}
                      </pre>
                    ) : file.fileType === "pdf" ? (
                      <div className="h-[600px] w-full">
                        <embed
                          src={file.previewUrl}
                          type="application/pdf"
                          width="100%"
                          height="100%"
                          className="border-0"
                        />
                      </div>
                    ) : file.fileType === "image" ? (
                      <div className="flex justify-center p-4 bg-gradient-to-b from-gray-800 to-gray-900">
                        <img 
                          src={file.previewUrl} 
                          alt="Decrypted preview" 
                          className="max-w-full max-h-[70vh] object-contain rounded-md shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <div className="mb-6 text-gray-400">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-70" />
                          <p className="text-lg">Preview not available for this file type</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="text-center mt-8 text-gray-500 text-sm space-y-1">
          <p>These files are encrypted with AES-GCM encryption.</p>
          <p>Only someone with the correct key can access the contents.</p>
        </div>
      </div>
    </motion.div>
  );
}

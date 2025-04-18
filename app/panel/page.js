"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Trash2, Eye, Key, Lock, FileText, Calendar, Clock, Hash, Lollipop, LockOpen } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [panelKey, setPanelKey] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [error, setError] = useState(null);
  const [deleteCount, setDeleteCount] = useState(0);

  // Helper to format remaining seconds into a human-friendly string
  const formatRemaining = (seconds) => {
    if (seconds <= 0) return "Expired";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? d + "d " : ""}${h > 0 ? h + "h " : ""}${m > 0 ? m + "m " : ""}${s}s`;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  };

  // Fetch metadata from backend API using panelKey
  const fetchMetadata = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/getFileMetadata?panelKey=${encodeURIComponent(panelKey)}`
      );
      if (!res.ok) {
        setError("Failed to fetch metadata")
        throw new Error("Failed to fetch metadata.");
      }
      const data = await res.json();
      setMetadata(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete the file via backend API using panelKey
  const deleteFile = async () => {
    const deletes = (deleteCount + 1) % 2;
    setDeleteCount(deletes);

    if(deletes == 1) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/deleteFile?panelKey=${encodeURIComponent(panelKey)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setError("Failed to delete file")
        throw new Error("Failed to delete file.");
      }
      setMetadata(null);
      setRemainingTime(null);
      setPanelKey("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle panel key form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!panelKey) {
      setError("Please enter your panel key.");
      return;
    }
    await fetchMetadata();
  };

  // Update remaining time every second when metadata is loaded
  useEffect(() => {
    if (metadata && metadata.expiration_timestamp) {
      const interval = setInterval(() => {
        const now = Date.now();
        const expiry = new Date(metadata.expiration_timestamp).getTime();
        const diff = Math.floor((expiry - now) / 1000);
        setRemainingTime(diff);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [metadata]);

  // Calculate expiration progress
  const calculateProgress = () => {
    if (!metadata || !remainingTime) return 0;
    
    const totalTime = (new Date(metadata.expiration_timestamp).getTime() - new Date(metadata.upload_timestamp).getTime()) / 1000;
    const usedTime = totalTime - remainingTime;
    return Math.min(100, Math.max(0, (usedTime / totalTime) * 100));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Link href="/">
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <Lollipop className="h-12 w-12 text-cyan-400 mr-2" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                </div>
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  DDFH
                </h1>
              </div>
            </Link>
          <p className="text-gray-400">Access and manage your secured files</p>
        </div>

        {/* Panel Key Form */}
        {!metadata && (
          <div className="bg-gray-800/70 p-8 rounded-xl shadow-xl backdrop-blur-sm border border-gray-700 mb-8 max-w-lg mx-auto">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 hover:scale-130 transition-all duration-300 ease-in-out hover:-rotate-25">
                {loading ? 
                <LockOpen className="w-8 h-8" /> : <Lock className="w-8 h-8" />
                }
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-br from-cyan-200 to-purple-300">Enter Your Panel Key</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                
                <Key /> Panel Key:
                  </label>
                <input
                  type="password"
                  value={panelKey}
                  onChange={(e) => setPanelKey(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-700/80 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  placeholder="Enter your secure panel key"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin mr-2 w-5 h-5" />
                    Accessing...
                  </>
                ) : (
                  <>Access Dashboard</>
                )}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Metadata Card */}
        {metadata && (
          <div className="bg-gray-800/70 rounded-xl shadow-xl backdrop-blur-sm border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  <FileText className="mr-2 w-6 h-6 text-cyan-400" />
                  {metadata.original_filename}
                </h2>
                <p className="text-gray-400 mt-1">Panel Key: {panelKey.substring(0, 3)}...{panelKey.substring(panelKey.length - 3)}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={fetchMetadata}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg inline-flex items-center transition-colors text-sm"
                >
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={deleteFile}
                  className={`px-4 py-2 hover:scale-110 ${deleteCount ? "bg-red-600/80 hover:bg-red-700" : "bg-red-400 hover:bg-red-500"} rounded-lg inline-flex items-center transition-all duration-200 ease-out text-sm`}
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  {deleteCount ? "Are you sure?" : "Delete File"}
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {/* Time Remaining */}
              {remainingTime !== null && (
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 flex items-center">
                      <Clock className="mr-2 w-4 h-4 text-cyan-400" />
                      Time Remaining:
                    </span>
                    <span className={`font-mono font-bold ${remainingTime < 3600 ? 'text-red-400' : remainingTime < 86400 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {formatRemaining(remainingTime)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${remainingTime < 3600 ? 'bg-red-500' : remainingTime < 86400 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${100 - calculateProgress()}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* File Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 mr-3 flex-shrink-0">
                    <Hash className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">File Size</p>
                    <p className="font-medium">{formatFileSize(metadata.file_size)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 mr-3 flex-shrink-0">
                    <Eye className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Access Count</p>
                    <p className="font-medium">{metadata.times_accessed} / {metadata.max_accesses || '∞'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 mr-3 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Upload Date</p>
                    <p className="font-medium">{new Date(metadata.upload_timestamp).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 mr-3 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Expiration Date</p>
                    <p className="font-medium">{new Date(metadata.expiration_timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 mr-3 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Last Accessed</p>
                    <p className="font-medium">{new Date(metadata.last_accessed).toLocaleString()}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
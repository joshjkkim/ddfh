"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Key, Lock, CheckCircle } from "lucide-react";

const validPasswordRegex = /^[a-zA-Z0-9!?]{8,}$/;
const validUsernameRegex = /^[a-zA-Z0-9_]{1,16}$/;

export default function RecoveryPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [seedPhrase, setSeedPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validUsernameRegex.test(username)) {
      setError("Username must be 1-16 characters long and contain only letters, numbers, and underscores.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!validPasswordRegex.test(newPassword)) {
      setError("Password must be at least 8 characters and can only contain letters, numbers, ! and ?. Underscores are not allowed.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, seedPhrase, newPassword }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Recovery failed.");
        setLoading(false);
        return;
      }
      
      setSuccess(true);
      // Optionally, redirect after a successful recovery
      setTimeout(() => router.push(`/${username}`), 1500);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 bg-opacity-75 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 text-center mb-6">
          Account Recovery
        </h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">Recovery successful!</p>}
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-300 font-medium mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full pl-10 p-3 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          {/* Seed Phrase */}
          <div className="mb-4">
            <label htmlFor="seedPhrase" className="block text-gray-300 font-medium mb-2">
              Seed Phrase
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <textarea
                id="seedPhrase"
                value={seedPhrase}
                onChange={(e) => setSeedPhrase(e.target.value)}
                placeholder="Enter your recovery seed phrase"
                required
                rows={3}
                className="w-full pl-10 p-3 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          {/* New Password */}
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-gray-300 font-medium mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                className="w-full pl-10 p-3 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          {/* Confirm Password */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-gray-300 font-medium mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                className="w-full pl-10 p-3 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {loading ? "Processing..." : (
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Recover Account
              </div>
            )}
          </button>
        </form>
        <p className="mt-4 text-center font-bold text-red-400 text-sm">
          Remember to store your seed phrase securely!
        </p>
      </div>
    </div>
  );
}

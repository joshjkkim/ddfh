"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, UserPlus, Check } from "lucide-react";

const validPasswordRegex = /^[a-zA-Z0-9!?]{8,}$/;
const validUsernameRegex = /^[a-zA-Z0-9_]{1,16}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(""); // optional invite code field
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!validUsernameRegex.test(username)) {
        setError("Username must be 1-16 characters long and contain only letters, numbers, and underscores.");
        return;
    }

    if (!validPasswordRegex.test(password)) {
        setError("Password must be at least 8 characters and can only contain letters, numbers, ! and ?. Underscores are not allowed.");
        return;
    }
    
    setLoading(true);
    try {
      // Send a POST request to your registration API endpoint.
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, inviteCode }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }
      
      // On successful registration, redirect to the login page (or dashboard if you prefer)
      router.push("/login");
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="bg-gray-900 bg-opacity-75 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 text-center mb-6">
          Register
        </h1>
        {error && (
          <p className="text-red-500 text-center mb-4">{error}</p>
        )}
        <form onSubmit={handleSubmit}>
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
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-300 font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 p-3 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          <div className="mb-4">
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
                placeholder="Confirm your password"
                required
                className="w-full pl-10 p-3 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          {/* Optional invite code field */}
          <div className="mb-6">
            <label htmlFor="inviteCode" className="block text-gray-300 font-medium mb-2">
              Invite Code
            </label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
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
            {loading ? "Registering..." : (
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 mr-2" />
                Register
              </div>
            )}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-cyan-400 hover:underline">
            Login here
          </a>.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";

const allowedReputationChanges = {
  user: [1, -1],
  admin: [3, -3],
  moderator: [2, -2],
  // Add more roles as needed
};

export default function ReputationFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipient = searchParams.get("recipient"); // e.g., ?recipient=dumdum

  const [user, setUser] = useState(null); // recipient's user data
  const [giver, setGiver] = useState(null); // logged-in user's full data (including role)
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formValues, setFormValues] = useState({
    reputation: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch recipient user data
  useEffect(() => {
    async function fetchRecipient() {
      try {
        const res = await fetch(`/api/getUser?username=${encodeURIComponent(recipient)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch recipient data.");
        }
        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (recipient) {
      fetchRecipient();
    }
  }, [recipient]);

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
  }, [router]);

  useEffect(() => {
    async function fetchGiver() {
      try {
        const res = await fetch(`/api/getUser?username=${encodeURIComponent(session.username)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch giver data.");
        }
        const data = await res.json();
        setGiver(data);
      } catch (err) {
        setError(err.message);
      }
    }
    if (session && session.username) {
      fetchGiver();
    }
  }, [session]);

  // Prevent self-reputation submission
  useEffect(() => {
    if (session && recipient && session.username === recipient) {
      setError("You cannot submit reputation for yourself.");
    }
  }, [session, recipient]);

  const handleChange = (e) => {
    setFormValues((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) return;
    setSubmitting(true);

    const numericReputation = Number(formValues.reputation);
    if (giver && giver.role === "user" && numericReputation !== 1 && numericReputation !== -1) {
      setError("As a regular user, you can only submit a reputation change of +1 or -1.");
      setSubmitting(false);
      return;
    } else if (giver && giver.role === "admin" && numericReputation !== 3 && numericReputation !== -3) {
      setError("As a admin user, you can only submit a reputation change of +1 or -1.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/modify-reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          reputation: numericReputation,
          message: formValues.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit reputation.");
      }
      // On success, redirect to recipient's profile page.
      router.push(`/${recipient}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-300">Loading...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <p className="text-red-500">{error || "User not found"}</p>
        <Link href="/">
          <p className="underline mt-4">Go Home</p>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header session={session} />
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Submit Reputation for {recipient}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Reputation Score</label>
          <select
            name="reputation"
            value={formValues.reputation}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            required
          >
            <option value="">Select a value</option>
            {giver && allowedReputationChanges[giver.role] && allowedReputationChanges[giver.role].map((value, idx) => (
              <option key={idx} value={value}>
                {value > 0 ? `+${value}` : value}
              </option>
            ))}
          </select>
          {giver && allowedReputationChanges[giver.role] ? (
            <p className="text-gray-400 text-sm mt-1">
              As a <strong>{giver.role}</strong>, you can only submit a reputation change of {allowedReputationChanges[giver.role].join(" or ")}.
            </p>
          ) : (
            <p className="text-gray-400 text-sm mt-1">No reputation change rules set for your role.</p>
          )}
        </div>

          <div>
            <label className="block mb-1">Message</label>
            <textarea
              name="message"
              value={formValues.message}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              rows={4}
              required
            ></textarea>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md font-medium transition"
          >
            {submitting ? "Submitting..." : "Submit Reputation"}
          </button>
        </form>
      </div>
    </div>
  );
}

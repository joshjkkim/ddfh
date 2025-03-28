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

export default function ReputationComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipient = searchParams.get("recipient");

  const [user, setUser] = useState(null); // recipient's user data
  const [giver, setGiver] = useState(null); // logged-in user's full data
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formValues, setFormValues] = useState({
    reputation: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
    setError(null);

    const numericReputation = Number(formValues.reputation);
    
    // Validate based on user role
    if (giver && giver.role) {
      const allowedValues = allowedReputationChanges[giver.role];
      if (!allowedValues.includes(numericReputation)) {
        setError(`As a ${giver.role}, you can only submit a reputation change of ${allowedValues.join(" or ")}.`);
        setSubmitting(false);
        return;
      }
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
      
      setSuccessMessage(`Successfully submitted ${numericReputation > 0 ? "+" : ""}${numericReputation} reputation to ${recipient}!`);
      
      // Reset form
      setFormValues({
        reputation: "",
        message: "",
      });
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/${recipient}`);
      }, 1500);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRepuationButtonClass = (value) => {
    if (value === formValues.reputation) {
      return value > 0 
        ? "bg-green-600 hover:bg-green-700 text-white" 
        : "bg-red-600 hover:bg-red-700 text-white";
    }
    return value > 0
      ? "bg-gray-800 hover:bg-green-600 border border-green-500 text-green-500 hover:text-white"
      : "bg-gray-800 hover:bg-red-600 border border-red-500 text-red-500 hover:text-white";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-t-indigo-500 border-r-transparent border-b-indigo-500 border-l-transparent rounded-full animate-spin"></div>
          <p className="text-gray-300 mt-4">Loading user information...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-500 text-center text-lg font-semibold">{error || "User not found"}</p>
          <div className="mt-6 flex justify-center">
            <Link href="/">
              <div className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium transition">
                Return Home
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header session={session} />
      <div className="max-w-3xl mx-auto p-4 pt-8">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center mr-4">
              {user.profileImage ? (
                <img src={user.profileImage} alt={recipient} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xl font-bold">{recipient.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Submit Reputation for {recipient}</h1>
              <p className="text-gray-400">Current reputation: {user.reputation || 0}</p>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 bg-green-900/30 border border-green-500 text-green-300 px-4 py-3 rounded relative">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-3 font-medium text-lg">Reputation Change</label>
              
              <div className="flex flex-wrap gap-3 mb-2">
                {giver && allowedReputationChanges[giver.role] && 
                  allowedReputationChanges[giver.role].map((value, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      onClick={() => setFormValues(prev => ({ ...prev, reputation: value }))}
                      className={`px-6 py-3 rounded-md font-bold transition ${getRepuationButtonClass(value)}`}
                    >
                      {value > 0 ? `+${value}` : value}
                    </button>
                  ))
                }
              </div>
              
              {giver && allowedReputationChanges[giver.role] ? (
                <p className="text-gray-400 text-sm mt-1">
                  As a <span className="font-semibold">{giver.role}</span>, you can apply these reputation changes.
                </p>
              ) : (
                <p className="text-gray-400 text-sm mt-1">No reputation change rules set for your role.</p>
              )}
            </div>

            <div>
              <label className="block mb-2 font-medium text-lg">Message</label>
              <div className="relative">
                <textarea
                  name="message"
                  value={formValues.message}
                  onChange={handleChange}
                  className="w-full p-4 rounded-md bg-gray-700 border border-gray-600 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows={4}
                  placeholder="Explain why you're modifying this user's reputation..."
                  required
                ></textarea>
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {formValues.message.length} / 500 characters
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Link href={`/${recipient}`}>
                <div className="px-4 py-2 border border-gray-600 rounded-md hover:bg-gray-700 transition">
                  Cancel
                </div>
              </Link>
              
              <button
                type="submit"
                disabled={submitting || !formValues.reputation || !formValues.message}
                className={`px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-md font-medium transition flex items-center ${
                  (!formValues.reputation || !formValues.message) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Submit Reputation"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
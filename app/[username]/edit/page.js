"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, 
  User,
  Save, 
  Upload,
  AlertTriangle,
  Loader2,
  Mail,
} from "lucide-react";
import { FaTwitter, FaDiscord, FaTelegramPlane, FaInstagram, FaYoutube } from 'react-icons/fa';

export default function EditProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formValues, setFormValues] = useState({
    username: "",
    bio: "",
    avatar_key: "",
    banner_key: "",
    email: "",
    discord: "",
    telegram: "",
    youtube: "",
    instagram: "",
    twitter: "",
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  // Fetch session data to check if user is authorized to edit
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/getSession");
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          
          // Check if user is authorized to edit this profile
          if (!data.session || data.session.username !== username) {
            router.push(`/${username}`);
            return;
          }
          
          // If authorized, fetch the user data
          fetchUserData(username);
        } else {
          // Not logged in, redirect to login
          router.push('/login');
        }
      } catch (err) {
        setError("Failed to authenticate. Please log in again.");
      }
    }
    
    fetchSession();
  }, [username, router]);

  // Fetch user data to populate the form
  const fetchUserData = async (username) => {
    try {
      const res = await fetch(`/api/getUser?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("Failed to fetch user data");
  
      const userData = await res.json();
  
      const avatarPromise = userData.avatar_key
        ? fetch(`/api/getDownloadURL?filename=${encodeURIComponent(userData.avatar_key)}`)
            .then(res => res.ok ? res.json() : Promise.reject(`Error fetching URL: ${res.status}`))
            .then(({ url }) => fetch(url).then(res => res.blob()))
            .then(blob => URL.createObjectURL(blob))
            .catch(err => console.error("Avatar Error:", err))
        : Promise.resolve("");
  
      const bannerPromise = userData.banner_key
        ? fetch(`/api/getDownloadURL?filename=${encodeURIComponent(userData.banner_key)}`)
            .then(res => res.ok ? res.json() : Promise.reject(`Error fetching URL: ${res.status}`))
            .then(({ url }) => fetch(url).then(res => res.blob()))
            .then(blob => URL.createObjectURL(blob))
            .catch(err => console.error("Banner Error:", err))
        : Promise.resolve("");
  
      const [avatarUrl, bannerUrl] = await Promise.all([avatarPromise, bannerPromise]);
      // Set form values directly with fetched data
      setFormValues({
        username: userData.username || "",
        bio: userData.bio || "",
        avatar_key: avatarUrl || "",
        banner_key: bannerUrl || "",
        youtube: userData.youtube || "",
        instagram: userData.instgram || "",
        discord: userData.discord || "",
        telegram: userData.telegram || "",
        email: userData.email || "",
        twitter: userData.twitter || "",
      });
  
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };  

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  // Handle banner file selection
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setBannerPreview(previewUrl);
    }
  };

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [avatarPreview, bannerPreview]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const formData = new FormData();
      formData.append("newUsername", formValues.username);
      formData.append("oldUsername", username)
      formData.append("bio", formValues.bio);
      formData.append("email", formValues.email);
      formData.append("instagram", formValues.instagram);
      formData.append("discord", formValues.discord);
      formData.append("telegram", formValues.telegram);
      formData.append("twitter", formValues.twitter);
      formData.append("youtube", formValues.youtube);
      
      
      if (avatarFile) {
        formData.append("avatar_img", avatarFile);
      }
      if (bannerFile) {
        formData.append("banner_img", bannerFile);
      }
      
      const res = await fetch("/api/updateProfile", {
        method: "PUT",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${formValues.username}`);
      }, 1500);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin"></div>
          <p className="text-gray-300 mt-4">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.push(`/${username}`)}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Profile
          </button>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-8">
          <h1 className="text-2xl font-bold mb-6 flex items-center">
            <User className="w-6 h-6 mr-2 text-purple-400" />
            Edit Your Profile
          </h1>
          
          {error && (
            <div className="bg-red-900 bg-opacity-40 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-900 bg-opacity-40 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-6">
              Profile updated successfully! Redirecting...
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Username and Email section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formValues.username}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              {/* Bio section */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formValues.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Tell others about yourself..."
                ></textarea>
              </div>
              
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 relative">
                    <Image 
                      src={avatarPreview || formValues.avatar_key || "/defaultuser.png"} 
                      alt="Avatar preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <label className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md cursor-pointer flex items-center transition-colors">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose New Avatar
                      <input
                        type="file"
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      Recommended: Square image, 500×500px or larger
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Banner Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Banner
                </label>
                <div className="bg-gray-700 rounded-md overflow-hidden h-32 relative mb-3">
                  <Image 
                    src={bannerPreview || formValues.banner_key || "/defaultbanner.png"} 
                    alt="Banner preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <label className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md cursor-pointer flex items-center transition-colors inline-block">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose New Banner
                  <input
                    type="file"
                    onChange={handleBannerChange}
                    accept="image/*"
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: 1500×500px, 3:1 aspect ratio
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  <Mail className="inline mr-2" />
                  Email (Username)
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formValues.email || ""}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="discord" className="block text-sm font-medium text-gray-300 mb-1">
                  <FaDiscord className="inline mr-2" />
                  Discord Username
                </label>
                <input
                  type="text"
                  id="discord"
                  name="discord"
                  value={formValues.discord || ""}
                  onChange={handleInputChange}
                  placeholder="Your Discord username"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="telegram" className="block text-sm font-medium text-gray-300 mb-1">
                  <FaTelegramPlane className="inline mr-2" />
                  Telegram Username
                </label>
                <input
                  type="text"
                  id="telegram"
                  name="telegram"
                  value={formValues.telegram || ""}
                  onChange={handleInputChange}
                  placeholder="Your Telegram username"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="instagram" className="block text-sm font-medium text-gray-300 mb-1">
                  <FaInstagram className="inline mr-2" />
                  Instagram Username
                </label>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={formValues.instagram || ""}
                  onChange={handleInputChange}
                  placeholder="Your Instagram Username"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-1">
                  <FaTwitter className="inline mr-2" />
                  Twitter Username
                </label>
                <input
                  type="text"
                  id="twitter"
                  name="twitter"
                  value={formValues.twitter || ""}
                  onChange={handleInputChange}
                  placeholder="@yourtwitter"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-1">
                  <FaYoutube className="inline mr-2" />
                  Youtube Username
                </label>
                <input
                  type="text"
                  id="twitter"
                  name="twitter"
                  value={formValues.youtube || ""}
                  onChange={handleInputChange}
                  placeholder="@youryoutube"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
              
              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push(`/${username}`)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium flex items-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
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
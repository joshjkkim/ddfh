"use client";

import React from "react";
import Link from "next/link";
import { Lollipop, Menu, X, HandCoins, User } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header({ session }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <header className="bg-gray-900 text-white border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="flex items-center">
                <div className="relative">
                  <Lollipop className="h-12 w-12 text-cyan-400 mr-2" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  DDFH
                </h1>
              </div>
            </Link>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/forum" 
              className={`flex items-center text-gray-300 hover:text-white transition-colors ${
                pathname === '/forum' 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
                <HandCoins className="h-6 w-6 mr-1" />
              <span>Forum</span>
            </Link>
            {session ? (
              <>
                <Link 
                  href={`/${session.username}`} 
                  className="flex items-center text-gray-300 hover:text-white transition-colors"
                >
                  <User className="h-6 w-6 mr-1" />
                  <span>{session.username}</span>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-gray-300 hover:text-white font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white p-2"
            >
              {menuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-800 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link 
              href="/forum" 
              className={`block px-3 py-2 rounded-md font-medium ${
                pathname === '/forum' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Forum
            </Link>
            {session ? (
              <>
                <Link 
                  href={`/${session.username}`} 
                  className="block px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="block px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link 
                  href="/signup" 
                  className="block px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
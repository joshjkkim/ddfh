"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lollipop, Menu, X, HandCoins, User, Sparkles, Cable } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header({ session }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const menuVariants = {
    hidden: { 
      opacity: 0, 
      y: -20,
      transition: {
        when: "afterChildren"
      }
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.header 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900 text-white border-b border-gray-800 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <motion.div 
                whileHover={{ 
                  rotate: [0, -10, 10, -10, 0],
                  transition: { duration: 0.5 }
                }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center"
              >
                <div className="relative">
                  <Lollipop className="h-12 w-12 text-cyan-400 mr-2" />
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full"
                  ></motion.div>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  DDFH
                </h1>
              </motion.div>
            </Link>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
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
            </motion.div>
            {session ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center space-x-8"
              >
                <Link 
                  href={`/urls`} 
                  className="flex items-center text-gray-300 hover:text-white transition-colors group"
                >
                  <Cable className="h-6 w-6 mr-1 group-hover:text-cyan-400 transition-colors" />
                  <span>URLs</span>
                </Link>

                <Link 
                  href={`/${session.username}`} 
                  className="flex items-center text-gray-300 hover:text-white transition-colors group"
                >
                  <User className="h-6 w-6 mr-1 group-hover:text-cyan-400 transition-colors" />
                  <span>{session.username}</span>
                </Link>
              </motion.div>
              
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center space-x-8"
              >
                <Link 
                  href="/login" 
                  className="text-gray-300 hover:text-white font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md font-medium transition-colors flex items-center"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                  Sign Up
                </Link>
              </motion.div>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white p-2"
            >
              {menuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuVariants}
            className="md:hidden bg-gray-800 shadow-lg"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <motion.div variants={menuItemVariants}>
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
              </motion.div>
              {session ? (
                <motion.div variants={menuItemVariants}>
                  <Link 
                    href={`/${session.username}`} 
                    className="block px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                </motion.div>
              ) : (
                <>
                  <motion.div variants={menuItemVariants}>
                    <Link 
                      href="/login" 
                      className="block px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Log In
                    </Link>
                  </motion.div>
                  <motion.div variants={menuItemVariants}>
                    <Link 
                      href="/signup" 
                      className="block px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                      Sign Up
                    </Link>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
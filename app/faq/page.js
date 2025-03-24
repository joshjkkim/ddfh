"use client";

import React, { useState } from 'react';
import { Shield, Lock, Clock, ChevronDown, ChevronUp, MessageCircleQuestion, Database, Key, Upload, FileText, Eye, RefreshCw, HelpCircle, MapPinOff } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function FAQ() {
  const [openItem, setOpenItem] = useState(null);
  const router = useRouter();

  const toggleItem = (index) => {
    setOpenItem(openItem === index ? null : index);
  };

  const faqItems = [
    {
      question: "What is DDFH?",
      answer: "DDFH is a zero-knowledge, end-to-end encrypted file hosting service. It allows you to securely share files with others without the service provider (us) having any way to access your data. All encryption happens in your browser before upload, and decryption happens in the recipient's browser after download."
    },
    {
      question: "How does the encryption work?",
      answer: "We use AES-GCM encryption, a strong industry-standard algorithm. Your file is encrypted in your browser before being uploaded. We generate a unique decryption key that only you receive, and without this key, the file cannot be accessed - even by us. This ensures complete privacy and security for your data."
    },
    {
      question: "What is a 'zero-knowledge' architecture?",
      answer: "Zero-knowledge means that we have no ability to access your encrypted data. We don't store your encryption keys, and they never leave your browser. Only the encrypted data is stored on our servers, making it impossible for us to access your files even if we wanted to or were compelled to by law enforcement."
    },
    {
      question: "Why do files have an expiration time?",
      answer: "Files are automatically deleted after their expiration time for both security and resource management. Temporary sharing reduces the risk of unauthorized access over time. Larger files have shorter maximum expiration times to help us manage storage resources efficiently."
    },
    {
      question: "What is the panel key used for?",
      answer: "The panel key gives you access to a dashboard where you can monitor your file's activity, including how many times it has been accessed and when it will expire. You can also use the panel to manually delete files before their scheduled expiration time."
    },
    {
      question: "What's the maximum file size?",
      answer: "DDFH supports files up to 5GB in size. Note that larger files will have shorter maximum expiration periods to help us manage server resources efficiently."
    },
    {
      question: "Is my data really secure?",
      answer: "Yes. With end-to-end encryption and zero-knowledge architecture, your data is encrypted before it ever leaves your device. We never see your encryption keys, and the data stored on our servers is encrypted. Even in the unlikely event of a server breach, your files would remain securely encrypted."
    },
    {
      question: "How does the 'Max Accesses' feature work?",
      answer: "You can set a limit on how many times your file can be accessed. Once it reaches this limit, the file will be automatically deleted from our servers, even if it hasn't reached its expiration time yet. This provides an additional layer of control over your shared content."
    },
    {
      question: "What happens to the decryption key if I lose it?",
      answer: "There is no way to recover a lost decryption key, as we don't store it anywhere on our servers. This is a fundamental part of our security model. Always make sure to save your decryption key in a secure location when sharing important files."
    },
    {
      question: "Do you log IP addresses or track users?",
      answer: "We maintain minimal logs required for service operation and abuse prevention, but we don't track your browsing or file contents. Due to our zero-knowledge architecture, we cannot see what files you're sharing or their contents."
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100">
      <div className="container mx-auto px-4 py-16">
        <header className="mb-16 text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <MapPinOff className="h-12 w-12 text-cyan-400 mr-2" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              DDFH
            </h1>
          </div>
          <p className="text-gray-300 max-w-xl mx-auto text-lg">
            Frequently Asked Questions
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center bg-gray-800/40 px-3 py-1 rounded-full">
              <Shield className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-xs text-gray-300">Zero-knowledge</span>
            </div>
            <div className="flex items-center bg-gray-800/40 px-3 py-1 rounded-full">
              <Lock className="h-4 w-4 text-yellow-400 mr-1" />
              <span className="text-xs text-gray-300">End-to-end encrypted</span>
            </div>
            <div className="flex items-center bg-gray-800/40 px-3 py-1 rounded-full">
              <Clock className="h-4 w-4 text-cyan-400 mr-1" />
              <span className="text-xs text-gray-300">Time-limited sharing</span>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-gray-700/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <MessageCircleQuestion className="h-6 w-6 text-cyan-400 mr-3" />
                <h2 className="text-2xl font-bold text-gray-100">Frequently Asked Questions</h2>
              </div>
              <button 
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-medium py-2 px-4 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 transform hover:scale-105"
              >
                Back Home
              </button>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div 
                  key={index} 
                  className="bg-gray-700/50 rounded-lg overflow-hidden transition-all duration-300"
                >
                  <button
                    className="w-full text-left px-6 py-4 flex items-center justify-between focus:outline-none"
                    onClick={() => toggleItem(index)}
                  >
                    <div className="flex items-center">
                      {index === 0 && <Shield className="h-5 w-5 text-green-400 mr-3" />}
                      {index === 1 && <Lock className="h-5 w-5 text-yellow-400 mr-3" />}
                      {index === 2 && <Database className="h-5 w-5 text-purple-400 mr-3" />}
                      {index === 3 && <Clock className="h-5 w-5 text-cyan-400 mr-3" />}
                      {index === 4 && <Key className="h-5 w-5 text-green-400 mr-3" />}
                      {index === 5 && <Upload className="h-5 w-5 text-blue-400 mr-3" />}
                      {index === 6 && <Lock className="h-5 w-5 text-red-400 mr-3" />}
                      {index === 7 && <Eye className="h-5 w-5 text-indigo-400 mr-3" />}
                      {index === 8 && <Key className="h-5 w-5 text-yellow-400 mr-3" />}
                      {index === 9 && <FileText className="h-5 w-5 text-cyan-400 mr-3" />}
                      <span className="font-medium text-gray-100">{item.question}</span>
                    </div>
                    {openItem === index ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <div 
                    className={`px-6 pb-4 text-gray-300 transition-all duration-300 ${
                      openItem === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                  >
                    <p className="border-t border-gray-600/50 pt-4">{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700/30">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 mr-2" />
                Still Have Questions?
              </h3>
              <p className="text-gray-300 mb-6">
                Our team is here to help you with any additional questions you might have about our secure file sharing service.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="inline-flex items-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all duration-300 hover:scale-105">
                  <MessageCircleQuestion className="h-5 w-5 mr-2" />
                  Contact Support
                </button>
                <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full transition-all duration-300 hover:scale-105">
                  <FileText className="h-5 w-5 mr-2" />
                  View Code
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-gray-400 text-sm">
            <p className="mt-2">
              © {new Date().getFullYear()} DDFH. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
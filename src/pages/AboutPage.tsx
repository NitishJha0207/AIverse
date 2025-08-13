import React from 'react';
import { Shield, Lock, Database, Users, Code, Brain } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639322537228-f710d846310a')] bg-cover bg-center opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Making AI Safe and Accessible</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Building the world's first privacy-focused AI app store, where security meets innovation.
            </p>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <p className="text-xl text-gray-600">
              AIVerse is proudly owned and maintained by Pathwise Technologies Private Limited, 
              a pioneering force in creating secure and ethical AI solutions. We're revolutionizing 
              how people interact with AI applications by putting privacy and security first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Privacy First</h3>
              <p className="text-gray-600">
                We believe your data belongs to you. Our platform ensures your information 
                stays private and secure while using AI applications.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">AI Innovation</h3>
              <p className="text-gray-600">
                We curate and verify the best AI applications, ensuring they meet our 
                strict standards for security and performance.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">User Control</h3>
              <p className="text-gray-600">
                Take control of your AI experience with granular permissions and 
                data sharing controls for each application.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl text-gray-600 mb-8">
              At AIVerse, our mission is to make AI safe, transparent, and accessible for everyone. 
              We believe that as AI becomes increasingly integral to our daily lives, users should 
              have complete control over their data and privacy while enjoying the benefits of 
              cutting-edge AI applications.
            </p>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <p className="text-gray-700 italic">
                "We envision a future where AI enhances human potential without compromising 
                privacy or security. AIVerse is building that future today."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
            <p className="text-xl text-gray-600 mb-8">
              Have questions about AIVerse or interested in publishing your AI application? 
              We'd love to hear from you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Business Inquiries</h3>
                <p className="text-gray-600">aiverse@pathwise.in</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Support</h3>
                <p className="text-gray-600">support@pathwise.in</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Twitter, 
  Instagram, 
  Github, 
  MessageSquare, 
  Mail, 
  Phone, 
  MapPin 
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/c4d15a35-a182-4c73-9c84-58699970784e.png"
                alt="AIVerse"
                className="w-10 h-10"
              />
              <h2 className="text-xl font-bold">AIVerse</h2>
            </div>
            <p className="text-gray-400 mb-4">
              The world's first dedicated AI App Store, bringing together AI applications, developers, and enterprises.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
              </li>
              <li>
                <Link to="/features" className="text-gray-400 hover:text-white transition-colors">Key Features</Link>
              </li>
              <li>
                <Link to="/launches" className="text-gray-400 hover:text-white transition-colors">AI Launches</Link>
              </li>
              <li>
                <Link to="/updates" className="text-gray-400 hover:text-white transition-colors">AI Updates</Link>
              </li>
              <li>
                <Link to="/tutorials" className="text-gray-400 hover:text-white transition-colors">AI App Tutorials</Link>
              </li>
              <li>
                <Link to="/store" className="text-gray-400 hover:text-white transition-colors">App Store</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">For Developers</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/developer/register" className="text-gray-400 hover:text-white transition-colors">Register as Developer</Link>
              </li>
              <li>
                <Link to="/developer/console" className="text-gray-400 hover:text-white transition-colors">Developer Console</Link>
              </li>
              <li>
                <Link to="/developer/publish" className="text-gray-400 hover:text-white transition-colors">Publish App</Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">API Reference</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Developer Community</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <a href="mailto:aiverse@pathwise.in" className="text-gray-400 hover:text-white transition-colors">aiverse@pathwise.in</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a href="tel:+91 8356955361" className="text-gray-400 hover:text-white transition-colors">+91 8356955361</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <span className="text-gray-400">
                  Bangalore, Karnataka, India.
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} The AI Verse. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
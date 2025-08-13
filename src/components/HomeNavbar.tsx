import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function HomeNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showEnterpriseDropdown, setShowEnterpriseDropdown] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '/home' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path;
  };

  const handleEnterpriseLogin = () => {
    navigate('/enterprise/login');
  };

  const handleEnterpriseSetup = () => {
    navigate('/enterprise/setup');
  };

  const handleEnterpriseAdmin = () => {
    navigate('/enterprise/admin');
  };

  return (
    <header
      className={`bg-white sticky top-0 z-50 transition-shadow ${
        isScrolled ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/ai-logo.png"
                alt="AIVerse"
                className="w-8 h-8"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMmUyZTIiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjY2NjYiPkFJPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
              <h1 className="text-xl font-semibold hidden sm:block">AIVerse</h1>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/home')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Home
            </Link>
            <Link
              to="/about"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/about')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              About
            </Link>
            <Link
              to="/features"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/features')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Key Features
            </Link>
            <Link
              to="/launches"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/launches')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              AI Launches
            </Link>
            <Link
              to="/updates"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/updates')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              AI Updates
            </Link>
            <Link
              to="/tutorials"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/tutorials')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              AI App Tutorials
            </Link>
            <Link
              to="/store"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/store')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              App Store
            </Link>
            
            {/* Enterprise dropdown */}
            <div className="relative">
              <button
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                onClick={() => setShowEnterpriseDropdown(!showEnterpriseDropdown)}
                onBlur={() => setTimeout(() => setShowEnterpriseDropdown(false), 100)}
              >
                <Building2 className="w-4 h-4" />
                Enterprise
                <ChevronDown className={`w-4 h-4 transition-transform ${showEnterpriseDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showEnterpriseDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                  <button
                    onClick={() => {
                      handleEnterpriseLogin();
                      setShowEnterpriseDropdown(false);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Enterprise Login
                  </button>
                  <button
                    onClick={() => {
                      handleEnterpriseSetup();
                      setShowEnterpriseDropdown(false);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Set Up Organization
                  </button>
                  <Link
                    to="/enterprise/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Enterprise Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleEnterpriseAdmin();
                      setShowEnterpriseDropdown(false);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Admin Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            {auth.isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  {auth.user?.fullName}
                </span>
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/home')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/about"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/about')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/features"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/features')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Key Features
            </Link>
            <Link
              to="/launches"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/launches')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              AI Launches
            </Link>
            <Link
              to="/updates"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/updates')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              AI Updates
            </Link>
            <Link
              to="/tutorials"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/tutorials')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              AI App Tutorials
            </Link>
            <Link
              to="/store"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/store')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              App Store
            </Link>
            
            {/* Enterprise section */}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Enterprise
              </p>
              <button
                onClick={() => {
                  navigate('/enterprise/login');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Enterprise Login
              </button>
              <button
                onClick={() => {
                  navigate('/enterprise/setup');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Set Up Organization
              </button>
              <Link
                to="/enterprise/dashboard"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Enterprise Dashboard
              </Link>
              <button
                onClick={() => {
                  navigate('/enterprise/admin');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Admin Dashboard
              </button>
            </div>

            <div className="pt-4 pb-3 border-t border-gray-200">
              {auth.isAuthenticated ? (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-base font-medium text-gray-800">
                    {auth.user?.fullName}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/login"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
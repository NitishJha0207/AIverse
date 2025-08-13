import { Link, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, Settings, Menu, X, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { SettingsModal } from './SettingsModal';

export function Navbar() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
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
    <>
      <header className={`bg-white sticky top-0 z-10 transition-shadow ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
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

            <div className="flex-1 max-w-2xl mx-4 hidden md:block">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search AI apps..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-4">
              {auth.isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium">{auth.user?.fullName}</span>
                  </div>
                  
                  {/* Enterprise dropdown */}
                  <div className="relative">
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                      onClick={() => setShowEnterpriseDropdown(!showEnterpriseDropdown)}
                      onBlur={() => setTimeout(() => setShowEnterpriseDropdown(false), 100)}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="text-sm">Enterprise</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showEnterpriseDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showEnterpriseDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                        <Link
                          to="/enterprise/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowEnterpriseDropdown(false)}
                        >
                          Enterprise Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            handleEnterpriseLogin();
                            setShowEnterpriseDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Enterprise Login
                        </button>
                        <button
                          onClick={() => {
                            handleEnterpriseSetup();
                            setShowEnterpriseDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Set Up Organization
                        </button>
                        <button
                          onClick={() => {
                            handleEnterpriseAdmin();
                            setShowEnterpriseDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Admin Dashboard
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm">Settings</span>
                  </button>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm">Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Register
                  </Link>
                </div>
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

        {/* Mobile search and menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 pt-2 pb-3 space-y-3">
              <div className="relative mt-3 mb-4">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search AI apps..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {auth.isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700">
                    <User className="w-5 h-5" />
                    <span className="font-medium">{auth.user?.fullName}</span>
                  </div>
                  <Link
                    to="/enterprise/dashboard"
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Enterprise Dashboard</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleEnterpriseLogin();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Enterprise Login</span>
                  </button>
                  <button
                    onClick={() => {
                      handleEnterpriseSetup();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Set Up Organization</span>
                  </button>
                  <button
                    onClick={() => {
                      handleEnterpriseAdmin();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Admin Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link
                    to="/login"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
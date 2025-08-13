import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Database, 
  Users, 
  Code, 
  ArrowRight,
  CheckCircle,
  Search,
  Zap,
  Building2,
  Rocket,
  ExternalLink,
  Brain,
  Info,
  Mail,
  Phone,
  Building
} from 'lucide-react';

export default function HomePage() {
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const navigate = useNavigate();

  const handleEnterpriseLogin = () => {
    navigate('/enterprise/login');
    setShowEnterpriseModal(false);
  };

  const handleEnterpriseSetup = () => {
    navigate('/enterprise/setup');
    setShowEnterpriseModal(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639322537228-f710d846310a')] bg-cover bg-center opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              AI Should Help You, Not Spy on You
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              AIVERSE — Next Gen. AppStore<br />
              Secures AI-Usage, Protects Data
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/store" 
                className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                Explore AI Apps
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => setShowEnterpriseModal(true)}
                className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                <Building className="w-5 h-5" />
                Enterprise Solutions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Contact Modal */}
      {showEnterpriseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEnterpriseModal(false)}>
          <div className="bg-white rounded-lg p-8 max-w-lg w-full m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold">Enterprise Solutions</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Looking to deploy AIVerse for your enterprise? Get in touch with our team for custom solutions and dedicated support.
            </p>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Enterprise Options</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={handleEnterpriseLogin}
                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      <span>Enterprise Login</span>
                    </div>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={handleEnterpriseSetup}
                    className="w-full flex items-center justify-between px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      <span>Set Up Organization</span>
                    </div>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-2">Contact Information</h3>
                <p className="text-gray-600">Mohit Ranjan, CEO</p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a href="mailto:aiverse@pathwise.in" className="text-blue-600 hover:underline">
                      aiverse@pathwise.in
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a href="tel:+918356955361" className="text-blue-600 hover:underline">
                      +91 8356955361
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowEnterpriseModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Section Preview */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              About AIVerse
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              AIVerse is proudly owned and maintained by Pathwise Technologies Private Limited. 
              Our mission is to make AI safe, transparent, and accessible for everyone while 
              ensuring complete user control over data and privacy.
            </p>
            <Link 
              to="/about" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Learn More About Us
              <Info className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
              <p className="text-gray-600">Your data belongs to you, always.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Innovation</h3>
              <p className="text-gray-600">Cutting-edge AI apps, vetted for security.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">User Control</h3>
              <p className="text-gray-600">Complete control over your AI experience.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section Preview */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-2">
              <Rocket className="w-8 h-8 text-purple-600" />
              Key Features
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Discover the powerful features that make AIVerse the most secure and 
              user-friendly AI app store platform.
            </p>
            <Link 
              to="/features" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Explore All Features
              <Zap className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Secure App Sandbox</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Isolated execution environment</span>
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Resource monitoring</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Shared Memory Layer</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Secure data sharing</span>
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Access control</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3">User Control</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Privacy settings</span>
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Permission management</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              Enterprise Solutions
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Secure, scalable AI app management for organizations of all sizes.
              Control access, monitor usage, and ensure compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Enterprise Login
              </h3>
              <p className="text-gray-600 mb-6">
                Access your organization's enterprise dashboard, manage users, and control AI app usage.
              </p>
              <button
                onClick={handleEnterpriseLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enterprise Login
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-600" />
                Set Up Your Organization
              </h3>
              <p className="text-gray-600 mb-6">
                Create a new enterprise account for your organization and start managing AI apps securely.
              </p>
              <button
                onClick={handleEnterpriseSetup}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Set Up Organization
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-2">
              <Shield className="w-8 h-8 text-red-500" />
              Why AIVERSE?
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              AI is smart, but your privacy is at risk. Most AI apps today track behavior, access data without consent, and store it on unknown servers.
            </p>
            <p className="text-xl font-semibold text-blue-600">
              AIVERSE fixes this with a privacy-first, user-controlled AI ecosystem.
            </p>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            How AIVERSE Works
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">You're in Control</h3>
              <p className="text-gray-600">
                Decide what data each AI app can access—nothing more.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No Shadow Storage</h3>
              <p className="text-gray-600">
                Your data never leaves without your permission. No hidden cloud syncing.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">One Secure AI Hub</h3>
              <p className="text-gray-600">
                Use multiple AI apps from one platform without repeating data exposure.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trustworthy AI</h3>
              <p className="text-gray-600">
                Only verified apps, with transparency in privacy, security, and ethics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* For Different Users */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 flex items-center justify-center gap-2">
            <Users className="w-8 h-8 text-blue-500" />
            Who It's For
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">For Individuals</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Discover useful AI tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Compare apps by features & safety</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Control personal data access</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">For Businesses</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Enable secure AI usage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Monitor permissions & usage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Prevent data leaks</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">For Developers</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>List your AI App for free</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Get analytics & reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Monetize via subscriptions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* App Categories */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">500+ AI Apps Onboarded</h2>
            <p className="text-xl text-gray-600">Explore top tools across categories</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Business', 'Design', 'Education', 'Productivity', 'Text', 'Speech', 'Video', 'Dev Tools'].map((category) => (
              <Link
                key={category}
                to={`/store?category=${category}`}
                className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <h3 className="font-medium">{category}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Unique Features */}
      <div className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Makes AIVERSE Unique</h2>
            <p className="text-xl opacity-90">First-of-its-kind Secure AI App Store</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl">
              <Shield className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Transparent Permissions</h3>
              <p className="opacity-90">
                Clear visibility into what data each app can access and how it's used.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl">
              <Lock className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Verified Apps</h3>
              <p className="opacity-90">
                Every app undergoes security and privacy verification before listing.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl">
              <Database className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Shared Memory Framework</h3>
              <p className="opacity-90">
                Secure data sharing between apps with granular user control.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Use AI Without Compromising Privacy?</h2>
          <p className="text-xl text-gray-600 mb-8">Your Data. Your Choice. Always.</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/store" 
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Explore Demo
              <ExternalLink className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setShowEnterpriseModal(true)}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              Enterprise Solutions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
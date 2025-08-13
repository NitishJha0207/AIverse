import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, AlertCircle, Check, Upload, FileUp, Code, GitBranch } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { publishApp, PublishingError } from '../lib/appPublishing';
import { logger } from '../lib/logging';

interface PublishAppFormProps {
  onClose: () => void;
  developerId: string;
}

export function PublishAppForm({ onClose, developerId }: PublishAppFormProps) {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    category: '',
    price: 0,
    tags: [] as string[],
    features: [] as string[],
    icon_url: '',
    screenshots: [] as string[],
    version: '1.0.0',
    repository_url: '',
    build_config: {
      node_version: '20',
      build_command: 'npm run build',
      output_dir: 'dist'
    }
  });

  // File upload states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'failed'>('idle');

  const publishLogger = logger.child({ 
    component: 'PublishAppForm',
    developerId 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setPublishState('publishing');

      publishLogger.info('Starting automated app publishing process');

      // Validate required fields
      if (!formData.name || !formData.description || !formData.short_description || 
          !formData.category || !formData.icon_url || !formData.repository_url) {
        throw new Error('Please fill in all required fields');
      }

      // Validate repository URL
      try {
        new URL(formData.repository_url);
      } catch {
        throw new Error('Please enter a valid repository URL');
      }

      publishLogger.info({ formData }, 'Publishing app with form data');

      // Publish app with progress tracking
      const result = await publishApp(
        {
          ...formData,
          developer_id: developerId,
          metadata: {
            build_config: formData.build_config
          }
        },
        formData.repository_url,
        undefined,
        (progress) => {
          setUploadProgress(progress);
          publishLogger.debug({ progress }, 'Publishing progress update');
        }
      );

      publishLogger.info({ appId: result.id }, 'App published successfully');
      setSuccess('App published successfully! Redirecting to developer console...');
      setPublishState('published');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        short_description: '',
        category: '',
        price: 0,
        tags: [],
        features: [],
        icon_url: '',
        screenshots: [],
        version: '1.0.0',
        repository_url: '',
        build_config: {
          node_version: '20',
          build_command: 'npm run build',
          output_dir: 'dist'
        }
      });
      
      // Navigate to console after a short delay
      setTimeout(() => {
        navigate('/developer/console', { replace: true });
      }, 2000);
      
    } catch (err) {
      let errorMessage: string;
      if (err instanceof PublishingError) {
        errorMessage = `Publishing failed: ${err.message}${err.details ? ` (${JSON.stringify(err.details)})` : ''}`;
      } else if (err instanceof Error) {
        if (err.message.includes('row-level security')) {
          errorMessage = 'Permission denied. Please ensure you have the correct permissions.';
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = 'An unexpected error occurred while publishing the app';
      }

      publishLogger.error({ error: err }, 'App publishing failed');
      setError(errorMessage);
      setPublishState('failed');
    } finally {
      setLoading(false);
    }
  };

  const getPublishButtonText = () => {
    switch (publishState) {
      case 'publishing':
        return 'Publishing...';
      case 'published':
        return 'Published!';
      case 'failed':
        return 'Try Again';
      default:
        return 'Publish App';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Publish New App</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.version}
              onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              placeholder="1.0.0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repository URL <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="url"
                required
                value={formData.repository_url}
                onChange={(e) => setFormData(prev => ({ ...prev, repository_url: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/username/repository"
                disabled={loading}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Provide the URL to your app's source code repository
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Short Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.short_description}
            onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            maxLength={150}
          />
          <p className="text-xs text-gray-500 mt-1">
            Brief description of your app (max 150 characters)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a category</option>
              <option value="Text & Writing">Text & Writing</option>
              <option value="Image & Design">Image & Design</option>
              <option value="Audio & Music">Audio & Music</option>
              <option value="Video & Animation">Video & Animation</option>
              <option value="Marketing & Sales">Marketing & Sales</option>
              <option value="Development & IT">Development & IT</option>
              <option value="Business & Admin">Business & Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (USD)
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Set to 0 for free apps
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Icon URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.icon_url}
            onChange={(e) => setFormData(prev => ({ ...prev, icon_url: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            URL to your app icon (recommended size: 512x512px)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Screenshots
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.screenshots.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      screenshots: prev.screenshots.filter((_, i) => i !== index)
                    }));
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Enter screenshot URL:');
                if (url) {
                  try {
                    new URL(url);
                    setFormData(prev => ({
                      ...prev,
                      screenshots: [...prev.screenshots, url]
                    }));
                  } catch {
                    alert('Please enter a valid URL');
                  }
                }
              }}
              disabled={loading}
              className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
            >
              <Plus className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      tags: prev.tags.filter((_, i) => i !== index)
                    }));
                  }}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  disabled={loading}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                const tag = window.prompt('Enter tag:');
                if (tag) {
                  setFormData(prev => ({
                    ...prev,
                    tags: [...prev.tags, tag]
                  }));
                }
              }}
              disabled={loading}
              className="px-3 py-1 border border-gray-300 rounded-full text-sm hover:bg-gray-50"
            >
              Add Tag
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Features
          </label>
          <div className="mt-2 space-y-2">
            {formData.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <span>{feature}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      features: prev.features.filter((_, i) => i !== index)
                    }));
                  }}
                  className="text-gray-500 hover:text-red-600"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const feature = window.prompt('Enter feature:');
                if (feature) {
                  setFormData(prev => ({
                    ...prev,
                    features: [...prev.features, feature]
                  }));
                }
              }}
              disabled={loading}
              className="w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-300"
            >
              Add Feature
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Build Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Node.js Version
              </label>
              <select
                value={formData.build_config.node_version}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  build_config: {
                    ...prev.build_config,
                    node_version: e.target.value
                  }
                }))}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="20">Node.js 20 (Latest LTS)</option>
                <option value="18">Node.js 18</option>
                <option value="16">Node.js 16</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Build Command
              </label>
              <input
                type="text"
                value={formData.build_config.build_command}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  build_config: {
                    ...prev.build_config,
                    build_command: e.target.value
                  }
                }))}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="npm run build"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Output Directory
              </label>
              <input
                type="text"
                value={formData.build_config.output_dir}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  build_config: {
                    ...prev.build_config,
                    output_dir: e.target.value
                  }
                }))}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="dist"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || publishState === 'published'}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              publishState === 'published' 
                ? 'bg-green-600 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span>Publishing...</span>
              </>
            ) : publishState === 'published' ? (
              <>
                <Check className="w-4 h-4" />
                <span>{getPublishButtonText()}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>{getPublishButtonText()}</span>
              </>
            )}
          </button>
        </div>

        {publishState === 'publishing' && uploadProgress > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-600">
                {uploadProgress < 100 ? 'Processing' : 'Finalizing'}: {uploadProgress}%
              </span>
              {uploadProgress === 100 && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
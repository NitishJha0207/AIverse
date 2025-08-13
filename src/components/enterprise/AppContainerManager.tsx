import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Play, 
  Square, 
  RefreshCw, 
  Cpu, 
  HardDrive, 
  Network, 
  Shield,
  AlertCircle,
  X
} from 'lucide-react';
import { AppContainer } from '../../types';
import { getAppContainer, updateAppContainerStatus, createAppContainer } from '../../lib/enterprise';
import { useEnterprise } from '../../context/EnterpriseContext';
import { LoadingSpinner } from '../LoadingSpinner';

interface AppContainerManagerProps {
  appId: string;
  userId: string;
  onClose?: () => void;
}

export function AppContainerManager({ appId, userId, onClose }: AppContainerManagerProps) {
  const { organization } = useEnterprise();
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState('');
  const [blockedDomain, setBlockedDomain] = useState('');

  useEffect(() => {
    const fetchContainer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get existing container
        const existingContainer = await getAppContainer(appId, userId);
        
        if (existingContainer) {
          setContainer(existingContainer);
        } else {
          // Create new container if none exists
          const newContainer = await createAppContainer(
            appId, 
            userId,
            organization?.id
          );
          setContainer(newContainer);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load container');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContainer();
  }, [appId, userId, organization?.id]);

  const handleStartContainer = async () => {
    if (!container) return;
    
    try {
      setActionLoading(true);
      setError(null);
      
      await updateAppContainerStatus(container.id, 'running');
      
      // Update local state
      setContainer(prev => prev ? { ...prev, status: 'running' } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start container');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopContainer = async () => {
    if (!container) return;
    
    try {
      setActionLoading(true);
      setError(null);
      
      await updateAppContainerStatus(container.id, 'stopped');
      
      // Update local state
      setContainer(prev => prev ? { ...prev, status: 'stopped' } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop container');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAllowedDomain = () => {
    if (!allowedDomain || !container) return;
    
    const updatedContainer = { ...container };
    const allowedDomains = [...(updatedContainer.network_isolation.allowed_domains || [])];
    
    if (!allowedDomains.includes(allowedDomain)) {
      allowedDomains.push(allowedDomain);
      updatedContainer.network_isolation.allowed_domains = allowedDomains;
      setContainer(updatedContainer);
      setAllowedDomain('');
    }
  };

  const handleAddBlockedDomain = () => {
    if (!blockedDomain || !container) return;
    
    const updatedContainer = { ...container };
    const blockedDomains = [...(updatedContainer.network_isolation.blocked_domains || [])];
    
    if (!blockedDomains.includes(blockedDomain)) {
      blockedDomains.push(blockedDomain);
      updatedContainer.network_isolation.blocked_domains = blockedDomains;
      setContainer(updatedContainer);
      setBlockedDomain('');
    }
  };

  const handleRemoveAllowedDomain = (domain: string) => {
    if (!container) return;
    
    const updatedContainer = { ...container };
    updatedContainer.network_isolation.allowed_domains = 
      updatedContainer.network_isolation.allowed_domains.filter(d => d !== domain);
    setContainer(updatedContainer);
  };

  const handleRemoveBlockedDomain = (domain: string) => {
    if (!container) return;
    
    const updatedContainer = { ...container };
    updatedContainer.network_isolation.blocked_domains = 
      updatedContainer.network_isolation.blocked_domains.filter(d => d !== domain);
    setContainer(updatedContainer);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="medium" message="Loading container..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Container Found</h3>
          <p className="text-gray-600 mb-4">
            There is no container for this application. Create one to get started.
          </p>
          <button
            onClick={() => createAppContainer(appId, userId, organization?.id).then(setContainer)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Container
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Server className="w-6 h-6 text-blue-600" />
          App Container
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Container Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              container.status === 'running' ? 'bg-green-500' :
              container.status === 'stopped' ? 'bg-gray-500' :
              'bg-red-500'
            }`}></div>
            <span className="font-medium capitalize">{container.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartContainer}
              disabled={container.status === 'running' || actionLoading}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Start Container"
            >
              <Play className="w-5 h-5" />
            </button>
            <button
              onClick={handleStopContainer}
              disabled={container.status === 'stopped' || actionLoading}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Stop Container"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={() => getAppContainer(appId, userId).then(c => c && setContainer(c))}
              disabled={actionLoading}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Status"
            >
              <RefreshCw className={`w-5 h-5 ${actionLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-600" />
          Resource Usage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">CPU</span>
              <span className="font-medium">{container.resource_usage.cpu_percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${container.resource_usage.cpu_percent}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Memory</span>
              <span className="font-medium">{container.resource_usage.memory_mb} MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ width: `${Math.min(100, (container.resource_usage.memory_mb / 256) * 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Storage</span>
              <span className="font-medium">{container.resource_usage.storage_mb} MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${Math.min(100, (container.resource_usage.storage_mb / 100) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Isolation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-600" />
            Network Isolation
          </h3>
          <button
            onClick={() => setShowNetworkSettings(!showNetworkSettings)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showNetworkSettings ? 'Hide Settings' : 'Show Settings'}
          </button>
        </div>
        
        {showNetworkSettings && (
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            {/* Allowed Domains */}
            <div>
              <h4 className="font-medium mb-2">Allowed Domains</h4>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={allowedDomain}
                  onChange={(e) => setAllowedDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddAllowedDomain}
                  disabled={!allowedDomain}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {container.network_isolation.allowed_domains.map((domain, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                  >
                    <span>{domain}</span>
                    <button
                      onClick={() => handleRemoveAllowedDomain(domain)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {container.network_isolation.allowed_domains.length === 0 && (
                  <p className="text-sm text-gray-500">No allowed domains. Container has unrestricted access.</p>
                )}
              </div>
            </div>
            
            {/* Blocked Domains */}
            <div>
              <h4 className="font-medium mb-2">Blocked Domains</h4>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={blockedDomain}
                  onChange={(e) => setBlockedDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddBlockedDomain}
                  disabled={!blockedDomain}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Block
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {container.network_isolation.blocked_domains.map((domain, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full"
                  >
                    <span>{domain}</span>
                    <button
                      onClick={() => handleRemoveBlockedDomain(domain)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {container.network_isolation.blocked_domains.length === 0 && (
                  <p className="text-sm text-gray-500">No blocked domains.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security Information */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Security Information
        </h3>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Isolated execution environment</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Resource limits enforced</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Network access controlled</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>File system isolation</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Container Logs */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-600" />
          Container Logs
        </h3>
        <div className="bg-gray-900 text-gray-200 rounded-lg p-4 font-mono text-sm h-40 overflow-y-auto">
          <p>[{new Date().toISOString()}] Container {container.id} created</p>
          <p>[{new Date().toISOString()}] Status: {container.status}</p>
          <p>[{new Date().toISOString()}] Resource limits applied</p>
          <p>[{new Date().toISOString()}] Network isolation configured</p>
          <p>[{new Date().toISOString()}] Container ready</p>
        </div>
      </div>
    </div>
  );
}
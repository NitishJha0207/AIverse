import React, { useState, useRef } from 'react';
import { X, Upload, Shield, AlertCircle, FileType, File } from 'lucide-react';
import { Permission, DataCollectionPolicy } from '../types';
import { supabase, uploadAppBinary } from '../lib/supabase';
import { z } from 'zod';

const SUPPORTED_BINARY_TYPES = ['apk', 'aab'];
const MAX_BINARY_SIZE = 100 * 1024 * 1024; // 100MB

const AppBinarySchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= MAX_BINARY_SIZE,
    'File size must be less than 100MB'
  ).refine(
    (file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension && SUPPORTED_BINARY_TYPES.includes(extension);
    },
    'Only .apk and .aab files are supported'
  )
});

interface PublishAppModalProps {
  onClose: () => void;
  onPublish: (appData: any) => Promise<void>;
}

export function PublishAppModal({ onClose, onPublish }: PublishAppModalProps) {
  const [step, setStep] = useState(1);
  const [appData, setAppData] = useState({
    name: '',
    description: '',
    category: 'general',
    price: 0,
    permissions: [] as Permission[],
  });

  const [currentPermission, setCurrentPermission] = useState<Partial<Permission>>({
    name: '',
    description: '',
    type: 'files',
    dataCollection: {
      purpose: '',
      dataTypes: [],
      retention: '30 days',
      sharing: [],
      required: false
    }
  });

  const [appBinary, setAppBinary] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await AppBinarySchema.parseAsync({ file });
      setAppBinary(file);
      setUploadError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setUploadError(error.errors[0].message);
      } else {
        setUploadError('Invalid file');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setAppBinary(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (!file) return;

    try {
      await AppBinarySchema.parseAsync({ file });
      setAppBinary(file);
      setUploadError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setUploadError(error.errors[0].message);
      } else {
        setUploadError('Invalid file');
      }
      setAppBinary(null);
    }
  };

  const handleAddPermission = () => {
    if (currentPermission.name && currentPermission.description) {
      setAppData(prev => ({
        ...prev,
        permissions: [...prev.permissions, { ...currentPermission, id: Date.now().toString(), isGranted: false } as Permission]
      }));
      setCurrentPermission({
        name: '',
        description: '',
        type: 'files',
        dataCollection: {
          purpose: '',
          dataTypes: [],
          retention: '30 days',
          sharing: [],
          required: false
        }
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);

      if (!appBinary) {
        setUploadError('Please upload an app binary file');
        return;
      }

      // Create app record first to get the ID
      const { data: app, error: appError } = await supabase
        .from('apps')
        .insert({
          name: appData.name,
          description: appData.description,
          category: appData.category,
          price: appData.price,
          required_permissions: appData.permissions,
          binary_type: appBinary.name.split('.').pop()?.toLowerCase(),
          status: 'pending'
        })
        .select()
        .single();

      if (appError || !app) {
        throw new Error(appError?.message || 'Failed to create app');
      }

      // Upload binary file
      const binaryPath = await uploadAppBinary(appBinary, app.id);

      // Update app with binary URL
      const { error: updateError } = await supabase
        .from('apps')
        .update({
          binary_url: binaryPath
        })
        .eq('id', app.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await onPublish(app);
      onClose();
    } catch (error) {
      console.error('Failed to publish app:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to publish app');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Publish Your AI App</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={appData.name}
                    onChange={(e) => setAppData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your app name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={appData.description}
                    onChange={(e) => setAppData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                    placeholder="Describe your app's features and benefits"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={appData.category}
                    onChange={(e) => setAppData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="productivity">Productivity</option>
                    <option value="developer">Developer Tools</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    value={appData.price}
                    onChange={(e) => setAppData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    App Binary
                  </label>
                  <div
                    className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-1 text-center">
                      {appBinary ? (
                        <div className="flex items-center justify-center space-x-2">
                          <FileType className="w-8 h-8 text-blue-500" />
                          <div className="text-sm text-gray-600">
                            {appBinary.name}
                            <span className="block text-xs">
                              {(appBinary.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <File className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id="file-upload"
                                ref={fileInputRef}
                                type="file"
                                accept=".apk,.aab"
                                className="sr-only"
                                onChange={handleFileSelect}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            APK or AAB up to 100MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {uploadError && (
                    <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!appData.name || !appData.description || !appBinary}
                >
                  Next: Permissions
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Data Collection Policy</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Clearly specify what data your app collects and how it will be used. 
                      This helps build trust with users and ensures compliance with privacy regulations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permission Name
                  </label>
                  <input
                    type="text"
                    value={currentPermission.name}
                    onChange={(e) => setCurrentPermission(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Camera Access"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={currentPermission.description}
                    onChange={(e) => setCurrentPermission(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Explain why this permission is needed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Collection Purpose
                  </label>
                  <input
                    type="text"
                    value={currentPermission.dataCollection?.purpose}
                    onChange={(e) => setCurrentPermission(prev => ({
                      ...prev,
                      dataCollection: { ...prev.dataCollection, purpose: e.target.value } as DataCollectionPolicy
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Why do you need to collect this data?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Retention Period
                  </label>
                  <select
                    value={currentPermission.dataCollection?.retention}
                    onChange={(e) => setCurrentPermission(prev => ({
                      ...prev,
                      dataCollection: { ...prev.dataCollection, retention: e.target.value } as DataCollectionPolicy
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="session">Session Only</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days</option>
                    <option value="1y">1 Year</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentPermission.dataCollection?.required}
                    onChange={(e) => setCurrentPermission(prev => ({
                      ...prev,
                      dataCollection: { ...prev.dataCollection, required: e.target.checked } as DataCollectionPolicy
                    }))}
                    id="required"
                  />
                  <label htmlFor="required" className="text-sm text-gray-700">
                    This permission is required for core functionality
                  </label>
                </div>

                <button
                  onClick={handleAddPermission}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mt-4"
                >
                  Add Permission
                </button>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Added Permissions</h4>
                  <div className="space-y-2">
                    {appData.permissions.map((permission, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{permission.name}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            permission.dataCollection?.required
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {permission.dataCollection?.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Publish App
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
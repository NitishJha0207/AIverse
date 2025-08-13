import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { Permission, AIApp } from '../types';

interface PermissionModalProps {
  app: AIApp;
  onClose: () => void;
  onGrantPermissions: (permissions: Permission[]) => void;
}

export default function PermissionModal({ app, onClose, onGrantPermissions }: PermissionModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>(
    app.permissions?.map(p => ({ ...p, isGranted: false })) || []
  );

  const handleTogglePermission = (id: string) => {
    setPermissions(permissions.map(p => 
      p.id === id ? { ...p, isGranted: !p.isGranted } : p
    ));
  };

  const handleSubmit = () => {
    // Only include permissions that have been granted
    const grantedPermissions = permissions.filter(p => p.isGranted);
    onGrantPermissions(grantedPermissions);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">App Permissions</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Shield className="w-5 h-5" />
            <span>{app.name} is requesting access to:</span>
          </div>
        </div>

        {permissions.length === 0 ? (
          <div className="text-center py-4 text-gray-600">
            This app doesn't require any permissions.
          </div>
        ) : (
          <div className="space-y-4">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={permission.id}
                  checked={permission.isGranted}
                  onChange={() => handleTogglePermission(permission.id)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor={permission.id} className="font-medium">
                    {permission.name}
                  </label>
                  <p className="text-xs text-gray-600">{permission.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Allow Selected
          </button>
        </div>
      </div>
    </div>
  );
}
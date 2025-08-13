import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  AlertCircle, 
  Check, 
  X,
  RefreshCw,
  Search
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { addUserToTeam, removeUserFromTeam } from '../../lib/enterprise';
import { Team, OrganizationUser } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';

interface TeamManagementProps {
  teamId: string;
}

export function TeamManagement({ teamId }: TeamManagementProps) {
  const { organization, teams, users, refreshTeams } = useEnterprise();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'member'>('member');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Find the current team
  const team = teams.find(t => t.id === teamId);
  
  // Get team members
  const teamMembers = team?.members || [];
  
  // Get available users (not already in the team)
  const availableUsers = users.filter(user => 
    !teamMembers.some(member => member.user_id === user.user_id)
  );
  
  // Filter available users by search query
  const filteredAvailableUsers = availableUsers.filter(user => 
    user.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!selectedUserId || !team) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await addUserToTeam(team.id, selectedUserId, selectedRole);
      
      setSuccess('User added to team successfully');
      setSelectedUserId(null);
      
      // Refresh teams data
      await refreshTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user to team');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!team) return;
    
    try {
      setRemovingUserId(userId);
      setError(null);
      
      await removeUserFromTeam(team.id, userId);
      
      // Refresh teams data
      await refreshTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user from team');
    } finally {
      setRemovingUserId(null);
    }
  };

  if (!team) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Team Not Found</h3>
          <p className="text-gray-600">The requested team could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold">{team.name}</h2>
        {team.description && (
          <p className="text-gray-600 mt-1">{team.description}</p>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Team Members
          </h3>
          <button
            onClick={refreshTeams}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Refresh team members"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Team Members List */}
        <div className="mb-8">
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No members in this team yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.user?.name || 'Unnamed User'}</p>
                      <p className="text-sm text-gray-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.role === 'owner' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.role}
                    </span>
                    
                    {removingUserId === member.user_id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <button
                        onClick={() => handleRemoveUser(member.user_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Remove from team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Team Member */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Add Team Member
          </h3>
          
          <div className="space-y-4">
            {/* Search Users */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* User Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {filteredAvailableUsers.length === 0 ? (
                <div className="col-span-2 text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No users found</p>
                </div>
              ) : (
                filteredAvailableUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.user_id)}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                      selectedUserId === user.user_id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {user.user?.name?.charAt(0) || user.user?.email?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.user?.name || 'Unnamed User'}</p>
                      <p className="text-sm text-gray-500 truncate">{user.user?.email}</p>
                    </div>
                    {selectedUserId === user.user_id && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Role Selection */}
            {selectedUserId && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Select Role</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={selectedRole === 'member'}
                      onChange={() => setSelectedRole('member')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>Member</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={selectedRole === 'owner'}
                      onChange={() => setSelectedRole('owner')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>Owner</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Add Button */}
            <div className="flex justify-end">
              <button
                onClick={handleAddUser}
                disabled={!selectedUserId || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Add to Team</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
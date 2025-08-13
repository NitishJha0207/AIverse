import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  AlertCircle, 
  Check, 
  X,
  RefreshCw,
  User,
  Clock,
  Send
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { createSupportTicket, getSupportTickets, updateSupportTicket } from '../../lib/enterprise';
import { SupportTicket } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';

interface SupportTicketManagerProps {
  onClose?: () => void;
}

export function SupportTicketManager({ onClose }: SupportTicketManagerProps) {
  const { organization, users } = useEnterprise();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  useEffect(() => {
    if (organization) {
      fetchTickets();
    }
  }, [organization]);

  const fetchTickets = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const supportTickets = await getSupportTickets(organization.id);
      setTickets(supportTickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch support tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const handleCreateTicket = async () => {
    if (!organization) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      if (!newTicket.subject || !newTicket.description) {
        setError('Subject and description are required');
        return;
      }
      
      await createSupportTicket(
        organization.id,
        newTicket.subject,
        newTicket.description,
        newTicket.priority
      );
      
      setSuccess('Support ticket created successfully');
      setNewTicket({
        subject: '',
        description: '',
        priority: 'medium'
      });
      setShowNewTicketForm(false);
      
      // Refresh tickets
      await fetchTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create support ticket');
    }
  };

  const handleUpdateTicket = async (
    ticketId: string,
    updates: {
      status?: 'open' | 'in_progress' | 'resolved' | 'closed';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assigned_to?: string;
    }
  ) => {
    try {
      setUpdatingTicket(true);
      setError(null);
      
      await updateSupportTicket(ticketId, updates);
      
      // Refresh tickets
      await fetchTickets();
      
      // Update selected ticket if it's the one being updated
      if (selectedTicket && selectedTicket.id === ticketId) {
        const updatedTicket = tickets.find(t => t.id === ticketId);
        if (updatedTicket) {
          setSelectedTicket({
            ...updatedTicket,
            ...updates
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update support ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Organization Not Found</h3>
          <p className="text-gray-600">Please set up your organization first.</p>
        </div>
        {onClose && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Support Tickets</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowNewTicketForm(!showNewTicketForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Support Ticket
        </button>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          title="Refresh tickets"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {showNewTicketForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-medium mb-4">Create New Support Ticket</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ticket subject"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your issue in detail"
                rows={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewTicketForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium">Tickets</h3>
          </div>
          
          <div className="overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner size="medium" message="Loading tickets..." />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No support tickets found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 hover:bg-gray-50 ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 truncate">{ticket.subject}</h4>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
          {selectedTicket ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-medium">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedTicket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                    selectedTicket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedTicket.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    selectedTicket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedTicket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedTicket.priority}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex-grow overflow-y-auto">
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <User className="w-4 h-4" />
                    <span>Reported by: {selectedTicket.created_by?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>Created: {new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-gray-700 whitespace-pre-line">{selectedTicket.description}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium mb-4">Ticket Management</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateTicket(selectedTicket.id, { 
                          status: e.target.value as any 
                        })}
                        disabled={updatingTicket}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) => handleUpdateTicket(selectedTicket.id, { 
                          priority: e.target.value as any 
                        })}
                        disabled={updatingTicket}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To
                    </label>
                    <select
                      value={selectedTicket.assigned_to || ''}
                      onChange={(e) => handleUpdateTicket(selectedTicket.id, { 
                        assigned_to: e.target.value || undefined 
                      })}
                      disabled={updatingTicket}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      {users.map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.user?.name || user.user?.email || 'Unknown User'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {updatingTicket && (
                    <div className="flex items-center justify-center py-4">
                      <LoadingSpinner size="small" message="Updating ticket..." />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-gray-500">
              Select a ticket to view details
            </div>
          )}
        </div>
      </div>

      {onClose && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
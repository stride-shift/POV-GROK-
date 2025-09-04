import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, handleApiError } from '../services/api';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import UserModal from '../components/users/UserModal';
import UserTable from '../components/users/UserTable';
import UserReportsModal from '../components/users/UserReportsModal';
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  Search,
  Shield,
  Upload
} from 'lucide-react';

const UserManagement = () => {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedUserForReports, setSelectedUserForReports] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);

  // Check if user has admin access
  const hasAdminAccess = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';

  // Redirect if no admin access
  useEffect(() => {
    if (userProfile && !hasAdminAccess) {
      toast.error('You do not have permission to access user management');
      window.location.href = '/';
    }
  }, [userProfile, hasAdminAccess]);

  // Fetch users
  const fetchUsers = async (showLoader = true, isSearching = false) => {
    try {
      if (showLoader) setLoading(true);
      if (isSearching) setSearchLoading(true);
      setError(null);
      
      const response = await apiService.getUsers({
        active_only: activeOnly,
        organization: organizationFilter || undefined,
        role: roleFilter || undefined,
        search: searchTerm || undefined
      }, user?.id);
      
      setUsers(response.users || []);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
      toast.error(errorInfo.message);
    } finally {
      if (showLoader) setLoading(false);
      if (isSearching) setSearchLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (hasAdminAccess) {
      fetchUsers();
    }
  }, [hasAdminAccess]);

  // Search with debounce
  useEffect(() => {
    if (!hasAdminAccess) return;
    
    const timeoutId = setTimeout(() => {
      fetchUsers(false, true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, organizationFilter, roleFilter, activeOnly, hasAdminAccess]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers(false).finally(() => setRefreshing(false));
  };

  // Handle creating new user
  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  // Handle editing user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  // Handle user save
  const handleSaveUser = async (userData) => {
    try {
      setSaving(true);
      
      if (editingUser) {
        // Update existing user
        await apiService.updateUser(editingUser.id, userData, user?.id);
        toast.success('User updated successfully');
      } else {
        // Create new user
        await apiService.createUser(userData, user?.id);
        toast.success('User created successfully');
      }
      
      setShowUserModal(false);
      setEditingUser(null);
      fetchUsers(false);
      
    } catch (error) {
      console.error('Error saving user:', error);
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message);
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setSaving(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId, permanent = false) => {
    const action = permanent ? 'permanently delete' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await apiService.deleteUser(userId, permanent, user?.id);
      toast.success(`User ${permanent ? 'deleted' : 'deactivated'} successfully`);
      fetchUsers(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message);
    }
  };

  // Handle viewing user reports
  const handleViewReports = (user) => {
    setSelectedUserForReports(user);
    setShowReportsModal(true);
  };

  if (!userProfile) {
    return <LoadingSpinner />;
  }

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage users, roles, and permissions
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleRefresh}
                icon={RefreshCw}
                variant="outline"
                loading={refreshing}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                onClick={handleCreateUser}
                icon={UserPlus}
                disabled={loading}
              >
                Add User
              </Button>
              <Button
                onClick={() => window.location.href = '/users/bulk-upload'}
                icon={Upload}
                variant="outline"
                disabled={loading}
              >
                Bulk Upload
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search by email, name..."
                />
              </div>
            </div>

            {/* Organization Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <input
                type="text"
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Filter by organization"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Active Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="activeOnly"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activeOnly" className="ml-2 text-sm text-gray-700">
                  Active users only
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSpinner />
              <p className="text-gray-600 mt-4">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-red-600 mb-4">⚠️ Error loading users</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => fetchUsers()} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <UserTable
              users={users}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onViewReports={handleViewReports}
              loading={loading}
              searchLoading={searchLoading}
              currentUserProfile={userProfile}
            />
          )}
        </div>

        {/* User Modal */}
        {showUserModal && (
          <UserModal
            user={editingUser}
            onSave={handleSaveUser}
            onClose={() => {
              setShowUserModal(false);
              setEditingUser(null);
            }}
          />
        )}

        {/* User Reports Modal */}
        {showReportsModal && selectedUserForReports && (
          <UserReportsModal
            user={selectedUserForReports}
            onClose={() => {
              setShowReportsModal(false);
              setSelectedUserForReports(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;
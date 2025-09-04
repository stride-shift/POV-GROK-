import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import { 
  Edit2, 
  Trash2, 
  Shield, 
  ShieldCheck,
  User,
  Building,
  MoreHorizontal,
  FileText,
  BarChart3
} from 'lucide-react';

const UserTable = ({ users, onEditUser, onDeleteUser, onViewReports, loading, searchLoading = false, currentUserProfile }) => {
  const { userProfile } = useAuth();
  const isSuperAdmin = currentUserProfile?.role === 'super_admin';
  const getRoleColor = (role) => {
    const colors = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-red-100 text-red-800',
      'user': 'bg-blue-100 text-blue-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleIcon = (role) => {
    if (role === 'super_admin' || role === 'admin') {
      return <ShieldCheck className="w-3 h-3" />;
    }
    return <Shield className="w-3 h-3" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatReportCount = (count) => {
    if (count === null || count === undefined) return '0';
    return count.toString();
  };

  // Group users by organization for super admins
  const groupUsersByOrganization = (users) => {
    const grouped = {};
    users.forEach(user => {
      const org = user.organization || 'No Organization';
      if (!grouped[org]) {
        grouped[org] = [];
      }
      grouped[org].push(user);
    });
    
    // Sort organizations, putting "No Organization" last
    const sortedOrgs = Object.keys(grouped).sort((a, b) => {
      if (a === 'No Organization') return 1;
      if (b === 'No Organization') return -1;
      return a.localeCompare(b);
    });
    
    return sortedOrgs.map(org => ({
      organization: org,
      users: grouped[org].sort((a, b) => {
        // Sort users within organization by name, then email
        const nameA = (a.full_name || a.email).toLowerCase();
        const nameB = (b.full_name || b.email).toLowerCase();
        return nameA.localeCompare(nameB);
      })
    }));
  };

  const renderUserRow = (user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              {/* User Info */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {user.avatar_url ? (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={user.avatar_url}
                        alt={user.full_name || user.email}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name || 'No name provided'}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>

              {/* Role & Organization */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  {user.role && (
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1 capitalize">{user.role.replace('_', ' ')}</span>
                      </span>
                    </div>
                  )}
          {!isSuperAdmin && user.organization && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Building className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-32">{user.organization}</span>
                    </div>
                  )}
                  {user.organization_role && (
                    <div className="text-xs text-gray-400">
                      {user.organization_role}
                    </div>
                  )}
                </div>
              </td>



              {/* Report Count */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {formatReportCount(user.reports_generated_total)}
                  </span>
                </div>
              </td>

              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>

              {/* Created Date */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(user.created_at)}
              </td>

              {/* Actions */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    onClick={() => onEditUser(user)}
                    icon={Edit2}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Button>
                  
                  {/* View Reports button - visible for admins and super-admins */}
                  {(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
                    <Button
                      onClick={() => onViewReports(user)}
                      icon={BarChart3}
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700"
                    >
                      Reports
                    </Button>
                  )}
                  
                  <div className="relative group">
                    <Button
                      icon={MoreHorizontal}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                    />
                    
                    {/* Dropdown Menu */}
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-1">
                        {user.is_active ? (
                          <button
                            onClick={() => onDeleteUser(user.id, false)}
                            className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => onEditUser({ ...user, is_active: true })}
                            className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center"
                          >
                            <ShieldCheck className="w-3 h-3 mr-2" />
                            Reactivate
                          </button>
                        )}
                        
                        <button
                          onClick={() => onDeleteUser(user.id, true)}
                          className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
  );

  if (users.length === 0) {
    return (
      <div className="p-12 text-center">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchLoading ? 'Searching...' : 'No users found'}
        </h3>
        <p className="text-gray-600">
          {loading || searchLoading ? 'Please wait while we fetch your data...' : 'Try adjusting your search criteria or add new users.'}
        </p>
      </div>
    );
  }

  // Render organizational view for super admins or regular view for others
  if (isSuperAdmin) {
    const groupedUsers = groupUsersByOrganization(users);
    
    return (
      <div className="space-y-6 relative">
        {searchLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-50 z-10 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-gray-700">Searching users...</span>
            </div>
          </div>
        )}
        
        {groupedUsers.map(({ organization, users: orgUsers }) => (
          <div key={organization} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Organization Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building className="w-5 h-5 text-white mr-3" />
                  <h3 className="text-lg font-semibold text-white">{organization}</h3>
                </div>
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {orgUsers.length} user{orgUsers.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            {/* Users Table for this Organization */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role & Position
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orgUsers.map(renderUserRow)}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Regular view for non-super admins
  return (
    <div className="overflow-x-auto relative">
      {searchLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 z-10 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium text-gray-700">Searching users...</span>
          </div>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role & Organization
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Report Count
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map(renderUserRow)}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
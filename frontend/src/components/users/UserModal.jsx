import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import Button from '../ui/Button';
import { 
  X, 
  Save, 
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

const UserModal = ({ user, onSave, onClose }) => {
  const { userProfile: currentUserProfile } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: '',
    organization: '',
    organization_role: '',
    phone: '',
    department: '',
    avatar_url: '',
    is_active: true,
    metadata: {},
    // Simplified quota system - only total
    report_quota_total: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(user);

  // Lock scroll when modal is open
  useScrollLock(true);

  // Initialize form data
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        password: '', // Never prefill password for editing
        full_name: user.full_name || '',
        role: user.role || '',
        organization: user.organization || '',
        organization_role: user.organization_role || '',
        phone: user.phone || '',
        department: user.department || '',
        avatar_url: user.avatar_url || '',
        is_active: user.is_active !== undefined ? user.is_active : true,
        metadata: user.metadata || {},
        // Simplified quota system - only total
        report_quota_total: user.report_quota_total || null
      });
    }
  }, [user]);

  // Set admin's organization for new users (not editing existing ones)
  useEffect(() => {
    if (!isEditing && currentUserProfile?.role === 'admin' && currentUserProfile?.organization) {
      setFormData(prev => ({
        ...prev,
        organization: currentUserProfile.organization
      }));
    }
  }, [isEditing, currentUserProfile]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation (only for new users)
    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      // Prepare data for submission
      const submitData = { ...formData };
      
      // Don't send empty password for updates
      if (isEditing && !submitData.password) {
        delete submitData.password;
      }
      
      // Clean up empty fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null) {
          delete submitData[key];
        }
      });

      await onSave(submitData);
      
    } catch (error) {
      console.error('Error saving user:', error);
      // Error is handled by parent component
    } finally {
      setSaving(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit User' : 'Add New User'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-500" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="user@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              {/* Password */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {!isEditing && '*'}
                  {isEditing && <span className="text-sm text-gray-500">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={isEditing ? 'Enter new password' : 'Enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>
          </div>

          {/* Role & Organization */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-gray-500" />
              Role & Organization
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select role</option>
                  {/* Super-admins can assign any role */}
                  {currentUserProfile?.role === 'super_admin' && (
                    <option value="super_admin">Super Admin</option>
                  )}
                  {(currentUserProfile?.role === 'super_admin' || currentUserProfile?.role === 'admin') && (
                    <>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                    </>
                  )}
                  {/* Fallback if user has no role or is regular user */}
                  {!currentUserProfile?.role || (currentUserProfile?.role !== 'super_admin' && currentUserProfile?.role !== 'admin') && (
                    <option value="user">User</option>
                  )}
                </select>
                {currentUserProfile?.role === 'admin' && (
                  <p className="mt-1 text-xs text-gray-500">
                    As an admin, you can only assign user and viewer roles
                  </p>
                )}
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                  {currentUserProfile?.role === 'admin' && (
                    <span className="text-xs text-gray-500 ml-1">(inherited from admin)</span>
                  )}
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => handleChange('organization', e.target.value)}
                    disabled={currentUserProfile?.role === 'admin'}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      currentUserProfile?.role === 'admin' 
                        ? 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed' 
                        : 'border-gray-300'
                    }`}
                    placeholder="ACME Corp"
                  />
                </div>
                {currentUserProfile?.role === 'admin' && (
                  <p className="mt-1 text-xs text-gray-500">
                    As an admin, you can only create users in your own organization
                  </p>
                )}
              </div>

              {/* Organization Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Role
                </label>
                <input
                  type="text"
                  value={formData.organization_role}
                  onChange={(e) => handleChange('organization_role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sales Manager"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sales"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-gray-500" />
              Contact Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => handleChange('avatar_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Status
            </h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active user (can log in and access the system)
              </label>
            </div>
          </div>

          {/* Report Quota Controls (admin and super-admin) */}
          {(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'super_admin') && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-gray-500" />
                Report Quotas
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Total Reports Quota */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Reports Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={formData.report_quota_total || ''}
                    onChange={(e) => handleChange('report_quota_total', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Unlimited"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Total reports user can generate (leave blank for unlimited)
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">Quota Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Leave blank or set to 0 for unlimited access</li>
                  <li>Users are blocked when quota is exceeded</li>
                  <li>Quotas can be reset by admins</li>
                </ul>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={Save}
              disabled={saving}
            >
              {saving ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
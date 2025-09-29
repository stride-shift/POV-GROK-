import axios from 'axios';
import { API_CONFIG } from './constants.js';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_CONFIG.API_KEY,
  },
  timeout: API_CONFIG.TIMEOUT,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Service Methods
export const apiService = {
  // Health Check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Workflow 2: Selective Pipeline
  generateTitles: async (formData) => {
    const response = await apiClient.post('/generate-pov-titles', formData);
    return response.data;
  },

  getTitles: async (reportId, userId) => {
    const response = await apiClient.get(`/get-report-titles/${reportId}?user_id=${userId}`);
    return response.data;
  },

  updateSelectedTitles: async (reportId, selectedIndices, userId) => {
    const response = await apiClient.put(`/update-selected-titles/${reportId}`, {
      user_id: userId,
      selected_indices: selectedIndices,
    });
    return response.data;
  },

  generateOutcomes: async (reportId, userId) => {
    const response = await apiClient.post(`/generate-pov-outcomes/${reportId}?user_id=${userId}`);
    return response.data;
  },

  getSelectionSummary: async (reportId, userId) => {
    const response = await apiClient.get(`/get-selection-summary/${reportId}?user_id=${userId}`);
    return response.data;
  },

  getReportOutcomes: async (reportId, userId, currentUserId = null) => {
    const headers = {};
    if (currentUserId) {
      headers['X-User-ID'] = currentUserId;
    }
    const response = await apiClient.get(`/get-report-outcomes/${reportId}?user_id=${userId}`, { headers });
    return response.data;
  },

  // Workflow 1: Full Pipeline (for comparison)
  generateFullReport: async (formData) => {
    const response = await apiClient.post('/generate-pov-to-database', formData);
    return response.data;
  },

  // Data Retrieval
  getReport: async (reportId, userId, currentUserId = null) => {
    const headers = {};
    if (currentUserId) {
      headers['X-User-ID'] = currentUserId;
    }
    const response = await apiClient.get(`/get-pov-report/${reportId}?user_id=${userId}`, { headers });
    return response.data;
  },

  getUserReports: async (userId, currentUserId = null) => {
    const headers = {};
    if (currentUserId) {
      headers['X-User-ID'] = currentUserId;
    }
    const response = await apiClient.get(`/get-user-reports/${userId}`, { headers });
    return response.data.reports || [];
  },

  deleteReport: async (reportId, userId) => {
    const response = await apiClient.delete(`/delete-report/${reportId}?user_id=${userId}`);
    return response.data;
  },

  // Export
  exportDocx: async (reportId, userId) => {
    const response = await apiClient.get(`/generate-docx-from-db/${reportId}?user_id=${userId}`, {
      responseType: 'blob', // Important for file downloads
    });
    return response.data;
  },

  // Utility
  cleanup: async () => {
    const response = await apiClient.get('/cleanup');
    return response.data;
  },

  // USER MANAGEMENT (with role-based authorization)
  createUser: async (userData, currentUserId) => {
    const response = await apiClient.post('/users', userData, {
      headers: {
        'X-User-ID': currentUserId,
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  updateUser: async (userId, userData, currentUserId) => {
    const response = await apiClient.put(`/users/${userId}`, userData, {
      headers: {
        'X-User-ID': currentUserId,
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  deleteUser: async (userId, permanent = false, currentUserId) => {
    const response = await apiClient.delete(`/users/${userId}`, {
      data: { permanent },
      headers: {
        'X-User-ID': currentUserId,
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  getUser: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  getUsers: async (filters = {}, currentUserId) => {
    const params = new URLSearchParams();
    
    if (filters.active_only !== undefined) params.append('active_only', filters.active_only);
    if (filters.organization) params.append('organization', filters.organization);
    if (filters.role) params.append('role', filters.role);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    if (filters.search) params.append('search', filters.search);

    const response = await apiClient.get(`/users?${params.toString()}`, {
      headers: {
        'X-User-ID': currentUserId,
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Get all reports (role-based access)
  getAllReports: async (filters = {}, currentUserId) => {
    const params = new URLSearchParams();
    
    if (filters.organization) params.append('organization', filters.organization);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await apiClient.get(`/admin/reports?${params.toString()}`, {
      headers: {
        'X-User-ID': currentUserId,
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Set user unlimited quota
  setUserUnlimitedQuota: async (userId, currentUserId) => {
    const response = await apiClient.post(`/admin/users/${userId}/set-unlimited`, {}, {
      headers: {
        'X-User-ID': currentUserId,
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Cold call email functions
  generateColdCallEmail: async (reportId, requestData) => {
    const response = await apiClient.post(`/generate-cold-call-email/${reportId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  getColdCallEmails: async (reportId, userId) => {
    const response = await apiClient.get(`/cold-call-emails/${reportId}?user_id=${userId}`, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY
      }
    });
    return response.data;
  },
  chatEditColdCallEmail: async (emailId, requestData) => {
    const response = await apiClient.post(`/chat-edit-cold-call-email/${emailId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
  getColdCallEmailVersions: async (emailId, userId) => {
    const response = await apiClient.get(`/cold-call-emails/${emailId}/versions?user_id=${userId}`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },
  restoreColdCallEmailVersion: async (emailId, versionNumber, userId) => {
    const response = await apiClient.post(`/cold-call-emails/${emailId}/restore/${versionNumber}`, {
      user_id: userId
    }, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Whitepaper
  generateWhitepaper: async (reportId, requestData) => {
    const response = await apiClient.post(`/generate-whitepaper/${reportId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
  getWhitepapers: async (reportId, userId) => {
    const response = await apiClient.get(`/whitepapers/${reportId}?user_id=${userId}`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },
  chatEditWhitepaper: async (whitepaperId, requestData) => {
    const response = await apiClient.post(`/chat-edit-whitepaper/${whitepaperId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
  getWhitepaperVersions: async (whitepaperId, userId) => {
    const response = await apiClient.get(`/whitepapers/${whitepaperId}/versions?user_id=${userId}`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },
  restoreWhitepaperVersion: async (whitepaperId, versionNumber, userId) => {
    const response = await apiClient.post(`/whitepapers/${whitepaperId}/restore/${versionNumber}`, {
      user_id: userId
    }, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Marketing assets
  generateMarketingAsset: async (reportId, requestData) => {
    const response = await apiClient.post(`/generate-marketing-asset/${reportId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
  getMarketingAssets: async (reportId, userId) => {
    const response = await apiClient.get(`/marketing-assets/${reportId}?user_id=${userId}`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },
  chatEditMarketingAsset: async (assetId, requestData) => {
    const response = await apiClient.post(`/chat-edit-marketing-asset/${assetId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
  getMarketingAssetVersions: async (assetId, userId) => {
    const response = await apiClient.get(`/marketing-assets/${assetId}/versions?user_id=${userId}`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },
  restoreMarketingAssetVersion: async (assetId, versionNumber, userId) => {
    const response = await apiClient.post(`/marketing-assets/${assetId}/restore/${versionNumber}`, {
      user_id: userId
    }, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Sales scripts
  generateSalesScript: async (reportId, requestData) => {
    const response = await apiClient.post(`/generate-sales-script/${reportId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
  getSalesScripts: async (reportId, userId) => {
    const response = await apiClient.get(`/sales-scripts/${reportId}?user_id=${userId}`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },
  chatEditSalesScript: async (scriptId, requestData) => {
    const response = await apiClient.post(`/chat-edit-sales-script/${scriptId}`, requestData, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
  getSalesScriptVersions: async (scriptId, userId) => {
    const response = await apiClient.get(`/sales-scripts/${scriptId}/versions?user_id=${userId}`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },
  restoreSalesScriptVersion: async (scriptId, versionNumber, userId) => {
    const response = await apiClient.post(`/sales-scripts/${scriptId}/restore/${versionNumber}`, {
      user_id: userId
    }, {
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Financial data
  getCompanyFinancialData: async (companyName) => {
    const response = await apiClient.get(`/company/${encodeURIComponent(companyName)}/financial-data`, {
      headers: { 'X-API-Key': API_CONFIG.API_KEY }
    });
    return response.data;
  },

  // Bulk create users
  bulkCreateUsers: async (users, currentUserId) => {
    const results = {
      success: [],
      failed: [],
      errors: []
    };

    // Process users one by one for better error handling
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        const userData = {
          email: user.email,
          password: 'tempPassword123!', // Default password for bulk created users
          full_name: user.full_name,
          role: user.role,
          organization: user.organization || null,
          organization_role: user.organization_role || null,
          phone: user.phone || null,
          department: user.department || null,
          auto_expire_days: user.account_expires_at ? Math.ceil((new Date(user.account_expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          report_quota_total: user.report_quota_total === 'unlimited' ? null : parseInt(user.report_quota_total) || null
        };

        const response = await apiClient.post('/users', userData, {
          headers: {
            'X-User-ID': currentUserId,
            'X-API-Key': API_CONFIG.API_KEY,
            'Content-Type': 'application/json'
          }
        });
        results.success.push({
          row: user.rowNumber,
          email: user.email,
          data: response.data
        });
      } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
        results.failed.push({
          row: user.rowNumber,
          email: user.email,
          error: errorMessage
        });
        results.errors.push(`Row ${user.rowNumber} (${user.email}): ${errorMessage}`);
      }
    }

    return results;
  },
};

// Helper function to download blob as file
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Error handling helper
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.detail || error.response.data?.message || 'Server error occurred';
    return {
      type: 'server',
      message,
      status: error.response.status,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      type: 'network',
      message: 'Network error - please check your connection',
    };
  } else {
    // Something else happened
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred',
    };
  }
};

export default apiService; 
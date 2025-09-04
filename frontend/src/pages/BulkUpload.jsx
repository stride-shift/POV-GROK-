import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiService, handleApiError } from '../services/api';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  Users,
  Eye,
  Trash2
} from 'lucide-react';

const BulkUpload = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

  // Check permissions
  const hasAccess = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Access Denied</div>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Generate CSV template
  const generateCSVTemplate = () => {
    const headers = [
      'full_name',
      'email', 
      'role',
      'organization',
      'organization_role',
      'phone',
      'department',
      'account_expires_at',
      'report_quota_total'
    ];
    
    const sampleData = [
      [
        'John Doe',
        'john.doe@company.com',
        'user',
        'TechCorp Inc',
        'Senior Developer',
        '+1-555-0123',
        'Engineering',
        '2025-12-31',
        '10'
      ],
      [
        'Jane Smith',
        'jane.smith@company.com', 
        'admin',
        'TechCorp Inc',
        'Department Manager',
        '+1-555-0124',
        'Marketing',
        '2025-12-31',
        'unlimited'
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV template downloaded');
  };

  // Generate Excel template (simplified CSV for now)
  const generateExcelTemplate = () => {
    // For now, we'll generate CSV and let user know it can be opened in Excel
    generateCSVTemplate();
    toast.success('Template downloaded (open in Excel and save as .xlsx)');
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setSelectedFile(file);
    parseFile(file);
  };

  // Parse uploaded file
  const parseFile = (file) => {
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      parseCSVFile(file);
    } else if (file.name.match(/\.(xlsx|xls)$/i)) {
      parseExcelFile(file);
    } else {
      toast.error('Unsupported file format');
      setSelectedFile(null);
    }
  };

  // Parse CSV file
  const parseCSVFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        parseCSV(e.target.result);
      } catch (error) {
        toast.error('Error reading CSV file: ' + error.message);
        setSelectedFile(null);
      }
    };
    reader.readAsText(file);
  };

  // Parse Excel file
  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to CSV format
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        parseCSV(csvContent);
        
      } catch (error) {
        toast.error('Error reading Excel file: ' + error.message);
        setSelectedFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse CSV content
  const parseCSV = (content) => {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast.error('CSV file must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const requiredFields = ['full_name', 'email', 'role'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      
      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      const data = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        // Basic validation
        if (!row.email || !row.email.includes('@')) {
          errors.push(`Row ${i + 1}: Invalid email address`);
        }

        if (!['user', 'admin', 'super_admin', 'viewer'].includes(row.role)) {
          errors.push(`Row ${i + 1}: Invalid role "${row.role}". Must be: user, admin, super_admin, or viewer`);
        }

        // Role assignment validation
        if (!isSuperAdmin && ['admin', 'super_admin'].includes(row.role)) {
          errors.push(`Row ${i + 1}: Only super admins can assign admin/super_admin roles`);
        }

        data.push({ ...row, rowNumber: i + 1 });
      }

      setParsedData(data);
      setPreviewData(data.slice(0, 10)); // Show first 10 rows
      setValidationErrors(errors);
      
      if (errors.length === 0) {
        toast.success(`Successfully parsed ${data.length} users`);
      } else {
        toast.error(`Found ${errors.length} validation errors`);
      }

    } catch (error) {
      toast.error('Error parsing CSV: ' + error.message);
      setSelectedFile(null);
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Clear uploaded file
  const clearFile = () => {
    setSelectedFile(null);
    setParsedData([]);
    setPreviewData([]);
    setValidationErrors([]);
    setUploadResults(null);
  };

  // Upload users
  const handleUpload = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    if (parsedData.length === 0) {
      toast.error('No users to upload');
      return;
    }

    setUploading(true);
    setUploadResults(null);

    try {
      const results = await apiService.bulkCreateUsers(parsedData, userProfile?.id);
      
      setUploadResults({
        success: results.success.length,
        failed: results.failed.length,
        total: parsedData.length,
        errors: results.errors,
        successDetails: results.success,
        failedDetails: results.failed
      });

      if (results.failed.length === 0) {
        toast.success(`Successfully uploaded all ${results.success.length} users!`);
      } else if (results.success.length === 0) {
        toast.error(`Failed to upload any users. ${results.failed.length} errors occurred.`);
      } else {
        toast.success(`Partially successful: ${results.success.length} uploaded, ${results.failed.length} failed`);
      }
      
    } catch (error) {
      console.error('Bulk upload error:', error);
      const errorInfo = handleApiError(error);
      toast.error('Upload failed: ' + errorInfo.message);
      setUploadResults({
        success: 0,
        failed: parsedData.length,
        total: parsedData.length,
        error: errorInfo.message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/users')}
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
              >
                Back to User Management
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bulk User Upload</h1>
                <p className="text-gray-600">Upload multiple users from CSV or Excel files</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Templates Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2 text-blue-600" />
            Download Templates
          </h2>
          <p className="text-gray-600 mb-4">
            Download a template file to see the required format and example data.
          </p>
          <div className="flex space-x-4">
            <Button
              onClick={generateCSVTemplate}
              icon={FileText}
              variant="outline"
            >
              Download CSV Template
            </Button>
            <Button
              onClick={generateExcelTemplate}
              icon={FileText}
              variant="outline"
            >
              Download Excel Template
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-green-600" />
            Upload File
          </h2>
          
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your file here, or click to browse
              </p>
              <p className="text-gray-600 mb-4">
                Supports CSV and Excel files (.csv, .xlsx, .xls)
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button as="span" variant="outline">
                  Choose File
                </Button>
              </label>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {parsedData.length} users
                    </p>
                  </div>
                </div>
                <Button
                  onClick={clearFile}
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="font-medium text-red-900">
                Validation Errors ({validationErrors.length})
              </h3>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-700 mb-1">
                  • {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Preview Section */}
        {previewData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-gray-600" />
                Data Preview ({parsedData.length} total users)
              </h2>
              {parsedData.length > 10 && (
                <p className="text-sm text-gray-600">Showing first 10 rows</p>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">{user.full_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{user.email}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{user.organization || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{user.department || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResults && (
          <div className={`border rounded-lg p-4 mb-6 ${
            uploadResults.failed === 0 ? 'bg-green-50 border-green-200' : 
            uploadResults.success === 0 ? 'bg-red-50 border-red-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center mb-2">
              {uploadResults.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              ) : uploadResults.success === 0 ? (
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              )}
              <h3 className={`font-medium ${
                uploadResults.failed === 0 ? 'text-green-900' : 
                uploadResults.success === 0 ? 'text-red-900' :
                'text-yellow-900'
              }`}>
                Upload Results
              </h3>
            </div>
            <p className={`text-sm ${
              uploadResults.failed === 0 ? 'text-green-700' : 
              uploadResults.success === 0 ? 'text-red-700' :
              'text-yellow-700'
            }`}>
              {uploadResults.success} successful, {uploadResults.failed} failed out of {uploadResults.total} total users
            </p>
            
            {/* Error Details */}
            {uploadResults.errors && uploadResults.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-900 mb-2">Error Details:</p>
                <div className="max-h-32 overflow-y-auto bg-white rounded border p-2">
                  {uploadResults.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600 mb-1">
                      • {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Success Details */}
            {uploadResults.successDetails && uploadResults.successDetails.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-green-900 mb-2">
                  Successfully Created ({uploadResults.successDetails.length} users):
                </p>
                <div className="max-h-24 overflow-y-auto bg-white rounded border p-2">
                  {uploadResults.successDetails.map((success, index) => (
                    <p key={index} className="text-xs text-green-600 mb-1">
                      • Row {success.row}: {success.email}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {uploadResults.error && (
              <p className="text-sm text-red-700 mt-2">System Error: {uploadResults.error}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {parsedData.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Ready to upload {parsedData.length} users
              {validationErrors.length > 0 && (
                <span className="text-red-600 ml-2">
                  ({validationErrors.length} errors must be fixed)
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={clearFile}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={validationErrors.length > 0 || uploading}
                loading={uploading}
                icon={Users}
              >
                {uploading ? 'Uploading...' : 'Upload Users'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUpload;
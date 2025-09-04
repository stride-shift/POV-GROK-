import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, handleApiError } from '../../services/api';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  X, 
  Eye, 
  Calendar, 
  FileText,
  User,
  Building,
  Search
} from 'lucide-react';

const UserReportsModal = ({ user, onClose }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUserReports = async () => {
      if (!user?.id || !currentUser?.id) return;

      try {
        setLoading(true);
        setError(null);
        
        // Use the admin-authorized endpoint to get user reports
        const reportsData = await apiService.getUserReports(user.id, currentUser.id);
        setReports(reportsData);
        
      } catch (error) {
        console.error('Error fetching user reports:', error);
        const errorInfo = handleApiError(error);
        setError(errorInfo.message);
        toast.error(errorInfo.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReports();
  }, [user?.id, currentUser?.id]);

  const handleViewReport = (reportId) => {
    onClose(); // Close modal first
    navigate(`/view/${reportId}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'titles_generated':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter reports based on search query
  const filteredReports = reports.filter(report => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const searchFields = [
      report.vendor_name,
      report.target_customer_name,
      report.id,
      report.status?.replace('_', ' ')
    ];
    
    return searchFields.some(field => 
      field?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Reports for {user?.full_name || user?.email}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {user?.email} • {user?.organization || 'No organization'}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            icon={X}
          />
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search reports by vendor, customer, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">Loading reports...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">⚠️ Error loading reports</div>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">This user hasn't generated any reports yet.</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching reports</h3>
              <p className="text-gray-600">
                No reports match your search for "{searchQuery}". Try a different search term.
              </p>
              <Button
                onClick={() => setSearchQuery('')}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {report.vendor_name} → {report.target_customer_name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            report.status
                          )}`}
                        >
                          {report.status?.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(report.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Report ID: {report.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {report.status === 'completed' && (
                        <Button
                          onClick={() => handleViewReport(report.id)}
                          variant="outline"
                          size="sm"
                          icon={Eye}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {reports.length === 0 ? (
              'No reports to display'
            ) : searchQuery ? (
              `Showing ${filteredReports.length} of ${reports.length} report${reports.length !== 1 ? 's' : ''}`
            ) : (
              `Showing ${reports.length} report${reports.length !== 1 ? 's' : ''}`
            )}
          </div>
          <Button
            onClick={onClose}
            variant="outline"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserReportsModal;
import React from 'react';
import { Calendar, Building, Users, ArrowRight } from 'lucide-react';

const ReportHeader = ({ 
  vendorName,
  customerName, 
  reportDate,
  reportId,
  showDate = true,
  className = ''
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Show relative time for recent reports
    if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      // Show full date for older reports
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  if (!vendorName && !customerName) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-8 mb-1 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Main Report Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
              <Building className="w-5 h-5 text-blue-600" />
              <span>{vendorName || 'Unknown Vendor'}</span>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-400" />
            
            <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
              <Users className="w-5 h-5 text-green-600" />
              <span>{customerName || 'Unknown Customer'}</span>
            </div>
          </div>
        </div>

        {/* Report Metadata */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {showDate && reportDate && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(reportDate)}</span>
            </div>
          )}
          
          {reportId && (
            <div className="text-xs text-gray-400 font-mono">
              ID: {reportId.slice(0, 8)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;
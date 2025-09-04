import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import Button from '../ui/Button';
import { 
  Plus, 
  Eye, 
  Download, 
  RotateCcw, 
  ArrowRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { WORKFLOW_STEPS } from '../../services/constants';

const QuickActions = ({ className = '' }) => {
  const navigate = useNavigate();
  const { 
    currentStep, 
    completedSteps, 
    reportData, 
    recentReports,
    resetWorkflow 
  } = useApp();

  const handleCreateNew = () => {
    resetWorkflow();
    navigate('/create');
  };

  const handleViewCurrent = () => {
    if (reportData.reportId) {
      navigate(`/view/${reportData.reportId}`);
    }
  };

  const handleViewRecent = (reportId) => {
    navigate(`/view/${reportId}`);
  };

  const handleContinueWorkflow = () => {
    navigate('/create');
  };

  const getWorkflowStatus = () => {
    if (!reportData.reportId) return 'not_started';
    if (completedSteps.includes(WORKFLOW_STEPS.EXPORT)) return 'completed';
    if (currentStep === WORKFLOW_STEPS.EXPORT) return 'ready_to_export';
    return 'in_progress';
  };

  const workflowStatus = getWorkflowStatus();
  const hasCurrentReport = reportData.reportId;
  const hasRecentReports = recentReports.length > 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      
      <div className="space-y-4">
        {/* Current Workflow Status */}
        {hasCurrentReport && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {workflowStatus === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                ) : (
                  <Clock className="w-5 h-5 text-blue-600 mr-3" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Current Report
                  </p>
                  <p className="text-xs text-gray-600">
                    {reportData.formData?.vendor_name} → {reportData.formData?.target_customer_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {workflowStatus === 'completed' ? (
                  <Button
                    size="sm"
                    onClick={handleViewCurrent}
                    icon={Eye}
                  >
                    View
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleContinueWorkflow}
                    icon={ArrowRight}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleCreateNew}
            icon={Plus}
            className="justify-start"
            variant="outline"
          >
            Create New Report
          </Button>
          
          {hasCurrentReport && workflowStatus === 'completed' && (
            <Button
              onClick={handleViewCurrent}
              icon={Eye}
              className="justify-start"
              variant="outline"
            >
              View Current Report
            </Button>
          )}
        </div>

        {/* Recent POV Reports */}
        {hasRecentReports && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recent POV Reports</h4>
            <div className="space-y-2">
              {recentReports.slice(0, 3).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {report.vendor_name} → {report.target_customer_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(report.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewRecent(report.id)}
                    icon={Eye}
                  >
                    View
                  </Button>
                </div>
              ))}
              
              {recentReports.length > 3 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  +{recentReports.length - 3} more reports
                </p>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
        {!hasCurrentReport && !hasRecentReports && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Get started by creating your first POV analysis report
            </p>
            <Button
              onClick={handleCreateNew}
              icon={Plus}
              size="sm"
            >
              Create Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickActions; 
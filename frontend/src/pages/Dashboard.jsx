import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { apiService, handleApiError } from '../services/api';
import { 
  Plus, 
  Eye, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  ArrowRight,
  Mail,
  BookOpen,
  Megaphone,
  MessageCircle,
  Users,
  BarChart3
} from 'lucide-react';
import { WORKFLOW_STEPS } from '../services/constants';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    reportData, 
    recentReports, 
    currentStep, 
    completedSteps,
    resetWorkflow,
    setRecentReports,
    lastCompletedReportId
  } = useApp();
  
  const [userReports, setUserReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleCreateNew = () => {
    resetWorkflow();
    navigate('/create');
  };

  const handleResumeDraft = () => {
    resetWorkflow();
    navigate('/create');
  };

  // Check if there's a saved draft
  const hasDraft = () => {
    try {
      const draft = localStorage.getItem('pov-form-draft');
      return !!draft;
    } catch {
      return false;
    }
  };

  const handleViewReport = (reportId) => {
    navigate(`/view/${reportId}`);
  };

  const handleContinueWorkflow = () => {
    navigate('/create');
  };

  const handleViewCurrent = () => {
    if (reportData.reportId) {
      navigate(`/view/${reportData.reportId}`);
    } else if (lastCompletedReportId) {
      navigate(`/view/${lastCompletedReportId}`);
    } else {
      navigate('/create');
    }
  };

  const getWorkflowStatus = () => {
    if (!reportData.reportId) return null;
    if (completedSteps.includes(WORKFLOW_STEPS.EXPORT)) return 'completed';
    if (currentStep === WORKFLOW_STEPS.EXPORT) return 'ready_to_export';
    return 'in_progress';
  };

  const canViewCurrent = reportData.reportId || lastCompletedReportId;

  // Fetch user reports on component mount
  useEffect(() => {
    const fetchUserReports = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const reports = await apiService.getUserReports(user.id);
        const reportsArray = Array.isArray(reports) ? reports : [];
        setUserReports(reportsArray);
        
        // Update recent reports in app context
        const recentReportsData = reportsArray.map(report => ({
          id: report.id,
          vendor_name: report.vendor_name,
          target_customer_name: report.target_customer_name,
          status: report.status,
          completedAt: report.created_at,
        }));
        
        setRecentReports(recentReportsData);
        
      } catch (error) {
        console.error('Error fetching user reports:', error);
        const errorInfo = handleApiError(error);
        setError(errorInfo.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReports();
  }, [user?.id]); // Removed setRecentReports from dependencies

  const workflowStatus = getWorkflowStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading your reports..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            POV Analysis Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.email}! Create and manage your point-of-view analysis reports
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Current Workflow Card */}
            {workflowStatus && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Current Report
                  </h2>
                  {workflowStatus === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Vendor</p>
                      <p className="font-medium text-gray-900">
                        {reportData.formData?.vendor_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-medium text-gray-900">
                        {reportData.formData?.target_customer_name}
                      </p>
                    </div>
                  </div>
                  {reportData.reportId && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Report ID: {reportData.reportId.slice(-12)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Status: {workflowStatus === 'completed' ? 'Completed' : 'In Progress'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {workflowStatus === 'completed' 
                        ? 'Ready to view and export'
                        : 'Continue where you left off'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {workflowStatus === 'completed' ? (
                      <Button
                        onClick={() => handleViewReport(reportData.reportId)}
                        icon={Eye}
                      >
                        View Report
                      </Button>
                    ) : (
                      <Button
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

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Quick Actions
              </h2>
              <div className="space-y-4">
                {hasDraft() ? (
                  <>
                    <Button
                      onClick={handleResumeDraft}
                      icon={Clock}
                      className="w-full justify-start"
                      size="lg"
                    >
                      Resume Draft
                    </Button>
                    <Button
                      onClick={handleCreateNew}
                      icon={Plus}
                      variant="outline"
                      className="w-full justify-start"
                      size="lg"
                    >
                      Start New Report
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleCreateNew}
                    icon={Plus}
                    className="w-full justify-start"
                    size="lg"
                  >
                    Create New Report
                  </Button>
                )}
                
                {userReports.length > 0 && (
                  <Button
                    onClick={() => navigate('/reports')}
                    icon={FileText}
                    variant="outline"
                    className="w-full justify-start"
                    size="lg"
                  >
                    View All Reports ({userReports.length})
                  </Button>
                )}
                
                {canViewCurrent && (
                  <Button
                    onClick={handleViewCurrent}
                    icon={Eye}
                    variant="outline"
                    className="w-full justify-start"
                    size="lg"
                  >
                    Continue Current Report
                  </Button>
                )}
              </div>
            </div>

            {/* Extras */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Extras
                </h2>
                <button
                  onClick={() => navigate('/extras')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                >
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: Mail, title: 'Cold Call Emails', description: 'Generate personalized outreach templates' },
                  { icon: FileText, title: 'Proposals', description: 'Create compelling business proposals' },
                  { icon: BookOpen, title: 'Whitepaper', description: 'Develop authoritative industry content' },
                  { icon: Megaphone, title: 'Marketing', description: 'Build comprehensive campaigns' },
                  { icon: MessageCircle, title: 'Sales Scripts', description: 'Create effective conversation guides' },
                  { icon: Users, title: 'Sales Avatar', description: 'Define detailed buyer personas' },
                  { icon: BarChart3, title: 'Meta Analysis', description: 'Gain insights across multiple reports' }
                ].map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                      onClick={() => navigate('/extras')}
                    >
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                          <IconComponent className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Coming Soon
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Getting Started - Only show when no reports exist */}
            {userReports.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No reports yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create your first POV analysis report to get started. Our system will help you map vendor capabilities to customer needs using a Jobs-to-be-Done framework.
                  </p>
                  <Button
                    onClick={handleCreateNew}
                    icon={Plus}
                    size="lg"
                  >
                    Create Your First Report
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            {userReports.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Reports</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {userReports.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="text-lg font-semibold text-green-600">
                      {Array.isArray(userReports) ? userReports.filter(r => r.status === 'completed').length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {Array.isArray(userReports) ? userReports.filter(r => r.status === 'processing' || r.status === 'titles_generated').length : 0}
                    </span>
                  </div>
                  {workflowStatus && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Current Workflow</span>
                        <span className={`text-sm font-medium ${
                          workflowStatus === 'completed' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {workflowStatus === 'completed' ? 'Ready' : 'Active'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
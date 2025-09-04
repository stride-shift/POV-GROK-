import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import { 
  FileText, 
  Target, 
  Eye, 
  Download,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Home
} from 'lucide-react';
import { WORKFLOW_STEPS } from '../../services/constants';

const WorkflowNavigation = ({ currentSection = null }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    reportData, 
    currentStep, 
    completedSteps,
    setCurrentStep,
    loadExistingReport,
    updateReportData
  } = useApp();

  // Helper to check if a report has data for a specific step
  const hasDataForStep = (step) => {
    switch (step) {
      case WORKFLOW_STEPS.FORM:
        return true; // Form is always available
      case WORKFLOW_STEPS.TITLES:
        // Titles step is available if we have a report ID (either with titles or form completed)
        return reportData.reportId !== null;
      case WORKFLOW_STEPS.OUTCOMES:
        // Outcomes step is available if we have a report ID (for existing reports, outcomes always exist in DB)
        return reportData.reportId !== null;
      default:
        return false;
    }
  };

  const sections = [
    {
      id: WORKFLOW_STEPS.FORM,
      name: 'Form',
      title: 'Input Details',
      icon: FileText,
      path: '/create',
      description: 'Vendor and customer information',
      available: true
    },
    {
      id: WORKFLOW_STEPS.TITLES,
      name: 'Titles',
      title: 'Select Outcomes',
      icon: Target,
      path: '/create',
      description: 'Choose outcome titles to analyze',
      available: hasDataForStep(WORKFLOW_STEPS.TITLES)
    },
    {
      id: WORKFLOW_STEPS.OUTCOMES,
      name: 'Outcomes',
      title: 'View Analysis',
      icon: Eye,
      path: reportData.reportId ? `/view/${reportData.reportId}` : '/create',
      description: 'Detailed outcome analysis & export',
      available: hasDataForStep(WORKFLOW_STEPS.OUTCOMES)
    }
    // Removed EXPORT step - export is available directly on the View Analysis page
  ];

  const getSectionStatus = (section) => {
    // Debug logging
    if (section.id === WORKFLOW_STEPS.FORM) {
      console.log('WorkflowNavigation - Form section status check:', {
        sectionId: section.id,
        currentStep,
        completedSteps,
        isCompleted: completedSteps.includes(section.id),
        isCurrent: currentStep === section.id,
        isAvailable: section.available
      });
    }

    if (completedSteps.includes(section.id)) {
      return 'completed';
    }
    if (currentStep === section.id) {
      return 'current';
    }
    if (section.available) {
      return 'available';
    }
    return 'locked';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'current':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'available':
        return <ChevronRight className="w-4 h-4 text-gray-400" />;
      case 'locked':
        return <AlertCircle className="w-4 h-4 text-gray-300" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'current':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'available':
        return 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
      case 'locked':
        return 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed';
      default:
        return 'bg-white border-gray-200 text-gray-700';
    }
  };

  const handleSectionClick = async (section) => {
    const status = getSectionStatus(section);
    
    if (status === 'locked') {
      return; // Don't navigate to locked sections
    }

    try {
      // Handle navigation to different sections
      switch (section.id) {
        case WORKFLOW_STEPS.FORM:
          // Load form data if we have a reportId but no form data in memory
          if (reportData.reportId && !reportData.formData) {
            try {
              const response = await apiService.getReport(reportData.reportId, user?.id);
              const reportDetails = response.report; // The API returns { report: {...}, titles: [...], outcomes: [...], summary: {...} }
              updateReportData({
                formData: {
                  vendor_name: reportDetails.vendor_name,
                  vendor_url: reportDetails.vendor_url,
                  vendor_services: reportDetails.vendor_services,
                  target_customer_name: reportDetails.target_customer_name,
                  target_customer_url: reportDetails.target_customer_url,
                  role_names: reportDetails.role_names, // Correct field name
                  linkedin_urls: reportDetails.linkedin_urls, // Correct field name
                  role_context: reportDetails.role_context, // Correct field name
                  additional_context: reportDetails.additional_context, // Correct field name
                  num_outcomes: 15, // Default value since this isn't stored in the DB
                  model_name: reportDetails.model_name // Correct field name
                }
              });
            } catch (error) {
              console.error('Error loading form data:', error);
              toast.error('Failed to load form data');
              return;
            }
          }
          setCurrentStep(WORKFLOW_STEPS.FORM);
          navigate('/create');
          break;
          
        case WORKFLOW_STEPS.TITLES:
          // Load titles data if we have a reportId but no titles in memory
          if (reportData.reportId && reportData.titles?.length === 0) {
            try {
              const titlesData = await apiService.getTitles(reportData.reportId, user?.id);
              updateReportData({
                titles: titlesData.titles,
                selectedIndices: titlesData.titles
                  .map((title, index) => title.selected ? index : null)
                  .filter(index => index !== null)
              });
            } catch (error) {
              console.error('Error loading titles:', error);
              toast.error('Failed to load titles data');
              return;
            }
          }
          setCurrentStep(WORKFLOW_STEPS.TITLES);
          navigate('/create');
          break;
          
        case WORKFLOW_STEPS.OUTCOMES:
          // Navigate to view page for outcomes (export is available on this page)
          if (reportData.reportId) {
            // Don't change current step when navigating to view - let ViewOutcomes handle it
            navigate(`/view/${reportData.reportId}`);
          } else {
            navigate('/create');
          }
          break;
          
        default:
          navigate(section.path);
      }
    } catch (error) {
      console.error('Error navigating to section:', error);
      toast.error('Navigation failed');
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Workflow Navigation
      </h3>
      
      {/* Quick Navigation */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          icon={Home}
          className="w-full justify-start text-xs"
        >
          Dashboard
        </Button>
      </div>
      
      <div className="space-y-2">
        {sections.map((section, index) => {
          const status = getSectionStatus(section);
          const Icon = section.icon;
          
          return (
            <button
              key={section.id}
              onClick={() => handleSectionClick(section)}
              disabled={status === 'locked'}
              className={`
                w-full text-left p-3 rounded-lg border transition-colors
                ${getStatusColor(status)}
                ${status !== 'locked' ? 'cursor-pointer' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium truncate">
                        {section.title}
                      </span>
                      {currentSection === section.name && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {section.description}
                    </p>
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {getStatusIcon(status)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Report Info */}
      {reportData.reportId && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div className="font-medium">Current Report</div>
            <div className="truncate">
              {reportData.formData?.vendor_name} → {reportData.formData?.target_customer_name}
            </div>
            <div className="text-gray-400">
              ID: {reportData.reportId.slice(-8)}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default WorkflowNavigation; 
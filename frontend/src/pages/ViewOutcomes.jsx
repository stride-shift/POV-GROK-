import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import OutcomesGrid from '../components/outcomes/OutcomesGrid';
import Button from '../components/ui/Button';
import ReportHeader from '../components/ui/ReportHeader';
import StockBanner from '../components/ui/StockBanner';

import WorkflowNavigation from '../components/navigation/WorkflowNavigation';
import MobileWorkflowNav from '../components/navigation/MobileWorkflowNav';
import { ArrowLeft, Download, Plus } from 'lucide-react';
import DoMoreModal from '../components/modals/DoMoreModal';
import { 
  apiService, 
  handleApiError, 
  downloadFile 
} from '../services/api';
import { 
  USER_CONFIG,
  SUCCESS_MESSAGES,
  EXPORT_CONFIG,
  WORKFLOW_STEPS
} from '../services/constants';

const ViewOutcomes = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    lastCompletedReportId, 
    resetWorkflow, 
    loadExistingReport,
    reportData,
    setCurrentStep,
    completeStep
  } = useApp();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDoMoreModal, setShowDoMoreModal] = useState(false);

  // Use reportId from URL params, or fall back to last completed report
  const currentReportId = reportId || lastCompletedReportId;

  // Set workflow state when viewing an existing report
  useEffect(() => {
    const loadReportContext = async () => {
      if (currentReportId && currentReportId !== reportData.reportId) {
        try {
          // Load basic report info to set up the context
          const response = await apiService.getReport(currentReportId, user?.id, user?.id);
          const reportDetails = response.report; // The API returns { report: {...}, titles: [...], outcomes: [...], summary: {...} }
          
          // Update the report data in context
          loadExistingReport({
            reportId: currentReportId,
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
            },
            titles: [], // Will be loaded when needed
            selectedIndices: [],
            outcomes: [], // Will be loaded by OutcomesGrid
            summary: null,
            status: 'completed'
          }, WORKFLOW_STEPS.OUTCOMES, [WORKFLOW_STEPS.FORM, WORKFLOW_STEPS.TITLES, WORKFLOW_STEPS.OUTCOMES]);
          
          // Ensure we're on the outcomes step when viewing
          setCurrentStep(WORKFLOW_STEPS.OUTCOMES);
          
        } catch (error) {
          console.error('Error loading report context:', error);
          // Don't show error toast here as it might be handled by OutcomesGrid
        }
      }
    };

    if (currentReportId && user?.id) {
      loadReportContext();
    }
  }, [currentReportId, reportData.reportId, user?.id]); // Removed loadExistingReport from dependencies to prevent infinite loop

  const handleFetchOutcomes = async (reportId, userId) => {
    setLoading(true);
    try {
      const data = await apiService.getReportOutcomes(reportId, userId, user?.id);
      return data;
    } catch (error) {
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentReportId) return;

    setExporting(true);
    try {
      const blob = await apiService.exportDocx(
        currentReportId,
        user?.id
      );

      // Get report data for filename
      const reportData = await apiService.getReportOutcomes(
        currentReportId,
        user?.id
      );

      const filename = EXPORT_CONFIG.DOCX_FILENAME(
        reportData.report?.vendor_name || 'Vendor',
        reportData.report?.target_customer_name || 'Customer'
      );

      downloadFile(blob, filename);
      toast.success(SUCCESS_MESSAGES.REPORT_EXPORTED);

    } catch (error) {
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message);
    } finally {
      setExporting(false);
    }
  };

  const handleBackToCreate = () => {
    navigate('/create');
  };

  const handleStartNew = () => {
    resetWorkflow();
    navigate('/create');
  };



  // Show message if no report ID is available
  if (!currentReportId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">No Report Selected</h2>
          <p className="text-gray-600 mb-6">
            Please create a report first or select an existing report to view its outcomes.
          </p>
          <Button onClick={handleStartNew} icon={Plus}>
            Create New Report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile Navigation */}
      <MobileWorkflowNav currentSection="Outcomes" />

      {/* Stock Information Banner */}
      <StockBanner 
        companyName={reportData.formData?.target_customer_name} 
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
          {/* Sidebar with Navigation */}
          <div className="hidden lg:block lg:col-span-2">
            <WorkflowNavigation currentSection="Outcomes" />
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-4">
            {/* Report Header - with matching padding structure */}
            <div className="px-6 pt-6 pb-2">
              <ReportHeader
                vendorName={reportData.formData?.vendor_name}
                customerName={reportData.formData?.target_customer_name}
                reportDate={reportData.createdAt}
                reportId={reportData.reportId}
              />
            </div>
            
            {/* Outcomes Grid */}
            <OutcomesGrid
              reportId={currentReportId}
              userId={user?.id}
              onFetchOutcomes={handleFetchOutcomes}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <Button
          onClick={handleExport}
          loading={exporting}
          icon={Download}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          Export DOCX
        </Button>
        <Button
          onClick={() => setShowDoMoreModal(true)}
          icon={Plus}
          size="lg"
          variant="secondary"
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          Actions
        </Button>
      </div>

      {/* Actions Modal */}
      <DoMoreModal
        isOpen={showDoMoreModal}
        onClose={() => setShowDoMoreModal(false)}
        reportId={currentReportId}
      />
    </div>
  );
};

export default ViewOutcomes; 
import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import POVInputForm from '../components/forms/POVInputForm';
import TitlesList from '../components/titles/TitlesList';
import ProgressBar from '../components/ui/ProgressBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import ReportHeader from '../components/ui/ReportHeader';
import Button from '../components/ui/Button';

import WorkflowNavigation from '../components/navigation/WorkflowNavigation';
import MobileWorkflowNav from '../components/navigation/MobileWorkflowNav';

import { Download, ArrowLeft, CheckCircle, Eye } from 'lucide-react';
import { 
  apiService, 
  handleApiError, 
  downloadFile 
} from '../services/api';
import { 
  WORKFLOW_STEPS, 
  REPORT_STATUS, 
  USER_CONFIG,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  EXPORT_CONFIG
} from '../services/constants';

const CreateReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentStep,
    completedSteps,
    reportData,
    loading,
    error,
    setCurrentStep,
    setCompletedSteps,
    updateReportData,
    setLoading,
    setError,
    resetWorkflow,
    completeStep,
    completeReport,
  } = useApp();

  // Ensure we start on the form step for new reports
  useEffect(() => {
    console.log('CreateReport - component mounted/updated:', {
      currentStep,
      reportId: reportData.reportId,
      formData: !!reportData.formData,
      titles: reportData.titles?.length,
      outcomes: reportData.outcomes?.length
    });

    // If this is a completely new report (no reportId and no form data), ensure we're on form step
    if (!reportData.reportId && !reportData.formData && currentStep !== WORKFLOW_STEPS.FORM) {
      console.log('CreateReport - setting step to FORM for new report');
      setCurrentStep(WORKFLOW_STEPS.FORM);
    }
  }, []); // Only run on mount

  // Ensure we're on the right step based on available data (but don't override user navigation)
  useEffect(() => {
    // Only auto-adjust steps for existing reports being loaded, not for new reports
    if (reportData.reportId && !reportData.formData) {
      // If we have outcomes, we should be on export step
      if (reportData.outcomes?.length > 0 && currentStep < WORKFLOW_STEPS.EXPORT) {
        setCurrentStep(WORKFLOW_STEPS.EXPORT);
      }
      // If we have titles but no outcomes, we should be on titles step
      else if (reportData.titles?.length > 0 && reportData.outcomes?.length === 0 && currentStep < WORKFLOW_STEPS.TITLES) {
        setCurrentStep(WORKFLOW_STEPS.TITLES);
      }
    }
    // For new reports (no reportId), ensure we're on the form step
    else if (!reportData.reportId && currentStep !== WORKFLOW_STEPS.FORM) {
      setCurrentStep(WORKFLOW_STEPS.FORM);
    }
  }, [reportData.reportId, reportData.outcomes?.length, reportData.titles?.length, reportData.formData, currentStep]); // Removed setCurrentStep from dependencies to prevent infinite loop

  // Helper to update loading state
  const setLoadingState = useCallback((key, value) => {
    setLoading({ [key]: value });
  }, []); // Removed setLoading from dependencies as it's stable

  // Helper to handle API errors
  const handleError = useCallback((error, context) => {
    console.error(`Error in ${context}:`, error);
    const errorInfo = handleApiError(error);
    setError(errorInfo);
    toast.error(errorInfo.message);
  }, []); // Removed setError from dependencies as it's stable

  // Step 1: Generate titles
  const handleFormSubmit = async (formData) => {
    setLoadingState('generatingTitles', true);
    setError(null);

    try {
      const response = await apiService.generateTitles({
        ...formData,
        user_id: user?.id,
      });

      updateReportData({
        reportId: response.report_id,
        formData,
        titles: response.titles || [],
        status: REPORT_STATUS.TITLES_GENERATED,
        createdAt: new Date().toISOString(),
      });

      completeStep(WORKFLOW_STEPS.FORM);
      setCurrentStep(WORKFLOW_STEPS.TITLES);
      toast.success(SUCCESS_MESSAGES.TITLES_GENERATED);

    } catch (error) {
      handleError(error, 'title generation');
    } finally {
      setLoadingState('generatingTitles', false);
    }
  };

  // Handle title selection changes
  const handleSelectionChange = useCallback((selectedIndices) => {
    updateReportData({ selectedIndices });
  }, []); // Removed updateReportData from dependencies as it's stable

  // Update selection in backend and continue to outcomes
  const handleContinueToOutcomes = async (selectedIndices) => {
    if (!reportData.reportId || selectedIndices.length === 0) {
      toast.error('Please select at least one title');
      return;
    }

    setLoadingState('updatingSelection', true);
    setError(null);

    try {
      // Update selection in backend
      await apiService.updateSelectedTitles(
        reportData.reportId,
        selectedIndices,
        user?.id
      );

      // Generate outcomes for selected titles
      setLoadingState('generatingOutcomes', true);
      setLoadingState('updatingSelection', false);

      const response = await apiService.generateOutcomes(
        reportData.reportId,
        user?.id
      );

      updateReportData({
        selectedIndices,
        outcomes: response.outcomes || [],
        summary: response.summary || null,
        status: REPORT_STATUS.COMPLETED,
      });

      completeStep(WORKFLOW_STEPS.TITLES);
      completeStep(WORKFLOW_STEPS.OUTCOMES);
      setCurrentStep(WORKFLOW_STEPS.OUTCOMES);
      
      // Mark report as completed and add to recent reports
      completeReport(reportData.reportId, {
        vendor_name: reportData.formData?.vendor_name,
        target_customer_name: reportData.formData?.target_customer_name,
        status: REPORT_STATUS.COMPLETED,
      });
      toast.success(SUCCESS_MESSAGES.OUTCOMES_GENERATED);
      
      // Navigate directly to view outcomes
      navigate(`/view/${reportData.reportId}`);

    } catch (error) {
      handleError(error, 'outcome generation');
    } finally {
      setLoadingState('updatingSelection', false);
      setLoadingState('generatingOutcomes', false);
    }
  };

  // Regenerate titles
  const handleRegenerateTitles = async () => {
    if (!reportData.formData) return;

    setLoadingState('regenerating', true);
    setError(null);

    try {
      const response = await apiService.generateTitles({
        ...reportData.formData,
        user_id: user?.id,
      });

      updateReportData({
        reportId: response.report_id,
        titles: response.titles || [],
        selectedIndices: [],
        outcomes: [],
        summary: null,
        status: REPORT_STATUS.TITLES_GENERATED,
      });

      toast.success('Titles regenerated successfully!');

    } catch (error) {
      handleError(error, 'title regeneration');
    } finally {
      setLoadingState('regenerating', false);
    }
  };

  // Export report as DOCX
  const handleExport = async () => {
    if (!reportData.reportId) return;

    setLoadingState('exporting', true);
    setError(null);

    try {
      const blob = await apiService.exportDocx(
        reportData.reportId,
        user?.id
      );

      const filename = EXPORT_CONFIG.DOCX_FILENAME(
        reportData.formData?.vendor_name || 'Vendor',
        reportData.formData?.target_customer_name || 'Customer'
      );

      downloadFile(blob, filename);
      toast.success(SUCCESS_MESSAGES.REPORT_EXPORTED);

    } catch (error) {
      handleError(error, 'report export');
    } finally {
      setLoadingState('exporting', false);
    }
  };

  // Go back to previous step
  const handleGoBack = () => {
    if (currentStep > WORKFLOW_STEPS.FORM) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  // Start over
  const handleStartOver = () => {
    resetWorkflow();
  };

  // Render current step content
  const renderStepContent = () => {
    // Debug logging
    console.log('CreateReport - renderStepContent:', {
      currentStep,
      WORKFLOW_STEPS,
      reportDataReportId: reportData.reportId,
      titlesLength: reportData.titles?.length,
      outcomesLength: reportData.outcomes?.length
    });

    switch (currentStep) {
      case WORKFLOW_STEPS.FORM:
        return (
          <POVInputForm
            onSubmit={handleFormSubmit}
            loading={loading.generatingTitles}
            initialData={reportData.formData}
          />
        );

      case WORKFLOW_STEPS.TITLES:
        return (
          <div>
            {/* Report Header - with matching padding structure */}
            <div className="px-6 pt-6 pb-2">
              <ReportHeader
                vendorName={reportData.formData?.vendor_name}
                customerName={reportData.formData?.target_customer_name}
                reportDate={reportData.createdAt}
                reportId={reportData.reportId}
              />
            </div>
            <TitlesList
              titles={reportData.titles}
              onSelectionChange={handleSelectionChange}
              onContinue={handleContinueToOutcomes}
              onRegenerate={handleRegenerateTitles}
              loading={loading.updatingSelection || loading.generatingOutcomes}
              regenerating={loading.regenerating}
            />
          </div>
        );

      default:
        // Default to form if currentStep is undefined or invalid
        console.log('CreateReport - defaulting to form, currentStep was:', currentStep);
        return (
          <POVInputForm
            onSubmit={handleFormSubmit}
            loading={loading.generatingTitles}
            initialData={reportData.formData}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Progress Bar */}
      <ProgressBar 
        currentStep={currentStep} 
        completedSteps={completedSteps} 
      />

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error.type === 'network' ? 'Connection Error' : 'Error'}
                </h3>
                <p className="mt-1 text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        show={loading.generatingOutcomes}
        message={LOADING_MESSAGES.GENERATING_OUTCOMES}
        subtitle="This may take a few minutes..."
        backdrop="none"
      />

      {/* Mobile Navigation */}
      <MobileWorkflowNav 
        currentSection={
          currentStep === WORKFLOW_STEPS.FORM ? 'Form' :
          currentStep === WORKFLOW_STEPS.TITLES ? 'Titles' :
          currentStep === WORKFLOW_STEPS.EXPORT ? 'Export' :
          'Form' // Default to Form if currentStep is undefined/null
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
          {/* Sidebar with Navigation */}
          <div className="hidden lg:block lg:col-span-2">
            <WorkflowNavigation 
              currentSection={
                currentStep === WORKFLOW_STEPS.FORM ? 'Form' :
                currentStep === WORKFLOW_STEPS.TITLES ? 'Titles' :
                currentStep === WORKFLOW_STEPS.EXPORT ? 'Export' :
                'Form' // Default to Form if currentStep is undefined/null
              }
            />
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-4">
            {renderStepContent()}
          </div>
        </div>
      </div>


    </div>
  );
};

export default CreateReport; 
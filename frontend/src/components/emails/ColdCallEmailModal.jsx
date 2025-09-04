import React, { useState, useEffect } from 'react';
import { X, Mail, User, Building, MessageSquare, Loader, Copy, Download, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, handleApiError } from '../../services/api';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

const ColdCallEmailModal = ({ 
  isOpen, 
  onClose, 
  reportId, 
  outcomes = [], 
  reportData = null 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientCompany: reportData?.formData?.target_customer_name || '',
    selectedOutcomes: [],
    customInstructions: ''
  });
  const [generating, setGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [savedEmails, setSavedEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Auto-fill recipient company when modal opens
  useEffect(() => {
    if (isOpen && reportData?.formData?.target_customer_name) {
      setFormData(prev => ({
        ...prev,
        recipientCompany: reportData.formData.target_customer_name
      }));
    }
  }, [isOpen, reportData]);

  // Load existing emails for this report
  useEffect(() => {
    if (isOpen && reportId && user?.id) {
      loadSavedEmails();
    }
  }, [isOpen, reportId, user?.id]);

  const loadSavedEmails = async () => {
    try {
      setLoadingEmails(true);
      const response = await apiService.getColdCallEmails(reportId, user.id);
      setSavedEmails(response.emails || []);
    } catch (error) {
      console.error('Error loading saved emails:', error);
      // Don't show error toast for this, as it's not critical
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOutcomeToggle = (outcomeIndex) => {
    setFormData(prev => ({
      ...prev,
      selectedOutcomes: prev.selectedOutcomes.includes(outcomeIndex)
        ? prev.selectedOutcomes.filter(i => i !== outcomeIndex)
        : [...prev.selectedOutcomes, outcomeIndex]
    }));
  };

  const handleGenerate = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    if (formData.selectedOutcomes.length === 0) {
      toast.error('Please select at least one outcome');
      return;
    }

    try {
      setGenerating(true);
      
      const requestData = {
        user_id: user.id,
        recipient_name: formData.recipientName || null,
        recipient_email: formData.recipientEmail || null,
        recipient_company: formData.recipientCompany || null,
        selected_outcomes: formData.selectedOutcomes,
        custom_instructions: formData.customInstructions || null
      };

      const response = await apiService.generateColdCallEmail(reportId, requestData);
      
      setGeneratedEmail({
        id: response.email_id,
        subject: response.subject,
        body: response.body,
        recipientName: response.recipient_name,
        recipientEmail: response.recipient_email,
        recipientCompany: response.recipient_company
      });

      // Reload saved emails to include the new one
      await loadSavedEmails();
      
      toast.success('Cold call email generated successfully!');
      
    } catch (error) {
      console.error('Error generating email:', error);
      const errorInfo = handleApiError(error);
      toast.error(`Failed to generate email: ${errorInfo.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyEmail = () => {
    if (!generatedEmail) return;
    
    const emailText = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    navigator.clipboard.writeText(emailText).then(() => {
      toast.success('Email copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy email');
    });
  };

  const handleReset = () => {
    setGeneratedEmail(null);
    setFormData({
      recipientName: '',
      recipientEmail: '',
      recipientCompany: reportData?.formData?.target_customer_name || '',
      selectedOutcomes: [],
      customInstructions: ''
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Generate Cold Call Email</h2>
              <p className="text-sm text-gray-600">Create personalized outreach based on POV outcomes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Side - Form */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
            {!generatedEmail ? (
              <div className="space-y-6">
                {/* Recipient Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recipient Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        value={formData.recipientName}
                        onChange={(e) => handleInputChange('recipientName', e.target.value)}
                        placeholder="John Smith"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Recipient Email
                      </label>
                      <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                        placeholder="john.smith@company.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4 inline mr-1" />
                      Company
                    </label>
                    <input
                      type="text"
                      value={formData.recipientCompany}
                      onChange={(e) => handleInputChange('recipientCompany', e.target.value)}
                      placeholder="Company name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Outcome Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Select Outcomes ({formData.selectedOutcomes.length} selected)
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {outcomes.map((outcome, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.selectedOutcomes.includes(index)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleOutcomeToggle(index)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                            formData.selectedOutcomes.includes(index)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {formData.selectedOutcomes.includes(index) && (
                              <div className="w-2 h-2 bg-white rounded-sm"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {outcome.title || `Outcome ${index + 1}`}
                            </h4>
                            {outcome.elaboration && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {outcome.elaboration}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Custom Instructions (Optional)
                  </label>
                  <textarea
                    value={formData.customInstructions}
                    onChange={(e) => handleInputChange('customInstructions', e.target.value)}
                    placeholder="Any specific tone, focus areas, or additional context..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Generate Button */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={formData.selectedOutcomes.length === 0}
                    icon={generating ? Loader : Mail}
                    className="flex-1"
                  >
                    {generating ? 'Generating...' : 'Generate Email'}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              /* Generated Email Display */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Generated Email</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyEmail}
                      icon={Copy}
                      variant="outline"
                      size="sm"
                    >
                      Copy
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                    >
                      Generate New
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* Email Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium text-gray-900">{generatedEmail.subject}</p>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body:</label>
                    <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                        {generatedEmail.body}
                      </div>
                    </div>
                  </div>

                  {/* Recipient Info */}
                  {(generatedEmail.recipientName || generatedEmail.recipientEmail || generatedEmail.recipientCompany) && (
                    <div className="pt-3 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">To:</label>
                      <div className="text-sm text-gray-600">
                        {generatedEmail.recipientName && <div>Name: {generatedEmail.recipientName}</div>}
                        {generatedEmail.recipientEmail && <div>Email: {generatedEmail.recipientEmail}</div>}
                        {generatedEmail.recipientCompany && <div>Company: {generatedEmail.recipientCompany}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Saved Emails */}
          <div className="w-80 p-6 bg-gray-50 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Previous Emails</h3>
              {loadingEmails && <LoadingSpinner size="sm" />}
            </div>

            {savedEmails.length > 0 ? (
              <div className="space-y-3">
                {savedEmails.map((email) => (
                  <div 
                    key={email.id} 
                    className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setGeneratedEmail({
                      id: email.id,
                      subject: email.subject,
                      body: email.email_body,
                      recipientName: email.recipient_name,
                      recipientEmail: email.recipient_email,
                      recipientCompany: email.recipient_company
                    })}
                  >
                    <div className="text-sm font-medium text-gray-900 truncate mb-1">
                      {email.subject}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {formatDate(email.created_at)}
                    </div>
                    {email.recipient_name && (
                      <div className="text-xs text-gray-600">
                        To: {email.recipient_name}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {email.selected_outcomes?.length || 0} outcomes selected
                    </div>
                  </div>
                ))}
              </div>
            ) : !loadingEmails ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No emails generated yet</p>
                <p className="text-xs text-gray-400 mt-1">Generated emails will appear here</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColdCallEmailModal;
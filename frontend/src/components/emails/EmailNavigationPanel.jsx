import React from 'react';
import Button from '../ui/Button';
import { ChevronRight, FolderOpen, Mail } from 'lucide-react';

const EmailNavigationPanel = ({
  currentReport,
  previousReports,
  previousEmails,
  outcomes,
  selectedOutcomes,
  onOutcomeToggle,
  recipientName,
  onRecipientNameChange,
  recipientEmail,
  onRecipientEmailChange,
  recipientCompany,
  onRecipientCompanyChange,
  customInstructions,
  onCustomInstructionsChange,
  onGenerate,
  onLoadEmail,
  loading,
  navigate
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Generate Cold Email</h3>
        </div>
        <p className="text-xs text-gray-600">
          Create personalized outreach emails from POV outcomes
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Form Fields */}
        <div className="p-4 space-y-4">
          {/* Recipient Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name (optional)
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => onRecipientNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Jane Smith, Marketing Director"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Email (optional)
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => onRecipientEmailChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Company
            </label>
            <input
              type="text"
              value={recipientCompany}
              onChange={(e) => onRecipientCompanyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Acme Corp"
            />
            <div className="text-xs text-gray-500 mt-1">
              Pre-filled from target customer
            </div>
          </div>

          {/* Outcome Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Outcomes ({selectedOutcomes.length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {outcomes.length === 0 ? (
                <p className="text-sm text-gray-500">Loading outcomes...</p>
              ) : (
                outcomes.map((outcome, idx) => (
                  <div
                    key={idx}
                    className={`p-2 border rounded cursor-pointer transition-colors text-sm ${
                      selectedOutcomes.includes(idx)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => onOutcomeToggle(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`${selectedOutcomes.includes(idx) ? 'text-blue-700' : 'text-gray-700'}`}>
                        Outcome {idx + 1}
                      </span>
                      {selectedOutcomes.includes(idx) && (
                        <span className="text-blue-600">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {outcome.title || outcome.summary || 'No description'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Instructions (optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => onCustomInstructionsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Add specific tone or focus areas..."
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={onGenerate}
            loading={loading}
            className="w-full"
            disabled={selectedOutcomes.length === 0}
          >
            Generate Cold Email
          </Button>
        </div>

        {/* Previous Emails */}
        <div className="p-4 border-t border-gray-200">
          <h4 className="font-medium text-sm text-gray-900 mb-3">Previous Emails</h4>
          {previousEmails.length === 0 ? (
            <div className="text-center py-4">
              <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No emails generated yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {previousEmails.slice(0, 5).map((email) => (
                <div
                  key={email.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onLoadEmail(email)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {email.subject}
                      </div>
                      {email.recipient_name && (
                        <div className="text-xs text-gray-600">
                          To: {email.recipient_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {new Date(email.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Previous Reports */}
        {previousReports.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="font-medium text-sm text-gray-900 mb-3">Switch Report</h4>
            <div className="space-y-2">
              {previousReports.slice(0, 3).map((report) => (
                <div
                  key={report.id}
                  className={`p-3 bg-white border rounded-lg cursor-pointer transition-colors ${
                    currentReport?.id === report.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => navigate(`/campaigns/${report.id}/cold-call-emails`)}
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {report.vendor_name} → {report.target_customer_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailNavigationPanel;

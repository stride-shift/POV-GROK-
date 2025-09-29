import React from 'react';
import Button from '../ui/Button';
import OutcomeSelector from '../shared/OutcomeSelector';
import { FileText, Eye } from 'lucide-react';

const NavigationPanel = ({
  currentReport,
  previousReports,
  previousWhitepapers,
  outcomes,
  selectedOutcomes,
  onOutcomeToggle,
  title,
  onTitleChange,
  instructions,
  onInstructionsChange,
  onGenerate,
  onLoadWhitepaper,
  loading,
  navigate
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Whitepaper Studio</h3>
        </div>
        <p className="text-xs text-gray-600">Generate and manage whitepapers</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Generation Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g., Strategic Analysis"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="text-xs text-gray-500 mt-1">
              Suggested: Strategic Analysis, Market Insights, Business Case Study
            </div>
          </div>

          <div>
            <OutcomeSelector
              outcomes={outcomes}
              selectedIndices={selectedOutcomes}
              onToggle={onOutcomeToggle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions (optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => onInstructionsChange(e.target.value)}
              placeholder="Focus on ROI, include case studies..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <Button
            onClick={onGenerate}
            loading={loading}
            disabled={!title.trim() || selectedOutcomes.length === 0}
            className="w-full"
          >
            Generate Whitepaper
          </Button>
        </div>

        {/* Reports Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Reports</h4>
          {currentReport && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Current Report</div>
              <div className="bg-gray-50 p-3 rounded border text-xs">
                <div className="font-medium text-gray-900 truncate">
                  {currentReport.vendor_name} → {currentReport.target_customer_name}
                </div>
                <div className="text-gray-500">{new Date(currentReport.created_at).toLocaleDateString()}</div>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/view/${currentReport.id}`)}>
                    View
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-1">Previous Reports</div>
            {previousReports.map((report) => (
              <div
                key={report.id}
                className="bg-gray-50 p-2 rounded border hover:bg-gray-100 transition cursor-pointer text-xs"
                onClick={() => navigate(`/campaigns/${report.id}/whitepaper`)}
              >
                <div className="font-medium text-gray-900 truncate">
                  {report.vendor_name} → {report.target_customer_name}
                </div>
                <div className="text-gray-500">{new Date(report.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Previous Whitepapers */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Previous Whitepapers</h4>
          {previousWhitepapers.length === 0 ? (
            <p className="text-xs text-gray-500">None yet</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {previousWhitepapers.map((wp) => (
                <div
                  key={wp.id}
                  className="bg-gray-50 p-3 rounded border hover:bg-gray-100 transition cursor-pointer"
                  onClick={() => onLoadWhitepaper(wp)}
                >
                  <div className="text-sm font-medium text-gray-900 truncate mb-1">{wp.title}</div>
                  <div className="text-xs text-gray-500">{new Date(wp.created_at).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-600 mt-1">{(wp.content || '').slice(0, 60)}...</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationPanel;
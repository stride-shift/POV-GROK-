import React from 'react';
import Button from '../ui/Button';
import { ChevronRight, FolderOpen } from 'lucide-react';

const ScriptsNavigationPanel = ({
  currentReport,
  previousReports,
  previousScripts,
  outcomes,
  selectedOutcomes,
  onOutcomeToggle,
  title,
  onTitleChange,
  instructions,
  onInstructionsChange,
  scenario,
  onScenarioChange,
  onGenerate,
  onLoadScript,
  loading,
  navigate
}) => {
  const scenarios = [
    { value: 'cold_call', label: 'Cold Call', description: 'Initial outreach conversation' },
    { value: 'discovery', label: 'Discovery', description: 'Needs assessment call' },
    { value: 'objection_handling', label: 'Objection Handling', description: 'Address concerns and pushbacks' },
    { value: 'demo_intro', label: 'Demo Introduction', description: 'Product demonstration opener' },
    { value: 'follow_up', label: 'Follow Up', description: 'Post-meeting follow-up call' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Generate Sales Script</h3>
        </div>
        <p className="text-xs text-gray-600">
          Create conversation scripts for various sales scenarios
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Scenario Selection */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Scenario</label>
          <div className="space-y-2">
            {scenarios.map((scenarioOption) => (
              <div
                key={scenarioOption.value}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  scenario === scenarioOption.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onScenarioChange(scenarioOption.value)}
              >
                <div className="font-medium text-sm text-gray-900">{scenarioOption.label}</div>
                <div className="text-xs text-gray-500 mt-1">{scenarioOption.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Cold Call Opener"
            />
            <div className="text-xs text-gray-500 mt-1">
              Give your script a descriptive title
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
              value={instructions}
              onChange={(e) => onInstructionsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Add specific tone, persona, or conversation flow requirements..."
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={onGenerate}
            loading={loading}
            className="w-full"
            disabled={!title || selectedOutcomes.length === 0}
          >
            Generate Sales Script
          </Button>
        </div>

        {/* Previous Scripts */}
        <div className="p-4 border-t border-gray-200">
          <h4 className="font-medium text-sm text-gray-900 mb-3">Previous Scripts</h4>
          {previousScripts.length === 0 ? (
            <p className="text-sm text-gray-500">No scripts generated yet</p>
          ) : (
            <div className="space-y-2">
              {previousScripts.slice(0, 5).map((script) => (
                <div
                  key={script.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onLoadScript(script)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {script.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {script.scenario} • {new Date(script.created_at).toLocaleDateString()}
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
                  onClick={() => navigate(`/campaigns/${report.id}/sales-scripts`)}
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

export default ScriptsNavigationPanel;

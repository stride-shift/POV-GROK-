import React from 'react';
import { CheckSquare, Square, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';

const SelectionSummary = ({ 
  totalTitles, 
  selectedCount, 
  onSelectAll, 
  onDeselectAll, 
  onContinue,
  loading = false,
  disabled = false 
}) => {
  const allSelected = selectedCount === totalTitles;
  const noneSelected = selectedCount === 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Selection Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={`
              w-3 h-3 rounded-full mr-3
              ${selectedCount > 0 ? 'bg-blue-600' : 'bg-gray-300'}
            `} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedCount} of {totalTitles} titles selected
              </p>
              <p className="text-xs text-gray-500">
                {selectedCount === 0 
                  ? 'Select at least one title to continue'
                  : `${selectedCount} outcome${selectedCount === 1 ? '' : 's'} will be generated`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Quick Selection Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              disabled={disabled || allSelected}
              icon={CheckSquare}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              disabled={disabled || noneSelected}
              icon={Square}
            >
              None
            </Button>
          </div>

          {/* Continue Button */}
          <Button
            onClick={onContinue}
            disabled={disabled || selectedCount === 0}
            loading={loading}
            className="min-w-[140px]"
          >
            Generate Analysis
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(selectedCount / totalTitles) * 100}%` }}
          />
        </div>
      </div>

      {/* Selection Tips */}
      {selectedCount === 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Select the outcome titles that are most relevant to your target customer's needs. 
            You can always change your selection and regenerate the analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default SelectionSummary; 
import React from 'react';

const OutcomeSelector = ({ outcomes = [], selectedIndices = [], onToggle }) => {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Select Outcomes ({selectedIndices.length} selected)
      </h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {outcomes.map((outcome, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedIndices.includes(index)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onToggle(index)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                  selectedIndices.includes(index)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedIndices.includes(index) && (
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
  );
};

export default OutcomeSelector;



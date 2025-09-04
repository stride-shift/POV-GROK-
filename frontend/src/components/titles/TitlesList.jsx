import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import TitleCard from './TitleCard';
import SelectionSummary from './SelectionSummary';
import Button from '../ui/Button';

const TitlesList = ({ 
  titles = [], 
  onSelectionChange, 
  onContinue,
  onRegenerate,
  loading = false,
  regenerating = false 
}) => {
  const [selectedIndices, setSelectedIndices] = useState([]);

  // Initialize selection from titles data
  useEffect(() => {
    const initialSelection = titles
      .filter(title => title.selected)
      .map(title => title.title_index);
    setSelectedIndices(initialSelection);
  }, [titles]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange(selectedIndices);
  }, [selectedIndices, onSelectionChange]);

  // Toggle individual title selection
  const handleTitleToggle = (titleIndex) => {
    setSelectedIndices(prev => {
      if (prev.includes(titleIndex)) {
        return prev.filter(index => index !== titleIndex);
      } else {
        return [...prev, titleIndex];
      }
    });
  };

  // Select all titles
  const handleSelectAll = () => {
    const allIndices = titles.map(title => title.title_index);
    setSelectedIndices(allIndices);
  };

  // Deselect all titles
  const handleDeselectAll = () => {
    setSelectedIndices([]);
  };

  // Handle continue to next step
  const handleContinue = () => {
    onContinue(selectedIndices);
  };

  if (titles.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No titles generated yet
          </h3>
          <p className="text-gray-600">
            Complete the form and generate outcome titles to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Select Outcome Titles
              </h2>
              <p className="text-gray-600">
                Choose the outcome titles that are most relevant for your analysis.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onRegenerate}
              loading={regenerating}
              icon={RefreshCw}
              size="sm"
            >
              Regenerate
            </Button>
          </div>
        </div>

        {/* Selection Summary */}
        <div className="mb-6">
          <SelectionSummary
            totalTitles={titles.length}
            selectedCount={selectedIndices.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onContinue={handleContinue}
            loading={loading}
            disabled={regenerating}
          />
        </div>

        {/* Titles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {titles.map((titleData) => (
            <TitleCard
              key={titleData.title_index}
              title={titleData.title}
              titleIndex={titleData.title_index}
              selected={selectedIndices.includes(titleData.title_index)}
              onToggle={handleTitleToggle}
              disabled={regenerating}
            />
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            About the Selective Workflow
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Select only the most relevant outcome titles for your customer</li>
            <li>• This saves time and focuses the analysis on what matters most</li>
            <li>• You can change your selection and regenerate at any time</li>
            <li>• The final report will include detailed analysis for selected outcomes plus a summary</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TitlesList; 
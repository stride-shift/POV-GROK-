import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Eye, EyeOff, FileText, Calendar, Building } from 'lucide-react';
import OutcomeCard from './OutcomeCard';
import OutcomeModal from './OutcomeModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';

const OutcomesGrid = ({ 
  reportId, 
  userId, 
  onFetchOutcomes,
  loading = false
}) => {
  const [outcomesData, setOutcomesData] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [showSummary, setShowSummary] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch outcomes data when component mounts or reportId changes
  useEffect(() => {
    if (reportId && userId) {
      fetchOutcomes();
    }
  }, [reportId, userId]);

  const fetchOutcomes = async () => {
    try {
      setError(null);
      const data = await onFetchOutcomes(reportId, userId);
      setOutcomesData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch outcomes');
    }
  };

  const handleToggleExpand = (index, isExpanded) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: isExpanded
    }));
  };

  const handleExpandAll = () => {
    const newExpandedState = {};
    outcomesData.outcomes.forEach((_, index) => {
      newExpandedState[index] = true;
    });
    setExpandedCards(newExpandedState);
  };

  const handleCollapseAll = () => {
    setExpandedCards({});
  };

  const handleCardClick = (outcome) => {
    setSelectedOutcome(outcome);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOutcome(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <LoadingSpinner 
            size="lg" 
            message="Loading outcomes..." 
            className="mx-auto"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Error Loading Outcomes</h3>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchOutcomes} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!outcomesData || !outcomesData.outcomes || outcomesData.outcomes.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No Outcomes Available
            </h3>
            <p className="text-gray-600">
              This report doesn't have any detailed outcomes yet. 
              Complete the selective workflow to generate outcomes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { report, outcomes, summary, total_outcomes } = outcomesData;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              POV Analysis Outcomes
            </h1>
            <p className="text-gray-600">
              Detailed analysis for {report.vendor_name} → {report.target_customer_name}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">
              <Calendar className="inline w-4 h-4 mr-1" />
              {new Date(report.created_at).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-500">
              <Building className="inline w-4 h-4 mr-1" />
              {total_outcomes} outcome{total_outcomes !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExpandAll}
            icon={Eye}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCollapseAll}
            icon={EyeOff}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Summary Section - Always visible when available */}
      {summary && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Summary & Key Takeaways
          </h2>
          <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-medium text-gray-800 mt-3 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700 leading-relaxed">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-800">
                    {children}
                  </strong>
                ),
              }}
            >
              {summary.summary_content}
            </ReactMarkdown>
            
            {summary.takeaways_content && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-medium text-gray-800 mt-3 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 mb-3 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 mb-4 space-y-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700 leading-relaxed">
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-800">
                        {children}
                      </strong>
                    ),
                  }}
                >
                  {summary.takeaways_content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outcomes Grid - 3 columns responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {outcomes.map((outcome, index) => (
          <OutcomeCard
            key={outcome.outcome_index || index}
            outcome={outcome}
            index={index}
            isExpanded={expandedCards[index] || false}
            onToggleExpand={handleToggleExpand}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {/* Outcome Modal */}
      <OutcomeModal
        outcome={selectedOutcome}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default OutcomesGrid; 
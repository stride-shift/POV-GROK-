import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

const OutcomeCard = ({ 
  outcome, 
  index,
  isExpanded = false,
  onToggleExpand,
  onCardClick 
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  // Synchronize local state with prop changes (for expand/collapse all functionality)
  useEffect(() => {
    setLocalExpanded(isExpanded);
  }, [isExpanded]);

  const handleToggle = () => {
    const newExpanded = !localExpanded;
    setLocalExpanded(newExpanded);
    if (onToggleExpand) {
      onToggleExpand(index, newExpanded);
    }
  };

  // Extract title from content if available, otherwise use the title field
  const getTitle = () => {
    if (outcome.title && outcome.title !== `Outcome ${outcome.outcome_index + 1}`) {
      return outcome.title;
    }
    
    // Try to extract title from markdown content
    const lines = outcome.content.split('\n');
    for (const line of lines) {
      if (line.startsWith('## **Outcome:')) {
        return line.replace('## **Outcome:', '').replace('**', '').trim();
      }
    }
    
    return `Outcome ${outcome.outcome_index + 1}`;
  };

  // Get preview text (first few lines of content)
  const getPreview = () => {
    const lines = outcome.content.split('\n');
    let previewLines = [];
    let foundDescription = false;
    
    for (const line of lines) {
      if (line.includes('**Outcome Description')) {
        foundDescription = true;
        continue;
      }
      if (foundDescription && line.trim() && !line.startsWith('#')) {
        previewLines.push(line.trim());
        if (previewLines.length >= 2) break;
      }
    }
    
    return previewLines.join(' ').substring(0, 200) + '...';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {/* Clickable area for modal */}
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => onCardClick && onCardClick(outcome)}
        >
          <div className="flex items-center mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold mr-3">
              {outcome.outcome_index + 1}
            </span>
            <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
              {getTitle()}
            </h3>
          </div>
          {!localExpanded && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {getPreview()}
            </p>
          )}
        </div>
        
        {/* Expand/Collapse button */}
        <div 
          className="ml-4 flex-shrink-0 cursor-pointer p-2 hover:bg-gray-100 rounded"
          onClick={handleToggle}
        >
          {localExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {localExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="prose prose-sm max-w-none mt-4 max-h-96 overflow-y-auto">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-3 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-3 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700 ml-2">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-800">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-700">
                    {children}
                  </em>
                ),
              }}
            >
              {outcome.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutcomeCard; 
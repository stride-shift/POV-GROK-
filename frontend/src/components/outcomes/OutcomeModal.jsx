import React from 'react';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { useScrollLock } from '../../hooks/useScrollLock';

const OutcomeModal = ({ outcome, isOpen, onClose }) => {
  // Use the scroll lock hook
  useScrollLock(isOpen && !!outcome, onClose);

  // Extract title from content if available, otherwise use the title field
  const getTitle = () => {
    if (outcome?.title && outcome.title !== `Outcome ${outcome.outcome_index + 1}`) {
      return outcome.title;
    }
    
    if (outcome?.content) {
      // Try to extract title from markdown content
      const lines = outcome.content.split('\n');
      for (const line of lines) {
        if (line.startsWith('## **Outcome:')) {
          return line.replace('## **Outcome:', '').replace('**', '').trim();
        }
      }
    }
    
    return outcome ? `Outcome ${outcome.outcome_index + 1}` : '';
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !outcome) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      data-modal="true"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold mr-4">
              {outcome.outcome_index + 1}
            </span>
            <h2 className="text-xl font-bold text-gray-800 line-clamp-2">
              {getTitle()}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={X}
            className="flex-shrink-0"
          >
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-lg font-medium text-gray-800 mt-4 mb-2">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 mb-4 leading-relaxed text-base">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-6 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-6 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700 leading-relaxed text-base">
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
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic text-gray-700">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
              }}
            >
              {outcome.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="primary"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OutcomeModal; 
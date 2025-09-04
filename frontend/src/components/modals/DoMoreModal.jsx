import React from 'react';
import { X, Mail, FileText, Plus, Megaphone, MessageCircle } from 'lucide-react';

const DoMoreModal = ({ isOpen, onClose, reportId }) => {
  if (!isOpen) return null;

  const options = [
    {
      id: 'cold-email',
      title: 'Cold Call Email',
      description: 'Generate personalized outreach emails based on selected outcomes',
      icon: Mail,
      onClick: () => window.location.href = `/campaigns/${reportId}/cold-call-emails`,
      available: true
    },
    {
      id: 'whitepaper',
      title: 'Whitepaper',
      description: 'Create authoritative whitepapers grounded in your POV analysis',
      icon: FileText,
      onClick: () => window.location.href = `/campaigns/${reportId}/whitepaper`,
      available: true
    },
    {
      id: 'marketing',
      title: 'Marketing',
      description: 'Build comprehensive marketing materials and campaigns',
      icon: Megaphone,
      onClick: () => window.location.href = `/campaigns/${reportId}/marketing`,
      available: true
    },
    {
      id: 'sales-scripts',
      title: 'Sales Scripts',
      description: 'Create effective sales conversation scripts',
      icon: MessageCircle,
      onClick: () => window.location.href = `/campaigns/${reportId}/sales-scripts`,
      available: true
    },
    {
      id: 'follow-up',
      title: 'Follow-up Sequence',
      description: 'Generate a series of follow-up emails',
      icon: Plus,
      onClick: () => {},
      available: false // Coming soon
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Do More with Your Report</h2>
            <p className="text-sm text-gray-600 mt-1">Choose how you'd like to extend your POV analysis</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {options.map((option) => {
              const IconComponent = option.icon;
              return (
                <div
                  key={option.id}
                  className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
                    option.available
                      ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                  onClick={option.available ? option.onClick : undefined}
                >
                  {/* Coming Soon Badge */}
                  {!option.available && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Coming Soon
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      option.available ? 'bg-blue-100' : 'bg-gray-200'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        option.available ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {option.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoMoreModal;
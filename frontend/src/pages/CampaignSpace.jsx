import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import { ArrowLeft, Mail, FileText, Megaphone, MessageCircle, Users, BookOpen } from 'lucide-react';

const CampaignSpace = () => {
  const navigate = useNavigate();
  const { reportId: routeReportId } = useParams();
  const { lastCompletedReportId } = useApp();
  const currentReportId = routeReportId || lastCompletedReportId;

  const actions = [
    {
      id: 'cold-call-emails',
      title: 'Cold Call Emails',
      description: 'Generate personalized cold outreach email templates',
      icon: Mail,
      comingSoon: false,
      path: currentReportId ? `/campaigns/${currentReportId}/cold-call-emails` : null
    },
    {
      id: 'whitepaper',
      title: 'Whitepaper',
      description: 'Generate an authoritative whitepaper from the POV',
      icon: FileText,
      comingSoon: false,
      path: currentReportId ? `/campaigns/${currentReportId}/whitepaper` : null
    },
    {
      id: 'marketing',
      title: 'Marketing',
      description: 'Build comprehensive marketing materials and campaigns',
      icon: Megaphone,
      comingSoon: false,
      path: currentReportId ? `/campaigns/${currentReportId}/marketing` : null
    },
    {
      id: 'sales-scripts',
      title: 'Sales Scripts',
      description: 'Create effective sales conversation scripts',
      icon: MessageCircle,
      comingSoon: false,
      path: currentReportId ? `/campaigns/${currentReportId}/sales-scripts` : null
    },
    {
      id: 'sales-avatar',
      title: 'Sales Avatar',
      description: 'Define detailed buyer personas and customer avatars',
      icon: Users,
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center">
          <Button onClick={() => navigate(`/view/${currentReportId || ''}`)} variant="ghost" icon={ArrowLeft}>
            Back to Report
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Space</h1>
          <p className="text-gray-600 mb-6">Build and manage your campaign artifacts. Choose an artifact to view and create items.</p>

          {/* Actions subsection (matching Actions page look and feel) */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Actions</h2>
            <p className="text-lg text-gray-600">Generate assets and follow-ups based on your POV report</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {actions.map((option) => {
              const IconComponent = option.icon;
              const isDisabled = option.comingSoon || !option.path;
              const handleClick = () => {
                if (option.comingSoon) return;
                if (option.path) navigate(option.path);
              };
              return (
                <div
                  key={option.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
                    option.comingSoon ? 'cursor-not-allowed opacity-75 hover:shadow-md' : 'cursor-pointer hover:shadow-lg hover:border-blue-300'
                  }`}
                  onClick={handleClick}
                >
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${option.comingSoon ? 'bg-gray-100' : 'bg-blue-100'}`}>
                      <IconComponent className={`w-6 h-6 ${option.comingSoon ? 'text-gray-500' : 'text-blue-600'}`} />
                    </div>
                    {option.comingSoon && (
                      <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Coming Soon</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{option.description}</p>
                  <div className="flex justify-end">
                    <Button size="sm" variant={isDisabled ? 'outline' : 'primary'} disabled={isDisabled} className={isDisabled ? 'cursor-not-allowed' : ''}>
                      {isDisabled ? 'Coming Soon' : 'Get Started'}
                    </Button>
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

export default CampaignSpace;



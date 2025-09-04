import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, FileText, BookOpen, Megaphone, MessageCircle, Users, BarChart3 } from 'lucide-react';
import Button from '../components/ui/Button';
import ColdCallEmailModal from '../components/emails/ColdCallEmailModal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService, handleApiError } from '../services/api';

const Extras = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const { user } = useAuth();
  const { lastCompletedReportId, loadExistingReport, reportData } = useApp();

  const [showColdEmailModal, setShowColdEmailModal] = useState(false);
  const [currentOutcomes, setCurrentOutcomes] = useState([]);
  const currentReportId = reportId || lastCompletedReportId;

  useEffect(() => {
    const loadReportContext = async () => {
      if (currentReportId && currentReportId !== reportData.reportId && user?.id) {
        try {
          const response = await apiService.getReport(currentReportId, user.id, user.id);
          const reportDetails = response.report;
          loadExistingReport({
            reportId: currentReportId,
            formData: {
              vendor_name: reportDetails.vendor_name,
              vendor_url: reportDetails.vendor_url,
              vendor_services: reportDetails.vendor_services,
              target_customer_name: reportDetails.target_customer_name,
              target_customer_url: reportDetails.target_customer_url,
              role_names: reportDetails.role_names,
              linkedin_urls: reportDetails.linkedin_urls,
              role_context: reportDetails.role_context,
              additional_context: reportDetails.additional_context,
              num_outcomes: 15,
              model_name: reportDetails.model_name
            },
            titles: [],
            selectedIndices: [],
            outcomes: [],
            summary: null,
            status: 'completed'
          });
        } catch (error) {
          // Soft-fail: keep page usable even if context load fails
          console.error('Error loading report context for Actions:', handleApiError(error));
        }
      }
    };

    if (currentReportId && user?.id) {
      loadReportContext();
    }
  }, [currentReportId, reportData.reportId, user?.id, loadExistingReport]);

  useEffect(() => {
    const fetchOutcomes = async () => {
      if (!currentReportId || !user?.id) return;
      try {
        const data = await apiService.getReportOutcomes(currentReportId, user.id, user.id);
        if (data.outcomes) setCurrentOutcomes(data.outcomes);
      } catch (error) {
        console.error('Error loading outcomes for Actions:', handleApiError(error));
      }
    };
    fetchOutcomes();
  }, [currentReportId, user?.id]);

  const extraOptions = [
    {
      id: 'cold-call-emails',
      title: 'Cold Call Emails',
      description: 'Generate personalized cold outreach email templates',
      icon: Mail,
      comingSoon: false,
      path: reportId ? `/actions/${reportId}/cold-call-emails` : null
    },
    {
      id: 'proposals',
      title: 'Whitepaper',
      description: 'Generate an authoritative whitepaper from the POV',
      icon: FileText,
      comingSoon: false,
      path: reportId ? `/actions/${reportId}/whitepaper` : null
    },
    {
      id: 'whitepaper',
      title: 'Whitepaper',
      description: 'Develop authoritative industry whitepapers',
      icon: BookOpen,
      comingSoon: true
    },
    {
      id: 'marketing',
      title: 'Marketing',
      description: 'Build comprehensive marketing materials and campaigns',
      icon: Megaphone,
      comingSoon: false,
      path: reportId ? `/actions/${reportId}/marketing` : null
    },
    {
      id: 'sales-scripts',
      title: 'Sales Scripts',
      description: 'Create effective sales conversation scripts',
      icon: MessageCircle,
      comingSoon: false,
      path: reportId ? `/actions/${reportId}/sales-scripts` : null
    },
    {
      id: 'sales-avatar',
      title: 'Sales Avatar',
      description: 'Define detailed buyer personas and customer avatars',
      icon: Users,
      comingSoon: true
    },
    {
      id: 'meta-analysis',
      title: 'Meta Analysis',
      description: 'Gain insights and patterns across multiple POV reports',
      icon: BarChart3,
      comingSoon: true
    }
  ];

  const handleOptionClick = (option) => {
    if (option.comingSoon) {
      console.log(`${option.title} clicked - Coming Soon!`);
      return;
    }
    if (option.id === 'cold-call-emails') {
      if (!currentReportId) {
        navigate('/view');
        return;
      }
      setShowColdEmailModal(true);
      return;
    }
    if (option.path) {
      navigate(option.path);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            icon={ArrowLeft}
            className="mb-4"
          >
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Actions
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Generate assets and follow-ups based on your POV report
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {extraOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <div
                key={option.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
                  option.comingSoon 
                    ? 'cursor-not-allowed opacity-75 hover:shadow-md' 
                    : 'cursor-pointer hover:shadow-lg hover:border-blue-300'
                }`}
                onClick={() => handleOptionClick(option)}
              >
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    option.comingSoon 
                      ? 'bg-gray-100' 
                      : 'bg-blue-100'
                  }`}>
                    <IconComponent className={`w-6 h-6 ${
                      option.comingSoon 
                        ? 'text-gray-500' 
                        : 'text-blue-600'
                    }`} />
                  </div>
                  {option.comingSoon && (
                    <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Coming Soon
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {option.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  {option.description}
                </p>
                
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant={option.comingSoon ? "outline" : "primary"}
                    disabled={option.comingSoon}
                    className={option.comingSoon ? "cursor-not-allowed" : ""}
                  >
                    {option.comingSoon ? "Coming Soon" : "Get Started"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              More Tools Coming Soon
            </h3>
            <p className="text-gray-600">
              We're continuously adding new tools and features to help you create compelling content 
              and drive better results. Stay tuned for updates!
            </p>
          </div>
        </div>
      </div>
    </div>
    <ColdCallEmailModal
      isOpen={showColdEmailModal}
      onClose={() => setShowColdEmailModal(false)}
      reportId={currentReportId}
      outcomes={currentOutcomes}
      reportData={reportData}
    />
  </>
  );
};

export default Extras;
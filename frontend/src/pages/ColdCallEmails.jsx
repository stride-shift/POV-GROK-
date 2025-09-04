import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import { ArrowLeft, Mail, RefreshCw, Copy } from 'lucide-react';
import { apiService, handleApiError } from '../services/api';
import OutcomeSelector from '../components/shared/OutcomeSelector';

const ColdCallEmails = () => {
  const navigate = useNavigate();
  const { reportId: routeReportId } = useParams();
  const { user } = useAuth();
  const { lastCompletedReportId } = useApp();

  const [reportId, setReportId] = useState(routeReportId || lastCompletedReportId || '');
  useEffect(() => {
    if (routeReportId) {
      setReportId(routeReportId);
      // Preload emails for this report
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeReportId]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState([]);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalEmail, setModalEmail] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);

  useEffect(() => {
    const loadOutcomes = async () => {
      if (!reportId || !user?.id) return;
      try {
        const data = await apiService.getReportOutcomes(reportId, user.id, user.id);
        const loadedOutcomes = data.outcomes || [];
        setOutcomes(loadedOutcomes);
        
        // Auto-select first 2 outcomes
        if (loadedOutcomes.length >= 2 && selectedOutcomes.length === 0) {
          setSelectedOutcomes([0, 1]);
        } else if (loadedOutcomes.length === 1 && selectedOutcomes.length === 0) {
          setSelectedOutcomes([0]);
        }
        
        if (data.report?.target_customer_name) {
          setRecipientCompany((prev) => prev || data.report.target_customer_name);
        }
        if (data.report) setCurrentReport(data.report);
      } catch (err) {
        // non-blocking
      }
    };
    loadOutcomes();
  }, [reportId, user?.id]);

  useEffect(() => {
    const loadReports = async () => {
      if (!user?.id) return;
      try {
        const list = await apiService.getUserReports(user.id, user.id);
        setPreviousReports(list || []);
      } catch (err) {
        // non-blocking
      }
    };
    loadReports();
  }, [user?.id]);

  const handleGenerate = async () => {
    if (!reportId) {
      toast.error('Enter a Report ID');
      return;
    }
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    if (selectedOutcomes.length === 0) {
      toast.error('Add at least one selected outcome index (e.g., 0,2,4)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail || null,
        recipient_company: recipientCompany || null,
        selected_outcomes: selectedOutcomes,
        custom_instructions: customInstructions || null,
      };
      const data = await apiService.generateColdCallEmail(reportId, payload);
      setGeneratedEmail({
        id: data.email_id,
        subject: data.subject,
        body: data.body,
        recipientName: data.recipient_name,
        recipientEmail: data.recipient_email,
        recipientCompany: data.recipient_company
      });
      toast.success('Cold call email generated');
      await handleRefresh();
    } catch (err) {
      const info = handleApiError(err);
      toast.error(info.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!reportId || !user?.id) return;
    setLoading(true);
    try {
      const data = await apiService.getColdCallEmails(reportId, user.id);
      setEmails(data.emails || []);
    } catch (err) {
      const info = handleApiError(err);
      toast.error(info.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (!generatedEmail) return;
    const emailText = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    navigator.clipboard.writeText(emailText).then(() => {
      toast.success('Email copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy email');
    });
  };

  const handleReset = () => {
    setGeneratedEmail(null);
    setSelectedOutcomes([]);
    setRecipientName('');
    setRecipientEmail('');
    // keep recipientCompany prefill if present
    setCustomInstructions('');
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center">
          <Button onClick={() => navigate(`/campaigns/${reportId || ''}`)} variant="ghost" icon={ArrowLeft}>
            Back to Campaigns
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Mail className="w-6 h-6 text-blue-600 mr-2" />
              Cold Call Emails
            </h1>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRefresh}>
              Refresh
            </Button>
          </div>

          <div className="flex gap-6">
            {/* Left: form and preview */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                { !routeReportId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report ID</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={reportId}
                      onChange={(e) => setReportId(e.target.value)}
                      placeholder="UUID of the POV report"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name (optional)</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g., Jean Smith, Marketing Director"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Suggested: Marketing Director, Sales Manager, CEO
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email (optional)</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Company (optional)</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={recipientCompany}
                    onChange={(e) => setRecipientCompany(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="md:col-span-2">
                  <OutcomeSelector
                    outcomes={outcomes}
                    selectedIndices={selectedOutcomes}
                    onToggle={(idx)=>setSelectedOutcomes(prev => prev.includes(idx) ? prev.filter(i=>i!==idx) : [...prev, idx])}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Instructions (optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Add any specific notes or instructions for the email tone or focus..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <Button onClick={handleGenerate} loading={loading} className="min-w-[200px]">
                  Generate Email
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              </div>

              {generatedEmail && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Generated Email</h3>
                    <Button onClick={handleCopyEmail} icon={Copy} variant="outline" size="sm">Copy</Button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium text-gray-900">{generatedEmail.subject}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body:</label>
                    <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">{generatedEmail.body}</div>
                    </div>
                  </div>
                  {(generatedEmail.recipientName || generatedEmail.recipientEmail || generatedEmail.recipientCompany) && (
                    <div className="pt-3 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">To:</label>
                      <div className="text-sm text-gray-600">
                        {generatedEmail.recipientName && <div>Name: {generatedEmail.recipientName}</div>}
                        {generatedEmail.recipientEmail && <div>Email: {generatedEmail.recipientEmail}</div>}
                        {generatedEmail.recipientCompany && <div>Company: {generatedEmail.recipientCompany}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: reports and previous emails */}
            <div className="w-80">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Reports</h3>
                {currentReport && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-500 mb-1">Current Report</div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-900">
                        {currentReport.vendor_name} → {currentReport.target_customer_name}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(currentReport.created_at).toLocaleDateString()}</div>
                      <div className="mt-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/view/${currentReport.id}`)}>View Report</Button>
                        <Button size="sm" className="ml-2" onClick={() => navigate(`/campaigns/${currentReport.id}/cold-call-emails`)}>Open Emails</Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-500 mb-1">Your Previous Reports</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(previousReports || []).map((r) => (
                    <div
                      key={r.id}
                      className="bg-white p-3 rounded border hover:shadow-sm transition cursor-pointer"
                      onClick={() => navigate(`/campaigns/${r.id}/cold-call-emails`)}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{r.vendor_name} → {r.target_customer_name}</div>
                      <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">Previous Emails</h3>
                </div>
                {emails.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No emails generated yet</p>
                    <p className="text-xs text-gray-400 mt-1">Generated emails will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          const payload = {
                            id: email.id,
                            subject: email.subject,
                            body: email.email_body,
                            recipientName: email.recipient_name,
                            recipientEmail: email.recipient_email,
                            recipientCompany: email.recipient_company
                          };
                          setGeneratedEmail(payload);
                          setModalEmail(payload);
                          setShowEmailModal(true);
                        }}
                      >
                        <div className="text-sm font-medium text-gray-900 truncate mb-1">{email.subject}</div>
                        <div className="text-xs text-gray-500 mb-2">{new Date(email.created_at).toLocaleDateString()}</div>
                        {email.recipient_name && (
                          <div className="text-xs text-gray-600">To: {email.recipient_name}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">{email.selected_outcomes?.length || 0} outcomes selected</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {showEmailModal && modalEmail && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyEmail} icon={Copy}>Copy</Button>
              <Button variant="outline" size="sm" onClick={() => setShowEmailModal(false)}>Close</Button>
            </div>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="font-medium text-gray-900">{modalEmail.subject}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body:</label>
              <div className="bg-gray-50 p-4 rounded border max-h-80 overflow-y-auto">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">{modalEmail.body}</div>
              </div>
            </div>
            {(modalEmail.recipientName || modalEmail.recipientEmail || modalEmail.recipientCompany) && (
              <div className="pt-3 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">To:</label>
                <div className="text-sm text-gray-600">
                  {modalEmail.recipientName && <div>Name: {modalEmail.recipientName}</div>}
                  {modalEmail.recipientEmail && <div>Email: {modalEmail.recipientEmail}</div>}
                  {modalEmail.recipientCompany && <div>Company: {modalEmail.recipientCompany}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ColdCallEmails;



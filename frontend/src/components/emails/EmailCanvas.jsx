import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import Button from '../ui/Button';
import { ArrowLeft, Copy, MessageSquare, FolderOpen, Download, Clock, RotateCcw, Mail, Edit3 } from 'lucide-react';
import { apiService, handleApiError } from '../../services/api';
import { Streamdown } from 'streamdown';
import EditableCanvasContent from '../editor/EditableCanvasContent';
import EmailNavigationPanel from './EmailNavigationPanel';
import EmailChatPanel from './EmailChatPanel';

const EmailCanvas = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const { user } = useAuth();
  const { lastCompletedReportId } = useApp();
  
  const currentReportId = reportId || lastCompletedReportId;
  
  // UI State
  const [isChatMode, setIsChatMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineEditingEnabled, setInlineEditingEnabled] = useState(true);
  
  // Data State
  const [outcomes, setOutcomes] = useState([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);
  const [previousEmails, setPreviousEmails] = useState([]);
  
  // Content State
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentEmailId, setCurrentEmailId] = useState(null);
  const [originalContent, setOriginalContent] = useState('');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  // Version State
  const [versionHistory, setVersionHistory] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [viewingVersion, setViewingVersion] = useState(null);
  
  // Form State (Email specific)
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, [currentReportId, user?.id]);

  const loadInitialData = async () => {
    if (!currentReportId || !user?.id) return;
    
    try {
      // Load outcomes and report data
      const outcomesData = await apiService.getReportOutcomes(currentReportId, user.id, user.id);
      const loadedOutcomes = outcomesData.outcomes || [];
      setOutcomes(loadedOutcomes);
      
      // Auto-select first 2 outcomes
      if (loadedOutcomes.length >= 2) {
        setSelectedOutcomes([0, 1]);
      } else if (loadedOutcomes.length === 1) {
        setSelectedOutcomes([0]);
      }
      
      if (outcomesData.report) {
        setCurrentReport(outcomesData.report);
        // Pre-fill company name
        if (outcomesData.report.target_customer_name) {
          setRecipientCompany(outcomesData.report.target_customer_name);
        }
      }
      
      // Load previous reports
      const reportsData = await apiService.getUserReports(user.id, user.id);
      setPreviousReports(reportsData || []);
      
      // Load previous emails
      const emailsData = await apiService.getColdCallEmails(currentReportId, user.id);
      setPreviousEmails(emailsData.emails || []);
      
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const handleGenerate = async () => {
    if (!currentReportId || !user?.id) {
      toast.error('Report and User are required');
      return;
    }
    
    if (selectedOutcomes.length === 0) {
      toast.error('Please select at least one outcome');
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    
    try {
      const payload = {
        user_id: user.id,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail || null,
        recipient_company: recipientCompany || null,
        selected_outcomes: selectedOutcomes,
        custom_instructions: customInstructions || null,
      };
      
      const response = await apiService.generateColdCallEmail(currentReportId, payload);
      
      // Set email metadata
      setEmailSubject(response.subject);
      setCurrentEmailId(response.email_id || response.id);
      const content = response.body || '';
      setOriginalContent(content);
      setViewingVersion(null);
      setCurrentVersion(1);
      setVersionHistory([]);
      
      // Stream the content
      await simulateStreaming(content);
      
      toast.success('Cold call email generated successfully!');
      
      // Reload previous emails
      const emailsData = await apiService.getColdCallEmails(currentReportId, user.id);
      setPreviousEmails(emailsData.emails || []);
      
    } catch (err) {
      toast.error(handleApiError(err).message);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const simulateStreaming = async (content, speed = 'normal') => {
    setEmailContent('');
    const words = content.split(' ');
    
    const delay = speed === 'fast' ? 30 : 50;
    
    for (let i = 0; i < words.length; i++) {
      setEmailContent(prev => prev + (i === 0 ? '' : ' ') + words[i]);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  const handleCopy = () => {
    const fullContent = `Subject: ${emailSubject}\n\n${emailContent}`;
    navigator.clipboard.writeText(fullContent).then(() => {
      toast.success('Email copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy content');
    });
  };

  const handleChatSubmit = async (message) => {
    if (!message.trim() || !emailContent || !currentEmailId) {
      if (!currentEmailId) {
        toast.error('Please generate or load an email first');
      }
      return;
    }
    
    // Add user message
    const userMessage = { type: 'user', content: message, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    // Add AI thinking message
    const thinkingMessage = { type: 'ai', content: 'Processing your request...', timestamp: new Date(), isThinking: true };
    setChatMessages(prev => [...prev, thinkingMessage]);
    
    try {
      // Call backend chat endpoint
      const response = await apiService.chatEditColdCallEmail(currentEmailId, {
        user_id: user.id,
        message: message,
        current_content: emailContent,
        current_subject: emailSubject
      });
      
      // Update version information first
      if (response.version) {
        setCurrentVersion(response.version);
      }
      if (response.version_history) {
        setVersionHistory(response.version_history);
      }
      
      // Add AI response message before streaming starts
      const aiResponse = { 
        type: 'ai', 
        content: `Updating your email based on: "${message}"`, 
        timestamp: new Date(),
        isThinking: false 
      };
      setChatMessages(prev => prev.slice(0, -1).concat([aiResponse]));
      
      // Stream the updated content
      const updatedContent = response.updated_content || response.body;
      if (response.updated_subject) {
        setEmailSubject(response.updated_subject);
      }
      setIsStreaming(true);
      setEmailContent('');
      
      await simulateStreaming(updatedContent, 'fast');
      
      setOriginalContent(updatedContent);
      setViewingVersion(null);
      setIsStreaming(false);
      
      // Update AI message to show completion
      const completionMessage = { 
        type: 'ai', 
        content: `✓ Email updated successfully! Now at version ${response.version || currentVersion + 1}`, 
        timestamp: new Date(),
        isThinking: false 
      };
      setChatMessages(prev => [...prev, completionMessage]);
      
      toast.success('Email updated to version ' + (response.version || currentVersion + 1));
      
      // Reload emails list
      const emailsData = await apiService.getColdCallEmails(currentReportId, user.id);
      setPreviousEmails(emailsData.emails || []);
      
    } catch (err) {
      setChatMessages(prev => prev.slice(0, -1));
      toast.error(handleApiError(err).message || 'Failed to process chat request');
    }
  };

  const loadEmail = async (email) => {
    setEmailSubject(email.subject);
    setEmailContent(email.email_body || email.body);
    setOriginalContent(email.email_body || email.body);
    setCurrentEmailId(email.id);
    setRecipientName(email.recipient_name || '');
    setRecipientEmail(email.recipient_email || '');
    setRecipientCompany(email.recipient_company || '');
    setChatMessages([]);
    setCurrentVersion(email.current_version || 1);
    setViewingVersion(null);
    
    // Load version history if available
    if (email.id && user?.id) {
      try {
        const versionsData = await apiService.getColdCallEmailVersions(email.id, user.id);
        setVersionHistory(versionsData.versions || []);
        setCurrentVersion(versionsData.current_version || 1);
      } catch (err) {
        console.error('Error loading version history:', err);
      }
    }
  };

  const viewVersion = (version) => {
    if (version) {
      setViewingVersion(version.version);
      setEmailContent(version.content || version.body);
      setEmailSubject(version.subject || emailSubject);
    } else {
      setViewingVersion(null);
      setEmailContent(originalContent);
    }
  };
  
  const restoreVersion = async (versionNumber) => {
    if (!currentEmailId || !user?.id) return;
    
    try {
      const response = await apiService.restoreColdCallEmailVersion(currentEmailId, versionNumber, user.id);
      
      setEmailContent(response.restored_content || response.body);
      setOriginalContent(response.restored_content || response.body);
      if (response.restored_subject) {
        setEmailSubject(response.restored_subject);
      }
      setCurrentVersion(response.new_version);
      setViewingVersion(null);
      
      const versionsData = await apiService.getColdCallEmailVersions(currentEmailId, user.id);
      setVersionHistory(versionsData.versions || []);
      
      toast.success(`Version ${versionNumber} is now the current version`);
    } catch (err) {
      toast.error('Failed to restore version');
    }
  };

  // Handle inline editing save
  const handleInlineEditSave = async (newContent) => {
    if (!currentEmailId || !user?.id) {
      throw new Error('No email loaded');
    }

    try {
      // Use the chat edit endpoint with a generic "Direct edit" message
      const response = await apiService.chatEditColdCallEmail(currentEmailId, {
        user_id: user.id,
        message: "Direct edit via inline editor",
        current_content: newContent,
        current_subject: emailSubject
      });

      // Update states with the response
      if (response.version) {
        setCurrentVersion(response.version);
      }
      if (response.version_history) {
        setVersionHistory(response.version_history);
      }

      // Update the content states
      setEmailContent(newContent);
      setOriginalContent(newContent);
      setViewingVersion(null);

      return response;
    } catch (error) {
      console.error('Error saving inline edit:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate(`/campaigns/${currentReportId || ''}`)} 
              variant="ghost" 
              icon={ArrowLeft}
              size="sm"
            >
              Back to Campaigns
            </Button>
            {currentReport && (
              <div className="text-sm text-gray-600">
                {currentReport.vendor_name} → {currentReport.target_customer_name}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {emailContent && (
              <>
                <Button onClick={handleCopy} icon={Copy} variant="outline" size="sm">
                  Copy
                </Button>
                <Button icon={Download} variant="outline" size="sm">
                  Export
                </Button>
                <Button 
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  icon={Clock} 
                  variant="outline" 
                  size="sm"
                  className={showVersionHistory ? 'bg-gray-100' : ''}
                >
                  Version {currentVersion}
                </Button>
                <Button
                  onClick={() => setInlineEditingEnabled(!inlineEditingEnabled)}
                  icon={Edit3}
                  variant={inlineEditingEnabled ? "primary" : "outline"}
                  size="sm"
                  title={inlineEditingEnabled ? 'Disable inline editing' : 'Enable inline editing'}
                >
                  {inlineEditingEnabled ? 'Edit Mode' : 'View Mode'}
                </Button>
              </>
            )}
            <Button
              onClick={() => setIsChatMode(!isChatMode)}
              icon={isChatMode ? FolderOpen : MessageSquare}
              variant={isChatMode ? "primary" : "outline"}
              size="sm"
            >
              {isChatMode ? 'Nav Mode' : 'Chat Mode'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Toggle between Navigation and Chat */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {isChatMode ? (
            <EmailChatPanel
              messages={chatMessages}
              input={chatInput}
              onInputChange={setChatInput}
              onSubmit={handleChatSubmit}
              disabled={!emailContent || viewingVersion !== null}
              viewingHistoricalVersion={viewingVersion !== null}
            />
          ) : (
            <EmailNavigationPanel
              currentReport={currentReport}
              previousReports={previousReports}
              previousEmails={previousEmails}
              outcomes={outcomes}
              selectedOutcomes={selectedOutcomes}
              onOutcomeToggle={(idx) => setSelectedOutcomes(prev => 
                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
              )}
              recipientName={recipientName}
              onRecipientNameChange={setRecipientName}
              recipientEmail={recipientEmail}
              onRecipientEmailChange={setRecipientEmail}
              recipientCompany={recipientCompany}
              onRecipientCompanyChange={setRecipientCompany}
              customInstructions={customInstructions}
              onCustomInstructionsChange={setCustomInstructions}
              onGenerate={handleGenerate}
              onLoadEmail={loadEmail}
              loading={loading}
              navigate={navigate}
            />
          )}
        </div>

        {/* Version History Panel (Overlay) */}
        {showVersionHistory && currentEmailId && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Version History</h3>
                </div>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Current version: {currentVersion}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Current Version Card */}
              <div 
                className={`p-3 border rounded-lg mb-3 cursor-pointer transition-colors ${
                  viewingVersion === null 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => viewVersion(null)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      Current Version (v{currentVersion})
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {viewingVersion === null ? 'Currently viewing' : 'Click to view current'}
                    </div>
                  </div>
                  {viewingVersion === null && (
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Live
                    </div>
                  )}
                </div>
              </div>
              
              {/* Version History */}
              {versionHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No previous versions yet</p>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Versions</div>
                  {versionHistory.slice().reverse().map((version, idx) => (
                    <div
                      key={idx}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        viewingVersion === version.version 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => viewVersion(version)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            Version {version.version}
                            {viewingVersion === version.version && (
                              <span className="ml-2 text-xs text-blue-600">(viewing)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {version.edit_message || 'No description'}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(version.edited_at).toLocaleDateString()} at{' '}
                            {new Date(version.edited_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreVersion(version.version);
                          }}
                          className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Make this the current version"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Canvas Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              {emailContent ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Email Header */}
                  <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-6 h-6 text-blue-600" />
                      <h2 className="text-2xl font-bold text-gray-900">Cold Call Email</h2>
                      {viewingVersion !== null && (
                        <span className="text-sm text-amber-600">
                          (Viewing Version {viewingVersion} - Read Only)
                        </span>
                      )}
                    </div>
                    
                    {/* Recipient Info Card */}
                    {(recipientName || recipientEmail || recipientCompany) && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="text-xs font-medium text-gray-500 mb-2">TO:</div>
                        <div className="space-y-1">
                          {recipientName && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Name:</span> {recipientName}
                            </div>
                          )}
                          {recipientEmail && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Email:</span> {recipientEmail}
                            </div>
                          )}
                          {recipientCompany && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Company:</span> {recipientCompany}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Subject Line */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-xs font-medium text-blue-700 mb-1">SUBJECT:</div>
                      <div className="text-lg font-semibold text-gray-900">{emailSubject}</div>
                    </div>
                  </div>
                  
                  {/* Email Body */}
                  <div className="p-6">
                  <div className="prose prose-lg max-w-none">
                    {inlineEditingEnabled && !isStreaming && !viewingVersion ? (
                      <EditableCanvasContent
                        content={emailContent}
                        onSave={handleInlineEditSave}
                        editable={true}
                        placeholder="Click to edit your email content..."
                        autoSave={false}
                        showControls={true}
                        className="email-content"
                      />
                    ) : (
                      <Streamdown
                        className="email-content"
                        parseIncompleteMarkdown={true}
                      >
                        {emailContent}
                      </Streamdown>
                    )}
                  </div>
                    
                    {isStreaming && (
                      <div className="mt-4 flex items-center text-sm text-gray-500">
                        <div className="animate-pulse flex space-x-1">
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="ml-2">Generating...</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Mail className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Your Cold Call Email</h2>
                    <p className="text-gray-600 mb-6">
                      Generate personalized outreach emails from your POV analysis
                    </p>
                    <p className="text-sm text-gray-500">
                      Use the panel on the left to get started, then switch to Chat Mode for editing
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailCanvas;

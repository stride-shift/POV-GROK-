import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import Button from '../ui/Button';
import { ArrowLeft, Copy, MessageSquare, FolderOpen, Download, Clock, RotateCcw, MessageCircle, Edit3, Building2 } from 'lucide-react';
import { apiService, handleApiError } from '../../services/api';
import { Streamdown } from 'streamdown';
import EditableCanvasContent from '../editor/EditableCanvasContent';
import ScriptsNavigationPanel from './ScriptsNavigationPanel';
import ScriptsChatPanel from './ScriptsChatPanel';
import FirmographicsCanvasPanel from './FirmographicsCanvasPanel';
import { extractFirmographics } from '../../utils/firmographicsExtractor';

const SalesScriptsCanvas = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const { user } = useAuth();
  const { lastCompletedReportId } = useApp();
  
  const currentReportId = reportId || lastCompletedReportId;
  
  // UI State
  const [panelMode, setPanelMode] = useState('nav'); // 'nav', 'chat'
  const [showFirmographics, setShowFirmographics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineEditingEnabled, setInlineEditingEnabled] = useState(true);
  
  // Data State
  const [outcomes, setOutcomes] = useState([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);
  const [previousScripts, setPreviousScripts] = useState([]);
  
  // Content State
  const [scriptContent, setScriptContent] = useState('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptScenario, setScriptScenario] = useState('cold_call');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [originalContent, setOriginalContent] = useState('');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  // Version State
  const [versionHistory, setVersionHistory] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [viewingVersion, setViewingVersion] = useState(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('cold_call');

  // Firmographics State
  const [firmographics, setFirmographics] = useState(null);
  const [firmographicsLoading, setFirmographicsLoading] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [grokResearch, setGrokResearch] = useState(null);

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
        
        // Store Grok research data if available
        if (outcomesData.grok_research) {
          setGrokResearch(outcomesData.grok_research);
        }
        
        // Extract firmographics from report, outcomes, and Grok research
        const extractedFirmographics = extractFirmographics(
          outcomesData.report, 
          loadedOutcomes, 
          outcomesData.grok_research
        );
        setFirmographics(extractedFirmographics);
        
        // Fetch financial data if we have a company name
        if (extractedFirmographics?.company_name) {
          fetchFinancialData(extractedFirmographics.company_name);
        }
      }
      
      // Load previous reports
      const reportsData = await apiService.getUserReports(user.id, user.id);
      setPreviousReports(reportsData || []);
      
      // Load previous scripts
      const scriptsData = await apiService.getSalesScripts(currentReportId, user.id);
      setPreviousScripts(scriptsData.items || scriptsData.scripts || []);
      
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const handleGenerate = async () => {
    if (!currentReportId || !user?.id || !title.trim()) {
      toast.error('Report, User, and Title are required');
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
        scenario: selectedScenario,
        title,
        custom_instructions: instructions || null,
        selected_outcomes: selectedOutcomes
      };
      
      const response = await apiService.generateSalesScript(currentReportId, payload);
      const content = response.item?.script_body || response.script_body || '';
      
      // Set script metadata
      setScriptTitle(title);
      setScriptScenario(selectedScenario);
      setCurrentScriptId(response.id || response.item?.id);
      setOriginalContent(content);
      setViewingVersion(null);
      setCurrentVersion(1);
      setVersionHistory([]);
      
      // Stream the content
      await simulateStreaming(content);
      
      toast.success('Sales script generated successfully!');
      
      // Reload previous scripts
      const scriptsData = await apiService.getSalesScripts(currentReportId, user.id);
      setPreviousScripts(scriptsData.items || scriptsData.scripts || []);
      
    } catch (err) {
      toast.error(handleApiError(err).message);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const simulateStreaming = async (content, speed = 'normal') => {
    setScriptContent('');
    const words = content.split(' ');
    
    const delay = speed === 'fast' ? 30 : 50;
    
    for (let i = 0; i < words.length; i++) {
      setScriptContent(prev => prev + (i === 0 ? '' : ' ') + words[i]);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  const handleCopy = () => {
    const fullContent = `${scriptTitle}\n\n${scriptContent}`;
    navigator.clipboard.writeText(fullContent).then(() => {
      toast.success('Sales script copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy content');
    });
  };

  const handleChatSubmit = async (message) => {
    if (!message.trim() || !scriptContent || !currentScriptId) {
      if (!currentScriptId) {
        toast.error('Please generate or load a sales script first');
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
      const response = await apiService.chatEditSalesScript(currentScriptId, {
        user_id: user.id,
        message: message,
        current_content: scriptContent
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
        content: `Updating your sales script based on: "${message}"`, 
        timestamp: new Date(),
        isThinking: false 
      };
      setChatMessages(prev => prev.slice(0, -1).concat([aiResponse]));
      
      // Stream the updated content
      const updatedContent = response.updated_content || response.script_body;
      setIsStreaming(true);
      setScriptContent('');
      
      await simulateStreaming(updatedContent, 'fast');
      
      setOriginalContent(updatedContent);
      setViewingVersion(null);
      setIsStreaming(false);
      
      // Update AI message to show completion
      const completionMessage = { 
        type: 'ai', 
        content: `✓ Sales script updated successfully! Now at version ${response.version || currentVersion + 1}`, 
        timestamp: new Date(),
        isThinking: false 
      };
      setChatMessages(prev => [...prev, completionMessage]);
      
      toast.success('Sales script updated to version ' + (response.version || currentVersion + 1));
      
      // Reload scripts list
      const scriptsData = await apiService.getSalesScripts(currentReportId, user.id);
      setPreviousScripts(scriptsData.items || scriptsData.scripts || []);
      
    } catch (err) {
      setChatMessages(prev => prev.slice(0, -1));
      toast.error(handleApiError(err).message || 'Failed to process chat request');
    }
  };

  const loadScript = async (script) => {
    setScriptTitle(script.title);
    setScriptContent(script.script_body);
    setScriptScenario(script.scenario);
    setOriginalContent(script.script_body);
    setCurrentScriptId(script.id);
    setChatMessages([]);
    setCurrentVersion(script.current_version || 1);
    setViewingVersion(null);
    
    // Load version history if available
    if (script.id && user?.id) {
      try {
        const versionsData = await apiService.getSalesScriptVersions(script.id, user.id);
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
      setScriptContent(version.content || version.script_body);
      setScriptTitle(version.title || scriptTitle);
    } else {
      setViewingVersion(null);
      setScriptContent(originalContent);
    }
  };
  
  const restoreVersion = async (versionNumber) => {
    if (!currentScriptId || !user?.id) return;
    
    try {
      const response = await apiService.restoreSalesScriptVersion(currentScriptId, versionNumber, user.id);
      
      setScriptContent(response.restored_content || response.script_body);
      setOriginalContent(response.restored_content || response.script_body);
      setCurrentVersion(response.new_version);
      setViewingVersion(null);
      
      const versionsData = await apiService.getSalesScriptVersions(currentScriptId, user.id);
      setVersionHistory(versionsData.versions || []);
      
      toast.success(`Version ${versionNumber} is now the current version`);
    } catch (err) {
      toast.error('Failed to restore version');
    }
  };

  const getScenarioBadge = (scenario) => {
    const badges = {
      'cold_call': { label: 'Cold Call', color: 'bg-blue-100 text-blue-700' },
      'discovery': { label: 'Discovery', color: 'bg-green-100 text-green-700' },
      'objection_handling': { label: 'Objection Handling', color: 'bg-red-100 text-red-700' },
      'demo_intro': { label: 'Demo Intro', color: 'bg-purple-100 text-purple-700' },
      'follow_up': { label: 'Follow Up', color: 'bg-yellow-100 text-yellow-700' }
    };
    return badges[scenario] || { label: scenario, color: 'bg-gray-100 text-gray-700' };
  };

  // Handle inline editing save
  const handleInlineEditSave = async (newContent) => {
    if (!currentScriptId || !user?.id) {
      throw new Error('No sales script loaded');
    }

    try {
      // Use the chat edit endpoint with a generic "Direct edit" message
      const response = await apiService.chatEditSalesScript(currentScriptId, {
        user_id: user.id,
        message: "Direct edit via inline editor",
        current_content: newContent
      });

      // Update states with the response
      if (response.version) {
        setCurrentVersion(response.version);
      }
      if (response.version_history) {
        setVersionHistory(response.version_history);
      }

      // Update the content states
      setScriptContent(newContent);
      setOriginalContent(newContent);
      setViewingVersion(null);

      return response;
    } catch (error) {
      console.error('Error saving inline edit:', error);
      throw error;
    }
  };

  // Fetch financial data for a company
  const fetchFinancialData = async (companyName) => {
    if (!companyName) return;
    
    setFinancialLoading(true);
    try {
      const response = await apiService.getCompanyFinancialData(companyName);
      
      if (response.is_public && response.financial_data) {
        setFinancialData(response.financial_data);
      } else {
        setFinancialData(null);
        console.log(`${companyName} is likely a private company or ticker not found`);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setFinancialData(null);
    } finally {
      setFinancialLoading(false);
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
            {scriptContent && (
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
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPanelMode(panelMode === 'nav' ? 'chat' : 'nav')}
                icon={panelMode === 'chat' ? FolderOpen : MessageSquare}
                variant={panelMode === 'chat' ? "primary" : "outline"}
                size="sm"
              >
                {panelMode === 'chat' ? 'Nav Mode' : 'Chat Mode'}
              </Button>
              <Button
                onClick={() => setShowFirmographics(!showFirmographics)}
                icon={Building2}
                variant={showFirmographics ? "primary" : "outline"}
                size="sm"
                title="Customer Context"
              >
                Context
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Toggle between Navigation and Chat */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {panelMode === 'chat' ? (
            <ScriptsChatPanel
              messages={chatMessages}
              input={chatInput}
              onInputChange={setChatInput}
              onSubmit={handleChatSubmit}
              disabled={!scriptContent || viewingVersion !== null}
              viewingHistoricalVersion={viewingVersion !== null}
            />
          ) : (
            <ScriptsNavigationPanel
              currentReport={currentReport}
              previousReports={previousReports}
              previousScripts={previousScripts}
              outcomes={outcomes}
              selectedOutcomes={selectedOutcomes}
              onOutcomeToggle={(idx) => setSelectedOutcomes(prev => 
                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
              )}
              title={title}
              onTitleChange={setTitle}
              instructions={instructions}
              onInstructionsChange={setInstructions}
              scenario={selectedScenario}
              onScenarioChange={setSelectedScenario}
              onGenerate={handleGenerate}
              onLoadScript={loadScript}
              loading={loading}
              navigate={navigate}
            />
          )}
        </div>

        {/* Version History Panel (Overlay) */}
        {showVersionHistory && currentScriptId && (
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
          <div className="h-full overflow-y-auto">
            {showFirmographics ? (
              /* Customer Context View */
              <div className="p-8">
                <div className="max-w-6xl mx-auto">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Customer Context</h1>
                      </div>
                      <p className="text-gray-600">
                        Comprehensive firmographics and customer insights for{' '}
                        {firmographics?.company_name || currentReport?.target_customer_name || 'your prospect'}
                      </p>
                    </div>
                    <div className="p-6">
                      <FirmographicsCanvasPanel
                        firmographics={firmographics}
                        loading={firmographicsLoading}
                        financialData={financialData}
                        financialLoading={financialLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Sales Script View */
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  {scriptContent ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                      {scriptTitle && (
                        <div className="mb-8 pb-4 border-b border-gray-200">
                          <div className="flex items-center gap-3 mb-2">
                            <MessageCircle className="w-6 h-6 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900">
                              {scriptTitle}
                            </h1>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getScenarioBadge(scriptScenario).color}`}>
                              {getScenarioBadge(scriptScenario).label}
                            </span>
                            {viewingVersion !== null && (
                              <span className="text-sm text-amber-600">
                                (Viewing Version {viewingVersion} - Read Only)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="prose prose-lg max-w-none">
                        {inlineEditingEnabled && !isStreaming && !viewingVersion ? (
                          <EditableCanvasContent
                            content={scriptContent}
                            onSave={handleInlineEditSave}
                            editable={true}
                            placeholder="Click to edit your sales script content..."
                            autoSave={false}
                            showControls={true}
                            className="script-content"
                          />
                        ) : (
                          <Streamdown
                            className="script-content"
                            parseIncompleteMarkdown={true}
                          >
                            {scriptContent}
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
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <MessageCircle className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Your Sales Script</h2>
                        <p className="text-gray-600 mb-6">
                          Generate conversation scripts from your POV analysis for various sales scenarios
                        </p>
                        <p className="text-sm text-gray-500">
                          Use the panel on the left to get started, then switch to Chat Mode for editing
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesScriptsCanvas;

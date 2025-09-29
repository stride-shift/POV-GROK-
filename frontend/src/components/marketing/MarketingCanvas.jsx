import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import Button from '../ui/Button';
import { ArrowLeft, Copy, MessageSquare, FolderOpen, Download, Clock, RotateCcw, Megaphone, Edit3 } from 'lucide-react';
import { apiService, handleApiError } from '../../services/api';
import { Streamdown } from 'streamdown';
import EditableCanvasContent from '../editor/EditableCanvasContent';
import MarketingNavigationPanel from './MarketingNavigationPanel';
import MarketingChatPanel from './MarketingChatPanel';

const MarketingCanvas = () => {
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
  const [previousAssets, setPreviousAssets] = useState([]);
  
  // Content State
  const [assetContent, setAssetContent] = useState('');
  const [assetTitle, setAssetTitle] = useState('');
  const [assetType, setAssetType] = useState('one_pager');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAssetId, setCurrentAssetId] = useState(null);
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
  const [selectedAssetType, setSelectedAssetType] = useState('one_pager');

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
      
      if (outcomesData.report) setCurrentReport(outcomesData.report);
      
      // Load previous reports
      const reportsData = await apiService.getUserReports(user.id, user.id);
      setPreviousReports(reportsData || []);
      
      // Load previous assets
      const assetsData = await apiService.getMarketingAssets(currentReportId, user.id);
      setPreviousAssets(assetsData.items || assetsData.assets || []);
      
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
        asset_type: selectedAssetType,
        title,
        custom_instructions: instructions || null,
        selected_outcomes: selectedOutcomes
      };
      
      const response = await apiService.generateMarketingAsset(currentReportId, payload);
      const content = response.item?.content || '';
      
      // Set title and metadata
      setAssetTitle(title);
      setAssetType(selectedAssetType);
      setCurrentAssetId(response.id || response.item?.id);
      setOriginalContent(content);
      setViewingVersion(null);
      setCurrentVersion(1);
      setVersionHistory([]);
      
      // Stream the content
      await simulateStreaming(content);
      
      toast.success('Marketing asset generated successfully!');
      
      // Reload previous assets
      const assetsData = await apiService.getMarketingAssets(currentReportId, user.id);
      setPreviousAssets(assetsData.items || assetsData.assets || []);
      
    } catch (err) {
      toast.error(handleApiError(err).message);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const simulateStreaming = async (content, speed = 'normal') => {
    setAssetContent('');
    const words = content.split(' ');
    
    const delay = speed === 'fast' ? 30 : 50;
    
    for (let i = 0; i < words.length; i++) {
      setAssetContent(prev => prev + (i === 0 ? '' : ' ') + words[i]);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  const handleCopy = () => {
    const fullContent = `${assetTitle}\n\n${assetContent}`;
    navigator.clipboard.writeText(fullContent).then(() => {
      toast.success('Marketing asset copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy content');
    });
  };

  const handleChatSubmit = async (message) => {
    if (!message.trim() || !assetContent || !currentAssetId) {
      if (!currentAssetId) {
        toast.error('Please generate or load a marketing asset first');
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
      const response = await apiService.chatEditMarketingAsset(currentAssetId, {
        user_id: user.id,
        message: message,
        current_content: assetContent
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
        content: `Updating your marketing asset based on: "${message}"`, 
        timestamp: new Date(),
        isThinking: false 
      };
      setChatMessages(prev => prev.slice(0, -1).concat([aiResponse]));
      
      // Stream the updated content
      const updatedContent = response.updated_content;
      setIsStreaming(true);
      setAssetContent('');
      
      await simulateStreaming(updatedContent, 'fast');
      
      setOriginalContent(updatedContent);
      setViewingVersion(null);
      setIsStreaming(false);
      
      // Update AI message to show completion
      const completionMessage = { 
        type: 'ai', 
        content: `✓ Marketing asset updated successfully! Now at version ${response.version || currentVersion + 1}`, 
        timestamp: new Date(),
        isThinking: false 
      };
      setChatMessages(prev => [...prev, completionMessage]);
      
      toast.success('Marketing asset updated to version ' + (response.version || currentVersion + 1));
      
      // Reload assets list
      const assetsData = await apiService.getMarketingAssets(currentReportId, user.id);
      setPreviousAssets(assetsData.items || assetsData.assets || []);
      
    } catch (err) {
      setChatMessages(prev => prev.slice(0, -1));
      toast.error(handleApiError(err).message || 'Failed to process chat request');
    }
  };

  const loadAsset = async (asset) => {
    setAssetTitle(asset.title);
    setAssetContent(asset.content);
    setAssetType(asset.asset_type);
    setOriginalContent(asset.content);
    setCurrentAssetId(asset.id);
    setChatMessages([]);
    setCurrentVersion(asset.current_version || 1);
    setViewingVersion(null);
    
    // Load version history if available
    if (asset.id && user?.id) {
      try {
        const versionsData = await apiService.getMarketingAssetVersions(asset.id, user.id);
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
      setAssetContent(version.content);
      setAssetTitle(version.title || assetTitle);
    } else {
      setViewingVersion(null);
      setAssetContent(originalContent);
    }
  };
  
  const restoreVersion = async (versionNumber) => {
    if (!currentAssetId || !user?.id) return;
    
    try {
      const response = await apiService.restoreMarketingAssetVersion(currentAssetId, versionNumber, user.id);
      
      setAssetContent(response.restored_content);
      setOriginalContent(response.restored_content);
      setCurrentVersion(response.new_version);
      setViewingVersion(null);
      
      const versionsData = await apiService.getMarketingAssetVersions(currentAssetId, user.id);
      setVersionHistory(versionsData.versions || []);
      
      toast.success(`Version ${versionNumber} is now the current version`);
    } catch (err) {
      toast.error('Failed to restore version');
    }
  };

  const getAssetTypeBadge = (type) => {
    const badges = {
      'one_pager': { label: 'One Pager', color: 'bg-blue-100 text-blue-700' },
      'linkedin_post': { label: 'LinkedIn', color: 'bg-purple-100 text-purple-700' },
      'blog': { label: 'Blog', color: 'bg-green-100 text-green-700' },
      'landing_page': { label: 'Landing Page', color: 'bg-yellow-100 text-yellow-700' },
      'press_release': { label: 'Press Release', color: 'bg-red-100 text-red-700' }
    };
    return badges[type] || { label: type, color: 'bg-gray-100 text-gray-700' };
  };

  // Handle inline editing save
  const handleInlineEditSave = async (newContent) => {
    if (!currentAssetId || !user?.id) {
      throw new Error('No marketing asset loaded');
    }

    try {
      // Use the chat edit endpoint with a generic "Direct edit" message
      const response = await apiService.chatEditMarketingAsset(currentAssetId, {
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
      setAssetContent(newContent);
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
            {assetContent && (
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
            <MarketingChatPanel
              messages={chatMessages}
              input={chatInput}
              onInputChange={setChatInput}
              onSubmit={handleChatSubmit}
              disabled={!assetContent || viewingVersion !== null}
              viewingHistoricalVersion={viewingVersion !== null}
            />
          ) : (
            <MarketingNavigationPanel
              currentReport={currentReport}
              previousReports={previousReports}
              previousAssets={previousAssets}
              outcomes={outcomes}
              selectedOutcomes={selectedOutcomes}
              onOutcomeToggle={(idx) => setSelectedOutcomes(prev => 
                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
              )}
              title={title}
              onTitleChange={setTitle}
              instructions={instructions}
              onInstructionsChange={setInstructions}
              assetType={selectedAssetType}
              onAssetTypeChange={setSelectedAssetType}
              onGenerate={handleGenerate}
              onLoadAsset={loadAsset}
              loading={loading}
              navigate={navigate}
            />
          )}
        </div>

        {/* Version History Panel (Overlay) */}
        {showVersionHistory && currentAssetId && (
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
              {assetContent ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                  {assetTitle && (
                    <div className="mb-8 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Megaphone className="w-6 h-6 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">
                          {assetTitle}
                        </h1>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getAssetTypeBadge(assetType).color}`}>
                          {getAssetTypeBadge(assetType).label}
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
                        content={assetContent}
                        onSave={handleInlineEditSave}
                        editable={true}
                        placeholder="Click to edit your marketing asset content..."
                        autoSave={false}
                        showControls={true}
                        className="marketing-content"
                      />
                    ) : (
                      <Streamdown
                        className="marketing-content"
                        parseIncompleteMarkdown={true}
                      >
                        {assetContent}
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
                      <Megaphone className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Your Marketing Asset</h2>
                    <p className="text-gray-600 mb-6">
                      Select an asset type and generate professional marketing content from your POV analysis
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

export default MarketingCanvas;

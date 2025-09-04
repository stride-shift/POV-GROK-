import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { ArrowLeft, Megaphone, RefreshCw, Copy } from 'lucide-react';
import { apiService, handleApiError } from '../services/api';
import OutcomeSelector from '../components/shared/OutcomeSelector';
import { useApp } from '../contexts/AppContext';

const Marketing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reportId } = useParams();
  const { lastCompletedReportId } = useApp();
  const currentReportId = reportId || lastCompletedReportId;

  const [assetType, setAssetType] = useState('one_pager');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);

  const refresh = async () => {
    if (!currentReportId || !user?.id) return;
    setLoading(true);
    try {
      const data = await apiService.getMarketingAssets(currentReportId, user.id);
      setItems(data.items || data.assets || data.marketing_assets || []);
    } catch (err) {
      toast.error(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [currentReportId, user?.id]);

  useEffect(() => {
    const loadOutcomes = async () => {
      if (!currentReportId || !user?.id) return;
      try {
        const data = await apiService.getReportOutcomes(currentReportId, user.id, user.id);
        const loadedOutcomes = data.outcomes || [];
        setOutcomes(loadedOutcomes);
        
        // Auto-select first 2 outcomes
        if (loadedOutcomes.length >= 2 && selectedOutcomes.length === 0) {
          setSelectedOutcomes([0, 1]);
        } else if (loadedOutcomes.length === 1 && selectedOutcomes.length === 0) {
          setSelectedOutcomes([0]);
        }
        
        if (data.report) setCurrentReport(data.report);
      } catch (err) {
        // Non-blocking
      }
    };
    loadOutcomes();
  }, [currentReportId, user?.id]);

  useEffect(() => {
    const loadReports = async () => {
      if (!user?.id) return;
      try {
        const list = await apiService.getUserReports(user.id, user.id);
        setPreviousReports(list || []);
      } catch (err) {}
    };
    loadReports();
  }, [user?.id]);

  const handleGenerate = async () => {
    if (!currentReportId || !user?.id || !title.trim()) {
      toast.error('Report, User, and Title are required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        asset_type: assetType,
        title,
        custom_instructions: instructions || null,
        selected_outcomes: selectedOutcomes
      };
      const res = await apiService.generateMarketingAsset(currentReportId, payload);
      const item = res.item || { title, content: '', asset_type: assetType };
      setGenerated({ title: item.title, content: item.content, assetType: item.asset_type });
      toast.success('Marketing asset generated');
      setTitle(''); setInstructions('');
      await refresh();
    } catch (err) {
      toast.error(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generated) return;
    const text = `${generated.title}\n\n${generated.content}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Marketing asset copied');
    }).catch(() => toast.error('Copy failed'));
  };

  const handleReset = () => {
    setGenerated(null);
    setSelectedOutcomes([]);
    setTitle('');
    setInstructions('');
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center">
          <Button onClick={() => navigate(`/campaigns/${currentReportId || ''}`)} variant="ghost" icon={ArrowLeft}>
            Back to Campaigns
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Megaphone className="w-6 h-6 text-blue-600 mr-2" />
              Marketing Assets
            </h1>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={refresh}>Refresh</Button>
          </div>

          <div className="flex gap-6">
            {/* Left: form + preview */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <OutcomeSelector
                    outcomes={outcomes}
                    selectedIndices={selectedOutcomes}
                    onToggle={(idx)=>setSelectedOutcomes(prev => prev.includes(idx) ? prev.filter(i=>i!==idx) : [...prev, idx])}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={assetType}
                    onChange={(e)=>setAssetType(e.target.value)}
                  >
                    <option value="one_pager">One Pager</option>
                    <option value="linkedin_post">LinkedIn Post</option>
                    <option value="blog">Blog</option>
                    <option value="landing_page">Landing Page</option>
                    <option value="press_release">Press Release</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., POV One-Pager"/>
                  <div className="text-xs text-gray-500 mt-1">
                    Suggested: Solution Brief, Market Advantage, Product Spotlight
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Instructions (optional)</label>
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={4} value={instructions} onChange={(e)=>setInstructions(e.target.value)} placeholder="Tone, audience, CTAs..."/>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <Button onClick={handleGenerate} loading={loading} className="min-w-[200px]">Generate Asset</Button>
                <Button variant="outline" onClick={handleReset}>Reset</Button>
              </div>

              {generated && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                    <Button onClick={handleCopy} icon={Copy} variant="outline" size="sm">Copy</Button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title:</label>
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium text-gray-900">{generated.title}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content:</label>
                    <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">{generated.content}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: reports and previous items */}
            <div className="w-80">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Reports</h3>
                {currentReport && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-500 mb-1">Current Report</div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-900">{currentReport.vendor_name} → {currentReport.target_customer_name}</div>
                      <div className="text-xs text-gray-500">{new Date(currentReport.created_at).toLocaleDateString()}</div>
                      <div className="mt-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/view/${currentReport.id}`)}>View Report</Button>
                        <Button size="sm" className="ml-2" onClick={() => navigate(`/campaigns/${currentReport.id}/marketing`)}>Open Marketing</Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-500 mb-1">Your Previous Reports</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(previousReports || []).map((r) => (
                    <div key={r.id} className="bg-white p-3 rounded border hover:shadow-sm transition cursor-pointer" onClick={() => navigate(`/campaigns/${r.id}/marketing`)}>
                      <div className="text-sm font-medium text-gray-900 truncate">{r.vendor_name} → {r.target_customer_name}</div>
                      <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Previous Assets</h3>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-600">None yet.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => { setGenerated({ title: it.title, content: it.content, assetType: it.asset_type }); setModalItem({ title: it.title, content: it.content, assetType: it.asset_type }); setShowModal(true); }}
                      >
                        <div className="text-sm font-medium text-gray-900 truncate mb-1">{it.title}</div>
                        <div className="text-xs text-gray-500 mb-1">Type: {it.asset_type}</div>
                        <div className="text-xs text-gray-500">{(it.content || '').slice(0, 80)}...</div>
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
    {showModal && modalItem && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Marketing Asset Preview</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${modalItem.title}\n\n${modalItem.content}`); }} icon={Copy}>Copy</Button>
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Close</Button>
            </div>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title:</label>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="font-medium text-gray-900">{modalItem.title}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content:</label>
              <div className="bg-gray-50 p-4 rounded border max-h-80 overflow-y-auto">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">{modalItem.content}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Marketing;



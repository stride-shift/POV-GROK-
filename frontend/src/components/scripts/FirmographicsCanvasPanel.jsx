import React from 'react';
import { Building2, Users, Target, AlertCircle, Lightbulb, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import OrgChart from '../charts/OrgChart';

const FirmographicsCanvasPanel = ({
  firmographics,
  loading = false,
  financialData = null,
  financialLoading = false
}) => {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!firmographics) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer Context Available</h3>
        <p className="text-gray-500 mb-4">
          Generate a sales script first to extract customer firmographics and context information.
        </p>
        <p className="text-sm text-gray-400">
          Customer data will be automatically extracted from your POV report and outcomes analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Row - Company Overview and JTBD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Overview */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Company Overview</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {firmographics.company_name && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company</span>
                <div className="text-lg font-semibold text-gray-900 mt-1">{firmographics.company_name}</div>
              </div>
            )}
            {firmographics.industry && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</span>
                <div className="text-sm text-gray-900 mt-1">{firmographics.industry}</div>
              </div>
            )}
            {firmographics.company_size && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Size</span>
                <div className="text-sm text-gray-900 mt-1">{firmographics.company_size}</div>
              </div>
            )}
            {firmographics.revenue && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</span>
                <div className="text-sm text-gray-900 mt-1">{firmographics.revenue}</div>
              </div>
            )}
            {firmographics.location && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</span>
                <div className="text-sm text-gray-900 mt-1">{firmographics.location}</div>
              </div>
            )}
            {firmographics.business_model && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Model</span>
                <div className="text-sm text-gray-900 mt-1">{firmographics.business_model}</div>
              </div>
            )}
          </div>
          
          {/* Stock Information */}
          {financialLoading ? (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="animate-pulse">
                <div className="h-4 bg-blue-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-blue-200 rounded w-1/3"></div>
              </div>
            </div>
          ) : financialData ? (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Information</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stock Price */}
                <div className="flex items-center gap-3">
                  <div className="font-mono font-bold text-lg text-gray-900">
                    {financialData.ticker}
                  </div>
                  <div className="font-semibold text-xl text-gray-900">
                    ${financialData.current_price}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                    financialData.price_change >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {financialData.price_change >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {financialData.price_change >= 0 ? '+' : ''}{financialData.price_change_percent}%
                  </div>
                </div>
                
                {/* Additional Financial Info */}
                <div className="space-y-1">
                  {financialData.market_cap_formatted && (
                    <div className="text-sm">
                      <span className="text-gray-500">Market Cap:</span>{' '}
                      <span className="font-medium text-gray-900">{financialData.market_cap_formatted}</span>
                    </div>
                  )}
                  {financialData.volume && (
                    <div className="text-sm">
                      <span className="text-gray-500">Volume:</span>{' '}
                      <span className="font-medium text-gray-900">{financialData.volume}</span>
                    </div>
                  )}
                  {financialData.pe_ratio && (
                    <div className="text-sm">
                      <span className="text-gray-500">P/E Ratio:</span>{' '}
                      <span className="font-medium text-gray-900">{financialData.pe_ratio}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 52 Week Range */}
              {(financialData.week_52_low || financialData.week_52_high) && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="text-xs text-gray-500 mb-1">52 Week Range</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">${financialData.week_52_low}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full" 
                        style={{
                          width: `${((financialData.current_price - financialData.week_52_low) / 
                                   (financialData.week_52_high - financialData.week_52_low)) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="font-medium">${financialData.week_52_high}</span>
                  </div>
                </div>
              )}
              
              {/* Last Updated */}
              <div className="mt-2 text-xs text-gray-400">
                Updated: {new Date(financialData.last_updated).toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>

        {/* Jobs To Be Done */}
        {firmographics.primary_jtbd && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-600 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Jobs To Be Done</h3>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Primary JTBD</span>
              <div className="text-lg font-medium text-gray-900 mt-2 mb-4">{firmographics.primary_jtbd}</div>
            </div>
            {firmographics.desired_outcomes && firmographics.desired_outcomes.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Desired Outcomes</span>
                <div className="mt-2 space-y-2">
                  {firmographics.desired_outcomes.slice(0, 4).map((outcome, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-sm text-gray-700">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Middle Row - Pain Points and Personas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pain Points */}
        {firmographics.pain_points && firmographics.pain_points.length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-600 rounded-lg">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Pain Points</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {firmographics.pain_points.slice(0, 5).map((pain, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700">{pain}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organizational Chart */}
        {firmographics.key_personas && firmographics.key_personas.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Organizational Chart</h3>
            </div>
            <OrgChart 
              personas={firmographics.key_personas}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* Bottom Row - Solutions and Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Solutions */}
        {firmographics.current_solutions && firmographics.current_solutions.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Current Solutions</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {firmographics.current_solutions.slice(0, 6).map((solution, idx) => (
                <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                  {solution}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tech Stack */}
        {firmographics.tech_stack && firmographics.tech_stack.length > 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-600 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Tech Stack</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {firmographics.tech_stack.slice(0, 8).map((tech, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buying Context */}
        {(firmographics.buying_process || firmographics.budget_range || firmographics.decision_timeline) && (
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-6 border border-cyan-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Buying Context</h3>
            </div>
            <div className="space-y-3">
              {firmographics.buying_process && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Process</span>
                  <div className="text-sm text-gray-900 mt-1">{firmographics.buying_process}</div>
                </div>
              )}
              {firmographics.budget_range && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</span>
                  <div className="text-sm text-gray-900 mt-1">{firmographics.budget_range}</div>
                </div>
              )}
              {firmographics.decision_timeline && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</span>
                  <div className="text-sm text-gray-900 mt-1">{firmographics.decision_timeline}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirmographicsCanvasPanel;

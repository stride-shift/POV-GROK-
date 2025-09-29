import React from 'react';
import { Building2, Users, Target, AlertCircle, Lightbulb, TrendingUp } from 'lucide-react';

const FirmographicsPanel = ({
  firmographics,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Customer Context</h3>
          </div>
          <p className="text-xs text-gray-600">Loading customer information...</p>
        </div>
        <div className="flex-1 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!firmographics) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Customer Context</h3>
          </div>
          <p className="text-xs text-gray-600">Customer firmographics and context</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-2">No customer context available</p>
            <p className="text-xs text-gray-400">Generate a script first to see customer information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Customer Context</h3>
        </div>
        <p className="text-xs text-gray-600">
          Key information about {firmographics.company_name || 'your customer'}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Company Overview */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-600" />
            <h4 className="font-medium text-sm text-gray-900">Company Overview</h4>
          </div>
          <div className="space-y-2">
            {firmographics.company_name && (
              <div>
                <span className="text-xs font-medium text-gray-500">Company:</span>
                <div className="text-sm text-gray-900">{firmographics.company_name}</div>
              </div>
            )}
            {firmographics.industry && (
              <div>
                <span className="text-xs font-medium text-gray-500">Industry:</span>
                <div className="text-sm text-gray-900">{firmographics.industry}</div>
              </div>
            )}
            {firmographics.company_size && (
              <div>
                <span className="text-xs font-medium text-gray-500">Company Size:</span>
                <div className="text-sm text-gray-900">{firmographics.company_size}</div>
              </div>
            )}
            {firmographics.revenue && (
              <div>
                <span className="text-xs font-medium text-gray-500">Revenue:</span>
                <div className="text-sm text-gray-900">{firmographics.revenue}</div>
              </div>
            )}
            {firmographics.location && (
              <div>
                <span className="text-xs font-medium text-gray-500">Location:</span>
                <div className="text-sm text-gray-900">{firmographics.location}</div>
              </div>
            )}
          </div>
        </div>

        {/* Jobs To Be Done */}
        {firmographics.primary_jtbd && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-green-600" />
              <h4 className="font-medium text-sm text-gray-900">Jobs To Be Done</h4>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500">Primary JTBD:</span>
                <div className="text-sm text-gray-900">{firmographics.primary_jtbd}</div>
              </div>
              {firmographics.desired_outcomes && firmographics.desired_outcomes.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Desired Outcomes:</span>
                  <div className="mt-1 space-y-1">
                    {firmographics.desired_outcomes.slice(0, 3).map((outcome, idx) => (
                      <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-500 text-xs">•</span>
                        <span className="flex-1">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pain Points */}
        {firmographics.pain_points && firmographics.pain_points.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <h4 className="font-medium text-sm text-gray-900">Pain Points</h4>
            </div>
            <div className="space-y-1">
              {firmographics.pain_points.slice(0, 4).map((pain, idx) => (
                <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-red-500 text-xs">•</span>
                  <span className="flex-1">{pain}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Personas */}
        {firmographics.key_personas && firmographics.key_personas.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-sm text-gray-900">Key Personas</h4>
            </div>
            <div className="space-y-3">
              {firmographics.key_personas.slice(0, 3).map((persona, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-900">{persona.role}</div>
                  {persona.name && (
                    <div className="text-xs text-gray-600 mt-1">{persona.name}</div>
                  )}
                  {persona.priorities && persona.priorities.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-gray-500 mb-1">Priorities:</div>
                      <div className="text-xs text-gray-600">
                        {persona.priorities.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Solutions */}
        {firmographics.current_solutions && firmographics.current_solutions.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <h4 className="font-medium text-sm text-gray-900">Current Solutions</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {firmographics.current_solutions.slice(0, 5).map((solution, idx) => (
                <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                  {solution}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buying Context */}
        {(firmographics.buying_process || firmographics.budget_range || firmographics.decision_timeline) && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-sm text-gray-900">Buying Context</h4>
            </div>
            <div className="space-y-2">
              {firmographics.buying_process && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Process:</span>
                  <div className="text-sm text-gray-900">{firmographics.buying_process}</div>
                </div>
              )}
              {firmographics.budget_range && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Budget:</span>
                  <div className="text-sm text-gray-900">{firmographics.budget_range}</div>
                </div>
              )}
              {firmographics.decision_timeline && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Timeline:</span>
                  <div className="text-sm text-gray-900">{firmographics.decision_timeline}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tech Stack */}
        {firmographics.tech_stack && firmographics.tech_stack.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-sm text-gray-900">Technology Stack</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {firmographics.tech_stack.slice(0, 6).map((tech, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirmographicsPanel;

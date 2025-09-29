import React from 'react';
import { Users, Crown, Award, Briefcase, User, ChevronDown } from 'lucide-react';

const OrgChart = ({ personas = [], loading = false }) => {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="h-20 bg-purple-200 rounded-lg w-48"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!personas || personas.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No organizational information available</p>
        <p className="text-xs text-gray-400 mt-1">Personnel data will be extracted from Grok research</p>
      </div>
    );
  }

  // Group personas by organizational level
  const groupPersonasByLevel = (personas) => {
    const levels = {
      'C-Suite': [],
      'VP': [],
      'Director': [],
      'Manager': [],
      'IC': []
    };

    personas.forEach(persona => {
      const level = persona.level || 'IC';
      if (levels[level]) {
        levels[level].push(persona);
      }
    });

    // Only return levels that have personas
    return Object.entries(levels).filter(([_, people]) => people.length > 0);
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'C-Suite': return Crown;
      case 'VP': return Award;
      case 'Director': return Briefcase;
      case 'Manager': return Users;
      case 'IC': return User;
      default: return User;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'C-Suite': return 'from-blue-500 to-purple-600';
      case 'VP': return 'from-green-500 to-blue-500';
      case 'Director': return 'from-orange-500 to-red-500';
      case 'Manager': return 'from-yellow-500 to-orange-500';
      case 'IC': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getInfluenceBadgeColor = (influence) => {
    switch (influence) {
      case 'ultimate': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDecisionPowerBadges = (powers) => {
    const badges = {
      'budget': { icon: '💰', label: 'Budget', color: 'bg-green-50 text-green-700' },
      'technical': { icon: '🔧', label: 'Technical', color: 'bg-blue-50 text-blue-700' },
      'user': { icon: '👥', label: 'User', color: 'bg-purple-50 text-purple-700' },
      'vendor_selection': { icon: '🤝', label: 'Vendor', color: 'bg-orange-50 text-orange-700' },
      'influence': { icon: '⭐', label: 'Influence', color: 'bg-gray-50 text-gray-700' }
    };

    return powers.map(power => badges[power] || badges['influence']);
  };

  const PersonaCard = ({ persona, level }) => {
    const LevelIcon = getLevelIcon(level);
    const levelColor = getLevelColor(level);
    const influenceColor = getInfluenceBadgeColor(persona.influence_level);
    const decisionBadges = getDecisionPowerBadges(persona.decision_power || ['influence']);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Header with avatar and basic info */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${levelColor} flex items-center justify-center`}>
            {persona.name ? (
              <span className="text-white font-bold text-sm">
                {persona.name.split(' ').map(n => n[0]).join('')}
              </span>
            ) : (
              <LevelIcon className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">
              {persona.name || 'Name not available'}
            </div>
            <div className="text-xs text-gray-600">
              {persona.role}
            </div>
            {persona.department && (
              <div className="text-xs text-gray-500">
                {persona.department}
              </div>
            )}
          </div>
        </div>

        {/* Influence and Decision Power */}
        <div className="space-y-2 mb-3">
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${influenceColor}`}>
            {persona.influence_level || 'low'} influence
          </div>
          
          <div className="flex flex-wrap gap-1">
            {decisionBadges.map((badge, idx) => (
              <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${badge.color}`}>
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Reporting relationship */}
        {persona.reports_to && (
          <div className="text-xs text-gray-500 mb-2">
            Reports to: <span className="font-medium">{persona.reports_to}</span>
          </div>
        )}

        {/* Priorities */}
        {persona.priorities && persona.priorities.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-500">Priorities:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {persona.priorities.slice(0, 2).map((priority, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {priority}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const groupedPersonas = groupPersonasByLevel(personas);

  return (
    <div className="org-chart space-y-6">
      {groupedPersonas.map(([level, people], levelIndex) => {
        const LevelIcon = getLevelIcon(level);
        const isLastLevel = levelIndex === groupedPersonas.length - 1;

        return (
          <div key={level} className="org-level">
            {/* Level Header */}
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                <LevelIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">{level}</span>
                <span className="text-xs text-gray-500">({people.length})</span>
              </div>
            </div>

            {/* Personas Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {people.map((persona, idx) => (
                <PersonaCard key={idx} persona={persona} level={level} />
              ))}
            </div>

            {/* Hierarchy Connector */}
            {!isLastLevel && (
              <div className="flex justify-center mb-2">
                <ChevronDown className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>
        );
      })}
      
      {/* Data Source Indicator */}
      <div className="text-center mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {personas.some(p => p.source === 'grok_research') ? (
            <span className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Enhanced with Grok research data
            </span>
          ) : (
            <span>Extracted from POV report context</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default OrgChart;

/**
 * Utility functions to extract firmographics data from reports and outcomes
 */

/**
 * Extract firmographics from report, outcomes, and Grok research data
 * @param {Object} report - The POV report data
 * @param {Array} outcomes - Array of outcome objects
 * @param {Object} grokResearch - Grok research data with detailed intelligence
 * @returns {Object} Firmographics data structure
 */
export const extractFirmographics = (report, outcomes = [], grokResearch = null) => {
  if (!report) return null;

  // Extract basic company information
  const firmographics = {
    company_name: report.target_customer_name || report.customer_name,
    industry: report.industry || extractIndustryFromContent(report),
    company_size: report.company_size || extractCompanySize(report),
    revenue: report.revenue || report.annual_revenue,
    location: report.location || report.headquarters,
    business_model: report.business_model || extractBusinessModel(report),
  };

  // Prioritize Grok research data if available
  if (grokResearch) {
    const grokData = extractFromGrokResearch(grokResearch);
    Object.assign(firmographics, grokData);
  } else {
    // Fallback to outcomes and basic extraction
    if (outcomes && outcomes.length > 0) {
      const jtbdData = extractJTBDFromOutcomes(outcomes);
      Object.assign(firmographics, jtbdData);
    }

    // Extract additional context from report content
    const contextualData = extractContextualData(report);
    Object.assign(firmographics, contextualData);
  }

  return firmographics;
};

/**
 * Extract Jobs To Be Done information from outcomes
 * @param {Array} outcomes - Array of outcome objects
 * @returns {Object} JTBD-related firmographics
 */
const extractJTBDFromOutcomes = (outcomes) => {
  const jtbdData = {
    primary_jtbd: null,
    desired_outcomes: [],
    pain_points: [],
    key_personas: [],
  };

  outcomes.forEach((outcome, index) => {
    // Extract primary JTBD from first outcome or most relevant one
    if (index === 0 || outcome.title?.toLowerCase().includes('job') || outcome.title?.toLowerCase().includes('jtbd')) {
      if (outcome.title && !jtbdData.primary_jtbd) {
        jtbdData.primary_jtbd = outcome.title;
      }
    }

    // Extract desired outcomes
    if (outcome.summary || outcome.content) {
      const content = outcome.summary || outcome.content;
      const outcomes = extractDesiredOutcomes(content);
      jtbdData.desired_outcomes.push(...outcomes);
    }

    // Extract pain points
    if (outcome.summary || outcome.content) {
      const content = outcome.summary || outcome.content;
      const pains = extractPainPoints(content);
      jtbdData.pain_points.push(...pains);
    }

    // Extract personas
    if (outcome.summary || outcome.content) {
      const content = outcome.summary || outcome.content;
      const personas = extractPersonas(content);
      jtbdData.key_personas.push(...personas);
    }
  });

  // Remove duplicates and limit arrays
  jtbdData.desired_outcomes = [...new Set(jtbdData.desired_outcomes)].slice(0, 5);
  jtbdData.pain_points = [...new Set(jtbdData.pain_points)].slice(0, 6);
  jtbdData.key_personas = jtbdData.key_personas.slice(0, 4);

  return jtbdData;
};

/**
 * Extract desired outcomes from text content
 * @param {string} content - Text content to analyze
 * @returns {Array} Array of desired outcomes
 */
const extractDesiredOutcomes = (content) => {
  if (!content) return [];
  
  const outcomes = [];
  const lowerContent = content.toLowerCase();
  
  // Look for outcome indicators
  const outcomePatterns = [
    /wants? to ([^.!?]+)/gi,
    /needs? to ([^.!?]+)/gi,
    /goals? (?:is|are) to ([^.!?]+)/gi,
    /objectives? (?:is|are) to ([^.!?]+)/gi,
    /aims? to ([^.!?]+)/gi,
    /seeks? to ([^.!?]+)/gi,
    /desires? to ([^.!?]+)/gi,
    /hopes? to ([^.!?]+)/gi,
  ];

  outcomePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const outcome = match.replace(pattern, '$1').trim();
        if (outcome.length > 10 && outcome.length < 100) {
          outcomes.push(outcome.charAt(0).toUpperCase() + outcome.slice(1));
        }
      });
    }
  });

  return outcomes.slice(0, 5);
};

/**
 * Extract pain points from text content
 * @param {string} content - Text content to analyze
 * @returns {Array} Array of pain points
 */
const extractPainPoints = (content) => {
  if (!content) return [];
  
  const painPoints = [];
  
  // Look for pain point indicators
  const painPatterns = [
    /struggles? with ([^.!?]+)/gi,
    /challenges? (?:include|are) ([^.!?]+)/gi,
    /problems? (?:include|are) ([^.!?]+)/gi,
    /issues? (?:include|are) ([^.!?]+)/gi,
    /difficulties? (?:include|are) ([^.!?]+)/gi,
    /frustrated (?:by|with) ([^.!?]+)/gi,
    /pain points? (?:include|are) ([^.!?]+)/gi,
    /bottlenecks? (?:include|are) ([^.!?]+)/gi,
  ];

  painPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const pain = match.replace(pattern, '$1').trim();
        if (pain.length > 10 && pain.length < 100) {
          painPoints.push(pain.charAt(0).toUpperCase() + pain.slice(1));
        }
      });
    }
  });

  return painPoints.slice(0, 6);
};

/**
 * Extract personas from text content
 * @param {string} content - Text content to analyze
 * @returns {Array} Array of persona objects
 */
const extractPersonas = (content) => {
  if (!content) return [];
  
  const personas = [];
  
  // Common business roles
  const rolePatterns = [
    /(?:VP|Vice President) (?:of )?([A-Z][a-z]+)/gi,
    /(?:Chief|C[A-Z]O) ([A-Z][a-z]+)/gi,
    /([A-Z][a-z]+) (?:Manager|Director|Lead)/gi,
    /Head of ([A-Z][a-z]+)/gi,
  ];

  rolePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const role = match.trim();
        if (role.length < 50) {
          personas.push({
            role: role,
            priorities: extractPersonaPriorities(content, role)
          });
        }
      });
    }
  });

  return personas.slice(0, 4);
};

/**
 * Extract priorities for a specific persona
 * @param {string} content - Text content to analyze
 * @param {string} role - The persona role
 * @returns {Array} Array of priorities
 */
const extractPersonaPriorities = (content, role) => {
  // This is a simplified implementation
  // In a real scenario, you might use more sophisticated NLP
  const priorities = [];
  
  if (role.toLowerCase().includes('sales')) {
    priorities.push('Increase revenue', 'Improve conversion rates');
  } else if (role.toLowerCase().includes('marketing')) {
    priorities.push('Generate leads', 'Brand awareness');
  } else if (role.toLowerCase().includes('operations')) {
    priorities.push('Efficiency', 'Cost reduction');
  } else if (role.toLowerCase().includes('technology') || role.toLowerCase().includes('it')) {
    priorities.push('System reliability', 'Security');
  }

  return priorities.slice(0, 3);
};

/**
 * Extract industry from report content if not explicitly provided
 * @param {Object} report - The report object
 * @returns {string|null} Extracted industry
 */
const extractIndustryFromContent = (report) => {
  if (!report.summary && !report.description) return null;
  
  const content = (report.summary || report.description || '').toLowerCase();
  
  const industries = [
    'technology', 'software', 'saas', 'fintech', 'healthcare', 'finance',
    'manufacturing', 'retail', 'e-commerce', 'education', 'media',
    'telecommunications', 'automotive', 'energy', 'real estate'
  ];

  for (const industry of industries) {
    if (content.includes(industry)) {
      return industry.charAt(0).toUpperCase() + industry.slice(1);
    }
  }

  return null;
};

/**
 * Extract company size from report content
 * @param {Object} report - The report object
 * @returns {string|null} Extracted company size
 */
const extractCompanySize = (report) => {
  if (!report.summary && !report.description) return null;
  
  const content = (report.summary || report.description || '').toLowerCase();
  
  const sizePatterns = [
    /(\d+[-–]\d+)\s*employees/i,
    /(\d+)\+?\s*employees/i,
    /(startup|small|medium|large|enterprise)/i,
  ];

  for (const pattern of sizePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

/**
 * Extract business model from report content
 * @param {Object} report - The report object
 * @returns {string|null} Extracted business model
 */
const extractBusinessModel = (report) => {
  if (!report.summary && !report.description) return null;
  
  const content = (report.summary || report.description || '').toLowerCase();
  
  const models = ['b2b', 'b2c', 'saas', 'marketplace', 'subscription', 'freemium'];
  
  for (const model of models) {
    if (content.includes(model)) {
      return model.toUpperCase();
    }
  }

  return null;
};

/**
 * Extract additional contextual data from report
 * @param {Object} report - The report object
 * @returns {Object} Additional firmographics data
 */
const extractContextualData = (report) => {
  const contextualData = {
    current_solutions: [],
    tech_stack: [],
    buying_process: null,
    budget_range: null,
    decision_timeline: null,
  };

  if (report.summary || report.description) {
    const content = (report.summary || report.description || '').toLowerCase();
    
    // Extract current solutions/competitors
    const solutionPatterns = [
      /currently (?:using|uses) ([^.!?]+)/gi,
      /existing (?:solution|system|tool) (?:is|includes) ([^.!?]+)/gi,
      /competitors? (?:include|are) ([^.!?]+)/gi,
    ];

    solutionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const solution = match.replace(pattern, '$1').trim();
          if (solution.length < 50) {
            contextualData.current_solutions.push(solution);
          }
        });
      }
    });

    // Extract common tech stack items
    const techKeywords = ['salesforce', 'hubspot', 'slack', 'microsoft', 'google', 'aws', 'azure'];
    techKeywords.forEach(tech => {
      if (content.includes(tech)) {
        contextualData.tech_stack.push(tech.charAt(0).toUpperCase() + tech.slice(1));
      }
    });
  }

  return contextualData;
};

/**
 * Extract firmographics from Grok research data
 * @param {Object} grokResearch - Grok research data
 * @returns {Object} Enhanced firmographics data
 */
const extractFromGrokResearch = (grokResearch) => {
  const grokData = {
    primary_jtbd: null,
    desired_outcomes: [],
    pain_points: [],
    key_personas: [],
    current_solutions: [],
    tech_stack: [],
    buying_process: null,
    budget_range: null,
    decision_timeline: null,
  };

  // Extract from different Grok research sections
  if (grokResearch.key_personnel_stakeholders) {
    grokData.key_personas = parseGrokPersonnel(grokResearch.key_personnel_stakeholders);
  }

  if (grokResearch.pain_points_challenges) {
    grokData.pain_points = parseGrokPainPoints(grokResearch.pain_points_challenges);
  }

  if (grokResearch.business_capabilities) {
    const capabilities = parseGrokCapabilities(grokResearch.business_capabilities);
    grokData.current_solutions = capabilities.solutions || [];
    grokData.primary_jtbd = capabilities.primary_jtbd;
  }

  if (grokResearch.technology_infrastructure) {
    grokData.tech_stack = parseGrokTechStack(grokResearch.technology_infrastructure);
  }

  if (grokResearch.growth_opportunities) {
    grokData.desired_outcomes = parseGrokGrowthOpportunities(grokResearch.growth_opportunities);
  }

  if (grokResearch.company_overview) {
    const buyingContext = parseGrokBuyingContext(grokResearch.company_overview);
    Object.assign(grokData, buyingContext);
  }

  return grokData;
};

/**
 * Parse Grok personnel data into structured personas with org chart info
 * @param {string} personnelText - Raw personnel text from Grok research
 * @returns {Array} Array of structured persona objects
 */
const parseGrokPersonnel = (personnelText) => {
  if (!personnelText) return [];

  const personas = [];
  
  // Split into sentences and paragraphs for analysis
  const sentences = personnelText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  for (const sentence of sentences) {
    const persona = extractPersonaFromSentence(sentence.trim());
    if (persona) {
      personas.push(persona);
    }
  }

  // Remove duplicates and enhance with hierarchy
  const uniquePersonas = deduplicatePersonas(personas);
  return enhanceWithHierarchy(uniquePersonas);
};

/**
 * Extract persona information from a single sentence
 * @param {string} sentence - Sentence to analyze
 * @returns {Object|null} Persona object or null
 */
const extractPersonaFromSentence = (sentence) => {
  const lowerSentence = sentence.toLowerCase();
  
  // Look for name patterns: "John Smith is the VP" or "VP of Sales John Smith"
  const nameRolePatterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+)(?:,|\s+)(?:is the|serves as|works as)?\s*([A-Z][^,]+?)(?:\s+and|\s+who|\.|,|$)/gi,
    /([A-Z][^,]+?)\s+([A-Z][a-z]+ [A-Z][a-z]+)(?:\s+and|\s+who|\.|,|$)/gi,
  ];

  for (const pattern of nameRolePatterns) {
    const matches = [...sentence.matchAll(pattern)];
    for (const match of matches) {
      let name, role;
      
      // Determine which group is name vs role based on pattern
      if (match[1] && match[2]) {
        // Check if first group looks like a name (two capitalized words)
        if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(match[1].trim())) {
          name = match[1].trim();
          role = match[2].trim();
        } else {
          role = match[1].trim();
          name = match[2].trim();
        }

        // Validate we have a reasonable name and role
        if (name && role && name.length < 50 && role.length < 100) {
          return {
            name: name,
            role: role,
            level: detectPersonaLevel(role),
            department: extractDepartment(role),
            influence_level: calculateInfluenceLevel(role),
            decision_power: identifyDecisionPower(role, sentence),
            reports_to: extractReportsTo(sentence),
            priorities: extractPriorities(sentence),
            source: 'grok_research'
          };
        }
      }
    }
  }

  return null;
};

/**
 * Detect organizational level from role title
 * @param {string} role - Role title
 * @returns {string} Organizational level
 */
const detectPersonaLevel = (role) => {
  const lowerRole = role.toLowerCase();
  
  if (lowerRole.includes('ceo') || lowerRole.includes('chief') || lowerRole.includes('president')) {
    return 'C-Suite';
  } else if (lowerRole.includes('vp') || lowerRole.includes('vice president')) {
    return 'VP';
  } else if (lowerRole.includes('director') || lowerRole.includes('head of')) {
    return 'Director';
  } else if (lowerRole.includes('manager') || lowerRole.includes('lead')) {
    return 'Manager';
  } else {
    return 'IC';
  }
};

/**
 * Calculate influence level based on role and context
 * @param {string} role - Role title
 * @returns {string} Influence level
 */
const calculateInfluenceLevel = (role) => {
  const level = detectPersonaLevel(role);
  
  switch (level) {
    case 'C-Suite': return 'ultimate';
    case 'VP': return 'high';
    case 'Director': return 'medium';
    case 'Manager': return 'medium';
    case 'IC': return 'low';
    default: return 'low';
  }
};

/**
 * Identify decision-making power from role and context
 * @param {string} role - Role title
 * @param {string} context - Surrounding context
 * @returns {Array} Array of decision powers
 */
const identifyDecisionPower = (role, context) => {
  const powers = [];
  const lowerRole = role.toLowerCase();
  const lowerContext = context.toLowerCase();
  
  // Budget authority indicators
  if (lowerRole.includes('vp') || lowerRole.includes('chief') || 
      lowerContext.includes('budget') || lowerContext.includes('purchase')) {
    powers.push('budget');
  }
  
  // Technical authority indicators
  if (lowerRole.includes('cto') || lowerRole.includes('it') || lowerRole.includes('technology') ||
      lowerContext.includes('technical') || lowerContext.includes('system')) {
    powers.push('technical');
  }
  
  // User authority indicators
  if (lowerRole.includes('manager') || lowerRole.includes('lead') ||
      lowerContext.includes('team') || lowerContext.includes('user')) {
    powers.push('user');
  }

  // Vendor selection authority
  if (lowerContext.includes('vendor') || lowerContext.includes('procurement') ||
      lowerContext.includes('selection') || lowerContext.includes('evaluation')) {
    powers.push('vendor_selection');
  }

  return powers.length > 0 ? powers : ['influence'];
};

/**
 * Extract reporting relationships from context
 * @param {string} sentence - Sentence containing relationship info
 * @returns {string|null} Person this role reports to
 */
const extractReportsTo = (sentence) => {
  const lowerSentence = sentence.toLowerCase();
  
  // Look for reporting patterns
  const reportingPatterns = [
    /reports?\s+(?:directly\s+)?to\s+(?:the\s+)?([A-Z][^,]+?)(?:\s+and|\s+who|\.|,|$)/gi,
    /under\s+(?:the\s+)?([A-Z][^,]+?)(?:\s+and|\s+who|\.|,|$)/gi,
  ];

  for (const pattern of reportingPatterns) {
    const match = sentence.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

/**
 * Extract priorities from context
 * @param {string} sentence - Sentence containing priority info
 * @returns {Array} Array of priorities
 */
const extractPriorities = (sentence) => {
  const priorities = [];
  const lowerSentence = sentence.toLowerCase();
  
  // Common priority indicators
  const priorityKeywords = [
    'revenue', 'growth', 'efficiency', 'cost reduction', 'productivity',
    'quality', 'customer satisfaction', 'innovation', 'compliance',
    'security', 'scalability', 'automation'
  ];

  priorityKeywords.forEach(keyword => {
    if (lowerSentence.includes(keyword)) {
      priorities.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });

  return priorities.slice(0, 3); // Limit to top 3
};

/**
 * Remove duplicate personas and consolidate information
 * @param {Array} personas - Array of persona objects
 * @returns {Array} Deduplicated personas
 */
const deduplicatePersonas = (personas) => {
  const seen = new Map();
  
  personas.forEach(persona => {
    const key = persona.name || persona.role;
    if (seen.has(key)) {
      // Merge information if duplicate found
      const existing = seen.get(key);
      existing.priorities = [...new Set([...existing.priorities, ...persona.priorities])];
      existing.decision_power = [...new Set([...existing.decision_power, ...persona.decision_power])];
    } else {
      seen.set(key, persona);
    }
  });

  return Array.from(seen.values());
};

/**
 * Enhance personas with hierarchical relationships
 * @param {Array} personas - Array of persona objects
 * @returns {Array} Enhanced personas with hierarchy
 */
const enhanceWithHierarchy = (personas) => {
  // Group by organizational level
  const hierarchy = {
    'C-Suite': [],
    'VP': [],
    'Director': [],
    'Manager': [],
    'IC': []
  };

  personas.forEach(persona => {
    const level = persona.level || 'IC';
    if (hierarchy[level]) {
      hierarchy[level].push(persona);
    }
  });

  // Add hierarchy context to each persona
  return personas.map(persona => ({
    ...persona,
    hierarchy_context: hierarchy,
    subordinates: findSubordinates(persona, personas),
    peers: findPeers(persona, personas)
  }));
};

/**
 * Find subordinates for a persona
 * @param {Object} persona - Persona to find subordinates for
 * @param {Array} allPersonas - All personas
 * @returns {Array} Array of subordinates
 */
const findSubordinates = (persona, allPersonas) => {
  return allPersonas.filter(p => 
    p.reports_to && (
      p.reports_to.toLowerCase().includes(persona.name?.toLowerCase()) ||
      p.reports_to.toLowerCase().includes(persona.role?.toLowerCase())
    )
  );
};

/**
 * Find peers for a persona
 * @param {Object} persona - Persona to find peers for
 * @param {Array} allPersonas - All personas
 * @returns {Array} Array of peers
 */
const findPeers = (persona, allPersonas) => {
  return allPersonas.filter(p => 
    p.level === persona.level && 
    p.department === persona.department &&
    p.name !== persona.name
  );
};

/**
 * Parse Grok pain points data
 * @param {string} painPointsText - Pain points text from Grok
 * @returns {Array} Array of pain points
 */
const parseGrokPainPoints = (painPointsText) => {
  if (!painPointsText) return [];
  
  const painPoints = [];
  
  // Split by common separators and extract pain points
  const lines = painPointsText.split(/[.!?\n•-]+/).filter(line => line.trim().length > 10);
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 150) {
      // Clean up and capitalize
      const cleanedPain = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      painPoints.push(cleanedPain);
    }
  });

  return painPoints.slice(0, 6);
};

/**
 * Parse Grok capabilities for solutions and JTBD
 * @param {string} capabilitiesText - Capabilities text from Grok
 * @returns {Object} Capabilities data
 */
const parseGrokCapabilities = (capabilitiesText) => {
  if (!capabilitiesText) return { solutions: [], primary_jtbd: null };
  
  const solutions = [];
  let primary_jtbd = null;
  
  // Extract current solutions/tools mentioned
  const solutionPatterns = [
    /(?:using|uses|implements|deployed|utilizes)\s+([A-Z][^,\.]+)/gi,
    /(?:with|via|through)\s+([A-Z][^,\.]+)/gi,
  ];

  solutionPatterns.forEach(pattern => {
    const matches = [...capabilitiesText.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1] && match[1].length < 50) {
        solutions.push(match[1].trim());
      }
    });
  });

  // Extract primary JTBD from capabilities
  const jtbdPatterns = [
    /(?:aims? to|seeks? to|wants? to|needs? to)\s+([^.!?]+)/gi,
    /(?:goal|objective|mission)\s+(?:is|are)\s+to\s+([^.!?]+)/gi,
  ];

  for (const pattern of jtbdPatterns) {
    const match = capabilitiesText.match(pattern);
    if (match && match[1] && !primary_jtbd) {
      primary_jtbd = match[1].trim();
      break;
    }
  }

  return {
    solutions: [...new Set(solutions)].slice(0, 5),
    primary_jtbd: primary_jtbd
  };
};

/**
 * Parse Grok technology stack information
 * @param {string} techText - Technology text from Grok
 * @returns {Array} Array of technologies
 */
const parseGrokTechStack = (techText) => {
  if (!techText) return [];
  
  const technologies = [];
  
  // Common technology names to look for
  const techKeywords = [
    'Salesforce', 'HubSpot', 'Microsoft', 'Google', 'AWS', 'Azure', 'Slack',
    'Zoom', 'Teams', 'Office 365', 'SharePoint', 'SAP', 'Oracle', 'Workday',
    'Tableau', 'Power BI', 'Snowflake', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Docker', 'Kubernetes', 'Jenkins', 'GitHub', 'GitLab', 'Jira', 'Confluence'
  ];

  techKeywords.forEach(tech => {
    if (techText.toLowerCase().includes(tech.toLowerCase())) {
      technologies.push(tech);
    }
  });

  return [...new Set(technologies)].slice(0, 8);
};

/**
 * Parse Grok growth opportunities for desired outcomes
 * @param {string} growthText - Growth opportunities text from Grok
 * @returns {Array} Array of desired outcomes
 */
const parseGrokGrowthOpportunities = (growthText) => {
  if (!growthText) return [];
  
  const outcomes = [];
  
  // Extract growth-related outcomes
  const lines = growthText.split(/[.!?\n•-]+/).filter(line => line.trim().length > 15);
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 15 && trimmed.length < 120) {
      outcomes.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
    }
  });

  return outcomes.slice(0, 5);
};

/**
 * Parse buying context from company overview
 * @param {string} overviewText - Company overview text from Grok
 * @returns {Object} Buying context data
 */
const parseGrokBuyingContext = (overviewText) => {
  if (!overviewText) return {};
  
  const context = {};
  const lowerText = overviewText.toLowerCase();
  
  // Extract budget information
  const budgetPatterns = [
    /budget[s]?\s+(?:of|around|approximately)\s+\$?([0-9]+[kmb]?)/gi,
    /\$([0-9,]+(?:\.[0-9]+)?[kmb]?)\s+(?:budget|annually|per year)/gi,
  ];

  for (const pattern of budgetPatterns) {
    const match = overviewText.match(pattern);
    if (match && match[1]) {
      context.budget_range = `$${match[1]}`;
      break;
    }
  }

  // Extract decision timeline
  const timelinePatterns = [
    /(?:decision|timeline|process).*?([0-9]+\s*(?:months?|weeks?|days?))/gi,
    /(?:within|over|in)\s+([0-9]+\s*(?:months?|weeks?))/gi,
  ];

  for (const pattern of timelinePatterns) {
    const match = overviewText.match(pattern);
    if (match && match[1]) {
      context.decision_timeline = match[1];
      break;
    }
  }

  // Extract buying process
  if (lowerText.includes('committee') || lowerText.includes('team decision')) {
    context.buying_process = 'Committee decision';
  } else if (lowerText.includes('individual') || lowerText.includes('single decision')) {
    context.buying_process = 'Individual decision maker';
  } else if (lowerText.includes('consensus') || lowerText.includes('approval')) {
    context.buying_process = 'Consensus-based approval';
  }

  return context;
};

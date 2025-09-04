// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://127.0.0.1:8081',
  API_KEY: 'agents-in-the-field',
  TIMEOUT: 300000, // 5 minutes
};

// User Configuration (will be set dynamically from auth)
export const USER_CONFIG = {
  USER_ID: null, // This will be set from the authenticated user
};

// Report Status Constants
export const REPORT_STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  TITLES_GENERATED: 'titles_generated',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Workflow Steps
export const WORKFLOW_STEPS = {
  FORM: 1,
  TITLES: 2,
  OUTCOMES: 3,
};

// Step Labels
export const STEP_LABELS = {
  [WORKFLOW_STEPS.FORM]: 'Input Details',
  [WORKFLOW_STEPS.TITLES]: 'Select Outcomes',
  [WORKFLOW_STEPS.OUTCOMES]: 'View Analysis',
};

// Model Options
export const MODEL_OPTIONS = [
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Fast)' },
];

// Default Form Values
export const DEFAULT_FORM_VALUES = {
  vendor_name: '',
  vendor_url: '',
  vendor_services: '',
  target_customer_name: '',
  target_customer_url: '',
  role_names: '',
  linkedin_urls: '',
  role_context: '',
  additional_context: '',
  num_outcomes: 15,
  model_name: 'gpt-4.1-mini',
  use_grok_research: false,
};

// Example Data (for demo/testing)
export const EXAMPLE_DATA = {
  vendor_name: 'StrideShift',
  vendor_url: 'https://www.strideshift.ai/',
  vendor_services: 'AI-powered workforce optimization platform that helps organizations improve employee productivity, reduce turnover, and enhance team performance through predictive analytics and personalized recommendations',
  target_customer_name: 'Netflix',
  target_customer_url: 'https://www.netflix.com',
  role_names: 'Head of People Analytics, VP of Engineering, Director of Content Operations',
  linkedin_urls: 'https://www.linkedin.com/in/netflix-people-analytics, https://www.linkedin.com/in/netflix-engineering-vp',
  role_context: 'Technology and content leadership team focused on scaling global operations, optimizing engineering productivity, and managing large distributed teams across multiple time zones',
  additional_context: 'Netflix operates with a high-performance culture and needs to maintain engineering velocity while scaling content production globally. Focus on data-driven decision making for workforce optimization.',
  num_outcomes: 15,
  model_name: 'gpt-4.1-mini',
  use_grok_research: true,
};

// Validation Rules - Only names required as requested
export const VALIDATION_RULES = {
  vendor_name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  target_customer_name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  num_outcomes: {
    required: true,
    min: 1,
    max: 20,
  },
};

// UI Constants
export const UI_CONSTANTS = {
  MAX_TITLE_LENGTH: 150,
  MAX_OUTCOME_PREVIEW_LENGTH: 200,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error - please check your connection',
  SERVER_ERROR: 'Server error occurred',
  VALIDATION_ERROR: 'Please check your input and try again',
  GENERATION_FAILED: 'Failed to generate content. Please try again.',
  EXPORT_FAILED: 'Failed to export report. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  TITLES_GENERATED: 'Titles generated successfully!',
  SELECTION_UPDATED: 'Selection updated successfully!',
  OUTCOMES_GENERATED: 'Analysis generated successfully!',
  REPORT_EXPORTED: 'Report exported successfully!',
  HEALTH_CHECK_PASSED: 'API connection successful!',
};

// Loading Messages
export const LOADING_MESSAGES = {
  GENERATING_TITLES: 'Generating outcome titles...',
  UPDATING_SELECTION: 'Updating selection...',
  GENERATING_OUTCOMES: 'Generating detailed analysis...',
  EXPORTING_REPORT: 'Preparing report for download...',
  CHECKING_HEALTH: 'Checking API connection...',
};

// File Export Constants
export const EXPORT_CONFIG = {
  DOCX_FILENAME: (vendorName, customerName) => {
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${vendorName}_${customerName}_POV_Report_${currentDate}.docx`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  },
  MAX_FILENAME_LENGTH: 100,
};

export default {
  API_CONFIG,
  USER_CONFIG,
  REPORT_STATUS,
  WORKFLOW_STEPS,
  STEP_LABELS,
  MODEL_OPTIONS,
  DEFAULT_FORM_VALUES,
  EXAMPLE_DATA,
  VALIDATION_RULES,
  UI_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LOADING_MESSAGES,
  EXPORT_CONFIG,
}; 
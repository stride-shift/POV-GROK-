import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { WORKFLOW_STEPS, REPORT_STATUS } from '../services/constants';

// Initial state
const initialState = {
  // Current workflow state
  currentStep: WORKFLOW_STEPS.FORM,
  completedSteps: [],
  
  // Report data
  reportData: {
    reportId: null,
    formData: null,
    titles: [],
    selectedIndices: [],
    outcomes: [],
    summary: null,
    status: REPORT_STATUS.IDLE,
  },
  
  // Loading states
  loading: {
    generatingTitles: false,
    updatingSelection: false,
    generatingOutcomes: false,
    exporting: false,
    regenerating: false,
  },
  
  // Error state
  error: null,
  
  // Navigation state
  lastCompletedReportId: null,
  recentReports: [], // Array of recent report IDs and basic info
};

// Action types
const ActionTypes = {
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  SET_COMPLETED_STEPS: 'SET_COMPLETED_STEPS',
  SET_REPORT_DATA: 'SET_REPORT_DATA',
  UPDATE_REPORT_DATA: 'UPDATE_REPORT_DATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  RESET_WORKFLOW: 'RESET_WORKFLOW',
  SET_LAST_COMPLETED_REPORT: 'SET_LAST_COMPLETED_REPORT',
  ADD_RECENT_REPORT: 'ADD_RECENT_REPORT',
  SET_RECENT_REPORTS: 'SET_RECENT_REPORTS',
  RESTORE_STATE: 'RESTORE_STATE',
  LOAD_EXISTING_REPORT: 'LOAD_EXISTING_REPORT',
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_CURRENT_STEP:
      return { ...state, currentStep: action.payload };
      
    case ActionTypes.SET_COMPLETED_STEPS:
      return { ...state, completedSteps: action.payload };
      
    case ActionTypes.SET_REPORT_DATA:
      return { ...state, reportData: action.payload };
      
    case ActionTypes.UPDATE_REPORT_DATA:
      return { 
        ...state, 
        reportData: { ...state.reportData, ...action.payload } 
      };
      
    case ActionTypes.SET_LOADING:
      return { 
        ...state, 
        loading: { ...state.loading, ...action.payload } 
      };
      
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
      
    case ActionTypes.RESET_WORKFLOW:
      console.log('🔄 RESET_WORKFLOW reducer - before reset:', {
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        reportId: state.reportData.reportId
      });
      const resetState = {
        ...state,
        currentStep: WORKFLOW_STEPS.FORM,
        completedSteps: [],
        reportData: {
          reportId: null,
          formData: null,
          titles: [],
          selectedIndices: [],
          outcomes: [],
          summary: null,
          status: REPORT_STATUS.IDLE,
        },
        loading: {
          generatingTitles: false,
          updatingSelection: false,
          generatingOutcomes: false,
          exporting: false,
          regenerating: false,
        },
        error: null,
      };
      console.log('✅ RESET_WORKFLOW reducer - after reset:', {
        currentStep: resetState.currentStep,
        completedSteps: resetState.completedSteps,
        reportId: resetState.reportData.reportId
      });
      return resetState;
      
    case ActionTypes.SET_LAST_COMPLETED_REPORT:
      return { ...state, lastCompletedReportId: action.payload };
      
    case ActionTypes.ADD_RECENT_REPORT:
      const newReport = action.payload;
      const updatedReports = [
        newReport,
        ...state.recentReports.filter(r => r.id !== newReport.id)
      ].slice(0, 10); // Keep only last 10 reports
      return { ...state, recentReports: updatedReports };
      
    case ActionTypes.SET_RECENT_REPORTS:
      return { ...state, recentReports: action.payload };
      
    case ActionTypes.RESTORE_STATE:
      return { ...state, ...action.payload };
      
    case ActionTypes.LOAD_EXISTING_REPORT:
      const { reportData, step, completedSteps } = action.payload;
      return {
        ...state,
        currentStep: step,
        completedSteps: completedSteps || [],
        reportData: reportData,
        error: null,
      };
      
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Storage key
const STORAGE_KEY = 'pov-analysis-app-state';

// Context provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Only restore certain parts of the state, not loading states
        const stateToRestore = {
          currentStep: parsedState.currentStep || WORKFLOW_STEPS.FORM,
          completedSteps: parsedState.completedSteps || [],
          reportData: parsedState.reportData || initialState.reportData,
          lastCompletedReportId: parsedState.lastCompletedReportId || null,
          recentReports: parsedState.recentReports || [],
        };
        dispatch({ type: ActionTypes.RESTORE_STATE, payload: stateToRestore });
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
    }
  }, []);

  // Save state to localStorage with manual trigger to avoid loops
  const saveToLocalStorage = useCallback(() => {
    try {
      const stateToSave = {
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        reportData: state.reportData,
        lastCompletedReportId: state.lastCompletedReportId,
        recentReports: state.recentReports,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  }, [state.currentStep, state.completedSteps, state.reportData, state.lastCompletedReportId, state.recentReports]);

  // Save to localStorage when specific actions occur (not on every state change)
  useEffect(() => {
    // Only save when there are meaningful changes, not on every render
    if (state.currentStep !== WORKFLOW_STEPS.FORM || state.reportData.reportId) {
      const timeoutId = setTimeout(saveToLocalStorage, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [state.currentStep, state.reportData.reportId, saveToLocalStorage]);

  // Action creators
  const actions = {
    setCurrentStep: (step) => {
      dispatch({ type: ActionTypes.SET_CURRENT_STEP, payload: step });
    },
    
    setCompletedSteps: (steps) => {
      dispatch({ type: ActionTypes.SET_COMPLETED_STEPS, payload: steps });
    },
    
    setReportData: (data) => {
      dispatch({ type: ActionTypes.SET_REPORT_DATA, payload: data });
    },
    
    updateReportData: (updates) => {
      dispatch({ type: ActionTypes.UPDATE_REPORT_DATA, payload: updates });
    },
    
    setLoading: (loadingUpdates) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loadingUpdates });
    },
    
    setError: (error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    },
    
    resetWorkflow: () => {
      console.log('🔄 Resetting workflow - clearing all state and localStorage');
      dispatch({ type: ActionTypes.RESET_WORKFLOW });
      // Clear localStorage when resetting workflow
      try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ localStorage cleared successfully');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    },
    
    setLastCompletedReport: (reportId) => {
      dispatch({ type: ActionTypes.SET_LAST_COMPLETED_REPORT, payload: reportId });
    },
    
    addRecentReport: (reportInfo) => {
      dispatch({ type: ActionTypes.ADD_RECENT_REPORT, payload: reportInfo });
    },
    
    setRecentReports: (reports) => {
      dispatch({ type: ActionTypes.SET_RECENT_REPORTS, payload: reports });
    },
    
    // Convenience method to complete a workflow step
    completeStep: (step) => {
      const currentCompleted = state.completedSteps;
      if (!currentCompleted.includes(step)) {
        dispatch({ 
          type: ActionTypes.SET_COMPLETED_STEPS, 
          payload: [...currentCompleted, step] 
        });
      }
    },
    
    // Method to mark report as completed and add to recent reports
    completeReport: (reportId, reportInfo) => {
      dispatch({ type: ActionTypes.SET_LAST_COMPLETED_REPORT, payload: reportId });
      dispatch({ type: ActionTypes.ADD_RECENT_REPORT, payload: {
        id: reportId,
        ...reportInfo,
        completedAt: new Date().toISOString()
      }});
    },
    
    // Method to load an existing report for editing
    loadExistingReport: (reportData, step, completedSteps) => {
      dispatch({ 
        type: ActionTypes.LOAD_EXISTING_REPORT, 
        payload: { reportData, step, completedSteps } 
      });
    },
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext; 
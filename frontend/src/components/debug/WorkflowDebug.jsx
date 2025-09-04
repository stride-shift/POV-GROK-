import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { WORKFLOW_STEPS } from '../../services/constants';

const WorkflowDebug = () => {
  const { 
    currentStep, 
    completedSteps, 
    reportData 
  } = useApp();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Workflow Debug</h4>
      <div className="space-y-1">
        <div>Current Step: {currentStep}</div>
        <div>Completed Steps: [{completedSteps.join(', ')}]</div>
        <div>Report ID: {reportData.reportId ? reportData.reportId.slice(-8) : 'None'}</div>
        <div>Has Form Data: {reportData.formData ? 'Yes' : 'No'}</div>
        <div>Titles Count: {reportData.titles?.length || 0}</div>
        <div>Selected Count: {reportData.selectedIndices?.length || 0}</div>
        <div>Outcomes Count: {reportData.outcomes?.length || 0}</div>
        <div>Status: {reportData.status}</div>
      </div>
    </div>
  );
};

export default WorkflowDebug; 
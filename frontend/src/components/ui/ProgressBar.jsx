import React from 'react';
import { Check } from 'lucide-react';
import { WORKFLOW_STEPS, STEP_LABELS } from '../../services/constants';

const ProgressBar = ({ currentStep, completedSteps = [] }) => {
  const steps = [
    WORKFLOW_STEPS.FORM,
    WORKFLOW_STEPS.TITLES,
    WORKFLOW_STEPS.OUTCOMES,
  ];

  const getStepStatus = (step) => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    if (step < currentStep) return 'completed';
    return 'upcoming';
  };

  const getStepClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 text-white border-green-600';
      case 'current':
        return 'bg-blue-600 text-white border-blue-600';
      case 'upcoming':
        return 'bg-gray-100 text-gray-400 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-400 border-gray-300';
    }
  };

  const getConnectorClasses = (stepIndex) => {
    const nextStep = steps[stepIndex + 1];
    if (!nextStep) return '';
    
    const nextStatus = getStepStatus(nextStep);
    return nextStatus === 'completed' || nextStatus === 'current' 
      ? 'bg-green-600' 
      : 'bg-gray-300';
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const isLast = index === steps.length - 1;

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center
                    transition-all duration-300 ease-in-out
                    ${getStepClasses(status)}
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step}</span>
                  )}
                </div>
                
                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p className={`
                    text-xs font-medium
                    ${status === 'current' ? 'text-blue-600' : 
                      status === 'completed' ? 'text-green-600' : 'text-gray-400'}
                  `}>
                    {STEP_LABELS[step]}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 mx-4">
                  <div
                    className={`
                      h-1 rounded-full transition-all duration-300 ease-in-out
                      ${getConnectorClasses(index)}
                    `}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar; 
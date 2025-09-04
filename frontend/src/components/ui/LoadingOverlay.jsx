import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = ({ 
  show = false,
  message = 'Loading...',
  subtitle = null,
  size = 'lg',
  className = '',
  backdrop = 'semi-transparent' // 'semi-transparent', 'blur', 'dark'
}) => {
  if (!show) return null;

  const backdropClasses = {
    'semi-transparent': 'bg-black bg-opacity-20',
    'blur': 'bg-white bg-opacity-30 backdrop-blur-sm',
    'dark': 'bg-black bg-opacity-50',
    'none': ''
  };

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${backdropClasses[backdrop]}
        transition-opacity duration-200
        ${className}
      `}
      aria-hidden="true"
    >
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full mx-4 border border-gray-200">
        <div className="text-center">
          <LoadingSpinner 
            size={size}
            color="blue"
            className="mb-4"
          />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {message}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
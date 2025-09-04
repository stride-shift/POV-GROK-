import React from 'react';
import { Check } from 'lucide-react';

const TitleCard = ({ 
  title, 
  titleIndex, 
  selected, 
  onToggle, 
  disabled = false 
}) => {
  const handleClick = () => {
    if (!disabled) {
      onToggle(titleIndex);
    }
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${selected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={handleClick}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 right-3">
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
            ${selected 
              ? 'bg-blue-600 border-blue-600' 
              : 'border-gray-300 bg-white'
            }
          `}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>

      {/* Title Index */}
      <div className="mb-2">
        <span className={`
          inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold
          ${selected 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-600'
          }
        `}>
          {titleIndex + 1}
        </span>
      </div>

      {/* Title Content */}
      <div className="pr-8">
        <p className={`
          text-sm font-medium leading-relaxed
          ${selected ? 'text-blue-900' : 'text-gray-800'}
        `}>
          {title}
        </p>
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="mt-3 flex items-center text-xs text-blue-600">
          <Check className="w-3 h-3 mr-1" />
          Selected for analysis
        </div>
      )}
    </div>
  );
};

export default TitleCard; 
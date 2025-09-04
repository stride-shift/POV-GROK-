import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import WorkflowNavigation from './WorkflowNavigation';
import Button from '../ui/Button';

const MobileWorkflowNav = ({ currentSection }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-20 left-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          icon={isOpen ? X : Menu}
          className="bg-white shadow-lg"
        >
          {isOpen ? 'Close' : 'Menu'}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Navigation Panel */}
      <div className={`
        lg:hidden fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 pt-20">
          <WorkflowNavigation currentSection={currentSection} />
        </div>
      </div>
    </>
  );
};

export default MobileWorkflowNav; 
import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import InlineEditor from './InlineEditor';
import { Edit3, Save, X } from 'lucide-react';
import Button from '../ui/Button';

const EditableCanvasContent = ({
  content,
  onSave,
  onCancel,
  editable = true,
  className = "",
  placeholder = "Click to edit...",
  showControls = true,
  autoSave = false,
  autoSaveDelay = 2000,
  children,
  ...props
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentContent, setCurrentContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const editorRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Handle content updates
  const handleContentUpdate = useCallback((newContent) => {
    setCurrentContent(newContent);
    setHasChanges(newContent !== content);
    
    // Auto-save logic
    if (autoSave && onSave && newContent !== content) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave(newContent, true);
      }, autoSaveDelay);
    }
  }, [content, autoSave, onSave, autoSaveDelay]);

  // Handle save
  const handleSave = useCallback(async (contentToSave = currentContent, isAutoSave = false) => {
    if (!hasChanges && !isAutoSave) return;
    
    setIsSaving(true);
    
    try {
      if (onSave) {
        await onSave(contentToSave);
        setHasChanges(false);
        if (!isAutoSave) {
          setIsEditing(false);
          toast.success('Changes saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving content:', error);
      if (!isAutoSave) {
        toast.error('Failed to save changes');
      }
    } finally {
      setIsSaving(false);
    }
  }, [currentContent, hasChanges, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setCurrentContent(content);
    setHasChanges(false);
    setIsEditing(false);
    
    // Clear auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    if (onCancel) {
      onCancel();
    }
  }, [content, onCancel]);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (editable) {
      setIsEditing(true);
    }
  }, [editable]);

  // Handle blur
  const handleBlur = useCallback(() => {
    // Don't auto-exit editing mode on blur to allow for toolbar interactions
    // setIsEditing(false);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  }, [handleCancel, handleSave]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Update content when prop changes
  React.useEffect(() => {
    if (content !== currentContent && !isEditing) {
      setCurrentContent(content);
      setHasChanges(false);
    }
  }, [content, currentContent, isEditing]);

  return (
    <div 
      className={`editable-canvas-content ${className}`}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <div className="relative group">
        {/* Edit indicator */}
        {editable && !isEditing && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg">
              <Edit3 className="w-3 h-3" />
            </div>
          </div>
        )}

        {/* Inline Editor */}
        <InlineEditor
          ref={editorRef}
          content={currentContent}
          onUpdate={handleContentUpdate}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          editable={editable}
          className="prose prose-lg max-w-none"
        />

        {/* Edit Controls */}
        {showControls && isEditing && hasChanges && !autoSave && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg border">
            <div className="flex-1 text-sm text-gray-600">
              Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+S</kbd> to save or <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> to cancel
            </div>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              icon={X}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSave()}
              loading={isSaving}
              size="sm"
              icon={Save}
            >
              Save
            </Button>
          </div>
        )}

        {/* Auto-save indicator */}
        {autoSave && isSaving && (
          <div className="absolute -top-2 -left-2">
            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
              Saving...
            </div>
          </div>
        )}

        {/* Unsaved changes indicator */}
        {hasChanges && !autoSave && (
          <div className="absolute -top-2 -left-2">
            <div className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium">
              Unsaved
            </div>
          </div>
        )}
      </div>

      {/* Additional content */}
      {children}
    </div>
  );
};

export default EditableCanvasContent;

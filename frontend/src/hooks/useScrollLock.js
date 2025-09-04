import { useEffect, useRef, useCallback } from 'react';

// Global scroll lock manager
let scrollLockCount = 0;
let originalScrollY = 0;
let originalBodyStyles = {};

const disableBodyScroll = () => {
  if (scrollLockCount === 0) {
    // Store current scroll position and body styles
    originalScrollY = window.scrollY;
    originalBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    // Apply scroll lock
    document.body.style.position = 'fixed';
    document.body.style.top = `-${originalScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-locked', 'true');
  }
  scrollLockCount++;
};

const enableBodyScroll = () => {
  if (scrollLockCount > 0) {
    scrollLockCount--;
  }

  if (scrollLockCount === 0 && document.body.getAttribute('data-scroll-locked') === 'true') {
    // Restore original body styles
    document.body.style.position = originalBodyStyles.position || '';
    document.body.style.top = originalBodyStyles.top || '';
    document.body.style.width = originalBodyStyles.width || '';
    document.body.style.overflow = originalBodyStyles.overflow || '';
    document.body.removeAttribute('data-scroll-locked');
    
    // Restore scroll position
    window.scrollTo(0, originalScrollY);
    
    // Reset stored values
    originalScrollY = 0;
    originalBodyStyles = {};
  }
};

// Emergency cleanup function - exposed globally
const restoreScrollLock = () => {
  scrollLockCount = 0;
  if (document.body.getAttribute('data-scroll-locked') === 'true') {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-scroll-locked');
  }
};

// Expose globally for emergency use
window.restoreScrollLock = restoreScrollLock;

/**
 * Custom hook for managing scroll locking
 * @param {boolean} isActive - Whether scroll should be locked
 * @param {function} onEscape - Optional callback for escape key
 */
export const useScrollLock = (isActive = false, onEscape = null) => {
  const isActiveRef = useRef(isActive);
  const hasScrollLock = useRef(false);
  
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && onEscape) {
      onEscape();
    }
  }, [onEscape]);

  useEffect(() => {
    const currentIsActive = isActive;
    const wasActive = isActiveRef.current;
    
    if (currentIsActive && !wasActive && !hasScrollLock.current) {
      // Activate scroll lock
      disableBodyScroll();
      hasScrollLock.current = true;
      
      if (onEscape) {
        document.addEventListener('keydown', handleEscape);
      }
    } else if (!currentIsActive && wasActive && hasScrollLock.current) {
      // Deactivate scroll lock
      enableBodyScroll();
      hasScrollLock.current = false;
      
      if (onEscape) {
        document.removeEventListener('keydown', handleEscape);
      }
    }

    isActiveRef.current = currentIsActive;

    // Cleanup function
    return () => {
      if (hasScrollLock.current) {
        enableBodyScroll();
        hasScrollLock.current = false;
      }
      if (onEscape) {
        document.removeEventListener('keydown', handleEscape);
      }
    };
  }, [isActive, handleEscape, onEscape]);

  // Emergency cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasScrollLock.current) {
        enableBodyScroll();
        hasScrollLock.current = false;
      }
      if (onEscape) {
        document.removeEventListener('keydown', handleEscape);
      }
    };
  }, []);

  return {
    restoreScroll: restoreScrollLock,
    isScrollLocked: hasScrollLock.current
  };
};

export default useScrollLock; 
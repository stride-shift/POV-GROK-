import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import MainNavigation from './components/navigation/MainNavigation';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import CreateReport from './pages/CreateReport';
import ViewOutcomes from './pages/ViewOutcomes';
import AllReports from './pages/AllReports';
import Extras from './pages/Extras';
import CampaignSpace from './pages/CampaignSpace';
import EmailCanvas from './components/emails/EmailCanvas';
import Whitepaper from './pages/Whitepaper';
import WhitepaperCanvas from './components/whitepaper/WhitepaperCanvas';
import MarketingCanvas from './components/marketing/MarketingCanvas';
import SalesScriptsCanvas from './components/scripts/SalesScriptsCanvas';
import UserManagement from './pages/UserManagement';
import BulkUpload from './pages/BulkUpload';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

function App() {
  // Global scroll restoration utility
  const restoreScroll = () => {
    // Comprehensive scroll restoration
    
    // 1. Use the global restore function if available
    if (window.restoreScrollLock) {
      window.restoreScrollLock();
    }
    
    // 2. Manual cleanup of body styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.height = '';
    document.body.style.touchAction = '';
    document.body.removeAttribute('data-scroll-locked');
    
    // 3. Clean up html element styles too
    document.documentElement.style.position = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
    
    // 4. Force a reflow to ensure styles are applied
    document.body.offsetHeight;
    
    // 5. Subtle success indication (console only)
    console.log('🔄 Scroll restored via keyboard shortcut');
  };

  // Ensure scroll is always restored on app load (in case modal left it disabled)
  useEffect(() => {
    restoreScroll();
    
    // Add global keyboard shortcut to restore scroll (Ctrl/Cmd + Shift + R)
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        restoreScroll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Detect navigation changes and restore scroll if needed
    const handleRouteChange = () => {
      // Slight delay to let the new route render
      setTimeout(() => {
        // Check if scroll is stuck after navigation
        const isLocked = document.body.getAttribute('data-scroll-locked') === 'true';
        const hasFixedPosition = document.body.style.position === 'fixed';
        const hasOverflowHidden = document.body.style.overflow === 'hidden';
        
        if (isLocked || hasFixedPosition || hasOverflowHidden) {
          console.warn('🚨 Scroll lock detected after navigation, auto-restoring...');
          restoreScroll();
        }
      }, 100);
    };

    // Listen for navigation changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <MainNavigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/create" element={
              <ProtectedRoute>
                <CreateReport />
              </ProtectedRoute>
            } />
            <Route path="/view/:reportId?" element={
              <ProtectedRoute>
                <ViewOutcomes />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <AllReports />
              </ProtectedRoute>
            } />
            <Route path="/actions" element={
              <ProtectedRoute>
                <Extras />
              </ProtectedRoute>
            } />
            <Route path="/actions/:reportId" element={
              <ProtectedRoute>
                <Extras />
              </ProtectedRoute>
            } />
            <Route path="/campaigns/:reportId?" element={
              <ProtectedRoute>
                <CampaignSpace />
              </ProtectedRoute>
            } />
            <Route path="/actions/cold-call-emails" element={
              <ProtectedRoute>
                <EmailCanvas />
              </ProtectedRoute>
            } />
            <Route path="/actions/:reportId/cold-call-emails" element={
              <ProtectedRoute>
                <EmailCanvas />
              </ProtectedRoute>
            } />
            {/* Campaign-scoped artifact routes */}
            <Route path="/campaigns/:reportId/cold-call-emails" element={
              <ProtectedRoute>
                <EmailCanvas />
              </ProtectedRoute>
            } />
            <Route path="/campaigns/:reportId/whitepaper" element={
              <ProtectedRoute>
                <WhitepaperCanvas />
              </ProtectedRoute>
            } />
            <Route path="/campaigns/:reportId/marketing" element={
              <ProtectedRoute>
                <MarketingCanvas />
              </ProtectedRoute>
            } />
            <Route path="/campaigns/:reportId/sales-scripts" element={
              <ProtectedRoute>
                <SalesScriptsCanvas />
              </ProtectedRoute>
            } />
            <Route path="/actions/:reportId/whitepaper" element={
              <ProtectedRoute>
                <Whitepaper />
              </ProtectedRoute>
            } />
            <Route path="/actions/:reportId/marketing" element={
              <ProtectedRoute>
                <MarketingCanvas />
              </ProtectedRoute>
            } />
            <Route path="/actions/:reportId/sales-scripts" element={
              <ProtectedRoute>
                <SalesScriptsCanvas />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/users/bulk-upload" element={
              <ProtectedRoute>
                <BulkUpload />
              </ProtectedRoute>
            } />
            </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

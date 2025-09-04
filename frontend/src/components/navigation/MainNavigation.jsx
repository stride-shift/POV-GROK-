import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import { 
  Home, 
  Plus, 
  Eye, 
  FileText, 
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  Users
} from 'lucide-react';
import { useState } from 'react';

const MainNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { 
    lastCompletedReportId, 
    recentReports, 
    resetWorkflow,
    currentStep,
    reportData 
  } = useApp();
  

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCreatePage = location.pathname === '/' || location.pathname === '/create';
  const isViewPage = location.pathname.startsWith('/view');

  const handleCreateNew = () => {
    resetWorkflow();
    navigate('/create');
    setMobileMenuOpen(false);
  };

  const handleViewReport = (reportId) => {
    navigate(`/view/${reportId}`);
    setMobileMenuOpen(false);
  };

  const handleViewCurrent = () => {
    if (reportData.reportId) {
      navigate(`/view/${reportData.reportId}`);
    } else if (lastCompletedReportId) {
      navigate(`/view/${lastCompletedReportId}`);
    }
    setMobileMenuOpen(false);
  };

  const canViewCurrent = reportData.reportId || lastCompletedReportId;
  const actionsPath = canViewCurrent ? `/campaigns/${reportData.reportId || lastCompletedReportId}` : '/campaigns';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // If user is not authenticated, show minimal navigation
  if (!user) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => navigate('/login')}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">POV Analysis</span>
              </div>
            </div>
            <Button
              onClick={() => navigate('/login')}
              size="sm"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">POV Analysis</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Create New Report */}
            <Button
              variant={isCreatePage ? "primary" : "ghost"}
              onClick={handleCreateNew}
              icon={Plus}
              size="sm"
            >
              Create Report
            </Button>

            {/* View Current Report */}
            {canViewCurrent && (
              <Button
                variant={isViewPage ? "primary" : "ghost"}
                onClick={handleViewCurrent}
                icon={Eye}
                size="sm"
              >
                View Current
              </Button>
            )}

            {/* All Reports */}
            <Button
              variant="ghost"
              onClick={() => navigate('/reports')}
              icon={FileText}
              size="sm"
            >
              All Reports
            </Button>

            {/* Campaigns */}
            <Button
              variant="ghost"
              onClick={() => navigate(actionsPath)}
              icon={Plus}
              size="sm"
            >
              Campaigns
            </Button>

            {/* Admin - Only show for admins and super-admins */}
            {userProfile?.role === 'admin' || userProfile?.role === 'super_admin' ? (
              <Button
                variant="ghost"
                onClick={() => navigate('/users')}
                icon={Users}
                size="sm"
              >
                Admin
              </Button>
            ) : null}

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowUserMenu(!showUserMenu)}
                size="sm"
                className="flex items-center"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <span className="hidden sm:block">{user.email}</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500">Signed in</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              icon={mobileMenuOpen ? X : Menu}
              size="sm"
            />
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              <Button
                variant={isCreatePage ? "primary" : "ghost"}
                onClick={handleCreateNew}
                icon={Plus}
                size="sm"
                className="w-full justify-start"
              >
                Create New Report
              </Button>
              
              {canViewCurrent && (
                <Button
                  variant={isViewPage ? "primary" : "ghost"}
                  onClick={handleViewCurrent}
                  icon={Eye}
                  size="sm"
                  className="w-full justify-start"
                >
                  View Current Report
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/reports');
                  setMobileMenuOpen(false);
                }}
                icon={FileText}
                size="sm"
                className="w-full justify-start"
              >
                All Reports
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  navigate(actionsPath);
                  setMobileMenuOpen(false);
                }}
                icon={Plus}
                size="sm"
                className="w-full justify-start"
              >
                Campaigns
              </Button>

              {/* Admin - Only show for admins and super-admins */}
              {userProfile?.role === 'admin' || userProfile?.role === 'super_admin' ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/users');
                    setMobileMenuOpen(false);
                  }}
                  icon={Users}
                  size="sm"
                  className="w-full justify-start"
                >
                  Admin
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for dropdowns */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
};

export default MainNavigation; 
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Components
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { CommandPalette } from './components/common/CommandPalette';

// Pages
import { Login } from './pages/Auth/Login';
import { RegisterAdmin } from './pages/Auth/RegisterAdmin';
import { AcceptInvite } from './pages/Auth/AcceptInvite';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Clients } from './pages/Clients/Clients';
import { Deals } from './pages/Deals/Deals';
import { Projects } from './pages/Projects/Projects';
import { FollowUps } from './pages/FollowUps/FollowUps';
import { Team } from './pages/Team/Team';
import { TelegramSettings } from './pages/Telegram/TelegramSettings';
import { Profile } from './pages/Profile/Profile';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const { t, toggleLang } = useLanguage();

  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [authView, setAuthView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || params.get('inviteToken') ? 'invite' : 'login';
  });

  // Quick modals triggers across pages
  const [openNewClientModal, setOpenNewClientModal] = useState(false);
  const [openNewDealModal, setOpenNewDealModal] = useState(false);
  const [openNewProjectModal, setOpenNewProjectModal] = useState(false);
  const [openNewFollowUpModal, setOpenNewFollowUpModal] = useState(false);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border-color)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              margin: '0 auto 1rem auto',
            }}
          />
          <p style={{ fontSize: '0.9rem' }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Not authenticated: render auth flows
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterAdmin onBackToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'invite') {
      return <AcceptInvite onBackToLogin={() => setAuthView('login')} />;
    }
    return (
      <Login
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToAcceptInvite={() => setAuthView('invite')}
      />
    );
  }

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  // Authenticated CRM Layout
  return (
    <div className="app-container">
      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          activePage={activePage}
          setActivePage={setActivePage}
          onOpenCommandPalette={() => setCmdOpen(true)}
        />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {activePage === 'dashboard' && (
            <Dashboard
              setActivePage={setActivePage}
              onOpenAddClient={() => {
                setActivePage('clients');
                setOpenNewClientModal(true);
              }}
              onOpenAddDeal={() => {
                setActivePage('deals');
                setOpenNewDealModal(true);
              }}
              onOpenAddProject={() => {
                setActivePage('projects');
                setOpenNewProjectModal(true);
              }}
              onOpenAddFollowUp={() => {
                setActivePage('followups');
                setOpenNewFollowUpModal(true);
              }}
            />
          )}

          {activePage === 'clients' && (
            <Clients
              isOpenNewModal={openNewClientModal}
              onCloseNewModal={() => setOpenNewClientModal(false)}
            />
          )}

          {activePage === 'deals' && (
            <Deals
              isOpenNewModal={openNewDealModal}
              onCloseNewModal={() => setOpenNewDealModal(false)}
            />
          )}

          {activePage === 'projects' && (
            <Projects
              isOpenNewModal={openNewProjectModal}
              onCloseNewModal={() => setOpenNewProjectModal(false)}
            />
          )}

          {activePage === 'followups' && (
            <FollowUps
              isOpenNewModal={openNewFollowUpModal}
              onCloseNewModal={() => setOpenNewFollowUpModal(false)}
            />
          )}

          {activePage === 'team' && <Team />}

          {activePage === 'telegram' && <TelegramSettings />}

          {activePage === 'profile' && <Profile />}
        </main>
      </div>

      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={(target) => {
          if (target === '__toggle_lang__') {
            toggleLang();
          } else {
            setActivePage(target);
          }
        }}
        onOpenNewClient={() => {
          setActivePage('clients');
          setOpenNewClientModal(true);
        }}
        onOpenNewDeal={() => {
          setActivePage('deals');
          setOpenNewDealModal(true);
        }}
        onOpenNewProject={() => {
          setActivePage('projects');
          setOpenNewProjectModal(true);
        }}
        onOpenNewFollowUp={() => {
          setActivePage('followups');
          setOpenNewFollowUpModal(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

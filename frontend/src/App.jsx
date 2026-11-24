import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

// Pages
import { Login } from './pages/Auth/Login';
import { RegisterAdmin } from './pages/Auth/RegisterAdmin';
import { AcceptInvite } from './pages/Auth/AcceptInvite';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Clients } from './pages/Clients/Clients';
import { Projects } from './pages/Projects/Projects';
import { FollowUps } from './pages/FollowUps/FollowUps';
import { Team } from './pages/Team/Team';
import { TelegramSettings } from './pages/Telegram/TelegramSettings';
import { Profile } from './pages/Profile/Profile';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();

  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'invite'

  // Quick modals triggers across pages
  const [openNewClientModal, setOpenNewClientModal] = useState(false);
  const [openNewProjectModal, setOpenNewProjectModal] = useState(false);
  const [openNewFollowUpModal, setOpenNewFollowUpModal] = useState(false);

  // Check URL query on initial mount for invitation tokens
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token') || params.get('inviteToken')) {
      setAuthView('invite');
    }
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto',
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p>{t('loading')}</p>
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

  // Authenticated CRM Layout
  return (
    <div className="app-container">
      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activePage={activePage}
          setActivePage={setActivePage}
        />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {activePage === 'dashboard' && (
            <Dashboard
              setActivePage={setActivePage}
              onOpenAddClient={() => {
                setActivePage('clients');
                setOpenNewClientModal(true);
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
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

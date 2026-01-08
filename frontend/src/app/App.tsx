import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { Profile } from './components/Profile';
import { LoginScreen } from './components/LoginScreen';
import { PublishScreen } from './components/PublishScreen';
import { MyPublications } from './components/MyPublications';
import { LanguageProvider } from './contexts/LanguageContext';
import { useLanguage } from './contexts/LanguageContext';
import { authAPI } from './services/leancloud';

function AppContent() {
  const { t, language } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'publish' | 'publications'>('home');
  const [user, setUser] = useState<{ email: string; username?: string; canPublish?: boolean; canComment?: boolean } | null>(null);
  const [publicationsRefreshTrigger, setPublicationsRefreshTrigger] = useState(0);

  // 检查用户登录状态
  useEffect(() => {
    const checkLoginStatus = async () => {
      // 检查localStorage中是否有sessionToken
      const token = localStorage.getItem('sessionToken');
      if (token) {
        try {
          // 尝试获取当前用户信息
          const currentUser = await authAPI.getCurrentUser();
          if (currentUser) {
            setUser({ 
              email: currentUser.email,
              username: currentUser.username,
              canPublish: currentUser.canPublish,
              canComment: currentUser.canComment
            });
            setIsLoggedIn(true);
            return;
          }
        } catch (error) {
          // token可能已过期，清除它
          localStorage.removeItem('sessionToken');
          console.log('Session token expired, cleared');
        }
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogin = async (email: string) => {
    const currentUser = await authAPI.getCurrentUser();
    setUser({ 
      email,
      username: currentUser?.username,
      canPublish: currentUser?.canPublish,
      canComment: currentUser?.canComment
    });
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await authAPI.logout();
    setUser(null);
    setIsLoggedIn(false);
    setCurrentView('home');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div 
      className="h-screen w-full bg-black flex flex-col overflow-hidden max-w-[480px] mx-auto"
      style={{
        height: '100vh',
        height: '100dvh', // 动态视口高度，适配移动端
        minHeight: '-webkit-fill-available', // iOS Safari 支持
      }}
    >
      {currentView === 'home' && <Home userEmail={user?.email} />}
      {currentView === 'profile' && (
        <Profile 
          user={user} 
          onLogout={handleLogout}
          onNavigateToPublications={() => {
            setPublicationsRefreshTrigger(Date.now());
            setCurrentView('publications');
          }}
        />
      )}
      {currentView === 'publish' && (
        <PublishScreen 
          user={user} 
          onClose={() => setCurrentView('home')}
          onNavigateToHome={() => setCurrentView('home')}
          onNavigateToPublications={() => {
        setPublicationsRefreshTrigger(Date.now());
        setCurrentView('publications');
          }}
        />
      )}
      {currentView === 'publications' && (
        <MyPublications
          key={`publications-${publicationsRefreshTrigger}`}
          user={user}
          onBack={() => setCurrentView('profile')}
          refreshTrigger={publicationsRefreshTrigger}
          initialTab="pending"
        />
      )}
      
      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-zinc-900 border-t border-zinc-800 safe-area-bottom z-50">
        <div className="flex items-center justify-around h-16 px-4">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentView === 'home' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-xs">{t.home}</span>
          </button>
          
          {/* 发布按钮 - 根据canPublish权限显示，只有明确为true时才显示 */}
          {user?.canPublish === true && (
            <button
              onClick={() => setCurrentView('publish')}
              className={`flex flex-col items-center gap-1 transition-colors ${
                currentView === 'publish' ? 'text-white' : 'text-zinc-500'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs">{language === 'zh' ? '发布' : 'Publish'}</span>
            </button>
          )}
          
          <button
            onClick={() => setCurrentView('profile')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentView === 'profile' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-xs">{t.profile}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
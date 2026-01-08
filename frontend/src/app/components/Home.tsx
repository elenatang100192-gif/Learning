import { useState } from 'react';
import { VideoFeed } from './VideoFeed';
import { NotificationCenter } from './NotificationCenter';
import { useLanguage } from '../contexts/LanguageContext';

type Category = 'Tech' | 'Arts' | 'Business';

interface HomeProps {
  userEmail?: string | null;
}

export function Home({ userEmail }: HomeProps = {}) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<Category>('Tech');
  const [showNotifications, setShowNotifications] = useState(false);

  const categories: { id: Category; label: string }[] = [
    { id: 'Tech', label: t.tech },
    { id: 'Arts', label: t.arts },
    { id: 'Business', label: t.business },
  ];

  // 未读通知数量（从API获取，暂时设为0）
  const unreadCount = 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 顶部分类导航 - 使用 fixed 定位确保在移动端可见 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/95 via-black/90 to-black/60 pb-2 pt-safe pointer-events-none max-w-[480px] mx-auto">
        <div className="flex items-center justify-between px-4 py-3 pointer-events-auto">
          {/* 中间：分类导航 */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex flex-col items-center gap-1 transition-all min-w-[60px] ${
                  activeCategory === category.id
                    ? 'text-white scale-110'
                    : 'text-white/70 scale-100'
                }`}
              >
                <span className="text-sm font-medium whitespace-nowrap">{category.label}</span>
                {activeCategory === category.id && (
                  <div className="w-full h-0.5 bg-orange-500 rounded-full mt-1" />
                )}
              </button>
            ))}
          </div>

          {/* 右侧：通知图标 */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors ml-2 flex-shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* 占位空间，避免内容被顶部导航遮挡 */}
      <div className="h-16 flex-shrink-0" />

      {/* 视频内容区 */}
      <VideoFeed category={activeCategory} />

      {/* 通知中心 */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userEmail={userEmail}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { userAPI } from '../services/leancloud';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null | undefined;
}

interface Notification {
  id: string;
  type: 'approved' | 'rejected' | 'pending';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  publicationId: string;
}

export function NotificationCenter({ isOpen, onClose, userEmail }: NotificationCenterProps) {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // 从API获取用户发布并生成通知
  useEffect(() => {
    if (!isOpen || !userEmail) return;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const userVideos = await userAPI.getUserPublications();
        const generatedNotifications: Notification[] = [];

        userVideos.forEach((video) => {
          const status = video.status;
          if (status === '已发布' && video.publishDate) {
            generatedNotifications.push({
              id: `notif-${video.id}-approved`,
          type: 'approved',
          title: language === 'zh' ? '🎉 审核通过' : '🎉 Approved',
          message: language === 'zh' 
                ? `您的视频《${video.title}》已通过审核并成功发布！`
                : `Your video "${video.title}" has been approved and published!`,
              time: video.publishDate,
          isRead: false,
              publicationId: video.id,
        });
          } else if (status === '已驳回') {
            generatedNotifications.push({
              id: `notif-${video.id}-rejected`,
          type: 'rejected',
          title: language === 'zh' ? '❌ 审核未通过' : '❌ Rejected',
          message: language === 'zh'
                ? `您的视频《${video.title}》未通过审核，请查看详情并重新提交。`
                : `Your video "${video.title}" was not approved. Please review and resubmit.`,
              time: video.uploadDate,
          isRead: false,
              publicationId: video.id,
        });
          } else if (status === '待审核') {
            generatedNotifications.push({
              id: `notif-${video.id}-pending`,
          type: 'pending',
          title: language === 'zh' ? '⏳ 审核中' : '⏳ Under Review',
          message: language === 'zh'
                ? `您的视频《${video.title}》正在审核中，预计24小时内完成。`
                : `Your video "${video.title}" is under review. Expected completion within 24 hours.`,
              time: video.uploadDate,
          isRead: true,
              publicationId: video.id,
        });
      }
    });

        const sortedNotifications = generatedNotifications.sort((a, b) => {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

        setNotifications(sortedNotifications);
      } catch (error) {
        console.error('加载通知失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [isOpen, userEmail, language]);

  const markAsRead = (notificationId: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((notif) => ({ ...notif, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* 通知面板 */}
      <div className="fixed inset-x-0 top-0 max-w-[480px] mx-auto bg-zinc-900 z-50 flex flex-col max-h-[80vh] rounded-b-3xl shadow-2xl">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold text-lg">{t.notificationTitle}</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-blue-500 text-sm hover:text-blue-400 transition-colors"
              >
                {language === 'zh' ? '全部已读' : 'Mark all read'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 通知列表 */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p>{t.noNotifications}</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const bgColors = {
    approved: 'bg-green-900/20 border-l-4 border-green-500',
    rejected: 'bg-red-900/20 border-l-4 border-red-500',
    pending: 'bg-yellow-900/20 border-l-4 border-yellow-500',
  };

  return (
    <div
      className={`p-4 hover:bg-zinc-800 transition-colors cursor-pointer ${
        !notification.isRead ? 'bg-zinc-800/50' : ''
      }`}
      onClick={onRead}
    >
      <div className={`p-3 rounded-lg ${bgColors[notification.type]}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-white font-medium">{notification.title}</h4>
          {!notification.isRead && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-zinc-300 text-sm mb-2">{notification.message}</p>
        <span className="text-zinc-500 text-xs">{notification.time}</span>
      </div>
    </div>
  );
}
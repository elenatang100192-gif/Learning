import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI } from '../services/leancloud';
import { toast } from 'sonner';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t, setLanguage } = useLanguage();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'zh' | 'en'>('en');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!validateEmail(email)) {
      setError(t.emailError);
      setIsLoading(false);
      return;
    }

    try {
      const result = await authAPI.sendOTP(email);
      if (result.success) {
        setStep('otp');

        // 开发模式：显示OTP验证码
        if (result.development && result.otp) {
          console.log('🔍 前端检测到开发模式，显示OTP:', result.otp);
          toast.success(
            '开发模式：OTP验证码已生成',
            {
              description: `您的验证码是：${result.otp}。请使用此验证码登录。`,
              duration: 20000, // 延长显示时间
            }
          );
        } else {
          // 生产模式：正常提示
          console.log('📧 前端检测到生产模式，显示邮件提示');
          toast.success(
            t.codeSent || '验证码已发送到您的邮箱',
            {
              description: '请检查收件箱、垃圾邮件和促销邮件文件夹。如未收到，请等待1-2分钟后重试。',
              duration: 10000,
            }
          );
        }
      } else {
        // 显示详细的错误信息
        const errorMsg = result.message || t.sendCodeError || '发送验证码失败，请重试';
        setError(errorMsg);
        console.error('发送OTP失败:', result.message);
      }
    } catch (error: any) {
      console.error('发送OTP失败:', error);
      const errorMsg = error?.message || t.sendCodeError || '发送验证码失败，请重试';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (otp.length !== 6) {
      setError(t.codeError);
      setIsLoading(false);
      return;
    }

    try {
      const user = await authAPI.loginWithEmail(email, otp);
      if (user) {
        // 根据选择的语言设置应用语言
        setLanguage(selectedLanguage);
        // 保存语言选择到localStorage
        localStorage.setItem('preferredLanguage', selectedLanguage);
        toast.success(t.loginSuccess || '登录成功！');
        onLogin(user.email);
      } else {
        setError(t.loginError || '登录失败，请检查验证码');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError(t.loginError || '登录失败，请检查验证码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-zinc-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 科技感背景效果 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* 网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      
      <div className="w-full max-w-md bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 3.6v7.72c0 4.83-3.13 9.37-8 10.68-4.87-1.31-8-5.85-8-10.68v-7.72l8-3.6z"/>
              <path d="M10.5 14.5l-2.5-2.5-1.41 1.41L10.5 17.5l7-7-1.41-1.41z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent mb-2">{t.loginTitle}</h1>
          <p className="text-gray-400">{t.loginSubtitle}</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.companyEmail}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent text-white placeholder-gray-500 transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] bg-[length:200%_100%] hover:bg-right disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (t.sending || '发送中...') : t.sendCode}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              {t.codeExpiry}
            </p>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.verificationCode}
              </label>
              <p className="text-sm text-gray-400 mb-3">
                {t.sentTo} {email}
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t.enterCode}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent text-center text-2xl tracking-widest font-mono text-white placeholder-gray-600 transition-all"
                maxLength={6}
                required
              />
            </div>

            {/* 语言选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                选择语言 / Select Language
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('zh')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedLanguage === 'zh'
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-zinc-800/50 border-zinc-700 text-gray-300 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-semibold">中文</div>
                  <div className="text-xs text-gray-400 mt-1">Chinese</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('en')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedLanguage === 'en'
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-zinc-800/50 border-zinc-700 text-gray-300 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-semibold">English</div>
                  <div className="text-xs text-gray-400 mt-1">英文</div>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] bg-[length:200%_100%] hover:bg-right disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (t.loggingIn || '登录中...') : t.login}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError('');
              }}
              className="w-full text-gray-400 py-2 text-sm hover:text-orange-400 transition-colors"
            >
              {t.backToEmail}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              {t.demoMode}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
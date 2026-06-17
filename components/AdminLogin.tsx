import React, { useState } from 'react';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
    if (!expectedPassword) {
      setError('رمز عبور محیط توسعه‌ای تنظیم نشده است');
      return;
    }
    if (password === expectedPassword) {
      onLogin();
    } else {
      setError('رمز عبور اشتباه است');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-skin-base px-4">
      <div className="bg-skin-card p-8 rounded-2xl shadow-xl border border-skin-border w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-skin-primary/10 rounded-full text-skin-primary">
            <Lock size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-skin-text mb-2">پنل مدیریت</h2>
        <p className="text-center text-skin-muted mb-8">لطفا رمز عبور را وارد کنید</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
              className="w-full px-4 py-3 rounded-lg bg-skin-control-bg border border-skin-border focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all text-center dir-ltr"
              placeholder="Password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-skin-muted hover:text-skin-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password}
            className="w-full bg-skin-primary hover:bg-skin-primary-hover text-white py-3 rounded-lg font-bold transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            ورود به سیستم
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 text-skin-muted hover:text-skin-text py-2 transition-colors text-sm"
          >
            <ArrowRight size={16} />
            بازگشت به سایت
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
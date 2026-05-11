import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'JU=:zzBTj.Cg4m*ja=0q7t^H~^0Zzm@2#*c') {
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
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-skin-control-bg border border-skin-border focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all text-center dir-ltr"
              placeholder="Password"
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-skin-primary hover:bg-skin-primary-hover text-white py-3 rounded-lg font-bold transition-all active:scale-95 shadow-md"
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
import React, { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-skin-overlay backdrop-blur-md">
            <div className="bg-skin-card p-8 rounded-2xl shadow-xl border border-skin-border w-full max-w-md text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-50 rounded-full text-red-600">
                  <AlertTriangle size={32} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-skin-text mb-2">مشکلی پیش آمد</h2>
              <p className="text-skin-muted text-sm mb-6">
                متأسفانه یک خطای غیرمنتظره رخ داد. لطفاً صفحه را دوباره بارگذاری کنید.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-lg font-medium transition-colors"
              >
                بارگذاری مجدد صفحه
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

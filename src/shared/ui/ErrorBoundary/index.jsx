import React from 'react';

const RETRY_KEY = 'eb_reload_ts';
const RETRY_WINDOW_MS = 10_000;

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    const lastReload = sessionStorage.getItem(RETRY_KEY);
    const now = Date.now();

    if (lastReload && now - parseInt(lastReload, 10) < RETRY_WINDOW_MS) {
      return;
    }

    sessionStorage.setItem(RETRY_KEY, String(now));
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-800">Что-то пошло не так</h1>
            <p className="text-slate-500">
              Произошла ошибка при загрузке страницы. Попробуйте обновить страницу вручную.
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem(RETRY_KEY);
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

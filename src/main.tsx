import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import api from './services/api'

// Client-side error telemetry reporter
const reportedErrors = new Set<string>();

const reportConsoleError = async (message: string, stack: string = '') => {
  const token = localStorage.getItem('access_token');
  if (!token) return; // Only report if user is logged in
  
  const errorKey = `${message}-${stack.substring(0, 100)}`;
  if (reportedErrors.has(errorKey)) return;
  reportedErrors.add(errorKey);
  
  try {
    await api.post('/feedbacks', {
      type: 'BUG',
      subject: 'Авто-отчет об ошибке в консоли',
      content: `Сообщение: ${message}\n\nСтек трейс:\n${stack}\n\nАдрес страницы: ${window.location.href}\nUserAgent: ${navigator.userAgent}`,
    });
  } catch (err) {
    // Fail silently to prevent infinite crash loop
  }
};

window.addEventListener('error', (event) => {
  const msg = event.message || 'Unknown runtime error';
  const stack = event.error?.stack || '';
  reportConsoleError(msg, stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message || (typeof reason === 'string' ? reason : 'Unhandled promise rejection');
  const stack = reason?.stack || '';
  reportConsoleError(`[UnhandledRejection] ${msg}`, stack);
});

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.map(arg => {
    if (arg instanceof Error) return arg.message + '\n' + arg.stack;
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch { return String(arg); }
    }
    return String(arg);
  }).join(' ');
  
  reportConsoleError(msg, 'console.error intercept');
  originalConsoleError.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

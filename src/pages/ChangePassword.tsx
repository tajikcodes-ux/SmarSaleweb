import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { ChangePasswordForm } from '../components/AccountDialog';

/**
 * Shown after signing in with a password someone else set (a manager, an import, a reset).
 * The server refuses everything else until it is replaced.
 */
export default function ChangePassword() {
  const navigate = useNavigate();
  if (!localStorage.getItem('access_token')) return <Navigate to="/login" replace />;

  let login = '';
  try {
    login = JSON.parse(localStorage.getItem('user') || '{}').username || '';
  } catch {
    /* shown without the login */
  }

  const signOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('smartsale:auth-change'));
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa] dark:bg-[#0a0a0a] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111] border border-[#e3e3e8] dark:border-[#1a1a1a] shadow-sm p-6">
        <div className="w-12 h-12 rounded-xl bg-[#e8f0fe] text-[#0b57d0] flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-[#1d1d1f] dark:text-white">Придумайте свой пароль</h1>
        <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-1.5 mb-5 leading-relaxed">
          Пароль {login && <span className="font-mono font-semibold">{login}</span>} задал руководитель, поэтому его знают другие.
          Чтобы продолжить работу, замените его на свой. Документы и оплаты в системе записываются на того, кто вошёл.
        </p>
        <ChangePasswordForm submitLabel="Сохранить и продолжить" onDone={() => navigate('/', { replace: true })} />
        <button onClick={signOut} className="w-full mt-3 text-xs text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white">
          Выйти
        </button>
      </div>
    </div>
  );
}

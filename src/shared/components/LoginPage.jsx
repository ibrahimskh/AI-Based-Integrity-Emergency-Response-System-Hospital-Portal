import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Button from './Button';
import { Field, Input } from './Field';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ role, brandLabel, homePath, accountHint }) {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && user.role === role) return <Navigate to={homePath} replace />;

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required.';
    if (!password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setAuthError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password, role);
      navigate(homePath, { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-lifeline-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Activity size={26} className="text-lifeline-red" />
            <span className="font-extrabold text-2xl tracking-tight text-lifeline-red">LIFELINE</span>
          </div>
          <p className="text-xs font-bold tracking-widest text-lifeline-sub">{brandLabel}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-lifeline-border shadow-sm p-6 sm:p-7">
          <h2 className="font-bold text-lg mb-1">Sign in</h2>
          <p className="text-sm text-lifeline-sub mb-5">Enter your credentials to continue.</p>

          {authError && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 text-lifeline-red-dark text-sm font-medium rounded-lg px-3 py-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {authError}
            </div>
          )}

          <Field label="Email" error={errors.email} required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.org" error={errors.email} autoComplete="username" />
          </Field>

          <Field label="Password" error={errors.password} required>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" error={errors.password} autoComplete="current-password" className="pr-10" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <Button type="submit" className="w-full mt-2" loading={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>

          {accountHint && (
            <div className="mt-5 text-xs text-lifeline-sub bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed">
              <span className="font-bold text-lifeline-ink">FIREBASE ACCOUNT</span><br />
              {accountHint}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

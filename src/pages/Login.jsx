import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth, authErrorMessage } from '../context/AuthContext';
import AuthShell, { GoogleIcon, Divider } from '../components/AuthShell';

const Login = () => {
  const { currentUser, login, googleSignIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = location.state?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(null); // 'email' | 'google' | null
  const [error, setError] = useState('');

  if (currentUser) return <Navigate to={next} replace />;

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    setBusy('email');
    try {
      await login(email.trim(), password);
      toast.success('Signed in');
      navigate(next, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(null);
  };

  const handleGoogle = async () => {
    setError('');
    setBusy('google');
    try {
      const res = await googleSignIn();
      if (res) {
        toast.success('Signed in with Google');
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(null);
  };

  const handleReset = async () => {
    if (!email.trim()) { setError('Type your email above first, then tap "Forgot password".'); return; }
    try {
      await resetPassword(email.trim());
      toast.success('Reset link sent — check your inbox');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <AuthShell kicker="Welcome back" title="Log in">
      <button type="button" onClick={handleGoogle} disabled={!!busy} className="btn btn-light w-full">
        <GoogleIcon /> {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <Divider />

      <form onSubmit={handleEmail} className="space-y-4" noValidate>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="field" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <label className="field-label" htmlFor="password">Password</label>
            <button type="button" onClick={handleReset} className="text-[12px] text-muted hover:text-ink underline underline-offset-2">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password" className="field pr-11"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPass(!showPass)} aria-label="Show password"
              className="absolute right-0 top-0 h-11 w-11 grid place-items-center text-muted hover:text-ink">
              {showPass ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        {error && <p className="text-[13px] text-live border-l-2 border-live pl-3">{error}</p>}

        <button type="submit" disabled={!!busy || !email || !password} className="btn btn-dark w-full">
          {busy === 'email' ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p className="text-[14px] text-muted mt-6">
        New here? <Link to="/register" state={location.state} className="text-ink font-semibold underline underline-offset-2">Create an account</Link>
      </p>
    </AuthShell>
  );
};

export default Login;

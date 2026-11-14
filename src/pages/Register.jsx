import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth, authErrorMessage } from '../context/AuthContext';
import AuthShell, { GoogleIcon, Divider } from '../components/AuthShell';

const Register = () => {
  const { currentUser, register, googleSignIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = location.state?.from || '/';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  if (currentUser) return <Navigate to={next} replace />;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) return setError('In-game name needs at least 3 characters.');
    if (password.length < 6) return setError('Password needs at least 6 characters.');
    if (!terms) return setError('Please accept the terms to continue.');

    setBusy('email');
    try {
      await register(email.trim(), password, username.trim());
      toast.success('Account created');
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

  return (
    <AuthShell kicker="New player" title="Create account">
      <button type="button" onClick={handleGoogle} disabled={!!busy} className="btn btn-light w-full">
        <GoogleIcon /> {busy === 'google' ? 'Opening Google…' : 'Sign up with Google'}
      </button>

      <Divider />

      <form onSubmit={handleRegister} className="space-y-4" noValidate>
        <div>
          <label className="field-label" htmlFor="ign">In-game name</label>
          <input id="ign" className="field" placeholder="e.g. Ghost_47" maxLength={24}
            value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="field" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={showPass ? 'text' : 'password'} autoComplete="new-password" className="field pr-11"
              placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPass(!showPass)} aria-label="Show password"
              className="absolute right-0 top-0 h-11 w-11 grid place-items-center text-muted hover:text-ink">
              {showPass ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-[13px] text-muted cursor-pointer">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 accent-ink w-4 h-4" />
          <span>I'm 18+ and agree to the <a href="#terms" className="text-ink underline">terms</a> and <a href="#refunds" className="text-ink underline">refund policy</a>.</span>
        </label>

        {error && <p className="text-[13px] text-live border-l-2 border-live pl-3">{error}</p>}

        <button type="submit" disabled={!!busy || !email || !password} className="btn btn-dark w-full">
          {busy === 'email' ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-[14px] text-muted mt-6">
        Already have one? <Link to="/login" state={location.state} className="text-ink font-semibold underline underline-offset-2">Log in</Link>
      </p>
    </AuthShell>
  );
};

export default Register;

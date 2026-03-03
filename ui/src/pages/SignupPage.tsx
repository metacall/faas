import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const BASE_URL = (import.meta.env.VITE_FAAS_URL as string | undefined) ?? 'http://localhost:9000';

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!terms) {
      setError('You must accept the Terms and Conditions.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, alias }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? 'Signup failed. Please try again.');
        return;
      }
      localStorage.setItem('faas_token', data.token);
      navigate('/');
    } catch {
      setError('Unable to reach the FaaS server. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white font-['Inter',sans-serif] min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-md flex flex-col items-center mb-8">
        <div className="mb-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative h-[60px] flex items-center justify-center">
              <img src="/metacall.svg" alt="MetaCall" className="h-full w-auto" />
            </div>
          </div>
        </div>

        <div className="flex space-x-6 text-sm font-medium">
          <Link to="/login" className="text-gray-500 hover:text-blue-500 transition-colors">
            Login
          </Link>
          <span className="text-blue-500 border-b-2 border-blue-500 pb-1 cursor-default">
            Signup
          </span>
        </div>
      </div>

      <div className="w-full max-w-md bg-white border border-gray-200 p-8 md:p-10 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8">Signup</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group">
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 text-gray-800 placeholder-gray-500 outline-none ring-0 focus:ring-0 focus:border-blue-500 transition-colors duration-200"
            />
          </div>

          <div className="group">
            <label htmlFor="alias" className="block text-sm font-medium text-gray-800 mb-1">
              Alias
            </label>
            <input
              id="alias"
              type="text"
              placeholder="developer_alias"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              required
              className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 text-gray-800 placeholder-gray-500 outline-none ring-0 focus:ring-0 focus:border-blue-500 transition-colors duration-200"
            />
          </div>

          <div className="group">
            <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 text-gray-800 placeholder-gray-500 outline-none ring-0 focus:ring-0 focus:border-blue-500 transition-colors duration-200"
            />
          </div>

          <div className="group">
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-800 mb-1">
              Password confirmation
            </label>
            <input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 text-gray-800 placeholder-gray-500 outline-none ring-0 focus:ring-0 focus:border-blue-500 transition-colors duration-200"
            />
          </div>

          <div className="flex items-start mt-6">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="focus:ring-0 focus:ring-offset-0 h-4 w-4 text-blue-500 border-gray-300 rounded-none bg-transparent cursor-pointer"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-800 cursor-pointer">
                I accept the{' '}
                <a
                  href="https://metacall.io/terms"
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a
                  href="https://metacall.io/privacy"
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy and Cookies Usage
                </a>
                .
              </label>
            </div>
          </div>

          {error && (
            <div className="py-2 pl-3 mt-4 text-xs text-red-600 bg-red-50 border-l-2 border-red-500">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto text-gray-500 border border-gray-300 font-medium py-2.5 px-6 hover:bg-gray-500 hover:border-gray-500 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      <div className="w-full max-w-md mt-6 text-left">
        <a
          href="https://metacall.io/docs"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-500 hover:text-opacity-80 transition-colors flex items-center gap-1"
        >
          Help
        </a>
      </div>
    </div>
  );
}

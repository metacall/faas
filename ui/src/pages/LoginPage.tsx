import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const BASE_URL = (import.meta.env.VITE_FAAS_URL as string | undefined) ?? 'http://localhost:9000';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? 'Login failed. Please try again.');
        return;
      }
      localStorage.setItem('faas_token', data.token);
      localStorage.setItem('faas_user_email', email);
      navigate('/');
    } catch {
      setError('Unable to reach the FaaS server. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-slate-800 font-['Inter',sans-serif] min-h-screen flex flex-col items-center justify-center transition-colors duration-300">
      <div className="w-full max-w-md px-8 py-12">
        <div className="flex flex-col items-center mb-12">
          <div className="mb-4">
            <img src="/metacall.svg" alt="MetaCall" className="h-[80px] w-[80px] object-contain" />
          </div>
        </div>

        <div className="flex justify-center mb-12 space-x-8 text-sm font-medium tracking-wide">
          <button className="relative pb-2 text-blue-500 font-bold transition-colors cursor-default">
            Login
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></span>
          </button>
          <Link
            to="/signup"
            className="relative pb-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            Signup
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="p-8 border border-gray-200 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-8 text-slate-800">Login</h2>

            <div className="relative mb-8">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="peer w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 text-slate-800 placeholder-transparent outline-none ring-0 focus:ring-0 focus:border-blue-500 transition-colors duration-300"
              />
              <label
                htmlFor="email"
                className="absolute left-0 top-2 text-gray-400 text-base pointer-events-none transition-all duration-300 peer-focus:-top-5 peer-focus:text-xs peer-focus:text-blue-500 peer-[-webkit-autofill]:-top-5 peer-[:not(:placeholder-shown)]:-top-5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-blue-500"
              >
                Email
              </label>
            </div>

            <div className="relative mb-8">
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="peer w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 text-slate-800 placeholder-transparent outline-none ring-0 focus:ring-0 focus:border-blue-500 transition-colors duration-300"
              />
              <label
                htmlFor="password"
                className="absolute left-0 top-2 text-gray-400 text-base pointer-events-none transition-all duration-300 peer-focus:-top-5 peer-focus:text-xs peer-focus:text-blue-500 peer-[-webkit-autofill]:-top-5 peer-[:not(:placeholder-shown)]:-top-5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-blue-500"
              >
                Password
              </label>
            </div>

            {error && (
              <div className="mb-4 text-xs text-red-500 ">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-gray-500 px-8 py-2 border border-gray-300 hover:bg-gray-500 hover:border-gray-500 hover:text-white transition-all duration-300 text-sm font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </div>
        </form>

        <div className="w-full max-w-md mt-6 text-left">
          <a
            href="https://metacall.io/docs"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
          >
            Help
          </a>
        </div>
      </div>
    </div>
  );
}

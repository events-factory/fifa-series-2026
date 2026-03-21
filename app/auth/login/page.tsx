'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(formData);

      if (response.data) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        if (response.data.user.isStaff) {
          router.push('/dashboard');
        } else {
          router.push('/my-registrations');
        }
      } else {
        setError(response.message || 'Invalid email or password.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-blue-50">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Card header */}
            <div className="bg-primary-700 px-8 py-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gold border-2 border-gold-dark shrink-0">
                <svg className="w-6 h-6 text-primary-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Sign In</h1>
                <p className="text-white/70 text-sm mt-0.5">Access your FIFA Series account</p>
              </div>
            </div>

            <div className="px-8 py-8">
              {error && (
                <div className="mb-5 p-4 bg-red-50 border border-accent-red text-accent-red rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-accent-red">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-accent-red">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-bold text-primary-700 bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Signing In...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  Don&apos;t have an account?{' '}
                  <Link href="/auth/register" className="text-primary-500 font-semibold hover:text-primary-700 transition-colors">
                    Register
                  </Link>
                </p>
              </div>

              <div className="mt-3 text-center">
                <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

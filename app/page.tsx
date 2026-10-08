'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-2xl bg-white shadow-xl lg:grid-cols-2">
          {/* Left side */}
          <div className="hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-center">
            <div className="max-w-md">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Business Management System
              </p>

              <h1 className="text-4xl font-bold leading-tight">
                Kitchenware
                <span className="block text-slate-300">Management</span>
              </h1>

              <p className="mt-5 text-base leading-7 text-slate-300">
                Manage products, inventory, purchases, sales, profits,
                customers, debts and stock from one simple system.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                  <p className="text-sm font-medium text-slate-400">
                    Inventory
                  </p>

                  <p className="mt-1 text-sm text-white">Track every batch</p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                  <p className="text-sm font-medium text-slate-400">Profit</p>

                  <p className="mt-1 text-sm text-white">
                    Know your real profit
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login side */}
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              {/* Mobile heading */}
              <div className="mb-8 lg:hidden">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Business Management System
                </p>

                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  Kitchenware Management
                </h1>
              </div>

              {/* Desktop heading */}
              <div className="mb-8 hidden lg:block">
                <h2 className="text-3xl font-bold text-slate-900">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Sign in to continue to your dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Error */}
              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <p className="mt-8 text-center text-xs text-slate-400">
                Kitchenware Management V1
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');

      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <section className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <form onSubmit={handleSubmit} className="w-full rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h1 className="mb-2 text-2xl font-bold text-blue-950">تسجيل الدخول</h1>
          <p className="mb-6 text-sm text-gray-600">أدخل بيانات الحساب للوصول إلى النظام.</p>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-gray-600">البريد الإلكتروني</span>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full outline-none"
                placeholder="name@example.com"
              />
            </div>
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-gray-600">كلمة المرور</span>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Lock className="h-4 w-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full outline-none"
                placeholder="••••••••"
              />
            </div>
          </label>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            دخول
          </button>
        </form>
      </section>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, LayoutDashboard, Loader2, LogOut } from 'lucide-react';

export default function HomePageClient() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setStatus('جاري رفع الملف...');
    let uploadedCvId = '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (uploadRes.status === 401) return handleLogout();

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'فشل رفع الملف');
      uploadedCvId = uploadData.cvId || '';

      setStatus('جاري استخراج بيانات السيرة...');
      const fileData = await readFileAsBase64(file);
      const parseRes = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData,
          mimeType: file.type,
        }),
      });
      if (parseRes.status === 401) return handleLogout();

      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error || 'فشل استخراج البيانات');

      const extractedData = typeof parseData.data === 'string' ? JSON.parse(parseData.data) : parseData.data;
      const updateRes = await fetch('/api/candidates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uploadData.cvId, data: extractedData }),
      });
      if (updateRes.status === 401) return handleLogout();

      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'فشل حفظ البيانات');

      router.push(`/review/${uploadData.cvId}`);
    } catch (err) {
      if (uploadedCvId) {
        try {
          await fetch('/api/candidates', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: uploadedCvId }),
          });
        } catch {}
      }

      const message = err?.message === 'Failed to fetch'
        ? 'تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم حاول مرة أخرى.'
        : (err?.message || 'حدث خطأ غير متوقع');
      setError(message);
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-950">CV Filter Free</h1>
            <p className="mt-2 text-gray-600">ارفع السيرة الذاتية، راجع البيانات المستخرجة، ثم فلتر المرشحين بسهولة.</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LayoutDashboard className="h-4 w-4" />
              لوحة التحكم
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>

        <form onSubmit={handleUpload} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500 hover:bg-blue-50">
            <FileUp className="mb-3 h-10 w-10 text-blue-600" />
            <span className="font-medium text-gray-900">{file ? file.name : 'اختر ملف السيرة الذاتية'}</span>
            <span className="mt-1 text-sm text-gray-500">PDF أو صورة JPG/PNG</span>
            <input
              type="file"
              accept=".pdf,image/*"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>

          {status && <p className="mt-4 text-sm text-blue-700">{status}</p>}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!file || loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            استخراج البيانات
          </button>
        </form>
      </section>
    </main>
  );
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

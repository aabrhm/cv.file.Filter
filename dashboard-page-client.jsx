'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Filter, GraduationCap, Loader2, LogOut, MapPin, Search, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DEFAULT_FILTERS = {
  searches: [''],
  skills: '',
  specialization: '',
  location: '',
  minExp: 0,
  maxExp: 50,
};

export default function DashboardPageClient() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      const searchTerms = (filters.searches || []).filter(Boolean);

      if (searchTerms.length) params.append('search', searchTerms.join(','));
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.specialization) params.append('specialization', filters.specialization);
      if (filters.location) params.append('location', filters.location);
      params.append('minExp', String(filters.minExp));
      params.append('maxExp', String(filters.maxExp));

      const res = await fetch(`/api/candidates?${params.toString()}`);
      if (res.status === 401) return handleLogout();

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحميل المرشحين');
      setCandidates(data.candidates || []);
    } catch (error) {
      alert(error.message || 'حدث خطأ أثناء تحميل المرشحين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [filters.minExp, filters.maxExp]);

  const deleteCandidate = async (candidate) => {
    const name = candidate.parsedData?.name || candidate.fileName || 'هذا المرشح';
    if (!confirm(`هل تريد حذف ${name}؟`)) return;

    setDeletingId(candidate.id);

    try {
      const res = await fetch('/api/candidates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidate.id }),
      });
      if (res.status === 401) return handleLogout();

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المرشح');

      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
    } catch (error) {
      alert(error.message || 'حدث خطأ أثناء حذف المرشح');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      <header className="border-b bg-white p-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-950">فلترة السير الذاتية</h1>
          <div className="flex items-center gap-2">
            <a href="/" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100">
              رفع سيرة جديدة
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6 lg:flex-row">
        <aside className="h-fit rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:sticky lg:top-6 lg:w-80">
          <div className="mb-6 flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold">الفلاتر</h2>
          </div>

          <div className="mb-6">
            <div className="space-y-2">
              {(filters.searches || []).map((term, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="اسم أو مهارة"
                    value={term}
                    onChange={(value) =>
                      setFilters({
                        ...filters,
                        searches: filters.searches.map((s, i) => (i === idx ? value : s)),
                      })
                    }
                    onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const next = [...filters.searches];
                      next[idx] = '';
                      setFilters({ ...filters, searches: next });
                    }}
                    className="text-gray-600"
                    aria-label="مسح حقل البحث"
                  >
                    مسح
                  </button>

                  {filters.searches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, searches: filters.searches.filter((_, i) => i !== idx) })}
                      className="text-red-600"
                      aria-label="حذف حقل بحث"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, searches: [...(filters.searches || []), ''] })}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
                >
                  + إضافة حقل بحث
                </button>

                <button
                  type="button"
                  onClick={fetchCandidates}
                  className="ml-auto inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  aria-label="بحث"
                >
                  <Search className="h-5 w-5" />
                  <span className="mr-2">بحث</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block">
              <span className="mb-1 block text-sm text-gray-600">المهارات، مفصولة بفاصلة</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filters.skills}
                  onChange={(event) => setFilters({ ...filters, skills: event.target.value })}
                  className="w-full rounded-lg border p-3"
                />
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, skills: '' })}
                  className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  مسح
                </button>
              </div>
            </label>
          </div>

          <div className="mb-4">
            <label className="block">
              <span className="mb-1 block text-sm text-gray-600">التخصص</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filters.specialization}
                  placeholder="محاسبة، تطوير ويب"
                  onChange={(event) => setFilters({ ...filters, specialization: event.target.value })}
                  className="w-full rounded-lg border p-3"
                />
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, specialization: '' })}
                  className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  مسح
                </button>
              </div>
            </label>
          </div>

          <div className="mb-4">
            <label className="block">
              <span className="mb-1 block text-sm text-gray-600">المدينة</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filters.location}
                  placeholder="الرياض، جدة"
                  onChange={(event) => setFilters({ ...filters, location: event.target.value })}
                  className="w-full rounded-lg border p-3"
                />
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, location: '' })}
                  className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  مسح
                </button>
              </div>
            </label>
          </div>

          <div className="mt-6">
            <span className="mb-2 block text-sm text-gray-600">سنوات الخبرة</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600">من</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minExp}
                    onChange={(event) => setFilters({ ...filters, minExp: Number(event.target.value) })}
                    className="w-full rounded-lg border p-3"
                  />
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, minExp: 0 })}
                    className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    مسح
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-gray-600">إلى</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.maxExp}
                    onChange={(event) => setFilters({ ...filters, maxExp: Number(event.target.value) })}
                    className="w-full rounded-lg border p-3"
                  />
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, maxExp: 50 })}
                    className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    مسح
                  </button>
                </div>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              fetchCandidates();
            }}
            className="mt-6 w-full rounded-lg border py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            إعادة ضبط الفلاتر
          </button>
        </aside>

        <section className="flex-1">
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">عدد المرشحين</p>
            <p className="text-2xl font-bold text-blue-950">{candidates.length}</p>
          </div>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
              <User className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg text-gray-500">لا يوجد مرشحون</p>
              <p className="mt-2 text-sm text-gray-400">ارفع سيرة ذاتية جديدة من الصفحة الرئيسية.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  deleting={deletingId === candidate.id}
                  onDelete={() => deleteCandidate(candidate)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, onKeyDown }) {
  return (
    <label className="block w-full">
      {label && <span className="mb-1 block text-sm text-gray-600">{label}</span>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border p-3"
      />
    </label>
  );
}

function CandidateCard({ candidate, deleting, onDelete }) {
  const data = candidate.parsedData || {};

  return (
    <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold text-gray-950">{data.name || 'بدون اسم'}</h3>
              <p className="text-sm text-gray-500">{[data.email, data.phone].filter(Boolean).join(' | ')}</p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {(data.skills || []).slice(0, 8).map((skill) => (
              <span key={skill} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{skill}</span>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <Meta
              icon={<Briefcase />}
              text={(() => {
                const jobTitle = data.experience?.[0]?.title;
                const parts = [];

                if (data.specialization) parts.push(data.specialization);
                if (jobTitle) parts.push(jobTitle);
                if (data.totalYearsExperience !== undefined) parts.push(`${data.totalYearsExperience} سنوات خبرة`);

                return parts.join(' • ');
              })()}
            />
            <Meta icon={<MapPin />} text={data.location} />
            <Meta icon={<GraduationCap />} text={data.education?.[0]?.degree} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-y-2 border-t pt-4 text-sm">
        <a href={`/review/${candidate.id}`} className="font-medium text-blue-600 hover:underline">
          تعديل البيانات
        </a>
        <span className="mx-2 text-gray-300">|</span>

        {candidate.hasFile ? (
          <a href={`/api/candidates/file/${candidate.id}`} className="font-medium text-green-600 hover:underline">
            تحميل السيرة
          </a>
        ) : (
          <span className="text-gray-400">لا يوجد ملف للتنزيل</span>
        )}

        <span className="mx-2 text-gray-300">|</span>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          حذف المرشح
        </button>

        {(data.specialization || data.totalYearsExperience !== undefined) && (
          <>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-gray-500">
              {data.specialization ? data.specialization : ''}
              {data.specialization && data.totalYearsExperience !== undefined ? ' • ' : ''}
              {data.totalYearsExperience !== undefined ? `${data.totalYearsExperience} سنوات خبرة` : ''}
            </span>
          </>
        )}

        <span className="mx-2 text-gray-300">|</span>
        <span className="text-gray-400">تم الاستخراج: {new Date(candidate.createdAt).toLocaleDateString('ar-SA')}</span>
      </div>
    </article>
  );
}

function Meta({ icon, text }) {
  if (!text) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {text}
    </span>
  );
}

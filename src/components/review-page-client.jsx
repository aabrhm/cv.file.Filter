'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Briefcase, GraduationCap, Languages, Loader2, LogOut, Mail, MapPin, Phone, Save, User, Wrench } from 'lucide-react';

export default function ReviewPageClient() {
  const params = useParams();
  const router = useRouter();
  const id = useMemo(() => String(params?.id || ''), [params]);

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadCandidate = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/candidates');
        if (res.status === 401) return handleLogout();

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'تعذر تحميل بيانات المرشحين');

        const cv = (result.candidates || []).find((candidate) => candidate.id === id);
        if (!cv) throw new Error('لم يتم العثور على بيانات هذا المرشح');

        if (mounted) setData(cv.parsedData || {});
      } catch (err) {
        if (mounted) setError(err.message || 'تعذر تحميل بيانات السيرة');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) {
      loadCandidate();
    } else {
      setError('معرف المرشح غير صالح');
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, key, value) => {
    setData((prev) => {
      const arr = [...(prev[field] || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const addItem = (field, template) => {
    setData((prev) => ({ ...prev, [field]: [...(prev[field] || []), template] }));
  };

  const handleDownloadData = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `${data.name?.replace(/[^a-zA-Z0-9\u0000-\u007F]/g, '_') || id}-data.json`;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/candidates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, data }),
      });
      if (res.status === 401) return handleLogout();

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل حفظ البيانات');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'تعذر حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-950">مراجعة البيانات المستخرجة</h1>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadData}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-5 py-3 text-blue-600 hover:bg-blue-50"
            >
              تنزيل البيانات
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              حفظ والانتقال للوحة التحكم
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-3 text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>

        <section className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <User className="h-5 w-5 text-blue-600" />
            المعلومات الشخصية
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="الاسم الكامل" value={data.name || ''} onChange={(value) => handleChange('name', value)} />
            <Field label="البريد الإلكتروني" icon={<Mail />} type="email" value={data.email || ''} onChange={(value) => handleChange('email', value)} />
            <Field label="رقم الجوال" icon={<Phone />} value={data.phone || ''} onChange={(value) => handleChange('phone', value)} />
            <Field label="الموقع" icon={<MapPin />} value={data.location || ''} onChange={(value) => handleChange('location', value)} />
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm text-gray-600">الملخص المهني</span>
            <textarea
              value={data.summary || ''}
              onChange={(event) => handleChange('summary', event.target.value)}
              rows={3}
              className="w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="سنوات الخبرة الإجمالية"
              type="number"
              value={data.totalYearsExperience ?? 0}
              onChange={(value) => handleChange('totalYearsExperience', Number(value || 0))}
            />
          </div>
        </section>

        <EditableList
          title="الخبرات العملية"
          icon={<Briefcase />}
          items={data.experience || []}
          addLabel="إضافة خبرة"
          onAdd={() => addItem('experience', { title: '', company: '', duration: '', description: '' })}
          renderItem={(exp, idx) => (
            <>
              <Field placeholder="المسمى الوظيفي" value={exp.title || ''} onChange={(value) => handleArrayChange('experience', idx, 'title', value)} />
              <Field placeholder="الشركة" value={exp.company || ''} onChange={(value) => handleArrayChange('experience', idx, 'company', value)} />
              <Field placeholder="المدة (مثال: 2020-2024)" value={exp.duration || ''} onChange={(value) => handleArrayChange('experience', idx, 'duration', value)} />
              <textarea
                placeholder="وصف مختصر"
                value={exp.description || ''}
                onChange={(event) => handleArrayChange('experience', idx, 'description', event.target.value)}
                className="md:col-span-2 rounded-lg border p-3"
                rows={2}
              />
            </>
          )}
        />

        <EditableList
          title="التعليم"
          icon={<GraduationCap />}
          items={data.education || []}
          addLabel="إضافة تعليم"
          onAdd={() => addItem('education', { degree: '', field: '', institution: '', year: '' })}
          renderItem={(edu, idx) => (
            <>
              <Field placeholder="الشهادة" value={edu.degree || ''} onChange={(value) => handleArrayChange('education', idx, 'degree', value)} />
              <Field placeholder="التخصص" value={edu.field || ''} onChange={(value) => handleArrayChange('education', idx, 'field', value)} />
              <Field placeholder="المؤسسة" value={edu.institution || ''} onChange={(value) => handleArrayChange('education', idx, 'institution', value)} />
              <Field placeholder="السنة" value={edu.year || ''} onChange={(value) => handleArrayChange('education', idx, 'year', value)} />
            </>
          )}
        />

        <section className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Wrench className="h-5 w-5 text-blue-600" />
            المهارات
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {(data.skills || []).map((skill, idx) => (
              <input
                key={idx}
                value={skill}
                onChange={(event) => {
                  const skills = [...(data.skills || [])];
                  skills[idx] = event.target.value;
                  handleChange('skills', skills);
                }}
                className="w-40 rounded-full border bg-blue-50 px-3 py-2 text-center text-sm text-blue-900"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleChange('skills', [...(data.skills || []), ''])}
            className="text-sm text-blue-600 hover:underline"
          >
            + إضافة مهارة
          </button>
        </section>

        <EditableList
          title="اللغات"
          icon={<Languages />}
          items={data.languages || []}
          addLabel="إضافة لغة"
          onAdd={() => addItem('languages', { name: '', level: '' })}
          renderItem={(lang, idx) => (
            <>
              <Field placeholder="اللغة" value={lang.name || ''} onChange={(value) => handleArrayChange('languages', idx, 'name', value)} />
              <Field placeholder="المستوى" value={lang.level || ''} onChange={(value) => handleArrayChange('languages', idx, 'level', value)} />
            </>
          )}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-8 py-4 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
            حفظ والذهاب للوحة التحكم
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, icon, type = 'text', value, onChange, placeholder }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm text-gray-600">{label}</span>}
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </label>
  );
}

function EditableList({ title, icon, items, addLabel, onAdd, renderItem }) {
  return (
    <section className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <span className="text-blue-600 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        {title}
      </h2>
      {items.map((item, idx) => (
        <div key={idx} className="mb-3 grid grid-cols-1 gap-3 rounded-lg border bg-gray-50 p-4 md:grid-cols-2">
          {renderItem(item, idx)}
        </div>
      ))}
      <button type="button" onClick={onAdd} className="text-sm text-blue-600 hover:underline">
        + {addLabel}
      </button>
    </section>
  );
}

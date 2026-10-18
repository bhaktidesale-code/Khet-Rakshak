import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { OperatorAssignment, getOperatorAssignments } from '../services/authService';

interface OtherDashboardsProps {
  currentLanguage: 'en' | 'hi' | 'mr' | 'gu' | 'pa' | 'ta' | 'te' | 'kn' | 'bn';
  currentTheme: 'light' | 'dark';
  currentRole: 'drone_pilot' | 'outlet_manager' | 'admin';
  identity?: User;
  userName?: string;
}

export default function OtherDashboards({ currentRole, currentTheme, identity, userName }: OtherDashboardsProps) {
  const [assignments, setAssignments] = useState<OperatorAssignment[]>([]);
  const [loading, setLoading] = useState(currentRole === 'drone_pilot');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentRole !== 'drone_pilot' || !identity) return;
    let active = true;
    setLoading(true);
    setError('');
    void getOperatorAssignments(identity)
      .then(({ assignments: result }) => { if (active) setAssignments(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load your work.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentRole, identity]);

  if (currentRole !== 'drone_pilot') {
    return <section className={`mx-auto max-w-3xl rounded-3xl border border-stone-200 p-6 shadow-sm ${currentTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-stone-900'}`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Not available yet</p>
      <h1 className="mt-2 text-2xl font-bold text-stone-900 dark:text-white">Manager tools</h1>
      <p className="mt-3 text-base leading-7 text-stone-700 dark:text-gray-200">Management tools are not available yet. Outlet tasks will appear here when the service is ready.</p>
    </section>;
  }

  return <main className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-3xl bg-emerald-800 p-6 text-white sm:p-8">
      <p className="text-sm text-emerald-100">Drone pilot workspace</p>
      <h1 className="mt-2 text-3xl font-bold">Your assigned visits</h1>
      <p className="mt-2 text-emerald-50">{userName ? `Hello, ${userName}. ` : ''}Check the work assigned to your account.</p>
    </header>
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-xl font-bold text-stone-900 dark:text-white">Assigned jobs</h2>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading ? <p role="status" className="mt-4 text-base text-stone-600">Loading assigned visits…</p> : null}
      {!loading && !error && assignments.length === 0 && <p className="mt-4 rounded-xl bg-stone-50 p-4 text-base text-stone-700">No visits are assigned to your account right now.</p>}
      <div className="mt-4 space-y-3">{assignments.map((job) => <article key={job.id} className="rounded-xl border border-stone-200 p-4">
        <h3 className="text-lg font-semibold">{job.farmName}</h3>
        <p className="mt-1 text-sm text-stone-700">{job.farmerName} · {job.village} · {job.crop}</p>
        <p className="mt-2 text-sm text-stone-700">Visit: {job.scheduledAt} · Status: {job.status}</p>
      </article>)}</div>
      <p className="mt-5 border-t border-stone-200 pt-4 text-sm leading-6 text-stone-600 dark:text-gray-200">Changing visit status, uploading images, and sending scan results are not available yet.</p>
    </section>
  </main>;
}

import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, LoaderCircle } from 'lucide-react';

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return <header className="space-y-2"><h1 className="text-3xl font-bold leading-tight text-[#17251c] dark:text-white">{title}</h1>{description && <p className="max-w-3xl text-lg leading-7 text-[#465449] dark:text-gray-200">{description}</p>}</header>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <section className="rounded-2xl border border-[#7b8d80] bg-[#f7f9f5] p-5 dark:bg-gray-800" aria-label={title}>
    <Info aria-hidden="true" className="h-6 w-6 text-[#176b3a] dark:text-emerald-300" />
    <h2 className="mt-3 text-lg font-bold text-[#17251c] dark:text-white">{title}</h2>
    <p className="mt-1 text-base leading-6 text-[#465449] dark:text-gray-200">{detail}</p>
    {action && <div className="mt-4">{action}</div>}
  </section>;
}

export function StatusBadge({ status, tone = 'info' }: { status: string; tone?: 'info' | 'success' | 'warning' | 'error' }) {
  const styles = {
    info: 'border-[#174ea6] bg-blue-50 text-[#174ea6] dark:bg-blue-950 dark:text-blue-200',
    success: 'border-[#176b3a] bg-green-50 text-[#176b3a] dark:bg-green-950 dark:text-green-200',
    warning: 'border-[#854d0e] bg-amber-50 text-[#854d0e] dark:bg-amber-950 dark:text-amber-200',
    error: 'border-[#b42318] bg-red-50 text-[#b42318] dark:bg-red-950 dark:text-red-200',
  };
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
  return <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${styles[tone]}`}><Icon aria-hidden="true" className="h-4 w-4" />{status}</span>;
}

export function LoadingState({ label }: { label: string }) {
  return <p role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-[#7b8d80] bg-white p-4 text-base text-[#465449] dark:bg-gray-900 dark:text-gray-200"><LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />{label}</p>;
}

export function ErrorState({ title, detail }: { title: string; detail: string }) {
  return <section role="alert" className="rounded-xl border border-[#b42318] bg-red-50 p-4 text-[#7a1b14] dark:bg-red-950 dark:text-red-100"><h2 className="flex items-center gap-2 font-bold"><AlertCircle aria-hidden="true" className="h-5 w-5" />{title}</h2><p className="mt-1 leading-6">{detail}</p></section>;
}

import { useState } from 'react';
import { User } from 'firebase/auth';
import { ArrowLeft, CheckCircle2, CircleHelp, Shield, UserRound, Plane } from 'lucide-react';
import { AppRole, signInWithGoogle } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';

interface AuthPageProps {
  onAuthenticated: (user: User, requestedRole: AppRole) => Promise<void>;
  onBack: () => void;
}

const roleOptions: { role: AppRole; title: string; description: string; icon: typeof UserRound }[] = [
  { role: 'FARMER', title: 'Farmer', description: 'Manage your farms and crop health.', icon: UserRound },
  { role: 'DRONE_PILOT', title: 'Drone Pilot', description: 'Access assigned drone operations after approval.', icon: Plane },
  { role: 'ADMIN', title: 'Administrator', description: 'Secure sign-in for provisioned administrators only.', icon: Shield },
];

export default function AuthPage({ onAuthenticated, onBack }: AuthPageProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole>('FARMER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const runAuthentication = async (user: User) => {
    setError('');
    try {
      await onAuthenticated(user, selectedRole);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Sign-in failed. Try again.');
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      await runAuthentication(await signInWithGoogle());
    } catch (authError) {
      const code = getFirebaseErrorCode(authError);
      setError(code === 'auth/popup-closed-by-user'
        ? 'Google sign-in was cancelled.'
        : 'Google sign-in could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-busy={busy} className="mx-auto my-6 max-w-3xl rounded-3xl border border-[#7b8d80] bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:my-8 sm:p-9">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400">
        <ArrowLeft className="h-4 w-4" /> Back to Khet Rakshak
      </button>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white">
          <Shield className="h-7 w-7" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Har Khet Ki Digital Suraksha</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-emerald-950 dark:text-white">Secure sign in</h1>
        <p className="mt-2 text-sm text-gray-500">Choose the portal you need. Your account permissions are verified securely.</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Choose portal">
        {roleOptions.map(({ role, title, description, icon: Icon }) => (
          <button
            key={role}
            type="button"
            aria-pressed={selectedRole === role}
            onClick={() => { setSelectedRole(role); setError(''); }}
            className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              selectedRole === role
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-gray-200 hover:border-emerald-300 dark:border-gray-700'
            }`}
          >
            <Icon className="mb-2 h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            <span className="block text-sm font-bold">{title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-gray-500">{description}</span>
          </button>
        ))}
      </div>

      {!isFirebaseConfigured && (
        <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Authentication is not configured yet. The site administrator must configure the Firebase client environment variables.
        </div>
      )}
      {error && <p id="auth-error" role="alert" className="mb-4 rounded-xl border border-[#b42318] bg-red-50 p-3 text-base text-[#7a1b14]">{error}</p>}

      <button
        type="button"
        disabled={busy || !isFirebaseConfigured}
        onClick={handleGoogle}
        className="group flex w-full items-center justify-center gap-3 rounded-lg border border-[#747775] bg-white px-4 py-3 font-medium text-[#1f1f1f] shadow-sm transition hover:bg-[#f8faff] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285f4] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-500 dark:bg-white dark:text-[#1f1f1f]"
      >
        {busy ? (
          <span>Please wait…</span>
        ) : (
          <>
            <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.89c-.58 2.96-2.25 5.48-4.72 7.18l7.63 5.91c4.45-4.1 7.18-10.14 7.18-17.56Z" />
              <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.94 23.94 0 0 0 0 21.56l7.98-6.19Z" />
              <path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.87-5.79l-7.63-5.91c-2.12 1.42-4.84 2.2-8.24 2.2-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <div className="mt-6 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-500 dark:bg-gray-800">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
        <p><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />Pilot access requires administrator approval. Administrator accounts are provisioned privately and cannot be self-registered.</p>
      </div>
    </section>
  );
}

function getFirebaseErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}

import { FormEvent, useState } from 'react';
import { User } from 'firebase/auth';
import { Shield } from 'lucide-react';
import { updateProfile } from '../services/authService';

interface ProfileSetupProps {
  identity: User;
  onComplete: (user: Awaited<ReturnType<typeof updateProfile>>) => void | Promise<void>;
}

export default function ProfileSetup({ identity, onComplete }: ProfileSetupProps) {
  const [fullName, setFullName] = useState(identity.displayName || '');
  const [village, setVillage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onComplete(await updateProfile(identity, { fullName: fullName.trim(), village: village.trim() }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto my-10 max-w-xl rounded-3xl border border-gray-100 bg-white p-7 shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-emerald-700 p-3 text-white"><Shield className="h-6 w-6" /></div>
        <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Khet Rakshak</p><h1 className="font-display text-xl font-bold">Complete your farmer profile</h1></div>
      </div>
      <p className="mb-5 text-sm text-gray-500">Add your name and village before opening your farm workspace.</p>
      {error && <p id="profile-error" role="alert" className="mb-4 rounded-lg border border-[#b42318] bg-red-50 p-3 text-base text-[#7a1b14]">{error}</p>}
      <form onSubmit={saveProfile} aria-busy={busy} className="space-y-4">
        <label className="block text-sm font-semibold">Full name
          <input required minLength={2} maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-3 font-normal dark:border-gray-700" />
        </label>
        <label className="block text-sm font-semibold">Village
          <input required maxLength={120} value={village} onChange={(event) => setVillage(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-3 font-normal dark:border-gray-700" />
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{busy ? 'Saving…' : 'Save profile and continue'}</button>
      </form>
    </section>
  );
}

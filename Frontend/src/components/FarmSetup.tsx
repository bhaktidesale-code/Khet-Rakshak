import { FormEvent, useState } from 'react';
import { User } from 'firebase/auth';
import { ArrowLeft, LoaderCircle, MapPin } from 'lucide-react';
import { Farm } from '../types';
import { saveFarmerFarm } from '../services/authService';

interface FarmSetupProps {
  identity: User;
  onCancel: () => void;
  onSave: (farm: Farm) => void;
}

export default function FarmSetup({ identity, onCancel, onSave }: FarmSetupProps) {
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [area, setArea] = useState('');
  const [crop, setCrop] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await saveFarmerFarm(identity, {
        name: name.trim(),
        location: village.trim(),
        areaAcres: Number(area),
        crop: crop.trim(),
      });
      onSave({
        id: saved.id,
        name: saved.name,
        location: saved.location,
        area: saved.areaAcres,
        areaUnit: 'acre',
        crop: saved.crop,
        sowingDate: '',
        irrigationType: 'unknown',
        latestHealthScore: null,
        lastScanDate: 'Not scanned',
        nextScanDate: 'Not scheduled',
        activeAlertsCount: 0,
        boundary: [],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this farm. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto my-8 max-w-xl rounded-3xl border border-gray-100 bg-white p-7 shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <button type="button" onClick={onCancel} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to farms
      </button>
      <h1 className="font-display text-2xl font-extrabold">Add a farm plot</h1>
      <p className="mt-2 flex gap-2 text-sm text-gray-600 dark:text-gray-300">
        <MapPin className="h-4 w-4 shrink-0" /> Farm details are saved to your account and can be selected by an authorized drone operator.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Farm name
          <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-3 font-normal dark:border-gray-700" />
        </label>
        <label className="block text-sm font-semibold">Village / location
          <input required maxLength={120} value={village} onChange={(event) => setVillage(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-3 font-normal dark:border-gray-700" />
        </label>
        <label className="block text-sm font-semibold">Area (acres)
          <input required type="number" min="0.01" step="0.01" value={area} onChange={(event) => setArea(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-3 font-normal dark:border-gray-700" />
        </label>
        <label className="block text-sm font-semibold">Primary crop
          <input required maxLength={80} value={crop} onChange={(event) => setCrop(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-3 font-normal dark:border-gray-700" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
        <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
          {saving && <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />}
          {saving ? 'Saving farm…' : 'Save farm plot'}
        </button>
      </form>
    </section>
  );
}

export function EmptyFarmState({ onAddFarm }: { onAddFarm: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-display text-xl font-bold text-emerald-950 dark:text-white">Start with your farm</h2>
      <p className="mt-2 text-sm text-gray-500">Save a plot to your account to make it available across your devices.</p>
      <button onClick={onAddFarm} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Add a farm plot</button>
    </div>
  );
}

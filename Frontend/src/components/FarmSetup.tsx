import { FormEvent, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Farm } from '../types';

interface FarmSetupProps {
  onCancel: () => void;
  onSave: (farm: Farm) => void;
}

export default function FarmSetup({ onCancel, onSave }: FarmSetupProps) {
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [area, setArea] = useState('');
  const [crop, setCrop] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      id: `session-farm-${crypto.randomUUID()}`,
      name: name.trim(),
      location: village.trim(),
      area: Number(area),
      areaUnit: 'acre',
      crop: crop.trim(),
      sowingDate: new Date().toISOString().slice(0, 10),
      irrigationType: 'rainfed',
      latestHealthScore: 0,
      lastScanDate: 'Not scanned',
      nextScanDate: 'Not scheduled',
      activeAlertsCount: 0,
      boundary: [],
    });
  };

  return (
    <section className="mx-auto my-8 max-w-xl rounded-3xl border border-gray-100 bg-white p-7 shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <button type="button" onClick={onCancel} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to farms
      </button>
      <h1 className="font-display text-2xl font-extrabold">Add a farm plot</h1>
      <p className="mt-2 flex gap-2 text-sm text-amber-800 dark:text-amber-400">
        <MapPin className="h-4 w-4 shrink-0" /> This prototype stores plot details only in the current browser session. No farm database/API exists yet.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
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
        <button type="submit" className="w-full rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800">Add plot for this session</button>
      </form>
    </section>
  );
}

export function EmptyFarmState({ onAddFarm }: { onAddFarm: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-display text-xl font-bold text-emerald-950 dark:text-white">Start with your farm</h2>
      <p className="mt-2 text-sm text-gray-500">Add a plot in this session to explore the farm dashboard and booking preview.</p>
      <button onClick={onAddFarm} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Add a farm plot</button>
    </div>
  );
}

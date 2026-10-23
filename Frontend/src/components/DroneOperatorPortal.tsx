import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { AlertCircle, CheckCircle2, Clock3, ImagePlus, LoaderCircle, MapPin, Search, Upload, UserRound } from 'lucide-react';
import {
  createDroneUpload,
  DroneUploadBatch,
  DroneUploadFile,
  DroneUploadResult,
  findOperatorFarmer,
  getOperatorDroneUploads,
  OperatorFarmer,
} from '../services/authService';

interface DroneOperatorPortalProps {
  identity: User | null;
  userName: string;
}

interface SelectedImage extends DroneUploadFile {
  preview: string;
}

const MAX_FILES = 8;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export default function DroneOperatorPortal({ identity, userName }: DroneOperatorPortalProps) {
  const [farmerId, setFarmerId] = useState('');
  const [farmer, setFarmer] = useState<OperatorFarmer | null>(null);
  const [farmId, setFarmId] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [results, setResults] = useState<DroneUploadResult[]>([]);
  const [batchId, setBatchId] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [fileError, setFileError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [activeProgress, setActiveProgress] = useState<{ id: string; value: number } | null>(null);
  const [history, setHistory] = useState<DroneUploadBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(Boolean(identity));
  const [historyError, setHistoryError] = useState('');
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const selectedFarm = farmer?.farms.find((farm) => farm.id === farmId) || null;
  const totalSize = useMemo(() => images.reduce((sum, image) => sum + image.file.size, 0), [images]);
  const uploadedIds = new Set(results.filter((result) => result.status === 'uploaded').map((result) => result.clientImageId));
  const failedResults = results.filter((result) => result.status === 'failed');

  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview)), []);

  useEffect(() => {
    if (!identity) {
      setHistoryLoading(false);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    setHistoryError('');
    void getOperatorDroneUploads(identity)
      .then((response) => { if (active) setHistory(response.uploads); })
      .catch((error: unknown) => { if (active) setHistoryError(error instanceof Error ? error.message : 'Could not load upload history.'); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [identity]);

  const searchFarmer = async (event: FormEvent) => {
    event.preventDefault();
    if (!identity) return;
    setSearching(true);
    setFarmer(null);
    setFarmId('');
    setSearchError('');
    clearWorkspace();
    try {
      const result = await findOperatorFarmer(identity, farmerId.trim());
      setFarmer(result);
      if (result.farms.length === 1) setFarmId(result.farms[0].id);
      if (!result.farms.length) setSearchError('This farmer has no registered farm plots yet. Ask the farmer to add a plot before uploading images.');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not verify that Farmer ID.');
    } finally {
      setSearching(false);
    }
  };

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    setFileError('');
    const remaining = MAX_FILES - images.length;
    const incoming = Array.from(files);
    if (incoming.length > remaining) {
      setFileError(`You can select up to ${MAX_FILES} images for one visit.`);
      return;
    }
    const additions: SelectedImage[] = [];
    for (const file of incoming) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setFileError(`${file.name}: only JPEG and PNG images are supported.`);
        continue;
      }
      if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
        setFileError(`${file.name}: choose a file smaller than 15 MB.`);
        continue;
      }
      try {
        const bitmap = await createImageBitmap(file);
        if (bitmap.width * bitmap.height > 50_000_000) {
          bitmap.close();
          setFileError(`${file.name}: image dimensions exceed the supported limit.`);
          continue;
        }
        bitmap.close();
        additions.push({ file, clientImageId: crypto.randomUUID(), preview: URL.createObjectURL(file) });
      } catch {
        setFileError(`${file.name}: this file could not be read as an image.`);
      }
    }
    setImages((current) => [...current, ...additions]);
    setResults([]);
    setConfirmed(false);
    setBatchId('');
  };

  const removeImage = (clientImageId: string) => {
    const item = images.find((image) => image.clientImageId === clientImageId);
    if (item) URL.revokeObjectURL(item.preview);
    setImages((current) => current.filter((image) => image.clientImageId !== clientImageId));
    setResults((current) => current.filter((result) => result.clientImageId !== clientImageId));
    setConfirmation(false);
    setConfirmed(false);
    setBatchId('');
  };

  const clearWorkspace = () => {
    images.forEach((image) => URL.revokeObjectURL(image.preview));
    setImages([]);
    setResults([]);
    setConfirmation(false);
    setConfirmed(false);
    setBatchId('');
    setUploadError('');
  };

  const uploadImages = async () => {
    if (!identity || !farmer || !selectedFarm || !confirmation || !images.length) return;
    const currentBatchId = batchId || crypto.randomUUID();
    setBatchId(currentBatchId);
    setUploadError('');
    setUploading(true);
    let nextResults = [...results];
    const pending = images.filter((image) => !uploadedIds.has(image.clientImageId));
    const bytesToUpload = pending.reduce((sum, image) => sum + image.file.size, 0);
    for (const image of pending) {
      try {
        const response = await createDroneUpload(identity, {
          farmerId: farmer.farmerId,
          farmId: selectedFarm.id,
          batchId: currentBatchId,
          expectedImageCount: images.length,
          files: [image],
        }, (progress) => {
          setActiveProgress({ id: image.clientImageId, value: progress });
        });
        nextResults = [
          ...nextResults.filter((result) => result.clientImageId !== image.clientImageId),
          ...response.results,
        ];
        setResults(nextResults);
        if (response.status === 'COMPLETED') setConfirmed(true);
      } catch (error) {
        const failure: DroneUploadResult = {
          clientImageId: image.clientImageId,
          filename: image.file.name,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Upload failed. Please retry this image.',
        };
        nextResults = [...nextResults.filter((result) => result.clientImageId !== image.clientImageId), failure];
        setResults(nextResults);
      } finally {
        setActiveProgress(null);
      }
    }
    setUploading(false);
    setConfirmation(false);
    if (nextResults.length && nextResults.every((result) => result.status === 'uploaded') && nextResults.length === images.length) {
      setConfirmed(true);
    } else if (bytesToUpload === 0) {
      setUploadError('There are no failed images to retry.');
    }
    setHistoryLoading(true);
    setHistoryError('');
    void getOperatorDroneUploads(identity)
      .then((response) => setHistory(response.uploads))
      .catch((error: unknown) => setHistoryError(error instanceof Error ? error.message : 'Could not refresh upload history.'))
      .finally(() => setHistoryLoading(false));
  };

  const overallProgress = images.length === 0
    ? 0
    : Math.round((images.reduce((sum, image) => {
      if (uploadedIds.has(image.clientImageId)) return sum + image.file.size;
      if (activeProgress?.id === image.clientImageId) return sum + (image.file.size * activeProgress.value) / 100;
      return sum;
    }, 0) / Math.max(totalSize, 1)) * 100);

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl bg-emerald-800 p-6 text-white sm:p-8">
        <p className="text-sm text-emerald-100">Drone operator workspace</p>
        <h1 className="mt-2 text-3xl font-bold">Farm image visit</h1>
        <p className="mt-2 text-emerald-50">{userName ? `Welcome, ${userName}. ` : ''}Verify the farmer and field before sending images to their account.</p>
      </header>

      <section className="space-y-5 rounded-2xl border border-[#7b8d80] bg-white p-5 shadow-sm dark:border-[#536458] dark:bg-[#1b2920] sm:p-6" aria-labelledby="farmer-lookup-title">
        <div>
          <h2 id="farmer-lookup-title" className="text-xl font-bold text-[#17251c] dark:text-white">1. Identify the farmer</h2>
          <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">Search a registered Farmer ID. Only the verified name, village, and farms are shown.</p>
        </div>
        <form onSubmit={(event) => void searchFarmer(event)} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="operator-farmer-id" className="sr-only">Farmer ID</label>
          <input
            id="operator-farmer-id"
            value={farmerId}
            onChange={(event) => setFarmerId(event.target.value.toUpperCase())}
            placeholder="Farmer ID (example: KR-1234ABCD5678EF90)"
            required
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#7b8d80] bg-white px-4 text-base text-[#17251c] dark:bg-[#111a14] dark:text-white"
          />
          <button type="submit" disabled={searching || !identity} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176b3a] px-5 font-bold text-white disabled:opacity-60">
            {searching ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Search aria-hidden="true" className="h-5 w-5" />}
            {searching ? 'Verifying…' : 'Search farmer'}
          </button>
        </form>
        {searchError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{searchError}</p>}
        {farmer && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <UserRound aria-hidden="true" className="mt-1 h-6 w-6 text-emerald-800 dark:text-emerald-300" />
                <div>
                  <p className="text-lg font-bold text-[#17251c] dark:text-white">{farmer.fullName}</p>
                  <p className="text-sm text-[#465449] dark:text-[#c2cec3]">Farmer ID: <strong>{farmer.farmerId}</strong></p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-[#465449] dark:text-[#c2cec3]"><MapPin aria-hidden="true" className="h-4 w-4" />{farmer.village || 'Village not recorded'}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-[#1b2920] dark:text-emerald-300"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Verified profile</span>
            </div>
            {farmer.farms.length > 0 && (
              <label className="mt-4 block text-sm font-semibold text-[#17251c] dark:text-white">
                Select the field for this visit
                <select value={farmId} onChange={(event) => { setFarmId(event.target.value); clearWorkspace(); }} className="mt-1 min-h-12 w-full rounded-xl border border-[#7b8d80] bg-white px-3 dark:bg-[#111a14]">
                  <option value="">Choose a registered field</option>
                  {farmer.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name} · {farm.crop} · {farm.location}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
      </section>

      {farmer && selectedFarm && !confirmed && (
        <section className="space-y-5 rounded-2xl border border-[#7b8d80] bg-white p-5 shadow-sm dark:border-[#536458] dark:bg-[#1b2920] sm:p-6" aria-labelledby="operator-images-title">
          <div>
            <h2 id="operator-images-title" className="text-xl font-bold text-[#17251c] dark:text-white">2. Select and review images</h2>
            <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">JPEG or PNG · up to 15 MB each · maximum {MAX_FILES} images per visit.</p>
          </div>
          <div className="rounded-xl bg-[#f7f9f5] p-4 text-sm dark:bg-[#111a14]">
            <p className="font-bold text-[#17251c] dark:text-white">Upload destination</p>
            <p className="mt-1 text-[#465449] dark:text-[#c2cec3]">{farmer.fullName} · {farmer.farmerId} · {selectedFarm.name} · {selectedFarm.location}</p>
          </div>
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#7b8d80] bg-[#f7f9f5] p-4 text-center text-sm font-semibold text-[#174c2c] hover:bg-[#f1f7f1] dark:bg-[#111a14] dark:text-emerald-300">
            <ImagePlus aria-hidden="true" className="h-7 w-7" />
            Choose drone photos
            <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple onChange={(event) => { void addImages(event.target.files); event.currentTarget.value = ''; }} className="sr-only" />
          </label>
          {fileError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{fileError}</p>}
          {images.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image) => {
                  const result = results.find((item) => item.clientImageId === image.clientImageId);
                  const isActive = activeProgress?.id === image.clientImageId;
                  return (
                    <article key={image.clientImageId} className="overflow-hidden rounded-xl border border-[#7b8d80] dark:border-[#536458]">
                      <img src={image.preview} alt={`Preview of ${image.file.name}`} className="h-40 w-full bg-[#f7f9f5] object-contain dark:bg-[#111a14]" />
                      <div className="space-y-1 p-3">
                        <p className="truncate text-sm font-semibold text-[#17251c] dark:text-white">{image.file.name}</p>
                        <p className="text-xs text-[#465449] dark:text-[#c2cec3]">{(image.file.size / 1024 / 1024).toFixed(2)} MB · {image.file.type}</p>
                        {result && <p className={`text-xs font-semibold ${result.status === 'uploaded' ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{result.status === 'uploaded' ? 'Uploaded' : result.message || 'Upload failed'}</p>}
                        {isActive && <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Uploading · {activeProgress.value}%</p>}
                        {!result && !uploading && <button type="button" onClick={() => removeImage(image.clientImageId)} className="mt-1 min-h-9 rounded-lg px-3 text-xs font-bold text-red-700 hover:bg-red-50 dark:text-red-300">Remove image</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm text-[#465449] dark:text-[#c2cec3]">
                <span>{images.length} image{images.length === 1 ? '' : 's'} selected</span>
                <span>Total size: {(totalSize / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </>
          )}
          {uploadError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{uploadError}</p>}
          {images.length > 0 && (
            <div className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-sm font-bold text-amber-950 dark:text-amber-100">3. Confirm the destination before upload</p>
              <p className="text-sm leading-6 text-amber-950 dark:text-amber-100">Images will be added to <strong>{farmer.fullName}</strong> ({farmer.farmerId}), field <strong>{selectedFarm.name}</strong> in {selectedFarm.location}.</p>
              <label className="flex items-start gap-3 text-sm font-semibold text-amber-950 dark:text-amber-100">
                <input type="checkbox" checked={confirmation} onChange={(event) => setConfirmation(event.target.checked)} className="mt-1 h-5 w-5 accent-emerald-700" />
                I verified this farmer and field are correct.
              </label>
              {uploading && (
                <div role="status" className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold"><span>Overall upload progress</span><span>{overallProgress}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-emerald-700 transition-all" style={{ width: `${overallProgress}%` }} /></div>
                </div>
              )}
              <button type="button" disabled={!confirmation || uploading || (images.every((image) => uploadedIds.has(image.clientImageId)) && failedResults.length === 0)} onClick={() => void uploadImages()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176b3a] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {uploading ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Upload aria-hidden="true" className="h-5 w-5" />}
                {uploading ? 'Uploading images…' : failedResults.length ? 'Retry failed images' : 'Confirm and upload'}
              </button>
              {failedResults.length > 0 && <p role="alert" className="text-sm text-amber-950 dark:text-amber-100"><AlertCircle aria-hidden="true" className="mr-1 inline h-4 w-4" />{failedResults.length} image(s) failed. Retry will send only failed images.</p>}
            </div>
          )}
        </section>
      )}

      {confirmed && (
        <section role="status" className="space-y-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
          <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-900 dark:text-emerald-200"><CheckCircle2 aria-hidden="true" />Upload complete</h2>
          <p className="text-sm leading-6 text-emerald-950 dark:text-emerald-100">{results.filter((result) => result.status === 'uploaded').length} image(s) stored for {farmer?.fullName} · {farmer?.farmerId} · {selectedFarm?.name}. Image diagnosis is not available for drone photos yet.</p>
          <p className="text-xs text-emerald-900 dark:text-emerald-200">Batch {batchId} · {new Date().toLocaleString()}</p>
          <button type="button" onClick={() => { clearWorkspace(); setFarmerId(''); setFarmer(null); setFarmId(''); }} className="min-h-11 rounded-xl bg-emerald-800 px-4 font-bold text-white">Start another farmer visit</button>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-[#7b8d80] bg-white p-5 shadow-sm dark:border-[#536458] dark:bg-[#1b2920] sm:p-6" aria-labelledby="operator-history-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="operator-history-title" className="text-xl font-bold text-[#17251c] dark:text-white">Recent upload history</h2>
            <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">Only your own batches are shown; administrators can review all batches.</p>
          </div>
          <Clock3 aria-hidden="true" className="h-6 w-6 text-[#176b3a]" />
        </div>
        {historyError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{historyError}</p>}
        {historyLoading ? <p role="status" className="text-sm text-[#465449] dark:text-[#c2cec3]">Loading upload history…</p> : null}
        {!historyLoading && !history.length && <p className="rounded-xl bg-[#f7f9f5] p-4 text-sm text-[#465449] dark:bg-[#111a14] dark:text-[#c2cec3]">No image upload batches have been recorded yet.</p>}
        {history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-[#7b8d80] text-[#465449] dark:border-[#536458] dark:text-[#c2cec3]"><th className="p-3">Farmer</th><th className="p-3">Field</th><th className="p-3">Images</th><th className="p-3">Status</th><th className="p-3">Uploaded</th></tr></thead>
              <tbody>{history.map((batch) => <tr key={batch.id} className="border-b border-[#d6ded8] dark:border-[#35463a]"><td className="p-3 font-semibold text-[#17251c] dark:text-white">{batch.farmerName}<br /><span className="text-xs font-normal">{batch.farmerId}</span></td><td className="p-3">{batch.farmName}<br /><span className="text-xs">{batch.location} · {batch.crop}</span></td><td className="p-3">{batch.uploadedCount} / {batch.expectedImageCount}</td><td className="p-3">{batch.status}</td><td className="p-3">{new Date(batch.createdAt).toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs leading-5 text-[#465449] dark:text-[#c2cec3]">Original image files are retained in private storage. EXIF capture time and GPS are shown only when extracted and recorded. Drone-image disease analysis is currently unavailable.</p>
    </main>
  );
}

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Clock3, ImageOff, LoaderCircle, MapPin } from 'lucide-react';
import { FarmerDroneImage, getDroneImageUrl, getFarmerDroneImages } from '../services/authService';

export default function FarmerDroneGallery({ identity }: { identity: User }) {
  const [images, setImages] = useState<FarmerDroneImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(null);
  const [openingImageId, setOpeningImageId] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getFarmerDroneImages(identity)
      .then((result) => { if (active) setImages(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load your farm images.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [identity]);

  const openPreview = async (image: FarmerDroneImage) => {
    setOpeningImageId(image.id);
    setError('');
    try {
      const result = await getDroneImageUrl(identity, image.id, 'farmer');
      setPreview({ url: result.url, alt: `Farm image ${image.filename}` });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open this image.');
    } finally {
      setOpeningImageId('');
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#7b8d80] bg-white p-5 shadow-sm dark:border-[#536458] dark:bg-[#1b2920] sm:p-6" aria-labelledby="farmer-drone-images-title">
      <div>
        <h2 id="farmer-drone-images-title" className="text-xl font-bold text-[#17251c] dark:text-white">Drone images</h2>
        <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">Private images uploaded to your farms by an authorized operator.</p>
      </div>
      {loading && <p role="status" className="inline-flex items-center gap-2 text-sm text-[#465449] dark:text-[#c2cec3]"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Loading your images…</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
      {!loading && images.length === 0 && !error && (
        <div className="flex items-center gap-3 rounded-xl bg-[#f7f9f5] p-4 text-sm text-[#465449] dark:bg-[#111a14] dark:text-[#c2cec3]">
          <ImageOff aria-hidden="true" className="h-5 w-5 shrink-0" />
          No drone images have been uploaded to your account yet.
        </div>
      )}
      {images.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <article key={image.id} className="space-y-3 rounded-xl border border-[#d6ded8] p-4 dark:border-[#35463a]">
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[#f7f9f5] dark:bg-[#111a14]">
                <ImageOff aria-hidden="true" className="h-8 w-8 text-[#7b8d80]" />
              </div>
              <div>
                <h3 className="truncate font-semibold text-[#17251c] dark:text-white">{image.filename}</h3>
                <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">{image.farm.name} · {image.farm.crop}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#465449] dark:text-[#c2cec3]"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{image.farm.location}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#465449] dark:text-[#c2cec3]"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />Uploaded {new Date(image.uploadedAt).toLocaleString()}</p>
                <p className="mt-1 text-xs text-[#465449] dark:text-[#c2cec3]">Capture time: {image.capturedAt ? new Date(image.capturedAt).toLocaleString() : 'not available'} · GPS: {image.gps ? `${image.gps.latitude}, ${image.gps.longitude}` : 'not available'}</p>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Crop analysis unavailable for drone imagery.</p>
              </div>
              <button type="button" disabled={openingImageId === image.id} onClick={() => void openPreview(image)} className="min-h-10 w-full rounded-lg bg-[#176b3a] px-3 text-sm font-bold text-white disabled:opacity-60">
                {openingImageId === image.id ? 'Opening…' : 'View full image'}
              </button>
            </article>
          ))}
        </div>
      )}
      {preview && (
        <div role="dialog" aria-modal="true" aria-label="Farm image preview" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <img
              src={preview.url}
              alt={preview.alt}
              onError={() => {
                setPreview(null);
                setError('This private image link expired or could not be opened. Try opening the image again.');
              }}
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
            <button type="button" onClick={() => setPreview(null)} className="mt-3 min-h-10 rounded-lg bg-white px-4 font-bold text-gray-900">Close preview</button>
          </div>
        </div>
      )}
    </section>
  );
}

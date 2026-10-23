import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cropImageCatalog } from '../data/cropImageCatalog';
import type { CropHint } from '../data/cropImageCatalog';

type CropFilter = CropHint | 'unclassified';

function getFilterLabel(filter: CropFilter) {
  if (filter === 'unclassified') return 'Unclassified';
  return `${filter} filename group`;
}

export default function CropImageGallery() {
  const [filter, setFilter] = useState<CropFilter>('Cotton');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const visibleImages = cropImageCatalog.filter((sample) => (
    filter === 'unclassified'
      ? sample.cropHint === null
      : sample.cropHint === filter
  ));
  const selectedImage = visibleImages[selectedIndex] ?? visibleImages[0] ?? null;

  useEffect(() => {
    setImageStatus('loading');
  }, [selectedImage?.imagePath]);

  const handleFilterChange = (value: CropFilter) => {
    setFilter(value);
    setSelectedIndex(0);
  };

  const stepImage = (direction: -1 | 1) => {
    setSelectedIndex((current) => (
      (current + direction + visibleImages.length) % visibleImages.length
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="crop-demo-filter" className="text-sm font-semibold text-[#17251c] dark:text-white">
          Browse sample images
        </label>
        <select
          id="crop-demo-filter"
          value={filter ?? 'unclassified'}
          onChange={(event) => {
            const value = event.target.value;
            handleFilterChange(value === 'Cotton' || value === 'Turmeric' ? value : null);
          }}
          className="min-w-0 max-w-full rounded-lg border border-[#7b8d80] bg-white px-3 py-2 text-sm text-[#17251c] dark:border-[#536458] dark:bg-[#111a14] dark:text-white"
        >
          <option value="Cotton">Cotton filename group ({cropImageCatalog.filter((sample) => sample.cropHint === 'Cotton').length})</option>
          <option value="Turmeric">Turmeric filename group ({cropImageCatalog.filter((sample) => sample.cropHint === 'Turmeric').length})</option>
          <option value="unclassified">Unclassified ({cropImageCatalog.filter((sample) => sample.cropHint === null).length})</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#7b8d80] bg-[#e9f3e9] dark:border-[#536458] dark:bg-[#203629]">
        <div className="relative flex aspect-[4/3] min-h-56 items-center justify-center p-2 sm:min-h-72 sm:p-4">
          {selectedImage && imageStatus !== 'error' ? (
            <>
              {imageStatus === 'loading' && (
                <p role="status" className="absolute rounded-lg bg-white/90 px-3 py-2 text-sm text-[#465449] shadow dark:bg-[#111a14] dark:text-[#c2cec3]">
                  Loading sample image…
                </p>
              )}
              <img
                key={selectedImage.imagePath}
                src={selectedImage.imagePath}
                alt={`Sample field image ${selectedImage.filename}; crop type is not verified.`}
                className={`h-full w-full object-contain ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageStatus('loaded')}
                onError={() => setImageStatus('error')}
              />
            </>
          ) : (
            <div role="status" className="flex max-w-sm flex-col items-center gap-2 px-4 text-center text-[#465449] dark:text-[#c2cec3]">
              <ImageOff aria-hidden="true" className="h-9 w-9" />
              <p className="font-semibold">This sample image could not be loaded.</p>
              <p className="text-sm">Choose another image or try again later.</p>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-[#9a4b12] px-3 py-1 text-xs font-bold text-white shadow">
            Sample Image · No diagnosis
          </span>
          {selectedImage && (
            <span className="absolute bottom-3 right-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-[#17251c] shadow dark:bg-[#111a14] dark:text-white">
              {visibleImages.length} samples
            </span>
          )}
        </div>
      </div>

      {selectedImage ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-[#17251c] dark:text-white">
              {selectedImage.cropHint ? `${selectedImage.cropHint} sample (filename group)` : 'Unclassified sample'}
            </p>
            <p className="break-all text-sm text-[#465449] dark:text-[#c2cec3]">{selectedImage.filename}</p>
            <p className="mt-1 text-xs text-[#465449] dark:text-[#c2cec3]">
              {selectedImage.labelStatus === 'filename-only'
                ? 'Crop type is only suggested by the filename; it is not verified.'
                : 'The filename does not identify a crop type.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => stepImage(-1)}
              aria-label={`Previous ${getFilterLabel(filter)} image`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#7b8d80] bg-white text-[#174c2c] hover:bg-[#f1f7f1] disabled:opacity-50 dark:border-[#536458] dark:bg-[#111a14] dark:text-[#a5e8b5]"
              disabled={visibleImages.length < 2}
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <span aria-live="polite" className="min-w-12 text-center text-sm font-semibold text-[#17251c] dark:text-white">
              {selectedIndex + 1} / {visibleImages.length}
            </span>
            <button
              type="button"
              onClick={() => stepImage(1)}
              aria-label={`Next ${getFilterLabel(filter)} image`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#7b8d80] bg-white text-[#174c2c] hover:bg-[#f1f7f1] disabled:opacity-50 dark:border-[#536458] dark:bg-[#111a14] dark:text-[#a5e8b5]"
              disabled={visibleImages.length < 2}
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <p role="alert" className="text-sm font-semibold text-red-800 dark:text-red-300">
          No sample images are available in this group.
        </p>
      )}

      <p className="rounded-xl border border-[#7b8d80] bg-white/90 p-3 text-sm leading-6 text-[#465449] dark:border-[#536458] dark:bg-[#111a14] dark:text-[#c2cec3]">
        These are dataset photos for demonstration only. Crop identities and disease labels are not verified, and this demo does not analyse images or provide crop-health results.
      </p>
    </div>
  );
}

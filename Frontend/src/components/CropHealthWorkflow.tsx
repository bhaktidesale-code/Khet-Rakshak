import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertTriangle, CheckCircle2, ImageOff, LoaderCircle, Upload } from 'lucide-react';
import { cropImageCatalog } from '../data/cropImageCatalog';
import type { CropImageSample } from '../data/cropImageCatalog';
import {
  getCropAnalysis,
  submitCropImage,
} from '../services/authService';
import type {
  CropAnalysis,
  CropType,
  CropTypeSource,
} from '../services/authService';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 16_000_000;
const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

interface CropHealthWorkflowProps {
  identity: User | null;
  canAnalyze: boolean;
  onRequestAccess: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readImageDimensions(file: File): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url);
        reject(new Error('The selected file has no readable image dimensions.'));
        return;
      }
      if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(url);
        reject(new Error('Choose an image with 16 megapixels or fewer.'));
        return;
      }
      resolve({ url, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file could not be read as a supported image.'));
    };
    image.src = url;
  });
}

function getSampleCropType(sample: CropImageSample): CropType {
  if (sample.cropHint === 'Cotton') return 'cotton';
  if (sample.cropHint === 'Turmeric') return 'turmeric';
  return 'unknown';
}

function getInitialCropTypeSource(sample: CropImageSample): CropTypeSource {
  return sample.cropHint ? 'filename_hint' : 'unknown';
}

export default function CropHealthWorkflow({
  identity,
  canAnalyze,
  onRequestAccess,
}: CropHealthWorkflowProps) {
  const [selectedSample, setSelectedSample] = useState<CropImageSample | null>(cropImageCatalog[1] ?? null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropType, setCropType] = useState<CropType>(cropImageCatalog[1] ? getSampleCropType(cropImageCatalog[1]) : 'unknown');
  const [cropTypeSource, setCropTypeSource] = useState<CropTypeSource>(cropImageCatalog[1] ? getInitialCropTypeSource(cropImageCatalog[1]) : 'unknown');
  const [selectionError, setSelectionError] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [analysis, setAnalysis] = useState<CropAnalysis | null>(null);
  const [isReadingUpload, setIsReadingUpload] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadSelectionVersion = useRef(0);

  useEffect(() => () => {
    if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
  }, [uploadedPreviewUrl]);

  const previewUrl = uploadedPreviewUrl ?? selectedSample?.imagePath ?? '';
  const filename = uploadedFile?.name ?? selectedSample?.filename ?? '';
  const fileSizeBytes = uploadedFile?.size ?? selectedSample?.fileSizeBytes ?? 0;

  const resetAnalysis = () => {
    setAnalysis(null);
    setAnalysisError('');
  };

  const handleSampleChange = (filenameValue: string) => {
    uploadSelectionVersion.current += 1;
    setIsReadingUpload(false);
    const sample = cropImageCatalog.find((entry) => entry.filename === filenameValue);
    if (!sample) {
      setSelectionError('The selected sample is not in the image catalogue.');
      return;
    }
    if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
    setUploadedPreviewUrl(null);
    setUploadedFile(null);
    setSelectedSample(sample);
    setDimensions(null);
    setCropType(getSampleCropType(sample));
    setCropTypeSource(getInitialCropTypeSource(sample));
    setSelectionError('');
    resetAnalysis();
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    const selectionVersion = ++uploadSelectionVersion.current;
    setIsReadingUpload(false);
    resetAnalysis();
    const extensionSupported = SUPPORTED_EXTENSIONS.test(file.name);
    if (!extensionSupported || (file.type && !SUPPORTED_MIME_TYPES.has(file.type))) {
      setSelectionError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSelectionError('Image files must be 8 MB or smaller.');
      return;
    }
    if (!file.size) {
      setSelectionError('The selected file is empty.');
      return;
    }

    setIsReadingUpload(true);
    setSelectionError('');
    try {
      const decoded = await readImageDimensions(file);
      if (selectionVersion !== uploadSelectionVersion.current) {
        URL.revokeObjectURL(decoded.url);
        return;
      }
      if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
      setSelectedSample(null);
      setUploadedFile(file);
      setUploadedPreviewUrl(decoded.url);
      setDimensions({ width: decoded.width, height: decoded.height });
      setCropType('unknown');
      setCropTypeSource('unknown');
    } catch (error) {
      if (selectionVersion === uploadSelectionVersion.current) {
        setSelectionError(error instanceof Error ? error.message : 'The image could not be read.');
      }
    } finally {
      if (selectionVersion === uploadSelectionVersion.current) setIsReadingUpload(false);
    }
  };

  const handleAnalyze = async () => {
    if (!identity || !canAnalyze) {
      onRequestAccess();
      return;
    }
    if (!previewUrl || selectionError || isReadingUpload) return;

    setIsSubmitting(true);
    setAnalysisError('');
    setAnalysis(null);
    try {
      let file = uploadedFile;
      if (!file && selectedSample) {
        const response = await fetch(selectedSample.imagePath);
        if (!response.ok) throw new Error(`Sample image could not be loaded (HTTP ${response.status}).`);
        const blob = await response.blob();
        if (!blob.size || blob.size > MAX_IMAGE_BYTES) {
          throw new Error('The selected sample is empty or exceeds the 8 MB upload limit.');
        }
        file = new File([blob], selectedSample.filename, { type: blob.type || 'image/jpeg' });
      }
      if (!file) throw new Error('Select a readable image before submitting it.');
      const submitted = await submitCropImage(identity, file, cropType, cropTypeSource);
      setAnalysis(submitted);
      try {
        const stored = await getCropAnalysis(identity, submitted.id);
        setAnalysis(stored);
      } catch (error) {
        setAnalysisError(error instanceof Error
          ? `The image check completed, but its short-lived result could not be retrieved: ${error.message}`
          : 'The image check completed, but its short-lived result could not be retrieved.');
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Image analysis could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryAnother = () => {
    setAnalysis(null);
    setAnalysisError('');
  };

  return (
    <section className="space-y-5 rounded-3xl border border-[#7b8d80] bg-white p-5 shadow-sm dark:border-[#536458] dark:bg-[#1b2920] sm:p-8" aria-labelledby="crop-workflow-title">
      <div>
        <h2 id="crop-workflow-title" className="text-2xl font-bold text-[#17251c] dark:text-white sm:text-3xl">Crop Image Health Check</h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[#465449] dark:text-[#c2cec3]">
          Choose a dataset sample or upload a crop photo. The current service checks image readability only; no validated crop-disease model is available.
        </p>
      </div>

      {!analysis && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <label htmlFor="crop-sample-select" className="block text-sm font-semibold text-[#17251c] dark:text-white">
              Select one of the 21 dataset images
            </label>
            <select
              id="crop-sample-select"
              value={selectedSample?.filename ?? ''}
              onChange={(event) => handleSampleChange(event.target.value)}
              className="w-full min-w-0 rounded-xl border border-[#7b8d80] bg-white px-3 py-3 text-sm text-[#17251c] dark:border-[#536458] dark:bg-[#111a14] dark:text-white"
            >
              {cropImageCatalog.map((sample) => (
                <option key={sample.filename} value={sample.filename}>
                  {sample.cropHint ? `${sample.cropHint} filename hint` : 'Unclassified'} — {sample.filename}
                </option>
              ))}
            </select>

            <label htmlFor="crop-image-upload" className="block text-sm font-semibold text-[#17251c] dark:text-white">
              Or upload a photo (JPEG, PNG, or WebP; maximum 8 MB)
            </label>
            <input
              id="crop-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={(event) => {
                void handleUpload(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
              className="w-full min-w-0 rounded-xl border border-[#7b8d80] bg-white p-2 text-sm text-[#17251c] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e9f3e9] file:px-3 file:py-2 file:font-semibold file:text-[#174c2c] dark:border-[#536458] dark:bg-[#111a14] dark:text-white"
            />

            <label htmlFor="crop-type-select" className="block text-sm font-semibold text-[#17251c] dark:text-white">
              Crop type
            </label>
            <select
              id="crop-type-select"
              value={cropType}
              onChange={(event) => {
                const value = event.target.value as CropType;
                setCropType(value);
                setCropTypeSource(value === 'unknown' ? 'unknown' : 'user_selected');
                resetAnalysis();
              }}
              className="w-full min-w-0 rounded-xl border border-[#7b8d80] bg-white px-3 py-3 text-sm text-[#17251c] dark:border-[#536458] dark:bg-[#111a14] dark:text-white"
            >
              <option value="unknown">Unknown / not selected</option>
              <option value="cotton">Cotton (selected, not verified)</option>
              <option value="turmeric">Turmeric (selected, not verified)</option>
              <option value="other">Other crop (unsupported)</option>
            </select>

            {selectionError && (
              <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900 dark:bg-red-950/30 dark:text-red-200">
                {selectionError}
              </p>
            )}
            {isReadingUpload && (
              <p role="status" className="flex items-center gap-2 text-sm text-[#465449] dark:text-[#c2cec3]">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> Checking image readability…
              </p>
            )}

            {!canAnalyze && (
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                Sign in with an active Farmer account to submit an image. The upload is processed in memory and is not retained.
              </p>
            )}
            {canAnalyze && (
              <p className="rounded-xl border border-[#7b8d80] bg-[#f7f9f5] p-3 text-sm leading-6 text-[#465449] dark:border-[#536458] dark:bg-[#111a14] dark:text-[#c2cec3]">
                The file is sent only to the configured Khet Rakshak API over your signed-in session. It is checked in memory and not saved as a farm record.
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={!previewUrl || Boolean(selectionError) || isReadingUpload || isSubmitting}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176b3a] px-5 py-3 font-bold text-white hover:bg-[#12532d] disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Upload aria-hidden="true" className="h-5 w-5" />}
              {isSubmitting ? 'Checking image…' : canAnalyze ? 'Submit image for analysis' : 'Sign in to submit image'}
            </button>
          </div>

          <div className="min-w-0 space-y-3">
            <h3 className="font-semibold text-[#17251c] dark:text-white">Image preview</h3>
            {previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-[#7b8d80] bg-[#e9f3e9] dark:border-[#536458] dark:bg-[#203629]">
                <div className="flex aspect-[4/3] min-h-56 items-center justify-center p-3 sm:min-h-72">
                  <img
                    src={previewUrl}
                    alt={`Selected crop image: ${filename}`}
                    className="h-full w-full object-contain"
                    onLoad={(event) => setDimensions({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })}
                    onError={() => {
                      setSelectionError('This image could not be loaded. Select another image.');
                      setDimensions(null);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div role="status" className="flex aspect-[4/3] min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#7b8d80] bg-[#f7f9f5] p-5 text-center text-[#465449] dark:border-[#536458] dark:bg-[#111a14] dark:text-[#c2cec3]">
                <ImageOff aria-hidden="true" className="h-9 w-9" />
                <p>Choose a dataset image or upload a photo to preview it.</p>
              </div>
            )}
            {filename && (
              <dl className="grid min-w-0 gap-2 rounded-xl bg-[#f7f9f5] p-4 text-sm dark:bg-[#111a14]">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">Filename</dt>
                  <dd className="break-all text-[#17251c] dark:text-white">{filename}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">File size</dt>
                  <dd className="text-[#17251c] dark:text-white">{formatFileSize(fileSizeBytes)}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">Dimensions</dt>
                  <dd className="text-[#17251c] dark:text-white">
                    {dimensions ? `${dimensions.width} × ${dimensions.height} px` : 'Reading…'}
                  </dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">Crop type</dt>
                  <dd className="text-[#17251c] dark:text-white">
                    {cropType === 'unknown'
                      ? 'Unknown'
                      : cropType === 'other'
                        ? 'Other (unsupported)'
                        : `${cropType === 'cotton' ? 'Cotton' : 'Turmeric'} (${cropTypeSource === 'filename_hint' ? 'filename hint' : 'selected'})`}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      )}

      {isSubmitting && (
        <p role="status" className="rounded-xl bg-[#e9f3e9] p-3 text-sm font-semibold text-[#174c2c] dark:bg-[#263e2e] dark:text-[#a5e8b5]">
          Validating and decoding the image. It is held in memory only; disease diagnosis is not enabled.
        </p>
      )}

      {analysisError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-900 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{analysisError}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-5 rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/20 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-[#176b3a] dark:text-[#a5e8b5]" />
            <div>
              <h3 className="text-lg font-bold text-[#17251c] dark:text-white">Image received and readability checked</h3>
              <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">
                {new Date(analysis.createdAt).toLocaleString()} · {analysis.filename}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="overflow-hidden rounded-xl border border-[#7b8d80] bg-white dark:border-[#536458] dark:bg-[#111a14]">
              <div className="flex aspect-[4/3] items-center justify-center p-3">
                <img src={previewUrl} alt={`Submitted crop image: ${analysis.filename}`} className="h-full w-full object-contain" />
              </div>
            </div>
            <dl className="grid content-start gap-3 text-sm">
              <div>
                <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">Crop type</dt>
                <dd className="text-[#17251c] dark:text-white">
                  {analysis.cropType === 'unknown'
                    ? 'Unknown'
                    : analysis.cropType === 'other'
                      ? 'Other (unsupported)'
                      : `${analysis.cropType === 'cotton' ? 'Cotton' : 'Turmeric'} (${analysis.cropTypeSource === 'filename_hint' ? 'filename hint, not verified' : 'selected by user'})`}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">Image processing</dt>
                <dd className="text-[#17251c] dark:text-white">
                  Readable {analysis.image.width} × {analysis.image.height} px {analysis.image.format.toUpperCase()}
                  {analysis.image.qualityStatus === 'warning' ? ' — quality warning' : ''}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">Disease analysis</dt>
                <dd className="font-bold text-amber-900 dark:text-amber-200">
                  {analysis.analysisStatus === 'unsupported_crop'
                    ? 'Unsupported crop — this prototype cannot analyse this crop.'
                    : 'Unavailable — no validated crop disease model is configured.'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#465449] dark:text-[#c2cec3]">Prediction and confidence</dt>
                <dd className="text-[#17251c] dark:text-white">None. No disease prediction was made.</dd>
              </div>
            </dl>
          </div>
          {analysis.warnings.length > 0 && (
            <ul className="list-inside list-disc space-y-1 text-sm leading-6 text-amber-950 dark:text-amber-100">
              {analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          <p className="text-xs leading-5 text-[#465449] dark:text-[#c2cec3]">
            This result is an image-readability check, not a crop-health diagnosis. The image itself was not saved. This result is available from the current API process for up to 15 minutes and is not a farm report.
          </p>
          <button
            type="button"
            onClick={handleTryAnother}
            className="min-h-11 rounded-xl border border-[#176b3a] px-5 py-2 font-bold text-[#174c2c] hover:bg-white dark:text-[#a5e8b5] dark:hover:bg-[#111a14]"
          >
            Try another image
          </button>
        </div>
      )}
    </section>
  );
}

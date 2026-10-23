import { useState } from 'react';
import { ArrowRight, Droplets, ImageOff, MapPin, ScanLine } from 'lucide-react';

interface FarmDemoPreviewProps {
  onViewHealth: () => void;
}

export default function FarmDemoPreview({ onViewHealth }: FarmDemoPreviewProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[#7b8d80] bg-white shadow-sm dark:border-[#536458] dark:bg-[#111a14]">
        <div className="relative flex aspect-[4/3] min-h-56 items-center justify-center bg-[#e9f3e9] p-3 dark:bg-[#203629] sm:min-h-72 sm:p-5">
          {imageUnavailable ? (
            <div role="alert" className="flex max-w-sm flex-col items-center gap-2 px-4 text-center text-[#465449] dark:text-[#c2cec3]">
              <ImageOff aria-hidden="true" className="h-9 w-9" />
              <p className="font-semibold">The demo image could not be loaded.</p>
              <p className="text-sm">The sample file may be unavailable in this build.</p>
            </div>
          ) : (
            <img
              src="/crop-demo/Cotton_4.jpeg"
              alt="Cotton field image Cotton_4.jpeg from Shindkheda Cotton Farm."
              className="h-full w-full rounded-xl object-contain"
              onError={() => setImageUnavailable(true)}
            />
          )}
          <span className="absolute left-4 top-4 rounded-full bg-[#176b3a] px-3 py-1.5 text-sm font-bold text-white shadow">
            Cotton Farm
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#9a4b12]">
            <MapPin aria-hidden="true" className="h-4 w-4" />
            Shindkheda, Plot No. 121/A, Dhule, Maharashtra, India
          </p>
          <h3 className="mt-2 text-2xl font-bold text-[#17251c] dark:text-white">Shindkheda Cotton Farm</h3>
          <p className="mt-2 text-sm leading-6 text-[#465449] dark:text-[#c2cec3]">
            Shindkheda Cotton Farm · Plot 121/A · Cotton
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-[#7b8d80] bg-white p-3 dark:border-[#536458] dark:bg-[#111a14]">
            <ScanLine aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#176b3a]" />
            <div>
              <p className="text-sm font-semibold text-[#17251c] dark:text-white">Crop health</p>
              <p className="text-sm text-[#465449] dark:text-[#c2cec3]">AI diagnosis unavailable</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-[#7b8d80] bg-white p-3 dark:border-[#536458] dark:bg-[#111a14]">
            <Droplets aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#176b3a]" />
            <div>
              <p className="text-sm font-semibold text-[#17251c] dark:text-white">Soil moisture</p>
              <p className="text-sm text-[#465449] dark:text-[#c2cec3]">Data unavailable</p>
            </div>
          </div>
        </div>

        <p className="break-all text-xs text-[#465449] dark:text-[#c2cec3]">
          Farm image: <span className="font-semibold">Cotton_4.jpeg</span> · disease diagnosis unavailable
        </p>

        <button
          type="button"
          onClick={onViewHealth}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176b3a] px-5 py-3 text-base font-bold text-white transition hover:bg-[#12532d] sm:w-auto"
        >
          View Farm Health
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

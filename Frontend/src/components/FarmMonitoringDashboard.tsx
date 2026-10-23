import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Droplets,
  FileDown,
  Leaf,
  MapPin,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';

interface FarmMonitoringDashboardProps {
  onBack: () => void;
  onOpenImageCheck: () => void;
}

type ImageStatus = 'loading' | 'loaded' | 'error';

const illustrativeHealthValues = [42, 48, 45, 56];
const illustrativeMoistureValues = [24, 29, 27, 33];
const illustrativeSteps = ['Example 1', 'Example 2', 'Example 3', 'Example 4'];

function DemoTrendChart({
  title,
  description,
  values,
  color,
}: {
  title: string;
  description: string;
  values: number[];
  color: string;
}) {
  const points = values
    .map((value, index) => `${32 + index * 112},${142 - value * 1.15}`)
    .join(' ');

  return (
    <article className="rounded-2xl border border-[#7b8d80] bg-white p-5 dark:border-[#536458] dark:bg-[#1b2920]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#17251c] dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">{description}</p>
        </div>
        <span className="rounded-full bg-[#fff0df] px-3 py-1 text-xs font-bold text-[#85420d] dark:bg-[#422b18] dark:text-[#ffd09d]">
          Demo data
        </span>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#465449] dark:text-[#c2cec3]">
        Illustrative only—not measurements or history from this farm.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl bg-[#f7f9f5] p-2 dark:bg-[#111a14]">
        <svg
          viewBox="0 0 400 190"
          role="img"
          aria-label={`${title}: illustrative demo data only, not real farm measurements.`}
          className="h-48 w-full"
          preserveAspectRatio="none"
        >
          {[32, 64, 96, 128, 160].map((y) => (
            <line key={y} x1="24" x2="390" y1={y} y2={y} stroke="currentColor" className="text-[#dce5dc] dark:text-[#334239]" strokeDasharray="3 5" />
          ))}
          <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {values.map((value, index) => {
            const x = 32 + index * 112;
            const y = 142 - value * 1.15;
            return (
              <g key={`${value}-${index}`}>
                <circle cx={x} cy={y} r="5" fill={color} />
                <text x={x} y={y - 12} textAnchor="middle" className="fill-[#465449] text-[11px] dark:fill-[#c2cec3]">{value}%</text>
                <text x={x} y="178" textAnchor="middle" className="fill-[#465449] text-[10px] dark:fill-[#c2cec3]">{illustrativeSteps[index]}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </article>
  );
}

function FarmSampleImage({
  status,
  onLoad,
  onError,
  compact = false,
}: {
  status: ImageStatus;
  onLoad?: () => void;
  onError?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-2xl bg-[#e9f3e9] dark:bg-[#203629] ${compact ? 'aspect-[4/3]' : 'aspect-[16/10] sm:min-h-80'}`}>
      {status === 'error' ? (
        <div role="alert" className="flex max-w-sm flex-col items-center gap-2 p-5 text-center text-[#465449] dark:text-[#c2cec3]">
          <ShieldAlert aria-hidden="true" className="h-9 w-9 text-[#9a4b12]" />
          <p className="font-semibold">The sample image is unavailable.</p>
          <p className="text-sm">The dashboard can still show which farm data is not connected.</p>
        </div>
      ) : (
        <>
          {status === 'loading' && (
            <p role="status" className="absolute z-10 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#465449] shadow dark:bg-[#111a14] dark:text-[#c2cec3]">
              Loading sample image…
            </p>
          )}
          <img
            src="/crop-demo/Cotton_4.jpeg"
            alt="Cotton_4.jpeg, an undated cotton farm demo sample. No diagnosis is available."
            className={`h-full w-full object-contain ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
            onLoad={onLoad}
            onError={onError}
          />
        </>
      )}
    </div>
  );
}

export default function FarmMonitoringDashboard({
  onBack,
  onOpenImageCheck,
}: FarmMonitoringDashboardProps) {
  const [imageStatus, setImageStatus] = useState<ImageStatus>('loading');

  return (
    <div className="mx-auto max-w-6xl space-y-7" aria-labelledby="farm-health-title">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#7b8d80] bg-white px-4 py-2 font-semibold text-[#174c2c] hover:bg-[#f1f7f1] dark:border-[#536458] dark:bg-[#1b2920] dark:text-[#a5e8b5] dark:hover:bg-[#23372a]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#e9b77f] bg-[#fff7ed] px-3 py-1.5 text-sm font-bold text-[#85420d] dark:border-[#8d5a2a] dark:bg-[#422b18] dark:text-[#ffd09d]">
          <Activity aria-hidden="true" className="h-4 w-4" />
          Demo farm · no live monitoring
        </span>
      </header>

      <section className="grid overflow-hidden rounded-3xl border border-[#7b8d80] bg-white shadow-sm dark:border-[#536458] dark:bg-[#1b2920] lg:grid-cols-[1.05fr_.95fr]">
        <div className="min-w-0 p-4 sm:p-6">
          <FarmSampleImage
            status={imageStatus}
            onLoad={() => setImageStatus('loaded')}
            onError={() => setImageStatus('error')}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[#465449] dark:text-[#c2cec3]">
            <span>Sample image · <strong className="text-[#17251c] dark:text-white">Cotton_4.jpeg</strong></span>
            <span>Observation date: unavailable (undated sample)</span>
          </div>
        </div>
        <div className="min-w-0 flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e9f3e9] px-3 py-1.5 text-sm font-bold text-[#174c2c] dark:bg-[#263e2e] dark:text-[#a5e8b5]">
            <Leaf aria-hidden="true" className="h-4 w-4" />
            Cotton · Plot 121/A
          </p>
          <h1 id="farm-health-title" className="mt-4 text-3xl font-bold leading-tight text-[#17251c] dark:text-white sm:text-4xl">
            Shindkheda Cotton Farm
          </h1>
          <p className="mt-3 inline-flex items-start gap-2 text-base leading-7 text-[#465449] dark:text-[#c2cec3]">
            <MapPin aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#176b3a]" />
            Shindkheda, Plot No. 121/A, Dhule, Maharashtra, India
          </p>
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="font-bold">Demo preview · not connected to live farm data</p>
            <p className="mt-1">No farm sensors, saved observations, weather feed, or validated cotton diagnosis model are connected.</p>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f7f9f5] p-4 dark:bg-[#111a14]">
              <dt className="text-sm font-semibold text-[#465449] dark:text-[#c2cec3]">Monitoring status</dt>
              <dd className="mt-1 font-bold text-[#17251c] dark:text-white">Demo sample only</dd>
            </div>
            <div className="rounded-xl bg-[#f7f9f5] p-4 dark:bg-[#111a14]">
              <dt className="text-sm font-semibold text-[#465449] dark:text-[#c2cec3]">Last updated</dt>
              <dd className="mt-1 font-bold text-[#17251c] dark:text-white">Unavailable · no timestamp</dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="indicators-title">
        <div className="mb-4">
          <h2 id="indicators-title" className="text-2xl font-bold text-[#17251c] dark:text-white">Farm indicators</h2>
          <p className="mt-1 text-sm text-[#465449] dark:text-[#c2cec3]">No live measurements are available for this demo plot.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#7b8d80] bg-white p-5 dark:border-[#536458] dark:bg-[#1b2920]">
            <div className="flex items-center gap-2 text-[#176b3a] dark:text-[#a5e8b5]"><ScanLine aria-hidden="true" className="h-5 w-5" /><h3 className="font-bold text-[#17251c] dark:text-white">Overall crop health</h3></div>
            <p className="mt-4 text-xl font-bold text-[#17251c] dark:text-white">Not assessed</p>
            <p className="mt-1 text-sm leading-5 text-[#465449] dark:text-[#c2cec3]">No validated model or field observations.</p>
          </article>
          <article className="rounded-2xl border border-[#7b8d80] bg-white p-5 dark:border-[#536458] dark:bg-[#1b2920]">
            <div className="flex items-center gap-2 text-[#176b3a] dark:text-[#a5e8b5]"><Droplets aria-hidden="true" className="h-5 w-5" /><h3 className="font-bold text-[#17251c] dark:text-white">Soil moisture</h3></div>
            <p className="mt-4 text-xl font-bold text-[#17251c] dark:text-white">Soil moisture data unavailable</p>
            <p className="mt-1 text-sm leading-5 text-[#465449] dark:text-[#c2cec3]">No sensor reading is connected.</p>
          </article>
          <article className="rounded-2xl border border-[#e9b77f] bg-[#fffaf4] p-5 dark:border-[#8d5a2a] dark:bg-[#2b2118]">
            <div className="flex items-center gap-2 text-[#9a4b12]"><CircleHelp aria-hidden="true" className="h-5 w-5" /><h3 className="font-bold text-[#17251c] dark:text-white">Irrigation</h3></div>
            <p className="mt-4 font-bold text-[#17251c] dark:text-white">Demo recommendation</p>
            <p className="mt-1 text-sm leading-5 text-[#465449] dark:text-[#c2cec3]">Demo recommendation — not based on live sensor data. Check soil moisture before deciding whether to water.</p>
          </article>
          <article className="rounded-2xl border border-[#7b8d80] bg-white p-5 dark:border-[#536458] dark:bg-[#1b2920]">
            <div className="flex items-center gap-2 text-[#176b3a] dark:text-[#a5e8b5]"><Leaf aria-hidden="true" className="h-5 w-5" /><h3 className="font-bold text-[#17251c] dark:text-white">Growth status</h3></div>
            <p className="mt-4 text-xl font-bold text-[#17251c] dark:text-white">Not assessed</p>
            <p className="mt-1 text-sm leading-5 text-[#465449] dark:text-[#c2cec3]">No crop stage observations are recorded.</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="trends-title" className="space-y-4">
        <div>
          <h2 id="trends-title" className="text-2xl font-bold text-[#17251c] dark:text-white">Illustrative trend examples</h2>
          <p className="mt-1 text-sm leading-6 text-[#465449] dark:text-[#c2cec3]">
            Demo data only. These examples are not measurements, dates, or history from Shindkheda Cotton Farm.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DemoTrendChart
            title="Crop health trend"
            description="Illustrative index (%) · not an AI result"
            values={illustrativeHealthValues}
            color="#176b3a"
          />
          <DemoTrendChart
            title="Soil moisture trend"
            description="Illustrative example (%) · no sensor connected"
            values={illustrativeMoistureValues}
            color="#d97706"
          />
        </div>
        <p className="rounded-xl border border-[#7b8d80] bg-white p-4 text-sm leading-6 text-[#465449] dark:border-[#536458] dark:bg-[#1b2920] dark:text-[#c2cec3]">
          No weather or rainfall chart is shown because no weather source is connected. The chart lines above are fixed illustrative examples, not collected farm data.
        </p>
      </section>

      <section aria-labelledby="observations-title" className="rounded-2xl border border-[#7b8d80] bg-white p-5 dark:border-[#536458] dark:bg-[#1b2920] sm:p-6">
        <h2 id="observations-title" className="text-xl font-bold text-[#17251c] dark:text-white">Monitoring observations</h2>
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#f7f9f5] p-4 dark:bg-[#111a14]">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#9a4b12]" />
          <div>
            <p className="font-semibold text-[#17251c] dark:text-white">No verified observations recorded</p>
            <p className="mt-1 text-sm leading-6 text-[#465449] dark:text-[#c2cec3]">
              The sample image is undated. No sensor readings, field notes, weather observations, or saved analysis reports are available for this farm.
            </p>
          </div>
        </div>
      </section>

      <section id="farm-health-report" aria-labelledby="report-title" className="space-y-5 rounded-3xl border border-[#7b8d80] bg-white p-5 shadow-sm dark:border-[#536458] dark:bg-[#1b2920] sm:p-7">
        <div className="farm-report-actions flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#176b3a] dark:text-[#a5e8b5]">Sample report</p>
            <h2 id="report-title" className="mt-1 text-2xl font-bold text-[#17251c] dark:text-white">Crop monitoring summary</h2>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176b3a] px-4 py-2 font-bold text-white hover:bg-[#12532d]"
          >
            <FileDown aria-hidden="true" className="h-4 w-4" />
            Print or save report
          </button>
        </div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(14rem,.7fr)]">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-[#17251c] dark:text-white">Farm details</h3>
              <p className="mt-1 text-sm leading-6 text-[#465449] dark:text-[#c2cec3]">
                Shindkheda Cotton Farm · Cotton · Plot 121/A<br />
                Shindkheda, Dhule, Maharashtra, India
              </p>
            </div>
            <div>
              <h3 className="font-bold text-[#17251c] dark:text-white">Image and observation date</h3>
              <p className="mt-1 text-sm leading-6 text-[#465449] dark:text-[#c2cec3]">
                Cotton_4.jpeg · sample image · observation date unavailable (undated)
              </p>
            </div>
            <div>
              <h3 className="font-bold text-[#17251c] dark:text-white">Available indicators</h3>
              <ul className="mt-1 list-inside list-disc text-sm leading-6 text-[#465449] dark:text-[#c2cec3]">
                <li>Crop health: not assessed; no validated model output.</li>
                <li>Soil moisture: unavailable; no sensor reading.</li>
                <li>Growth stage: not assessed; no field observation.</li>
                <li>Irrigation: illustrative guidance only, not sensor-based.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[#17251c] dark:text-white">Suggested next steps</h3>
              <ul className="mt-1 list-inside list-disc text-sm leading-6 text-[#465449] dark:text-[#c2cec3]">
                <li>Check the crop and soil directly before making irrigation decisions.</li>
                <li>Use a connected, calibrated soil sensor for measured moisture readings.</li>
                <li>Request an expert review for a crop diagnosis; the image check only verifies readability.</li>
              </ul>
              <p className="mt-2 text-xs leading-5 text-[#465449] dark:text-[#c2cec3]">
                General suggestions only—not based on a verified finding from this demo farm.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <FarmSampleImage status={imageStatus} compact />
            <p className="text-xs leading-5 text-[#465449] dark:text-[#c2cec3]">
              {imageStatus === 'error' ? 'The primary sample image could not be displayed.' : 'Primary sample image · Cotton_4.jpeg · no diagnosis'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>Missing data:</strong> no validated crop-disease model, saved farm records, live sensors, weather feed, or dated field observations are connected. This sample report is not a live crop assessment.
          </p>
        </div>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#465449] dark:text-[#c2cec3]">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#176b3a]" />
          Report content is clearly marked as sample data or unavailable; no diagnosis or live reading is claimed.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={onOpenImageCheck}
          className="min-h-12 rounded-xl bg-[#176b3a] px-5 py-3 font-bold text-white hover:bg-[#12532d]"
        >
          Check an image
        </button>
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 rounded-xl border border-[#7b8d80] bg-white px-5 py-3 font-semibold text-[#174c2c] hover:bg-[#f1f7f1] dark:border-[#536458] dark:bg-[#1b2920] dark:text-[#a5e8b5] dark:hover:bg-[#23372a]"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}

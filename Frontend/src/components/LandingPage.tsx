import { useState } from 'react';
import { ClipboardCheck, Leaf, MapPinned, Sprout } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';
import FarmDemoPreview from './FarmDemoPreview';

interface LandingPageProps {
  currentLanguage: Language;
  onNavigate: (view: string) => void;
  currentTheme: 'light' | 'dark';
}

export default function LandingPage({ currentLanguage, onNavigate }: LandingPageProps) {
  const t = translations[currentLanguage];
  const [demoStep, setDemoStep] = useState(0);
  const demoSteps = [
    { title: t.farms, detail: t.farm_details, Icon: MapPinned },
    { title: t.overall_health, detail: t.crop_report_missing, Icon: Leaf },
    { title: t.reports, detail: t.session_data_note, Icon: ClipboardCheck },
  ];
  const ActiveDemoIcon = demoSteps[demoStep].Icon;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1 py-4 sm:py-10">
      <section className="grid items-center gap-8 rounded-3xl border border-[#7b8d80] bg-white p-6 dark:border-[#536458] dark:bg-[#1b2920] sm:p-10 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e9f3e9] px-4 py-2 text-base font-semibold text-[#174c2c]"><Sprout aria-hidden="true" className="h-5 w-5" /> Khet Rakshak</p>
          <h1 className="mt-6 max-w-2xl text-3xl font-bold leading-tight text-[#17251c] dark:text-white sm:text-5xl">{t.landing_title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#465449] dark:text-[#c2cec3]">{t.landing_subtitle}</p>
          <button onClick={() => onNavigate('login')} className="mt-7 min-h-12 w-full rounded-xl bg-[#176b3a] px-6 py-3 text-lg font-bold text-white hover:bg-[#12532d] sm:w-auto">
            {t.landing_action}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('crop-demo')}
            className="mt-3 min-h-12 w-full rounded-xl bg-[#9a4b12] px-6 py-3 text-lg font-bold text-white hover:bg-[#7d3d0f] sm:ml-3 sm:mt-7 sm:w-auto"
          >
            Try Crop Health Demo
          </button>
        </div>
        <div className="rounded-2xl border border-[#7b8d80] bg-[#f7f9f5] p-6 dark:border-[#536458] dark:bg-[#111a14] sm:p-8">
          <Sprout aria-hidden="true" className="h-10 w-10 text-[#176b3a]" />
          <h2 className="mt-4 text-xl font-bold text-[#17251c] dark:text-white">{t.farmer_dashboard}</h2>
          <p className="mt-2 leading-7 text-[#465449] dark:text-[#c2cec3]">{t.landing_subtitle}</p>
          <div role="note" className="mt-6 rounded-xl border border-[#7b8d80] bg-white p-4 text-base leading-6 text-[#465449] dark:border-[#536458] dark:bg-[#1b2920] dark:text-[#c2cec3]">
            {t.landing_note}
          </div>
        </div>
      </section>

      <section aria-labelledby="demo-title" className="overflow-hidden rounded-3xl border border-[#7b8d80] bg-white shadow-sm dark:border-[#536458] dark:bg-[#1b2920]">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <span className="inline-flex items-center rounded-full border border-[#176b3a] bg-[#e9f3e9] px-3 py-1 text-sm font-bold text-[#174c2c] dark:bg-[#263e2e] dark:text-[#a5e8b5]">Farm overview · Shindkheda</span>
            <h2 id="demo-title" className="mt-4 text-2xl font-bold text-[#17251c] dark:text-white sm:text-3xl">{t.how_it_works}</h2>
            <p className="mt-2 text-base leading-7 text-[#465449] dark:text-[#c2cec3]">{t.landing_subtitle}</p>

            <div className="mt-6 grid grid-cols-3 gap-2" role="group" aria-label={t.how_it_works}>
              {demoSteps.map(({ title, Icon }, index) => (
                <button key={title} type="button" aria-pressed={demoStep === index} onClick={() => setDemoStep(index)}
                  className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center text-sm font-semibold ${demoStep === index ? 'border-[#176b3a] bg-[#e9f3e9] text-[#174c2c] dark:bg-[#263e2e] dark:text-[#a5e8b5]' : 'border-[#7b8d80] bg-white text-[#465449] hover:bg-[#f1f7f1] dark:bg-[#111a14] dark:text-[#c2cec3] dark:hover:bg-[#23372a]'}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span>{title}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#7b8d80] bg-[#f7f9f5] p-5 dark:border-[#536458] dark:bg-[#111a14]" aria-live="polite">
              <p className="text-sm font-semibold text-[#176b3a] dark:text-[#a5e8b5]">{demoStep + 1} / {demoSteps.length}</p>
              <h3 className="mt-1 text-xl font-bold text-[#17251c] dark:text-white">{demoSteps[demoStep].title}</h3>
              <p className="mt-2 leading-7 text-[#465449] dark:text-[#c2cec3]">{demoSteps[demoStep].detail}</p>
            </div>
          </div>

          <div className="min-w-0 bg-[#e9f3e9] p-4 dark:bg-[#203629] sm:p-6 lg:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#174c2c] shadow-sm dark:bg-[#111a14] dark:text-[#a5e8b5]">
              <ActiveDemoIcon aria-hidden="true" className="h-4 w-4" />
              {demoSteps[demoStep].title}
            </div>
            <FarmDemoPreview onViewHealth={() => onNavigate('farm-health-demo')} />
          </div>
        </div>
      </section>
    </div>
  );
}

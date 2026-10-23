export default function DroneAnalysis() {
  return (
    <section
      role="status"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100"
    >
      <h2 className="font-bold">Crop disease analysis is unavailable</h2>
      <p className="mt-2 text-sm leading-6">
        No validated crop-disease model is configured. This screen does not display simulated diagnoses, confidence, or severity.
      </p>
    </section>
  );
}

import { useState } from 'react';
import { Check } from 'lucide-react';
import { calculatePilotPricing, formatInr } from '../utils/pumpModel';

interface PricingSectionProps {
  onStartPilot: () => void;
  onBookDemo: () => void;
}

const SETUP_ITEMS = [
  'Industrial M12 T-splitter harness & galvanic signal isolator',
  'ProPump Edge Regression Box (DIN-rail mounted, IP54 enclosure)',
  'On-site installation in under 30 minutes per power pack (zero PLC edits)',
  '14-day baseline volumetric efficiency (ηv) calibration per machine',
  '1-year hardware replacement warranty for shop-floor operation',
];

const SUBSCRIPTION_ITEMS = [
  'Continuous 0–100 Health Score & remaining useful life (RUL) regression',
  'Local plant LAN dashboard + optional encrypted private cloud access',
  'Automated Tamil, English, and Hindi WhatsApp & SMS shift alerts',
  'Component-level wear flags (piston shoes, valve plate, bearing ΔT)',
  'Quarterly fleet reliability summary for maintenance & plant heads',
];

export function PricingSection({ onStartPilot, onBookDemo }: PricingSectionProps) {
  const [units, setUnits] = useState(4);
  const pricing = calculatePilotPricing(units);

  return (
    <section id="pricing" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-sky-700">Transparent Plant Pricing</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 [text-wrap:balance] sm:text-4xl">
              Priced for Indian factories, not enterprise PLC budgets.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              One avoided hydraulic pump seizure on a 250T press or injection molder pays back a full year of monitoring. No hidden OEM integration fees.
            </p>
          </div>

          {/* Interactive Fleet Estimator Control */}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 lg:min-w-[320px]">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="fleet-units-range" className="text-xs font-medium text-slate-600">
                Estimate for your plant fleet
              </label>
              <span className="font-mono text-sm font-semibold tabular-nums text-slate-950">
                {pricing.unitCount} {pricing.unitCount === 1 ? 'power pack' : 'power packs'}
              </span>
            </div>
            <input
              id="fleet-units-range"
              type="range"
              min={1}
              max={24}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer accent-sky-700"
            />
            <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
              <span>1 unit</span>
              <span>10+ units (volume tier)</span>
              <span>24 units</span>
            </div>
          </div>
        </div>

        {/* Two-column pricing structure: Initial Setup vs Annual Subscription */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Column 1: Initial Setup (One-Time) */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Phase 01 · One-Time Hardware &amp; Commissioning
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold text-slate-950">
                Initial Setup (One-Time)
              </h3>
              <div className="mt-5 flex items-baseline gap-2 border-b border-slate-100 pb-5">
                <span
                  data-testid="pricing-setup-total"
                  className="font-mono text-3xl font-bold tabular-nums text-slate-950 sm:text-4xl"
                >
                  {formatInr(pricing.oneTimeSetupInr)}
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  ({formatInr(pricing.perUnitSetupInr)} / unit · {pricing.unitCount}{' '}
                  {pricing.unitCount === 1 ? 'unit' : 'units'})
                </span>
              </div>

              <ul className="mt-6 space-y-3.5 text-sm text-slate-700">
                {SETUP_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={onBookDemo}
                className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:border-slate-950 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                Request Hardware Compatibility Check
              </button>
            </div>
          </div>

          {/* Column 2: Annual Subscription (Per Unit / Year) */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-900 bg-slate-950 p-6 text-slate-100 sm:p-8">
            <div>
              <p className="text-xs font-medium text-sky-400">
                Phase 02 · Ongoing Regression &amp; Alerts
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold text-white">
                Subscription (Per Unit / Year)
              </h3>
              <div className="mt-5 flex items-baseline gap-2 border-b border-slate-800 pb-5">
                <span
                  data-testid="pricing-sub-total"
                  className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl"
                >
                  {formatInr(pricing.annualSubscriptionInr)}
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-400">
                  / year ({formatInr(pricing.perUnitAnnualInr)} / unit / yr)
                </span>
              </div>

              <ul className="mt-6 space-y-3.5 text-sm text-slate-300">
                {SUBSCRIPTION_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-sky-400"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={onStartPilot}
                className="w-full cursor-pointer rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                Start 60-Day Paid Pilot
              </button>
            </div>
          </div>
        </div>

        {/* 60-Day Paid Pilot Assurance Note */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="max-w-3xl">
              <h3 className="font-display text-base font-semibold text-slate-950">
                60-Day Paid Pilot Guarantee — {formatInr(pricing.pilotFee60DaysInr)} for up to 2 critical power packs
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Validate ProPump AI on your hardest-working hydraulic press or injection molder before committing to plant-wide deployment. 100% of your pilot fee is credited toward full setup if you continue; if the regression baseline does not deliver clear visibility, we unclip the M12 splitters with zero lock-in.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartPilot}
              className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              Reserve Pilot Slot
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

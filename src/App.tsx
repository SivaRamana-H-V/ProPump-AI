import { useEffect, useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LivingPumpCore } from './components/LivingPumpCore';
import { RegressionVsBinaryDiagram, M12SplitterSchematic } from './components/Diagrams';
import { PricingSection } from './components/PricingSection';
import { PrivateClientDashboard } from './components/PrivateClientDashboard';
import { ClientLoginModal, LeadModal } from './components/Modals';
import { PREDICTION_SIGNALS } from './data/plantAssets';
import {
  CLIENT_SESSION_STORAGE_KEY,
  ClientSession,
  PumpHealthStatus,
} from './utils/pumpModel';

export default function App() {
  // Interactive 3D Living Pump Core live state (starts healthy)
  const [pumpStatus, setPumpStatus] = useState<PumpHealthStatus>('healthy');

  // Lead capture & Client Login modals + Private Plant Dashboard view
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadModalType, setLeadModalType] = useState<'pilot' | 'demo' | 'expert'>('demo');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [clientSession, setClientSession] = useState<ClientSession | null>(null);
  const [activeView, setActiveView] = useState<'landing' | 'dashboard'>('landing');

  // Restore existing authenticated plant session on reload if server still recognizes token
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as ClientSession;
      if (!parsed?.token) return;

      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${parsed.token}` },
      })
        .then((res) => {
          if (res.ok) {
            setClientSession(parsed);
            setActiveView('dashboard');
          } else {
            window.sessionStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
          }
        })
        .catch(() => {
          // Ignore offline restoration errors
        });
    } catch {
      // Ignore storage parsing errors
    }
  }, []);

  const openLeadModal = (type: 'pilot' | 'demo' | 'expert') => {
    setLeadModalType(type);
    setLeadModalOpen(true);
  };

  const handleOpenPortalOrLogin = () => {
    if (clientSession) {
      setActiveView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setLoginModalOpen(true);
    }
  };

  const handleAuthenticated = (session: ClientSession) => {
    setClientSession(session);
    setActiveView('dashboard');
    try {
      window.sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore restricted sessionStorage
    }
    window.scrollTo({ top: 0 });
  };

  const handleSignOut = async () => {
    const token = clientSession?.token;
    setClientSession(null);
    setActiveView('landing');
    try {
      window.sessionStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
  };

  if (activeView === 'dashboard' && clientSession) {
    return (
      <PrivateClientDashboard
        session={clientSession}
        onBackToLanding={() => setActiveView('landing')}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      {/* =====================================================================
          SECTION 1: NAVBAR
          3-zone Top Bar Contract: Brand wordmark, 5 nav links, 1 primary CTA
      ===================================================================== */}
      <Navbar
        onOpenLeadModal={openLeadModal}
        onOpenLogin={handleOpenPortalOrLogin}
        isAuthenticated={Boolean(clientSession)}
      />

      <main>
        {/* ===================================================================
            SECTION 2: HERO SECTION
            Left column: headline, subhead, two CTAs ("See Pricing", "Client Login")
            Right column: Interactive 3D "The Living Pump Core" cutaway
        =================================================================== */}
        <section className="mx-auto max-w-7xl px-4 pt-12 pb-14 sm:px-6 lg:px-8 lg:pt-16 lg:pb-18">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Hero Left Column */}
            <div className="lg:col-span-6">
              <p className="text-xs font-medium tracking-wide text-slate-600">
                Non-invasive hydraulic power pack monitoring · Built for Indian manufacturing
              </p>

              <h1 className="mt-4 font-display text-4xl leading-[1.1] font-bold tracking-tight text-slate-950 [text-wrap:balance] sm:text-5xl lg:text-[3.35rem]">
                Catch hydraulic pump failure weeks before it stops your line.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                ProPump AI clips an M12 T-splitter onto your existing analog sensor lines and runs a continuous wear regression model at the edge — estimating piston, seal, and valve-plate degradation weeks before seizure with zero PLC changes.
              </p>

              {/* Hero CTAs: Primary ("See Pricing") + Secondary ("Client Login") */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <a
                  href="#pricing"
                  className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  See Pricing
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>

                <button
                  type="button"
                  onClick={handleOpenPortalOrLogin}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:border-slate-950 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  <Lock className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  {clientSession ? 'Open Plant Dashboard' : 'Client Login'}
                </button>
              </div>

              <p className="mt-6 text-xs text-slate-500">
                Move cursor across the 3D pump to tilt · Hover glowing M12 sensor taps · Click housing to inspect predicted component wear
              </p>
            </div>

            {/* Hero Right Column: Interactive Three.js Living Pump Core */}
            <div className="lg:col-span-6">
              <LivingPumpCore
                status={pumpStatus}
                onStatusChange={setPumpStatus}
              />
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 3: STATS BAR
            Full-width 3-column proof bar directly below the hero split
        =================================================================== */}
        <section
          aria-label="Key deployment metrics"
          className="border-y border-slate-200 bg-white"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-200 px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
            <div className="py-7 md:pr-8">
              <p className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-950 sm:text-3xl">
                0–100 Health Score
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                Continuous wear index derived from volumetric efficiency and case-drain drift.
              </p>
            </div>

            <div className="py-7 md:px-8">
              <p className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-950 sm:text-3xl">
                &lt;30 min Install
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                Passive M12 T-splitter clips inline during a shift break — no hose cuts or welding.
              </p>
            </div>

            <div className="py-7 md:pl-8">
              <p className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-950 sm:text-3xl">
                Zero PLC Changes
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                Galvanically isolated read-only tap keeps OEM machine warranties and ladder logic untouched.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 4: PROBLEM SECTION
            Three cards: Unexpected Stops, No Budget for PLC Retrofits, Overworked Engineers
        =================================================================== */}
        <section id="problem" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-sky-700">The Shop-Floor Reality</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 [text-wrap:balance] sm:text-4xl">
              Hydraulic power packs rarely fail loudly until the press is already dead.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Small and mid-sized forging, molding, and foundry units lose lakhs in scrap, overtime, and emergency air-freighted cartridges every time a main piston pump seizes mid-shift.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-mono text-xs font-medium text-slate-500">01 · Margin Erosion</p>
              <h3 className="mt-3 font-display text-xl font-bold text-slate-950">
                Unexpected Stops
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Internal piston shoe wear builds quietly for weeks while line pressure still looks acceptable on the gauge. By the time cavitation or pressure collapse hits, a ₹1.5L pump failure triggers 48–96 hours of lost dispatch and flushed hydraulic circuits.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-mono text-xs font-medium text-slate-500">02 · Legacy Fleet Barrier</p>
              <h3 className="mt-3 font-display text-xl font-bold text-slate-950">
                No Budget for PLC Retrofits
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Typical enterprise IIoT retrofits cost significantly more per machine, often requiring OEM PLC access, proprietary gateways, and multi-day downtime. Older Indian presses and die-casting units need diagnostics that work directly off existing 4–20mA analog lines.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-mono text-xs font-medium text-slate-500">03 · Maintenance Bandwidth</p>
              <h3 className="mt-3 font-display text-xl font-bold text-slate-950">
                Overworked Engineers
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                One maintenance supervisor often looks after 30 to 60 hydraulic power packs across three shifts. Relying on hand-touch temperature checks, ear diagnostics, and paper logbooks makes early wear impossible to catch consistently.
              </p>
            </article>
          </div>
        </section>

        {/* ===================================================================
            SECTION 5: SOLUTION & HOW IT WORKS SECTION
            Regression vs Binary Alert explanation + 3 Architecture Cards + M12 Schematic
        =================================================================== */}
        <section id="solution" className="scroll-mt-20 border-t border-slate-200 bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="text-sm font-medium text-sky-700">The ProPump Solution</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 [text-wrap:balance] sm:text-4xl">
                  Trend regression catches slope drift — binary alarms only report breakdown.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  A standard PLC alarm waits for oil temperature to cross 70°C or pressure to collapse below setpoint. By that moment, metal shavings are already circulating through proportional valves.
                </p>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  ProPump AI models each power pack&apos;s baseline efficiency under identical cycle loads and tracks the weekly degradation slope — giving maintenance teams a 3 to 5 week window to schedule cartridge replacement during Sunday shutdown.
                </p>
              </div>

              <div className="lg:col-span-7">
                <RegressionVsBinaryDiagram />
              </div>
            </div>

            {/* Three Core Architecture Cards */}
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="font-mono text-xs font-medium text-sky-700">01. Hardware Layer</p>
                <h3 className="mt-2.5 font-display text-xl font-bold text-slate-950">
                  Clip-On Hardware
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  Passive M12 T-splitters tap existing 4–20mA pressure, flow, and temperature transmitters with full galvanic isolation. Optional clamp-on case-drain flow sensor adds direct internal leakage tracking in minutes.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="font-mono text-xs font-medium text-sky-700">02. Analytics Layer</p>
                <h3 className="mt-2.5 font-display text-xl font-bold text-slate-950">
                  Edge Regression Engine
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  A rugged DIN-rail edge node computes volumetric efficiency (ηv), case-drain ratios, and pressure ramp slope locally. Predictions keep running even if factory internet goes down.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="font-mono text-xs font-medium text-sky-700">03. Operations Layer</p>
                <h3 className="mt-2.5 font-display text-xl font-bold text-slate-950">
                  Client Dashboard (Local + Private Cloud)
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  Inspect fleet health scores on your plant LAN or securely from management mobile devices, with one-line shift action alerts sent in Tamil, English, or Hindi.
                </p>
              </article>
            </div>

            {/* How It Works Installation Schematic & Steps */}
            <div id="how-it-works" className="scroll-mt-20 mt-14 grid grid-cols-1 items-center gap-8 border-t border-slate-200 pt-14 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <M12SplitterSchematic />
              </div>

              <div className="lg:col-span-5">
                <p className="text-sm font-medium text-sky-700">How It Works</p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950">
                  From unboxing to live regression baseline in 3 steps.
                </h3>
                <ol className="mt-5 space-y-4 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-sky-700">01.</span>
                    <span>
                      <strong className="font-semibold text-slate-950">Unplug &amp; clip inline:</strong>{' '}
                      Insert the M12 T-splitter between your hydraulic transducer and existing PLC cable.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-sky-700">02.</span>
                    <span>
                      <strong className="font-semibold text-slate-950">Auto-learn load cycles:</strong>{' '}
                      The edge gateway profiles your normal press or clamp strokes over the first 14 days.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-sky-700">03.</span>
                    <span>
                      <strong className="font-semibold text-slate-950">Act on early drift:</strong>{' '}
                      Receive component-specific wear warnings weeks before failure — never mid-order.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 6: WHAT IT PREDICTS TABLE
            Volumetric Efficiency, Case-Drain Flow, Oil Temp ΔT, Pressure Ramp
        =================================================================== */}
        <section id="predictions" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-sky-700">Hydraulic Failure Signatures</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 [text-wrap:balance] sm:text-4xl">
                What ProPump AI measures and predicts.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Every health score is backed by four physical hydraulic parameters — transparent engineering telemetry your maintenance chief can verify with a flow meter and IR gun.
              </p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th scope="col" className="px-5 py-3.5">Parameter</th>
                    <th scope="col" className="px-5 py-3.5">Early Warning Pattern</th>
                    <th scope="col" className="px-5 py-3.5">Underlying Wear Mechanism</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Typical Lead Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {PREDICTION_SIGNALS.map((row) => (
                    <tr key={row.signal} className="align-top transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-display font-semibold text-slate-950">{row.signal}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">{row.tapMethod}</p>
                      </td>
                      <td className="px-5 py-4 leading-relaxed text-slate-700">
                        {row.earlyPattern}
                      </td>
                      <td className="px-5 py-4 leading-relaxed text-slate-700">
                        {row.likelyFault}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold whitespace-nowrap tabular-nums text-sky-800">
                        {row.leadTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Note: Lead times are engineering estimates from published hydraulic degradation studies; confirmed per-machine during the 14-day baseline calibration.
            </p>
          </div>
        </section>

        {/* ===================================================================
            SECTION 7: PRICING SECTION
            Two-column table: Initial Setup (One-time) vs Subscription (Per unit/yr)
            Includes 60-day paid pilot note and fleet estimator
        =================================================================== */}
        <PricingSection
          onStartPilot={() => openLeadModal('pilot')}
          onBookDemo={() => openLeadModal('demo')}
        />

        {/* ===================================================================
            SECTION 8: CTA SECTION
            "Ready to Monitor Your First Pump?" with "Start Pilot" & "Talk to Expert"
        =================================================================== */}
        <section className="border-t border-slate-200 bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white [text-wrap:balance] sm:text-4xl">
              Ready to Monitor Your First Pump?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
              Start with a 60-day paid pilot on your highest-downtime press or molding power pack. Installed in under 30 minutes with zero disruption to production schedules.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => openLeadModal('pilot')}
                className="min-h-[44px] cursor-pointer whitespace-nowrap rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Start Pilot
              </button>
              <button
                type="button"
                onClick={() => openLeadModal('expert')}
                className="min-h-[44px] cursor-pointer whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-6 py-2.5 text-sm font-semibold text-slate-100 transition-colors duration-150 hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Talk to Expert
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          SECTION 10: FOOTER
          Copyright, navigation mirror, and explicit demo/field-validation disclaimer
      ===================================================================== */}
      <footer className="border-t border-slate-200 bg-white py-12 text-sm text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-center">
            <div>
              <p className="font-display text-base font-bold text-slate-950">ProPump AI</p>
              <p className="mt-1 text-xs text-slate-500">
                Non-invasive hydraulic power pack monitoring · Industrial edge diagnostics
              </p>
            </div>

            <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <a href="#problem" className="hover:text-slate-950">Problem</a>
              <a href="#solution" className="hover:text-slate-950">Solution</a>
              <a href="#how-it-works" className="hover:text-slate-950">How It Works</a>
              <a href="#pricing" className="hover:text-slate-950">Pricing</a>
              <button
                type="button"
                onClick={handleOpenPortalOrLogin}
                className="cursor-pointer font-medium text-sky-700 hover:text-sky-900"
              >
                {clientSession ? 'Plant Dashboard' : 'Client Login'}
              </button>
            </nav>
          </div>

          <div className="mt-6 flex flex-col justify-between gap-4 text-xs text-slate-500 md:flex-row md:items-center">
            <p>© {new Date().getFullYear()} ProPump AI Technologies. All rights reserved.</p>
            <p className="max-w-2xl md:text-right">
              Disclaimer: Telemetry curves, health scores, and asset logs shown on this platform use representative demo data for evaluation. Multi-plant field validation across partner manufacturing units is currently ongoing; lead-time accuracy depends on baseline duty-cycle stability and sensor calibration.
            </p>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <LeadModal
        open={leadModalOpen}
        initialType={leadModalType}
        onClose={() => setLeadModalOpen(false)}
      />
      <ClientLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LogOut, Search } from 'lucide-react';
import { PlantPumpAsset } from '../data/plantAssets';
import {
  ClientSession,
  computeRegressionSeries,
  filterPlantAssets,
  getPowerPackSensorReadouts,
  PumpHealthStatus,
  SensorHighlightKey,
  VernacularLang,
} from '../utils/pumpModel';
import { PowerPack3DViewer } from './PowerPack3DViewer';
import { RegressionChart } from './RegressionChart';

interface PrivateClientDashboardProps {
  session: ClientSession;
  onBackToLanding: () => void;
  onSignOut: () => void;
}

const LANG_OPTIONS: { code: VernacularLang; label: string }[] = [
  { code: 'ta', label: 'தமிழ்' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
];

const STATUS_FILTERS: { id: 'all' | PumpHealthStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'failing', label: 'Action' },
  { id: 'degraded', label: 'Watch' },
  { id: 'healthy', label: 'Healthy' },
];

function statusColorClass(status: PumpHealthStatus): string {
  if (status === 'failing') return 'text-rose-400';
  if (status === 'degraded') return 'text-amber-400';
  return 'text-sky-400';
}

function statusDisplayText(status: PumpHealthStatus): string {
  if (status === 'failing') return 'Action Required';
  if (status === 'degraded') return 'Watch / Plan Service';
  return 'Healthy';
}

export function PrivateClientDashboard({
  session,
  onBackToLanding,
  onSignOut,
}: PrivateClientDashboardProps) {
  const [assets, setAssets] = useState<PlantPumpAsset[]>([]);
  const [plantMeta, setPlantMeta] = useState<{
    name: string;
    location: string;
    gatewayId: string;
    syncMode: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedAssetId, setSelectedAssetId] = useState<string>('HPU-01');
  const [statusFilter, setStatusFilter] = useState<'all' | PumpHealthStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSensor, setActiveSensor] = useState<SensorHighlightKey | null>(null);
  const [lang, setLang] = useState<VernacularLang>('en');

  useEffect(() => {
    let cancelled = false;

    async function loadPrivatePumps() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/client/pumps', {
          headers: {
            Authorization: `Bearer ${session.token}`,
            Accept: 'application/json',
          },
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          plant?: { name: string; location: string; gatewayId: string; syncMode: string };
          assets?: PlantPumpAsset[];
        };

        if (!res.ok || !data.ok || !Array.isArray(data.assets)) {
          if (!cancelled) {
            setLoadError(data.error || 'Unable to load private power pack telemetry.');
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setAssets(data.assets);
          if (data.plant) setPlantMeta(data.plant);
          if (data.assets.length > 0) {
            setSelectedAssetId((prev) =>
              data.assets!.some((a) => a.id === prev) ? prev : data.assets![0].id,
            );
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Network error while contacting ProPump plant gateway.');
          setLoading(false);
        }
      }
    }

    loadPrivatePumps();
    return () => {
      cancelled = true;
    };
  }, [session.token]);

  const filteredAssets = useMemo(
    () => filterPlantAssets(assets, statusFilter, searchQuery),
    [assets, statusFilter, searchQuery],
  );

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? assets[0] ?? null,
    [assets, selectedAssetId],
  );

  const sensorReadouts = useMemo(
    () => (selectedAsset ? getPowerPackSensorReadouts(selectedAsset.telemetry) : []),
    [selectedAsset],
  );

  const regressionSeries = useMemo(
    () =>
      selectedAsset
        ? computeRegressionSeries(
            selectedAsset.historicalLabels,
            selectedAsset.historicalEtaV,
            selectedAsset.forecastLabels,
          )
        : null,
    [selectedAsset],
  );

  const handleSelectAsset = (id: string) => {
    setSelectedAssetId(id);
    setActiveSensor(null);
  };

  return (
    <div
      data-testid="private-client-dashboard"
      className="min-h-screen bg-[#070D19] text-slate-100"
    >
      {/* Top Workspace Bar: Breadcrumb / Plant Context on left, Back & Sign Out on right */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0B1220]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0 text-sky-400"
            >
              <rect
                x="2.5"
                y="2.5"
                width="19"
                height="19"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="4.5" stroke="#E2E8F0" strokeWidth="1.8" />
              <path
                d="M12 7.5V2.5M16.5 12H21.5M12 16.5V21.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <span className="shrink-0 whitespace-nowrap font-display text-base font-bold tracking-tight text-white">
              ProPump AI
            </span>
            <span aria-hidden="true" className="hidden text-slate-600 sm:inline">/</span>
            <span className="hidden truncate text-sm font-medium text-slate-300 sm:inline">
              {plantMeta?.name ?? session.plantName}
            </span>
            <span aria-hidden="true" className="hidden text-slate-600 lg:inline">·</span>
            <span className="hidden truncate font-mono text-xs text-slate-400 lg:inline">
              {session.username} ({session.role})
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Overview</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-rose-500/70 hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Authenticated 3-Column Private Workspace */}
      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="h-[520px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 lg:col-span-3" />
            <div className="h-[520px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 lg:col-span-6" />
            <div className="h-[520px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 lg:col-span-3" />
          </div>
        ) : loadError || !selectedAsset ? (
          <div
            role="alert"
            className="mx-auto max-w-lg rounded-xl border border-rose-800/70 bg-rose-950/30 p-6 text-center"
          >
            <h1 className="font-display text-lg font-semibold text-white">
              Unable to load private plant data
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {loadError ?? 'No hydraulic power packs are linked to this account.'}
            </p>
            <button
              type="button"
              onClick={onSignOut}
              className="mt-5 cursor-pointer rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Sign in again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
            {/* ===============================================================
                LEFT SIDEBAR: POWER PACK LIST
            =============================================================== */}
            <aside
              aria-label="Hydraulic power pack fleet"
              className="overflow-hidden rounded-xl border border-slate-800 bg-[#0B1220] lg:col-span-3"
            >
              <div className="border-b border-slate-800 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h1 className="font-display text-sm font-semibold text-white">
                    Power Packs
                  </h1>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {filteredAssets.length} of {assets.length} units
                  </span>
                </div>

                {/* Search Power Packs */}
                <div className="relative mt-3">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by ID, press, or bay..."
                    aria-label="Filter power packs"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {/* Segmented Status Filter */}
                <div
                  role="group"
                  aria-label="Filter power packs by health status"
                  className="mt-2.5 grid grid-cols-4 gap-1 rounded-lg bg-slate-950 p-1"
                >
                  {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        aria-pressed={active}
                        className={`cursor-pointer whitespace-nowrap rounded px-1.5 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredAssets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <p>No power packs match the current filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                    className="mt-3 cursor-pointer font-medium text-sky-400 underline underline-offset-2 hover:text-sky-300"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <ul
                  role="listbox"
                  aria-label="Plant hydraulic power packs"
                  className="divide-y divide-slate-800/80"
                >
                  {filteredAssets.map((asset) => {
                    const isSelected = asset.id === selectedAsset.id;
                    return (
                      <li key={asset.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectAsset(asset.id)}
                          className={`flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-500 ${
                            isSelected
                              ? 'bg-slate-800/80 text-white'
                              : 'bg-transparent text-slate-300 hover:bg-slate-900/70'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-semibold text-white">
                              {asset.id} · {asset.shortName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {asset.line} · {asset.architectureLabel}
                            </p>
                            <p
                              className={`mt-1 text-[11px] font-medium ${statusColorClass(asset.status)}`}
                            >
                              {statusDisplayText(asset.status)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right font-mono tabular-nums">
                            <p
                              className={`text-sm font-bold ${statusColorClass(asset.status)}`}
                            >
                              {asset.healthScore}/100
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              ~{asset.daysLeft}d left
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-t border-slate-800 bg-slate-950/70 px-4 py-3 text-[11px] text-slate-400">
                <p className="font-medium text-slate-300">
                  {plantMeta?.gatewayId ?? 'EDGE-CBE-01'} · Private Plant Session
                </p>
                <p className="mt-0.5">{plantMeta?.location ?? session.location}</p>
              </div>
            </aside>

            {/* ===============================================================
                CENTER STAGE: INTERACTIVE 3D POWER PACK MODEL + REGRESSION TREND
            =============================================================== */}
            <section
              aria-label="Selected power pack 3D digital twin and trend"
              className="space-y-5 lg:col-span-6"
            >
              {/* Asset Headline Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B1220] px-5 py-3.5">
                <div className="min-w-0">
                  <h2
                    data-testid="dashboard-asset-heading"
                    className="truncate font-display text-lg font-bold text-white"
                  >
                    {selectedAsset.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {selectedAsset.bay} · {selectedAsset.pumpSpec}
                  </p>
                </div>
                <div className="shrink-0 text-right font-mono tabular-nums">
                  <p className="text-[11px] text-slate-400">Model Confidence</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {selectedAsset.confidencePct}% · {statusDisplayText(selectedAsset.status)}
                  </p>
                </div>
              </div>

              {/* Center Interactive 3D Power Pack Model */}
              <PowerPack3DViewer
                asset={selectedAsset}
                activeSensor={activeSensor}
                onSelectSensor={setActiveSensor}
              />

              {/* 8-Week Regression Trend + Vernacular Shift Action Summary */}
              {regressionSeries && (
                <div className="rounded-xl border border-slate-800 bg-[#0B1220] p-5">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-200">
                      8-Week Volumetric Efficiency &amp; 4-Week Regression Forecast
                    </span>
                    <span className="font-mono tabular-nums text-slate-300">
                      Slope: {regressionSeries.slopePerWeek}% / wk · Est. RUL: ~{selectedAsset.daysLeft}d
                    </span>
                  </div>

                  <RegressionChart
                    series={regressionSeries}
                    status={selectedAsset.status}
                    assetName={selectedAsset.name}
                  />

                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-400">
                        Operator Shift Instruction ·{' '}
                        <span className="font-mono text-slate-200">
                          {lang === 'en' ? 'EN' : lang === 'ta' ? 'TA (தமிழ்)' : 'HI (हिन्दी)'}
                        </span>
                      </span>
                      <div
                        role="group"
                        aria-label="Action text language selector"
                        className="flex items-center gap-1 rounded-md bg-slate-950 p-1"
                      >
                        {LANG_OPTIONS.map((opt) => (
                          <button
                            key={opt.code}
                            type="button"
                            lang={opt.code}
                            data-lang={opt.code}
                            onClick={() => setLang(opt.code)}
                            aria-pressed={lang === opt.code}
                            className={`min-h-[30px] cursor-pointer whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${
                              lang === opt.code
                                ? 'bg-sky-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p
                      key={`${selectedAsset.id}-${lang}`}
                      lang={lang}
                      data-lang={lang}
                      data-testid="vernacular-action-text"
                      aria-live="polite"
                      className="mt-2 text-sm leading-relaxed font-medium text-slate-100"
                    >
                      {selectedAsset.actions[lang]}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* ===============================================================
                RIGHT PANEL: LIVE POWER PACK VALUES & SENSOR READOUTS
            =============================================================== */}
            <aside
              aria-label="Live power pack telemetry values"
              data-testid="power-pack-side-values"
              className="overflow-hidden rounded-xl border border-slate-800 bg-[#0B1220] lg:col-span-3"
            >
              {/* Primary Health Score & RUL Summary */}
              <div className="border-b border-slate-800 p-4">
                <p className="text-xs font-medium text-slate-400">Live Telemetry Values</p>
                <div className="mt-2 flex items-baseline justify-between gap-2 font-mono tabular-nums">
                  <div>
                    <p
                      data-testid="dashboard-selected-score"
                      className={`text-3xl font-bold ${statusColorClass(selectedAsset.status)}`}
                    >
                      {selectedAsset.healthScore}
                      <span className="text-sm font-normal text-slate-500">/100</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Overall Health Score</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">~{selectedAsset.daysLeft}d</p>
                    <p className="mt-0.5 text-xs text-slate-400">Est. Lead Time</p>
                  </div>
                </div>
              </div>

              {/* Interactive Sensor Value Rows (Click to spotlight sensor pin on 3D power pack) */}
              <div className="divide-y divide-slate-800/80">
                {sensorReadouts.map((metric) => {
                  const isFocused = activeSensor === metric.key;
                  return (
                    <button
                      key={metric.id}
                      type="button"
                      onClick={() =>
                        setActiveSensor((prev) => (prev === metric.key ? null : metric.key))
                      }
                      aria-pressed={isFocused}
                      className={`flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-500 ${
                        isFocused
                          ? 'bg-sky-950/60'
                          : 'bg-transparent hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200">{metric.label}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {metric.signalTap} · Ref {metric.nominalRange}
                        </p>
                      </div>
                      <div className="shrink-0 text-right font-mono tabular-nums">
                        <p
                          className={`text-sm font-semibold ${statusColorClass(metric.state)}`}
                        >
                          {metric.value}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {metric.state === 'failing'
                            ? 'Critical'
                            : metric.state === 'degraded'
                              ? 'Drifting'
                              : 'Nominal'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Flagged Component Diagnostic Footer */}
              <div className="border-t border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs font-medium text-slate-400">Flagged Component</p>
                <p
                  className={`mt-1 font-display text-sm font-semibold ${statusColorClass(selectedAsset.status)}`}
                >
                  {selectedAsset.flaggedComponent}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Click any value row above to highlight its physical M12 sensor tap point on the 3D power pack.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

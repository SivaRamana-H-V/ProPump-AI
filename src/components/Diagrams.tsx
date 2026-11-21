// Inline SVG engineering schematics (zero external image dependencies)

export function RegressionVsBinaryDiagram() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h3 className="font-display text-base font-semibold text-slate-950">
          Why Regression Outperforms Binary Alarms
        </h3>
        <span className="font-mono text-xs text-slate-500">
          Volumetric Efficiency (ηv) vs Operating Days
        </span>
      </div>

      <svg
        viewBox="0 0 640 230"
        className="mt-4 h-auto w-full"
        role="img"
        aria-label="Chart comparing binary threshold alarms that trigger only at pump failure versus ProPump regression modeling that flags wear slope 28 days early"
      >
        {/* Subtle horizontal reference grid */}
        <line x1="56" y1="34" x2="610" y2="34" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="56" y1="84" x2="610" y2="84" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="56" y1="134" x2="610" y2="134" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="56" y1="184" x2="610" y2="184" stroke="#CBD5E1" strokeWidth="1.2" />

        {/* Y-Axis Labels */}
        <text x="12" y="38" fill="#64748B" fontSize="11" fontFamily="IBM Plex Mono, monospace">95%</text>
        <text x="12" y="88" fill="#64748B" fontSize="11" fontFamily="IBM Plex Mono, monospace">88%</text>
        <text x="12" y="138" fill="#64748B" fontSize="11" fontFamily="IBM Plex Mono, monospace">80%</text>
        <text x="12" y="188" fill="#64748B" fontSize="11" fontFamily="IBM Plex Mono, monospace">72%</text>

        {/* Binary trip threshold line */}
        <line
          x1="56"
          y1="158"
          x2="610"
          y2="158"
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <text x="64" y="152" fill="#B91C1C" fontSize="11" fontFamily="IBM Plex Mono, monospace">
          Binary PLC Alarm Threshold (Too Late — Pump Seizure Zone)
        </text>

        {/* Early Warning Lead-Time Shaded Band */}
        <rect x="295" y="34" width="235" height="150" fill="#0EA5E9" fillOpacity="0.07" />
        <line x1="295" y1="34" x2="295" y2="184" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="530" y1="34" x2="530" y2="184" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Measured Efficiency Curve + Regression Slope */}
        <path
          d="M 60 44 L 130 47 L 200 52 L 260 62 L 295 72 L 365 95 L 445 124 L 530 158"
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.5"
        />

        {/* ProPump Early Warning Marker */}
        <circle cx="295" cy="72" r="5.5" fill="#0284C7" />
        <text x="306" y="62" fill="#0369A1" fontSize="11.5" fontWeight="600" fontFamily="Public Sans, sans-serif">
          ProPump Flags Slope Drift
        </text>
        <text x="306" y="77" fill="#475569" fontSize="10.5" fontFamily="IBM Plex Mono, monospace">
          28-day planned maintenance window
        </text>

        {/* Binary Alarm Marker */}
        <circle cx="530" cy="158" r="5.5" fill="#DC2626" />
        <text x="455" y="205" fill="#B91C1C" fontSize="11" fontWeight="600" fontFamily="Public Sans, sans-serif">
          Unplanned Line Stop
        </text>

        {/* X-Axis Labels */}
        <text x="58" y="205" fill="#64748B" fontSize="11" fontFamily="IBM Plex Mono, monospace">Day 0</text>
        <text x="278" y="205" fill="#0369A1" fontSize="11" fontFamily="IBM Plex Mono, monospace">Day 32</text>
        <text x="512" y="218" fill="#64748B" fontSize="11" fontFamily="IBM Plex Mono, monospace">Day 60</text>
      </svg>
    </div>
  );
}

export function M12SplitterSchematic() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h3 className="font-display text-base font-semibold text-slate-950">
          Non-Invasive M12 T-Splitter Signal Tap Architecture
        </h3>
        <span className="font-mono text-xs text-slate-500">
          Read-Only Isolation · Zero PLC Logic Changes
        </span>
      </div>

      <svg
        viewBox="0 0 680 185"
        className="mt-4 h-auto w-full"
        role="img"
        aria-label="Wiring schematic showing existing 4 to 20 milliamp hydraulic sensor passing through a passive M12 T-splitter to the existing plant PLC unchanged while tapping a read-only signal to the ProPump Edge Gateway"
      >
        {/* Box 1: Existing Analog Sensors */}
        <rect x="16" y="54" width="150" height="72" rx="8" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
        <text x="30" y="82" fill="#0F172A" fontSize="12.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Existing Sensors
        </text>
        <text x="30" y="100" fill="#475569" fontSize="10.5" fontFamily="IBM Plex Mono, monospace">
          4–20mA / 0–10V
        </text>
        <text x="30" y="114" fill="#64748B" fontSize="10" fontFamily="Public Sans, sans-serif">
          Pressure · Temp · Flow
        </text>

        {/* Wire 1 -> Splitter */}
        <line x1="166" y1="90" x2="238" y2="90" stroke="#0F172A" strokeWidth="2.2" />
        <polygon points="238,85 248,90 238,95" fill="#0F172A" />

        {/* Box 2: Clip-On M12 T-Splitter */}
        <rect x="248" y="48" width="154" height="84" rx="8" fill="#0F172A" stroke="#0284C7" strokeWidth="2" />
        <text x="264" y="78" fill="#F8FAFC" fontSize="12.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          M12 T-Splitter
        </text>
        <text x="264" y="96" fill="#38BDF8" fontSize="10.5" fontFamily="IBM Plex Mono, monospace">
          Galvanic Isolation
        </text>
        <text x="264" y="114" fill="#CBD5E1" fontSize="10" fontFamily="Public Sans, sans-serif">
          Installs in &lt;30 mins
        </text>

        {/* Top Branch -> Existing PLC (Unchanged) */}
        <path d="M 402 74 L 444 74 L 444 44 L 486 44" fill="none" stroke="#64748B" strokeWidth="2" />
        <polygon points="486,39 496,44 486,49" fill="#64748B" />
        <rect x="496" y="16" width="168" height="58" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
        <text x="510" y="40" fill="#0F172A" fontSize="12" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Plant PLC (Untouched)
        </text>
        <text x="510" y="58" fill="#64748B" fontSize="10" fontFamily="Public Sans, sans-serif">
          Zero code or wiring edits
        </text>

        {/* Bottom Branch -> ProPump Edge Box */}
        <path d="M 402 106 L 444 106 L 444 136 L 486 136" fill="none" stroke="#0284C7" strokeWidth="2.4" />
        <polygon points="486,131 496,136 486,141" fill="#0284C7" />
        <rect x="496" y="106" width="168" height="62" rx="8" fill="#F0F9FF" stroke="#0284C7" strokeWidth="1.8" />
        <text x="510" y="131" fill="#0C4A6E" fontSize="12" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          ProPump Edge Unit
        </text>
        <text x="510" y="149" fill="#0369A1" fontSize="10" fontFamily="IBM Plex Mono, monospace">
          Regression + Health Score
        </text>
      </svg>
    </div>
  );
}

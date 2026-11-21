import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenLeadModal: (type: 'pilot' | 'demo' | 'expert') => void;
  onOpenLogin: () => void;
  isAuthenticated?: boolean;
}

const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#solution' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar({
  onOpenLeadModal,
  onOpenLogin,
  isAuthenticated = false,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-slate-50/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-8 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark (single line, zero subtitle clutter) */}
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-display text-lg font-bold tracking-tight text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-sky-600"
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
            <circle cx="12" cy="12" r="4.5" stroke="#0F172A" strokeWidth="1.8" />
            <path d="M12 7.5V2.5M16.5 12H21.5M12 16.5V21.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <span>ProPump AI</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-slate-950 hover:underline hover:decoration-sky-600 hover:decoration-2 hover:underline-offset-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onOpenLogin}
            className="shrink-0 cursor-pointer whitespace-nowrap text-sm font-medium text-sky-700 transition-colors duration-150 hover:text-slate-950 hover:underline hover:decoration-sky-600 hover:decoration-2 hover:underline-offset-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
          >
            {isAuthenticated ? 'Plant Dashboard' : 'Client Login'}
          </button>
        </nav>

        {/* Zone 3: Single primary CTA (always visible on mobile & desktop) + mobile menu toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenLeadModal('demo');
            }}
            className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center whitespace-nowrap rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:px-4 sm:text-sm"
          >
            Book Demo
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down navigation drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white px-4 py-4 shadow-md md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] items-center rounded-md px-3 text-base font-medium text-slate-800 hover:bg-slate-100 hover:text-slate-950"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="mt-2 flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              {isAuthenticated ? 'Open Plant Dashboard' : 'Client Login'}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

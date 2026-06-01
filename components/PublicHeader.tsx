import { ThemeToggle } from '@/components/ThemeToggle'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/80 px-6 py-3 backdrop-blur-md">
      <span className="flex items-center gap-2.5 font-display text-sm font-semibold text-text-primary">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4.5 19.5l1.5-1.5M19.5 4.5l-1.5 1.5M4.5 4.5l1.5 1.5M19.5 19.5l-1.5-1.5M12 3v2m0 14v2M3 12h2m14 0h2" />
          </svg>
        </span>
        Turnero Médico
      </span>
      <ThemeToggle />
    </header>
  )
}

import { ThemeToggle } from '@/components/ThemeToggle'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <span className="font-display text-sm font-semibold text-text-primary">
        Turnero Médico
      </span>
      <ThemeToggle />
    </header>
  )
}

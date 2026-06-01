import { PublicHeader } from '@/components/PublicHeader'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      {children}
    </div>
  )
}

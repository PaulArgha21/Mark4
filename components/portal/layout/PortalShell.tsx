'use client'
import { PortalSidebar } from './PortalSidebar'

interface PortalShellProps {
  children: React.ReactNode
}

export function PortalShell({ children }: PortalShellProps) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--portal-bg)' }}>
      <PortalSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

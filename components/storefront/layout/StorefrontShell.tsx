'use client'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { StorefrontHeader } from './StorefrontHeader'
import { StorefrontFooter } from './StorefrontFooter'
import { BottomNav } from './BottomNav'
import { AnnouncementBar } from './AnnouncementBar'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

interface StorefrontShellProps {
  children: React.ReactNode
}

export function StorefrontShell({ children }: StorefrontShellProps) {
  const { data: settings } = useSWR('/api/storefront/site-settings', fetcher)

  return (
    <div className="min-h-screen flex flex-col bg-clay-bg-base">
      {settings?.announcementText && (
        <div className="hidden md:block">
          <AnnouncementBar
            text={settings.announcementText}
            link={settings.announcementLink}
          />
        </div>
      )}
      <StorefrontHeader />
      <motion.main
        className="flex-1 pb-[72px] md:pb-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.main>
      {/* Footer hidden on mobile — bottom nav replaces it */}
      <div className="app-hide-mobile">
        <StorefrontFooter />
      </div>
      <BottomNav />
    </div>
  )
}

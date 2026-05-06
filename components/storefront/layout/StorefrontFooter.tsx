'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { AprditeLogoIcon } from '@/components/shared/AprditeLogo'
import { Globe, Heart, Send, Play, Mail, MapPin, Phone } from 'lucide-react'
import useSWR from 'swr'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

const footerLinks = {
  shop: [
    { label: 'New Arrivals', href: '/search?q=new' },
    { label: 'Best Sellers', href: '/search?q=best' },
    { label: 'All Products', href: '/search' },
  ],
  account: [
    { label: 'My Orders', href: '/account/orders' },
    { label: 'Wishlist', href: '/account/wishlist' },
    { label: 'My Addresses', href: '/account/addresses' },
    { label: 'Settings', href: '/account/settings' },
  ],
}

export function StorefrontFooter() {
  const { data: settings } = useSWR('/api/storefront/site-settings', fetcher)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setSubscribing(true)
    // Newsletter subscribe placeholder — show success toast
    setTimeout(() => {
      toast.success('Thanks for subscribing!')
      setNewsletterEmail('')
      setSubscribing(false)
    }, 500)
  }

  return (
    <footer className="bg-clay-midnight text-clay-text-on-dark mt-auto">
      {/* Newsletter Strip — Glassmorphic */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <motion.div
            className="text-center max-w-xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeUpVariants} className="w-12 h-12 rounded-2xl glass-frost mx-auto mb-5 flex items-center justify-center">
              <Mail size={20} className="text-white/80" />
            </motion.div>
            <motion.h3
              variants={fadeUpVariants}
              className="font-display text-2xl md:text-3xl font-bold mb-2"
            >
              Stay in the Loop
            </motion.h3>
            <motion.p variants={fadeUpVariants} className="text-white/50 mb-7 text-sm leading-relaxed">
              Subscribe for exclusive drops, early access to sales, and style inspiration.
            </motion.p>
            <motion.form
              variants={fadeUpVariants}
              className="flex gap-2 max-w-md mx-auto"
              onSubmit={handleNewsletterSubmit}
            >
              <input
                type="email"
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 bg-white/8 border border-white/15 rounded-2xl px-5 py-3.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-clay-rose/60 focus:ring-1 focus:ring-clay-rose/30 transition-all"
                required
              />
              <motion.button
                type="submit"
                disabled={subscribing}
                className="bg-clay-rose hover:bg-clay-rose-dark text-white px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all flex-shrink-0 disabled:opacity-50"
                whileTap={{ scale: 0.95 }}
                style={{ boxShadow: '0 0 20px rgba(214,51,108,0.2)' }}
              >
                {subscribing ? '...' : 'Subscribe'}
              </motion.button>
            </motion.form>
          </motion.div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2">
              <AprditeLogoIcon size={32} />
              <span
                className="font-display text-2xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--clay-rose), var(--clay-rose-light))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {settings?.siteName || 'Aprdite'}
              </span>
            </div>
            <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-xs">
              {settings?.tagline || 'Curated fashion for the modern soul.'}
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              {[Globe, Heart, Send, Play].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center hover:bg-clay-rose hover:border-clay-rose transition-all"
                  whileHover={{ y: -2, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon size={15} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-white/50">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/40 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/30">
            &copy; {new Date().getFullYear()} {settings?.siteName || 'Aprdite'}. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[11px] text-white/30">
            <span className="flex items-center gap-1.5"><Mail size={11} /> {settings?.supportEmail || 'support@aprdite.com'}</span>
            <span className="flex items-center gap-1.5"><Phone size={11} /> {settings?.supportPhone || '+91-000-000-0000'}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

'use client'

import { cn } from '@/lib/utils'

interface AprditeLogoProps {
  size?: number
  className?: string
}

export function AprditeLogoIcon({ size = 36, className }: AprditeLogoProps) {
  return (
    <img
      src="/mylogo.png"
      alt="Aprdite"
      width={size}
      height={size}
      className={cn('flex-shrink-0 object-contain', className)}
      draggable={false}
    />
  )
}

interface AprditeLogoWithTextProps {
  size?: number
  textClassName?: string
  className?: string
  brandName?: string
}

export function AprditeLogoWithText({
  size = 32,
  textClassName,
  className,
  brandName = 'Aprdite',
}: AprditeLogoWithTextProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <AprditeLogoIcon size={size} />
      <span
        className={cn('font-display font-bold tracking-tight', textClassName)}
        style={{
          background: 'linear-gradient(135deg, var(--clay-rose), var(--clay-rose-light))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {brandName}
      </span>
    </span>
  )
}

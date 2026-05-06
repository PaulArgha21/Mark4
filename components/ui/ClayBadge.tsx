'use client'
import { motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { badgePopVariants } from '@/lib/animations'

const badgeVariants = cva(
  'inline-flex items-center font-medium',
  {
    variants: {
      variant: {
        default:   'bg-clay-bg-sunken text-clay-text-secondary',
        rose:      'bg-clay-blush text-clay-rose',
        success:   'bg-emerald-50 text-clay-sage',
        warning:   'bg-amber-50 text-clay-warning',
        danger:    'bg-red-50 text-clay-error',
        info:      'bg-blue-50 text-clay-sky',
        sale:      'bg-clay-rose text-white',
        new:       'bg-clay-midnight text-white',
        trending:  'bg-gradient-to-r from-clay-rose to-clay-rose-light text-white',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px] rounded-clay-sm',
        md: 'px-2.5 py-1 text-xs rounded-clay-sm',
        lg: 'px-3 py-1.5 text-sm rounded-clay-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

interface ClayBadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode
  className?: string
  animate?: boolean
}

export function ClayBadge({ children, variant, size, className, animate = false }: ClayBadgeProps) {
  if (animate) {
    return (
      <motion.span
        className={cn(badgeVariants({ variant, size, className }))}
        variants={badgePopVariants}
        initial="hidden"
        animate="visible"
      >
        {children}
      </motion.span>
    )
  }

  return (
    <span className={cn(badgeVariants({ variant, size, className }))}>
      {children}
    </span>
  )
}

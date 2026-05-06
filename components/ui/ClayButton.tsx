'use client'
import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-rose focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-clay-rose text-white hover:bg-clay-rose-dark shadow-clay-md hover:shadow-clay-lg active:shadow-clay-sm',
        secondary:
          'bg-clay-bg-surface text-clay-text border border-clay-border hover:bg-clay-bg-sunken hover:border-clay-rose shadow-clay-sm hover:shadow-clay-md',
        ghost:
          'text-clay-text-secondary hover:text-clay-text hover:bg-clay-bg-sunken',
        danger:
          'bg-clay-error text-white hover:opacity-90 shadow-clay-sm',
        outline:
          'border-2 border-clay-rose text-clay-rose hover:bg-clay-blush',
        link:
          'text-clay-rose hover:text-clay-rose-dark underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-clay-sm',
        md: 'h-10 px-4 text-sm rounded-clay-md',
        lg: 'h-12 px-6 text-base rounded-clay-lg',
        xl: 'h-14 px-8 text-lg rounded-clay-lg',
        icon: 'h-10 w-10 rounded-clay-md',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ClayButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  children?: React.ReactNode
}

const ClayButton = forwardRef<HTMLButtonElement, ClayButtonProps>(
  ({ className, variant, size, fullWidth, loading, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={springs.bouncy}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    )
  }
)
ClayButton.displayName = 'ClayButton'

export { ClayButton, buttonVariants }
export type { ClayButtonProps }

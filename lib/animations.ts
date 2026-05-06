import type { Transition, Variants } from 'framer-motion'

// ═══════════════════════════════════════════════════════════
// CLAY DESIGN SYSTEM — Animation Presets
// As specified in the build plan. DO NOT MODIFY.
// ═══════════════════════════════════════════════════════════

// Spring presets
export const springs = {
  gentle:  { type: 'spring', stiffness: 120, damping: 14 } as Transition,
  bouncy:  { type: 'spring', stiffness: 300, damping: 20 } as Transition,
  snappy:  { type: 'spring', stiffness: 400, damping: 25 } as Transition,
  slow:    { type: 'spring', stiffness: 80,  damping: 20 } as Transition,
}

// Easing curves
export const easings = {
  softBounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  smoothOut:  [0.22, 1, 0.36, 1]     as [number, number, number, number],
  smoothIn:   [0.55, 0, 1, 0.45]     as [number, number, number, number],
}

// Stagger container — parent variant for orchestrating children
export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

// Fade up — individual child variant
export const fadeUpVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.gentle,
  },
}

// Fade in
export const fadeInVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: easings.smoothOut },
  },
}

// Scale in — for modals, cards
export const scaleInVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springs.bouncy,
  },
}

// Slide in from left
export const slideInLeftVariants: Variants = {
  hidden:  { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springs.gentle,
  },
}

// Slide in from right
export const slideInRightVariants: Variants = {
  hidden:  { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springs.gentle,
  },
}

// Card hover — for product cards
export const cardHoverVariants = {
  rest:  { scale: 1, y: 0 },
  hover: {
    scale: 1.03,
    y: -8,
    transition: springs.gentle,
  },
  tap: {
    scale: 0.97,
    transition: springs.snappy,
  },
}

// Image reveal — for lazy-loaded images
export const imageRevealVariants: Variants = {
  hidden:  { opacity: 0, scale: 1.05 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: easings.smoothOut },
  },
}

// Badge pop — for notification badges, counts
export const badgePopVariants: Variants = {
  hidden:  { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springs.bouncy,
  },
}

// Skeleton pulse — for loading states
export const skeletonPulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
  },
}

// Page transition
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: easings.smoothOut } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2, ease: easings.smoothIn } },
}

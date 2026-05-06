'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { skeletonPulse } from '@/lib/animations'

function Bone({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('rounded-clay-md animate-shimmer', className)}
      variants={skeletonPulse}
      initial="initial"
      animate="animate"
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="clay-card overflow-hidden">
      <Bone className="aspect-[3/4] w-full rounded-b-none" />
      <div className="p-3 space-y-2.5">
        <Bone className="h-3 w-2/3" />
        <Bone className="h-4 w-full" />
        <div className="flex items-center gap-2">
          <Bone className="h-3 w-12" />
          <Bone className="h-3 w-16" />
        </div>
        <Bone className="h-5 w-1/3" />
      </div>
    </div>
  )
}

export function HeroSkeleton() {
  return (
    <Bone className="w-full h-[60vh] md:h-[70vh] rounded-none" />
  )
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="clay-card overflow-hidden">
          <Bone className="aspect-square w-full rounded-b-none" />
          <div className="p-3">
            <Bone className="h-4 w-2/3 mx-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StoryBubblesSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
          <Bone className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
          <Bone className="h-3 w-14" />
        </div>
      ))}
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function HomepageSkeleton() {
  return (
    <div className="min-h-screen bg-clay-bg-base space-y-10">
      <HeroSkeleton />
      <div className="px-4 max-w-7xl mx-auto">
        <StoryBubblesSkeleton />
      </div>
      <div className="px-4 max-w-7xl mx-auto">
        <Bone className="h-8 w-48 mb-6" />
        <CategoryGridSkeleton />
      </div>
      <div className="px-4 max-w-7xl mx-auto">
        <Bone className="h-8 w-48 mb-6" />
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-clay-bg-base">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <Bone className="aspect-[3/4] w-full rounded-clay-xl" />
          <div className="space-y-5">
            <Bone className="h-4 w-24" />
            <Bone className="h-10 w-3/4" />
            <Bone className="h-5 w-32" />
            <Bone className="h-8 w-40" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="w-8 h-8 rounded-full" />
              ))}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Bone key={i} className="w-14 h-10 rounded-clay-sm" />
              ))}
            </div>
            <Bone className="h-12 w-full rounded-clay-lg" />
            <Bone className="h-12 w-full rounded-clay-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

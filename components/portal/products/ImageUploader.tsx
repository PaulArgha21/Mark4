'use client'
import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, GripVertical, Star, Loader2 } from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { toast } from 'sonner'

export interface UploadedImage {
  id: string
  url: string
  file?: File
  isPrimary: boolean
  sortOrder: number
  uploading?: boolean
  progress?: number
}

interface ImageUploaderProps {
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  maxImages?: number
  folder?: string
}

export function ImageUploader({ images, onChange, maxImages = 10, folder = 'products' }: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      // Get presigned URL
      const res = await fetch('/api/portal/media/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contentType: file.type, folder }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        toast.error(`Upload URL failed: ${errData?.message || res.statusText}`)
        return null
      }
      const { data } = await res.json()
      if (!data?.uploadUrl) {
        toast.error('Upload URL missing from response — check R2 config')
        return null
      }

      // Upload to R2
      const uploadRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) {
        toast.error(`R2 upload failed: ${uploadRes.statusText}`)
        return null
      }

      return data.publicUrl
    } catch (err) {
      toast.error(`Image upload error: ${err instanceof Error ? err.message : 'Network error'}`)
      return null
    }
  }, [folder])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!fileArr.length) return

    const available = maxImages - images.length
    const toUpload = fileArr.slice(0, available)

    // Create placeholder entries
    const placeholders: UploadedImage[] = toUpload.map((file, i) => ({
      id: `temp-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      file,
      isPrimary: images.length === 0 && i === 0,
      sortOrder: images.length + i,
      uploading: true,
    }))

    const newImages = [...images, ...placeholders]
    onChange(newImages)

    // Upload each file
    const uploaded: UploadedImage[] = [...images]
    let successCount = 0
    let failCount = 0
    for (const placeholder of placeholders) {
      const url = await uploadFile(placeholder.file!)
      if (url) {
        uploaded.push({
          ...placeholder,
          url,
          file: undefined,
          uploading: false,
        })
        successCount++
      } else {
        failCount++
      }
    }
    onChange(uploaded)
    if (successCount > 0) toast.success(`${successCount} image${successCount > 1 ? 's' : ''} uploaded`)
    if (failCount > 0) toast.error(`${failCount} image${failCount > 1 ? 's' : ''} failed to upload`)
  }, [images, maxImages, onChange, uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const removeImage = useCallback((id: string) => {
    const filtered = images.filter(img => img.id !== id)
    // If we removed primary, make first one primary
    if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
      filtered[0].isPrimary = true
    }
    onChange(filtered)
  }, [images, onChange])

  const setPrimary = useCallback((id: string) => {
    const updated = images.map(img => ({ ...img, isPrimary: img.id === id }))
    onChange(updated)
  }, [images, onChange])

  const handleReorder = useCallback((reordered: UploadedImage[]) => {
    const updated = reordered.map((img, i) => ({ ...img, sortOrder: i }))
    onChange(updated)
  }, [onChange])

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/5'
            : 'border-[var(--portal-border)] hover:border-[var(--portal-accent)]/50 hover:bg-[var(--portal-elevated)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
          Drag & drop images here, or click to browse
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>
          PNG, JPG, WEBP up to 5MB • Max {maxImages} images
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>
          {images.length} / {maxImages} uploaded
        </p>
      </div>

      {/* Image Grid — Reorderable */}
      {images.length > 0 && (
        <Reorder.Group
          axis="x"
          values={images}
          onReorder={handleReorder}
          className="flex flex-wrap gap-3"
        >
          <AnimatePresence>
            {images.map((img) => (
              <Reorder.Item
                key={img.id}
                value={img}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div
                  className="relative w-24 h-24 rounded-xl overflow-hidden border"
                  style={{ borderColor: img.isPrimary ? 'var(--portal-accent)' : 'var(--portal-border)' }}
                >
                  <Image
                    src={img.url}
                    alt="Product"
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized={img.url.startsWith('blob:')}
                  />
                  {img.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}

                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPrimary(img.id) }}
                      className="p-1 rounded-full bg-white/90 hover:bg-white transition-colors"
                      title="Set as primary"
                    >
                      <Star size={12} className={img.isPrimary ? 'fill-amber-500 text-amber-500' : 'text-gray-600'} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                      className="p-1 rounded-full bg-white/90 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <X size={12} className="text-red-500" />
                    </button>
                  </div>

                  {/* Primary badge */}
                  {img.isPrimary && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">
                      PRIMARY
                    </div>
                  )}

                  {/* Drag handle */}
                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical size={12} className="text-white drop-shadow" />
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  )
}

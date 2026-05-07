'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, FileSpreadsheet, Download, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

interface BulkResult {
  success: number
  failed: number
  errors: { row: number; message: string }[]
}

export default function BulkUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const parseExcel = useCallback(async (file: File) => {
    // Dynamically import xlsx
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet)
    return data
  }, [])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setResult(null)
    try {
      const data = await parseExcel(f)
      setPreview(data.slice(0, 5))
      toast.success(`Parsed ${data.length} rows from ${f.name}`)
    } catch {
      toast.error('Failed to parse file. Please use .xlsx or .csv format.')
      setFile(null)
    }
  }, [parseExcel])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setUploading(true)
    setResult(null)

    try {
      const data = await parseExcel(file)

      const res = await fetch('/api/portal/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: data }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message || 'Bulk upload failed')
        return
      }

      setResult(json.data)
      toast.success(`Upload complete: ${json.data.success} products created`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [file, parseExcel])

  const downloadTemplate = useCallback(() => {
    const template = [
      ['name', 'brand', 'category', 'basePrice', 'salePrice', 'costPrice', 'description', 'shortDescription', 'sku', 'size', 'color', 'colorHex', 'stock', 'weight', 'isFeatured'],
      ['Silk Saree Gold Border', 'Aprdite', 'Sarees', '2999', '2499', '1200', 'Beautiful silk saree with golden border work', 'Premium silk saree', 'SILK-GOLD-M', 'M', 'Gold', '#FFD700', '50', '500', 'true'],
      ['Cotton Kurta Set', 'Aprdite', 'Kurtas', '1499', '999', '600', 'Pure cotton kurta with palazzo set', 'Cotton kurta set', 'KURT-WHT-L', 'L', 'White', '#FFFFFF', '100', '350', 'false'],
    ]

    const csv = template.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product_upload_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6 max-w-4xl">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--portal-elevated)]" style={{ color: 'var(--portal-muted)' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Bulk Upload</h1>
              <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Import products from Excel/CSV file</p>
            </div>
          </div>
          <ClayButton variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download size={16} /> Download Template
          </ClayButton>
        </motion.div>

        {/* Instructions */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl p-5" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--portal-text)' }}>Instructions</h3>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--portal-muted)' }}>
            <li>• Download the template CSV file and fill in your product data</li>
            <li>• Required columns: <span className="font-medium text-[var(--portal-text)]">name, basePrice, sku</span></li>
            <li>• Optional: brand, category, salePrice, costPrice, description, size, color, colorHex, stock, weight, isFeatured</li>
            <li>• Multiple variants for the same product: use same name, different SKU/size/color</li>
            <li>• Supported formats: .xlsx, .xls, .csv</li>
            <li>• Maximum 500 products per upload</li>
          </ul>
        </motion.div>

        {/* Drop Zone */}
        <motion.div variants={fadeUpVariants}>
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/5'
                : 'border-[var(--portal-border)] hover:border-[var(--portal-accent)]/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <FileSpreadsheet size={40} className="mx-auto mb-3" style={{ color: isDragOver ? 'var(--portal-accent)' : 'var(--portal-muted)' }} />
            {file ? (
              <>
                <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{file.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>{(file.size / 1024).toFixed(1)} KB • Click to replace</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                  Drop your Excel/CSV file here
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>or click to browse</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Preview */}
        {preview.length > 0 && (
          <motion.div variants={fadeUpVariants} className="rounded-2xl p-5 overflow-x-auto" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--portal-text)' }}>Preview (first 5 rows)</h3>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {Object.keys(preview[0]).slice(0, 8).map(key => (
                    <th key={key} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--portal-muted)' }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {Object.values(row).slice(0, 8).map((val: any, j) => (
                      <td key={j} className="px-2 py-1.5 truncate max-w-[150px]" style={{ color: 'var(--portal-text)' }}>{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <ClayButton variant="primary" size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload {preview.length > 5 ? `${preview.length}+` : ''} Products
              </ClayButton>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <motion.div variants={fadeUpVariants} className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>Upload Results</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{result.success} created</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{result.failed} failed</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
                    <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                    <span style={{ color: 'var(--portal-muted)' }}>Row {err.row}: {err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}

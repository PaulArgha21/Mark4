export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'
import { startOfDay, endOfDay } from 'date-fns'

const querySchema = z.object({
  type:      z.enum(['revenue', 'refunds', 'gst', 'orders']),
  startDate: z.string().datetime(),
  endDate:   z.string().datetime(),
  format:    z.enum(['csv', 'json']).default('csv'),
})

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.join(',')
  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

export async function GET(request: Request) {
  const { error, employee } = await requirePermission(request, 'analytics.full')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) return badRequest('Invalid params', parsed.error.flatten())

    const { type, startDate, endDate, format: fmt } = parsed.data
    const start = startOfDay(new Date(startDate))
    const end = endOfDay(new Date(endDate))

    let headers: string[] = []
    let rows: Record<string, unknown>[] = []
    let filename = ''

    switch (type) {
      case 'revenue': {
        const orders = await db.order.findMany({
          where: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } },
          include: {
            user: { select: { name: true, email: true } },
            items: { select: { quantity: true, unitPrice: true, product: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        })

        headers = ['Order Number', 'Date', 'Customer', 'Email', 'Items', 'Subtotal', 'Tax', 'Shipping', 'Discount', 'Total', 'Payment Method']
        rows = orders.map(o => ({
          'Order Number': o.orderNumber,
          'Date': o.createdAt.toISOString().split('T')[0],
          'Customer': o.user.name ?? '',
          'Email': o.user.email,
          'Items': o.items.length,
          'Subtotal': Number(o.subtotal),
          'Tax': Number(o.tax),
          'Shipping': Number(o.shippingCost),
          'Discount': Number(o.discount),
          'Total': Number(o.total),
          'Payment Method': o.paymentMethod ?? 'N/A',
        }))
        filename = `revenue-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`
        break
      }

      case 'refunds': {
        const refunds = await db.refund.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: {
            order: { select: { orderNumber: true, user: { select: { name: true, email: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        })

        headers = ['Refund ID', 'Date', 'Order Number', 'Customer', 'Email', 'Amount', 'Reason', 'Status', 'Razorpay ID']
        rows = refunds.map(r => ({
          'Refund ID': r.id,
          'Date': r.createdAt.toISOString().split('T')[0],
          'Order Number': r.order.orderNumber,
          'Customer': r.order.user.name ?? '',
          'Email': r.order.user.email,
          'Amount': Number(r.amount),
          'Reason': r.reason ?? '',
          'Status': r.status,
          'Razorpay ID': r.razorpayRefundId ?? '',
        }))
        filename = `refunds-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`
        break
      }

      case 'gst': {
        const orders = await db.order.findMany({
          where: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } },
          select: {
            orderNumber: true,
            createdAt: true,
            subtotal: true,
            tax: true,
            total: true,
            shippingAddress: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'asc' },
        })

        headers = ['Order Number', 'Date', 'Customer', 'Taxable Value', 'CGST (9%)', 'SGST (9%)', 'IGST (18%)', 'Total GST', 'Invoice Total']
        rows = orders.map(o => {
          const tax = Number(o.tax)
          const addr = o.shippingAddress as Record<string, unknown> | null
          const state = (addr?.state as string) ?? ''
          const isInterState = state.toLowerCase() !== 'maharashtra' && state !== ''
          return {
            'Order Number': o.orderNumber,
            'Date': o.createdAt.toISOString().split('T')[0],
            'Customer': o.user.name ?? '',
            'Taxable Value': Number(o.subtotal),
            'CGST (9%)': isInterState ? 0 : Math.round((tax / 2) * 100) / 100,
            'SGST (9%)': isInterState ? 0 : Math.round((tax / 2) * 100) / 100,
            'IGST (18%)': isInterState ? tax : 0,
            'Total GST': tax,
            'Invoice Total': Number(o.total),
          }
        })
        filename = `gst-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`
        break
      }

      case 'orders': {
        const orders = await db.order.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: {
            user: { select: { name: true, email: true } },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: 'asc' },
        })

        headers = ['Order Number', 'Date', 'Customer', 'Email', 'Status', 'Payment Status', 'Items', 'Total']
        rows = orders.map(o => ({
          'Order Number': o.orderNumber,
          'Date': o.createdAt.toISOString().split('T')[0],
          'Customer': o.user.name ?? '',
          'Email': o.user.email,
          'Status': o.status,
          'Payment Status': o.paymentStatus,
          'Items': o._count.items,
          'Total': Number(o.total),
        }))
        filename = `orders-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`
        break
      }
    }

    // Audit log the export
    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'finance.export',
      resourceType: 'Report',
      resourceId: type,
      payload: {
        context: {
          type,
          format: fmt,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          rowCount: String(rows.length),
        },
      },
    })

    if (fmt === 'json') {
      return new Response(JSON.stringify({ data: rows, meta: { type, rows: rows.length, start: start.toISOString(), end: end.toISOString() } }), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }

    // CSV
    const csv = toCSV(headers, rows)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (err) {
    console.error('Finance export error:', err)
    return serverError()
  }
}

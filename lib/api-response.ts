import { NextResponse } from 'next/server'

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 })
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function badRequest(message: string, errors?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, details: errors } },
    { status: 400 }
  )
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 401 }
  )
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 403 }
  )
}

export function notFound(message = 'Not found') {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 404 }
  )
}

export function conflict(message: string) {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 409 }
  )
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 500 }
  )
}

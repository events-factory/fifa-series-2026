import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eventsfactory.rw/api/abstract';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

async function proxyRequest(request: NextRequest, pathSegments: string[], method: string) {
  try {
    const path = pathSegments.join('/');
    const url = `${API_BASE_URL}/${path}`;
    const authorization = request.headers.get('authorization');

    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      body = await request.text();
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authorization) headers['Authorization'] = authorization;

    const response = await fetch(url, { method, headers, body: body || undefined });
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return NextResponse.json({ message: 'Proxy error', error: String(error) }, { status: 500 });
  }
}

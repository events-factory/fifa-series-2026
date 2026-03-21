import { NextRequest, NextResponse } from 'next/server';

const SMARTEVENT_API_URL = 'https://app.smartevent.rw/Api';
const EVENT_CODE = process.env.SMARTEVENT_EVENT_CODE || 'X/4eYDDKuZMnlnJAPCBWcER6Y1ZFMVBHWkVxekJBRXBKTnluVWc9PQ==';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

async function proxyRequest(request: NextRequest, pathSegments: string[], method: string) {
  try {
    const path = pathSegments.join('/');
    const url = `${SMARTEVENT_API_URL}/${path}`;

    const isRegistrationEndpoint = [
      'Display-Registration-Categories',
      'Display-Categories-Form-Inputs',
      'Register-Delegate',
      'Invite-Bulk-Delegates',
    ].some((ep) => path.includes(ep));

    const headers: Record<string, string> = {};

    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    } else if (path.includes('Registration-Page-Api')) {
      headers['Authorization'] = EVENT_CODE;
    }

    let body: FormData | string | URLSearchParams | undefined;

    if (method !== 'GET') {
      if (isRegistrationEndpoint) {
        try {
          const incomingFormData = await request.clone().formData();
          const isBulk = path.includes('Invite-Bulk-Delegates');
          const eventCodeField = isBulk ? 'eventcode' : 'event_code';
          const eventCodeValue = EVENT_CODE;

          const newFormData = new FormData();
          newFormData.append(eventCodeField, eventCodeValue);

          incomingFormData.forEach((value, key) => {
            if (key !== 'event_code' && key !== 'eventcode') newFormData.append(key, value);
          });

          body = newFormData;
          delete headers['Content-Type'];
        } catch {
          try {
            const isBulk = path.includes('Invite-Bulk-Delegates');
            const eventCodeField = isBulk ? 'eventcode' : 'event_code';
            const eventCodeValue = EVENT_CODE;
            const formParams = new URLSearchParams();
            formParams.append(eventCodeField, eventCodeValue);

            const jsonBody = await request.json();
            Object.entries(jsonBody).forEach(([key, value]) => {
              if (key !== 'event_code' && key !== 'eventcode') formParams.append(key, String(value));
            });

            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            body = formParams;
          } catch {
            headers['Content-Type'] = 'application/json';
            body = undefined;
          }
        }
      } else {
        headers['Content-Type'] = 'application/json';
        try { body = await request.text(); } catch { body = undefined; }
      }
    } else {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body instanceof FormData ? body : body?.toString() || undefined,
    });

    const data = await response.text();
    return new NextResponse(data, { status: response.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return NextResponse.json({ message: 'SmartEvent proxy error', error: String(error) }, { status: 500 });
  }
}

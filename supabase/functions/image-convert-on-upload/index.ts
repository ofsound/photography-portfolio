import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-webhook-signature'
};

type StorageWebhookPayload = {
  type: string;
  record?: {
    bucket_id?: string;
    bucketId?: string;
    name?: string;
    object_name?: string;
    metadata?: {
      mimetype?: string;
      size?: number | string;
    };
  };
};

type SupabaseRuntime = {
  supabaseUrl: string;
  serviceRoleKey: string;
  supabase: ReturnType<typeof createClient>;
};

type WebhookAuthConfig = {
  sharedSecret: string;
  signatureSecret: string | null;
};

type WebhookAuthResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
    };

const firstNonEmptyEnv = (keys: string[]) => {
  for (const key of keys) {
    const value = Deno.env.get(key);
    if (value && value.trim().length) {
      return value.trim();
    }
  }
  return '';
};

const getRuntime = (): SupabaseRuntime => {
  const supabaseUrl = firstNonEmptyEnv(['SUPABASE_URL', 'PROJECT_URL']);
  const serviceRoleKey = firstNonEmptyEnv([
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SECRET_KEY',
    'SERVICE_ROLE_KEY'
  ]);

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL secret (use SUPABASE_URL or PROJECT_URL).');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing service-role secret (use SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY; SUPABASE_SECRET_KEY also accepted).'
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    supabase: createClient(supabaseUrl, serviceRoleKey)
  };
};

const getWebhookAuthConfig = (): WebhookAuthConfig => {
  const sharedSecret = firstNonEmptyEnv([
    'IMAGE_CONVERT_WEBHOOK_SECRET',
    'STORAGE_WEBHOOK_SECRET',
    'WEBHOOK_SHARED_SECRET'
  ]);

  if (!sharedSecret) {
    throw new Error(
      'Missing webhook auth secret (set IMAGE_CONVERT_WEBHOOK_SECRET, STORAGE_WEBHOOK_SECRET, or WEBHOOK_SHARED_SECRET).'
    );
  }

  const signatureSecret = firstNonEmptyEnv([
    'IMAGE_CONVERT_WEBHOOK_SIGNATURE_SECRET',
    'STORAGE_WEBHOOK_SIGNATURE_SECRET',
    'WEBHOOK_SIGNATURE_SECRET'
  ]);

  return {
    sharedSecret,
    signatureSecret: signatureSecret || null
  };
};

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

const readBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const hmacSha256Hex = async (secret: string, payload: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(new Uint8Array(signature));
};

const normalizeSignatureHeader = (headerValue: string | null) => {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith('sha256=')) {
    return trimmed.slice(7).toLowerCase();
  }
  return trimmed.toLowerCase();
};

const verifyWebhookRequest = async (
  request: Request,
  rawBody: string,
  config: WebhookAuthConfig
): Promise<WebhookAuthResult> => {
  const headerSecret = request.headers.get('x-webhook-secret')?.trim() ?? '';
  const bearerSecret = readBearerToken(request.headers.get('authorization')) ?? '';
  const suppliedSharedSecret = headerSecret || bearerSecret;

  if (!suppliedSharedSecret || !constantTimeEqual(suppliedSharedSecret, config.sharedSecret)) {
    return { ok: false, status: 401, error: 'Unauthorized webhook request.' };
  }

  if (!config.signatureSecret) {
    return { ok: true };
  }

  const suppliedSignature = normalizeSignatureHeader(request.headers.get('x-webhook-signature'));
  if (!suppliedSignature) {
    return { ok: false, status: 401, error: 'Missing webhook signature.' };
  }

  const expectedSignature = await hmacSha256Hex(config.signatureSecret, rawBody);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) {
    return { ok: false, status: 401, error: 'Invalid webhook signature.' };
  }

  return { ok: true };
};

const sourceMimeFromPath = (path: string) => {
  const lower = path.toLowerCase();
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const extensionFromMime = (mime: string) => {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  return 'jpg';
};

const normalizeSourcePath = (rawPath: string) => {
  const trimmed = rawPath.trim().replace(/^\/+/, '');
  const withoutBucket = trimmed.replace(/^photos\//, '');
  const decoded = decodeURIComponent(withoutBucket);

  if (decoded.startsWith('source/')) return decoded;

  const sourceIndex = decoded.indexOf('source/');
  if (sourceIndex >= 0) return decoded.slice(sourceIndex);

  return decoded;
};

const getDeliveryFormat = (sourceMime: string) => {
  if (sourceMime === 'image/heic' || sourceMime === 'image/heif') return 'webp';
  if (sourceMime === 'image/png') return 'png';
  if (sourceMime === 'image/webp') return 'webp';
  return 'jpg';
};

const buildDeliveryPath = (sourcePath: string, ext: string) => {
  const noPrefix = sourcePath.replace(/^source\//, '');
  const stem = noPrefix.replace(/\.[^.]+$/, '');
  return `delivery/${stem}.${ext}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadSourceObject = async (runtime: SupabaseRuntime, sourcePath: string) => {
  let lastError = 'unknown';

  for (let attempt = 0; attempt < 20; attempt++) {
    const { data, error } = await runtime.supabase.storage.from('photos').download(sourcePath);
    if (!error && data) {
      return data;
    }

    lastError = error?.message ?? 'download returned no data';
    await sleep(500);
  }

  throw new Error(`Source object download failed for "${sourcePath}": ${lastError}`);
};

const setDeliveryOnPhotoImage = async (
  runtime: SupabaseRuntime,
  args: {
  sourcePath: string;
  deliveryPath: string;
  deliveryMime: string;
  deliveryBytes: number;
}
) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    const { data: row, error: rowError } = await runtime.supabase
      .from('photo_images')
      .select('id, delivery_storage_path')
      .eq('source_storage_path', args.sourcePath)
      .maybeSingle();

    if (rowError) {
      throw rowError;
    }

    if (!row) {
      await sleep(500);
      continue;
    }

    if (row.delivery_storage_path) {
      return { updated: false, reason: 'already-converted' };
    }

    const { error: updateError } = await runtime.supabase
      .from('photo_images')
      .update({
        delivery_storage_path: args.deliveryPath,
        delivery_mime_type: args.deliveryMime,
        delivery_bytes: args.deliveryBytes
      })
      .eq('id', row.id);

    if (updateError) {
      throw updateError;
    }

    return { updated: true, reason: 'updated' };
  }

  throw new Error('photo_images row not found for source path within retry window');
};

const downloadConverted = async (runtime: SupabaseRuntime, sourcePath: string, format: string) => {
  const encodedPath = sourcePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const transformUrls = [
    `${runtime.supabaseUrl}/storage/v1/render/image/authenticated/photos/${encodedPath}?format=${format}&quality=88`,
    `${runtime.supabaseUrl}/storage/v1/render/image/public/photos/${encodedPath}?format=${format}&quality=88`
  ];

  let lastError = 'unknown';

  for (let attempt = 0; attempt < 20; attempt++) {
    for (const transformUrl of transformUrls) {
      const isAuthenticated = transformUrl.includes('/authenticated/');
      const response = await fetch(transformUrl, {
        method: 'GET',
        headers: isAuthenticated
          ? {
              Authorization: `Bearer ${runtime.serviceRoleKey}`,
              apikey: runtime.serviceRoleKey
            }
          : undefined
      });

      if (response.ok) {
        return await response.blob();
      }

      lastError = `Transform request failed (${response.status}) for path "${sourcePath}" at "${transformUrl}": ${await response.text()}`;
    }
    await sleep(500);
  }

  throw new Error(lastError);
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authConfig = getWebhookAuthConfig();
    const rawBody = await request.text();
    const authResult = await verifyWebhookRequest(request, rawBody, authConfig);
    if (!authResult.ok) {
      return new Response(JSON.stringify({ ok: false, error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let payload: StorageWebhookPayload;
    try {
      payload = rawBody ? (JSON.parse(rawBody) as StorageWebhookPayload) : ({ type: 'unknown' } as StorageWebhookPayload);
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const runtime = getRuntime();
    const record = payload.record;
    const bucketId = record?.bucket_id ?? record?.bucketId;
    const objectName = record?.name ?? record?.object_name;

    if (!bucketId || !objectName) {
      return new Response(JSON.stringify({ ok: true, skipped: 'missing record' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (bucketId !== 'photos') {
      return new Response(JSON.stringify({ ok: true, skipped: 'bucket mismatch' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sourcePath = normalizeSourcePath(objectName);

    if (!sourcePath.startsWith('source/')) {
      return new Response(JSON.stringify({ ok: true, skipped: 'not source prefix' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sourceMime = record.metadata?.mimetype ?? sourceMimeFromPath(sourcePath);
    const deliveryFormat = getDeliveryFormat(sourceMime);
    const deliveryMime =
      deliveryFormat === 'webp' ? 'image/webp' : deliveryFormat === 'png' ? 'image/png' : 'image/jpeg';

    const convertedBlob =
      sourceMime === 'image/heic' || sourceMime === 'image/heif'
        ? await downloadConverted(runtime, sourcePath, deliveryFormat)
        : await downloadSourceObject(runtime, sourcePath);

    const deliveryPath = buildDeliveryPath(sourcePath, extensionFromMime(deliveryMime));

    const { error: uploadError } = await runtime.supabase.storage.from('photos').upload(deliveryPath, convertedBlob, {
      upsert: true,
      contentType: deliveryMime
    });

    if (uploadError) {
      throw uploadError;
    }

    const rowWriteResult = await setDeliveryOnPhotoImage(runtime, {
      sourcePath,
      deliveryPath,
      deliveryMime,
      deliveryBytes: convertedBlob.size
    });

    return new Response(
      JSON.stringify({
        ok: true,
        sourcePath,
        deliveryPath,
        deliveryMime,
        bytes: convertedBlob.size,
        rowWriteResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'conversion failed',
        error: (err as Error).message
      })
    );
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

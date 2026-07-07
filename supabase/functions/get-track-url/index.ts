import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'ilaama-tracks';
const URL_TTL_SECONDS = 3600; // 1 hour

// Allowlist: trackId → storage object path (never exposed to the client)
const TRACKS: Record<string, string> = {
  'i-mean-hello': 'I mean hello.wav',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const origin = req.headers.get('origin');
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403);
  }

  let trackId: string;
  try {
    const body = await req.json();
    trackId = body.trackId;
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const storagePath = TRACKS[trackId];
  if (!storagePath) {
    return jsonResponse({ error: 'Track not found' }, 404);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return jsonResponse({ error: 'Unable to generate stream URL' }, 500);
  }

  return jsonResponse({
    url: data.signedUrl,
    expiresIn: URL_TTL_SECONDS,
  });
});

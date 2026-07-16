const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');

export const isCloudSyncConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const SYNC_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function normalizeSyncCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .match(/.{1,4}/g)
    ?.join('-') || '';
}

export function generateSyncCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (byte) => SYNC_ALPHABET[byte % SYNC_ALPHABET.length]).join('');
  return normalizeSyncCode(raw);
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function workspaceCredentials(syncCode) {
  const normalized = normalizeSyncCode(syncCode);
  if (normalized.replace(/-/g, '').length < 12) {
    throw new Error('كود المزامنة يجب أن يحتوي على 12 حرفًا على الأقل.');
  }
  const compact = normalized.replace(/-/g, '');
  const workspaceId = (await sha256(`quote-flow-id:${compact}`)).slice(0, 40);
  const secretHash = await sha256(`quote-flow-secret:${compact}`);
  return { workspaceId, secretHash };
}

async function callRpc(functionName, body) {
  if (!isCloudSyncConfigured) throw new Error('Cloud sync is not configured.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Cloud request failed (${response.status})`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function loadCloudWorkspace(syncCode) {
  const { workspaceId, secretHash } = await workspaceCredentials(syncCode);
  return callRpc('load_quote_workspace', {
    p_workspace_id: workspaceId,
    p_secret_hash: secretHash,
  });
}

export async function saveCloudWorkspace(syncCode, payload) {
  const { workspaceId, secretHash } = await workspaceCredentials(syncCode);
  return callRpc('save_quote_workspace', {
    p_workspace_id: workspaceId,
    p_secret_hash: secretHash,
    p_payload: payload,
  });
}

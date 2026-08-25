// Mints a Supabase session for the admin user via the service-role admin API
// (generateLink + verifyOtp — no password change, no app-data mutation) and
// writes /tmp/sb-session.json for bench-admin-nav.mjs.
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const user = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: 'admin@stbasilsboston.org',
})
if (linkErr) throw new Error('generateLink failed: ' + linkErr.message)

const { data: sess, error: verifyErr } = await user.auth.verifyOtp({
  token_hash: linkData.properties.hashed_token,
  type: 'magiclink',
})
if (verifyErr) throw new Error('verifyOtp failed: ' + verifyErr.message)

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
writeFileSync('/tmp/sb-session.json', JSON.stringify({ ref, session: sess.session }))
console.log('session minted for', sess.user.email, '→ /tmp/sb-session.json')

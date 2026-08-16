import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)

// Reproduce el patrón ANTIGUO: count + range
async function oldWay(tense: string, exclude: string[]) {
  let cq = db.from('phrases').select('*', { count: 'exact', head: true }).eq('tense', tense)
  if (exclude.length) cq = cq.not('id', 'in', exclude)
  const { count } = await cq
  if (!count) return null
  const offset = Math.floor(Math.random() * count)
  let dq = db.from('phrases').select('id, verb, sentence, answer, type, person, expected_stem, stem_group').eq('tense', tense)
  if (exclude.length) dq = dq.not('id', 'in', exclude)
  const { data } = await dq.range(offset, offset).single()
  return data
}

async function main() {
  const N = 20
  // simula una sesión avanzada: 15 frases ya vistas
  const { data: seen } = await db.from('phrases').select('id').eq('tense','indefinido').limit(15)
  const exclude = (seen ?? []).map((r: any) => r.id)

  const t0 = Date.now()
  for (let i = 0; i < N; i++) await oldWay('indefinido', exclude)
  const elapsed = Date.now() - t0
  console.log(`ANTIGUO (count + range), ${N} peticiones con ${exclude.length} exclusiones:`)
  console.log(`  total ${elapsed}ms  |  media ${(elapsed/N).toFixed(0)}ms por pregunta`)
  console.log(`  consultas a la BD: ${N*2} (2 por pregunta)`)
}
main()

#!/usr/bin/env node
// =============================================================================
// functions/scripts/backfill-url-eventos.mjs
//
// Reescreve a `url` dos eventos já publicados que ficaram com o domínio antigo
// gravado no Firestore (LEELA-S1214-T3 · RN-423).
//
// POR QUE ESTE SCRIPT EXISTE. O `publicarEvento` rodou em produção com
// `EVENTO_URL_BASE = 'https://beh.ro'` cravado no código. Trocar o código não
// reescreve documento antigo: os eventos publicados antes do fix continuam com
// a `url` apontando para o domínio dos mocks Be Hero, e esse campo é lido pelo
// painel e vira o QR do evento.
//
// POR QUE ELE NÃO RODA SOZINHO. Reescrever documento em produção é operação,
// não build. O default é `--dry-run`: o script LISTA o que mudaria e não toca
// em nada. Aplicar exige `--apply` explícito e é decisão do dono.
//
// IDEMPOTENTE. A `url` é função de `base + slug`, então rodar duas vezes
// produz o mesmo resultado. Documentos que já estão certos são pulados, e o
// script conta quantos.
//
// Uso:
//   node functions/scripts/backfill-url-eventos.mjs --project prod
//   node functions/scripts/backfill-url-eventos.mjs --project prod --apply
//
// Ambiente:
//   LEELA_PUBLIC_URL (ou NEXT_PUBLIC_LEELA_URL) — a base nova. Sem ela o
//   script recusa rodar: um backfill sem base gravaria `undefined` em massa,
//   que é pior que o domínio errado.
//   GOOGLE_APPLICATION_CREDENTIALS / credencial padrão do ambiente.
// =============================================================================

import admin from 'firebase-admin';

const args = process.argv.slice(2);
const aplicar = args.includes('--apply');
const projectId =
  valorDe('--project') ??
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.GCLOUD_PROJECT;

function valorDe(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

function basePublica() {
  const bruto = process.env.LEELA_PUBLIC_URL ?? process.env.NEXT_PUBLIC_LEELA_URL;
  if (typeof bruto !== 'string') return null;
  const limpo = bruto.trim().replace(/\/+$/, '');
  if (limpo.length === 0 || !/^https?:\/\/[^\s<>"'\\]+$/.test(limpo)) return null;
  return limpo;
}

const base = basePublica();
if (base === null) {
  console.error(
    'ERRO: defina LEELA_PUBLIC_URL (ou NEXT_PUBLIC_LEELA_URL) com a base pública nova.\n' +
      'Backfill sem base gravaria URL inválida em massa.'
  );
  process.exit(1);
}
if (projectId === undefined) {
  console.error('ERRO: informe --project <id> (ou defina GOOGLE_CLOUD_PROJECT).');
  process.exit(1);
}

admin.initializeApp({ projectId });
const db = admin.firestore();

const snap = await db.collection('eventos').get();

let jaCertos = 0;
let semUrl = 0;
const mudancas = [];

for (const doc of snap.docs) {
  const dados = doc.data();
  const urlAtual = dados.url;
  const slug = typeof dados.slug === 'string' && dados.slug.length > 0 ? dados.slug : doc.id;
  const urlNova = `${base}/${encodeURIComponent(slug)}`;

  // Evento nunca publicado não tem `url` — não se inventa uma aqui: quem
  // grava é a publicação, com a transição de status que ela faz junto.
  if (typeof urlAtual !== 'string' || urlAtual.length === 0) {
    semUrl++;
    continue;
  }
  if (urlAtual === urlNova) {
    jaCertos++;
    continue;
  }
  mudancas.push({ id: doc.id, de: urlAtual, para: urlNova });
}

console.log(`Projeto: ${projectId}`);
console.log(`Base nova: ${base}`);
console.log(`Eventos lidos: ${snap.size}`);
console.log(`Já corretos: ${jaCertos} · sem url (não publicados): ${semUrl}`);
console.log(`A reescrever: ${mudancas.length}`);
for (const m of mudancas) {
  console.log(`  ${m.id}\n    de:   ${m.de}\n    para: ${m.para}`);
}

if (!aplicar) {
  console.log('\nDRY-RUN — nada foi escrito. Repita com --apply para aplicar.');
  process.exit(0);
}

// Lotes de 400 (o limite do batch é 500; folga para o carimbo).
let escritos = 0;
for (let i = 0; i < mudancas.length; i += 400) {
  const lote = db.batch();
  for (const m of mudancas.slice(i, i + 400)) {
    lote.update(db.collection('eventos').doc(m.id), {
      url: m.para,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await lote.commit();
  escritos += Math.min(400, mudancas.length - i);
  console.log(`  … ${escritos}/${mudancas.length}`);
}
console.log(`\nAplicado: ${escritos} documento(s) reescrito(s).`);

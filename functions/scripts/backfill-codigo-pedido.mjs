#!/usr/bin/env node
// =============================================================================
// functions/scripts/backfill-codigo-pedido.mjs
//
// Dá `codigoPedido` (RN-474) às compras que já existem — LEELA-S1228-T4.
//
// POR QUE ESTE SCRIPT EXISTE. O código curto da compra nasce dentro da
// transação de venda (`createInscricaoCharge.ts`), então ele só existe para
// quem comprou DEPOIS da S1228-T1. As compras anteriores continuam sem código,
// e a RN-475 recusou o fallback: superfície que encontra pedido sem código não
// escreve o id interno no lugar, escreve nada. O que a ausência produz é
// ausência — e a única forma de tirar a ausência é backfill.
//
// POR QUE ELE NÃO RODA SOZINHO. A frase do precedente
// (`backfill-url-eventos.mjs`) governa este arquivo também: reescrever
// documento em produção é operação, não build. O default é `--dry-run`: o
// script LISTA o que faria e não toca em nada. Aplicar exige `--apply`
// explícito e é ato do dono, registrado no kanban.
//
// A DIFERENÇA EM RELAÇÃO AO PRECEDENTE, E É ELA QUE EXIGE CUIDADO: este
// backfill também RESERVA. Cada código atribuído cria `pedidoCodigos/{codigo}`
// na MESMA transação em que carimba o pedido. Carimbar sem reservar plantaria
// colisão contra o sorteio do checkout de amanhã — o código apareceria no
// e-mail de uma compra antiga e seria sorteado de novo para uma compra nova,
// que é exatamente a falha que o código existe para não ter. Por isso aqui não
// há `WriteBatch` de 400 como no precedente: batch não é transação, e o par
// (carimbo, reserva) tem de ser atômico. Uma transação por pedido, em série.
//
// IDEMPOTENTE POR COMPARAÇÃO. Pedido que já tem código canônico NUNCA é
// re-sorteado: a transação relê o doc e sai cedo, do mesmo jeito que a
// transação da venda sai cedo no replay. O que uma segunda passada faz é
// convergir para zero escritas. O que ela NÃO faz é trocar o código de
// ninguém: um código já gravado pode ter saído num e-mail, e e-mail enviado
// não se corrige.
//
// O QUE ELE ACRESCENTA, E SÓ ISSO. `codigoPedido` no doc do pedido, o doc de
// reserva, e o ESPELHO do código em cada inscrito da compra (é o campo que a
// busca do operador lê — RN-475/S1228-T3). Nenhum outro campo é tocado:
// `status`, `atualizadoEm` e o resto ficam como estão, inclusive em pedido
// cancelado ou estornado. O backfill não move a compra; ele só lhe dá um nome
// que a pessoa consegue ditar. (Divergência deliberada do precedente, que
// carimba `atualizadoEm`: lá o campo reescrito era o próprio dado do evento;
// aqui `atualizadoEm` é a trilha de quando a COMPRA se moveu, e ela não se
// moveu.)
//
// O ESPELHO É ESCRITO PELO ADMIN SDK, e isso é intencional: desde `48fc7116`
// as Rules fecham `codigoPedido` do inscrito para qualquer cliente (ele entrou
// nas duas listas `hasAny` de campo-de-Function). O Admin SDK não passa por
// Rules, então este script escreve onde o organizador é negado — e o teste da
// lane prova as duas metades no mesmo emulator.
//
// Uso:
//   node functions/scripts/backfill-codigo-pedido.mjs --project leela-hub
//   node functions/scripts/backfill-codigo-pedido.mjs --project leela-hub --apply
//
// Pré-requisito de build: o script importa o gerador do core e o mecanismo de
// reserva de `functions/lib` — reusar é o ponto, duplicar o alfabeto ou o nome
// da coleção seria plantar a divergência que ele existe para evitar. Rode
// `pnpm build` (ou `npm --prefix functions run build`) antes.
//
// Ambiente:
//   GOOGLE_APPLICATION_CREDENTIALS / credencial padrão do ambiente.
//   FIRESTORE_EMULATOR_HOST — quando presente, roda contra o emulator.
// =============================================================================

import admin from 'firebase-admin';

const args = process.argv.slice(2);
const aplicar = args.includes('--apply');
const projectId = valorDe('--project');

function valorDe(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

// `--project` é OBRIGATÓRIO e NÃO cai para `GOOGLE_CLOUD_PROJECT` como o
// precedente: aquele script reescrevia uma URL, este cria documento em coleção
// de reserva. Rodar contra o projeto errado por causa de uma variável de
// ambiente esquecida é o acidente clássico, e o custo de digitar o projeto é
// uma palavra.
if (projectId === undefined || projectId.length === 0) {
  console.error(
    'ERRO: informe --project <id>. Sem default e sem variável de ambiente —\n' +
      'este backfill escreve em pedidos e cria reservas de código.'
  );
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Reuso do mecanismo vivo (import dinâmico só para dar erro legível sem build)
// -----------------------------------------------------------------------------

let core;
let reservaModulo;
try {
  core = await import('@leela/core');
  reservaModulo = await import('../lib/functions/src/checkout/codigoPedidoReserva.js');
} catch (erro) {
  console.error(
    'ERRO: não achei o build de `@leela/core` ou de `functions/lib`.\n' +
      'Este script REUSA o gerador e o mecanismo de reserva em vez de os\n' +
      'duplicar. Rode o build antes:\n' +
      '  pnpm build      (ou: npm --prefix functions run build)\n' +
      `Detalhe: ${erro instanceof Error ? erro.message : String(erro)}`
  );
  process.exit(1);
}

const { gerarCodigoPedido, isCodigoPedidoValido, formatarCodigoPedido } = core;
const {
  PEDIDO_CODIGOS_COL,
  TENTATIVAS_CODIGO_PEDIDO,
  MOTIVO_SEM_CODIGO_PEDIDO_LIVRE,
  gravarReservaCodigoPedidoNaTx,
} = reservaModulo;

admin.initializeApp({ projectId });
const db = admin.firestore();

// -----------------------------------------------------------------------------
// Leitura: o plano, montado antes de qualquer escrita
// -----------------------------------------------------------------------------

/** `eventos/{eventoId}/inscritos/{inscritoId}` — o caminho do espelho. */
function refDoInscrito(eventoId, inscritoId) {
  return db.collection('eventos').doc(eventoId).collection('inscritos').doc(inscritoId);
}

function idsDosInscritos(dados) {
  const refs = dados['inscritoRefs'];
  if (!Array.isArray(refs)) return [];
  return refs.filter((id) => typeof id === 'string' && id.length > 0);
}

/**
 * Classifica UM pedido sem escrever nada. É o que o ensaio imprime e é a mesma
 * conta que a transação refaz na hora de aplicar (lá com o doc relido dentro
 * da transação, que é o que serializa contra uma segunda execução).
 */
async function planejar(doc) {
  const dados = doc.data();
  const codigo = dados['codigoPedido'];
  const eventoId = typeof dados['eventoId'] === 'string' ? dados['eventoId'] : null;
  const inscritoIds = idsDosInscritos(dados);
  const item = {
    id: doc.id,
    eventoId,
    status: typeof dados['status'] === 'string' ? dados['status'] : '?',
    inscritos: inscritoIds.length,
    codigo: isCodigoPedidoValido(codigo) ? codigo : null,
    // `undefined` e `null` são "não tem"; qualquer outra coisa é campo torto e
    // não se toca em campo torto por conta própria (ver `desfecho`).
    codigoTorto:
      codigo !== undefined && codigo !== null && !isCodigoPedidoValido(codigo)
        ? String(codigo)
        : null,
    reservaFalta: false,
    reservaDeOutro: null,
    espelhosAusentes: 0,
    espelhosDivergentes: 0,
    espelhosPerdidos: 0,
  };

  if (item.codigoTorto !== null) {
    item.desfecho = 'codigo_torto';
    return item;
  }

  if (item.codigo !== null) {
    const reserva = await db.collection(PEDIDO_CODIGOS_COL).doc(item.codigo).get();
    if (!reserva.exists) item.reservaFalta = true;
    else {
      const dono = reserva.get('pedidoId');
      if (dono !== doc.id) {
        item.reservaDeOutro = typeof dono === 'string' ? dono : '(sem pedidoId)';
        item.desfecho = 'reserva_de_outro';
        return item;
      }
    }
  }

  if (eventoId !== null && inscritoIds.length > 0) {
    const snaps = await db.getAll(...inscritoIds.map((id) => refDoInscrito(eventoId, id)));
    for (const snap of snaps) {
      if (!snap.exists) {
        item.espelhosPerdidos++;
        continue;
      }
      // Inscrito que aponta para OUTRO pedido não é desta compra — a lista
      // `inscritoRefs` está torta e carimbar seria propagar o erro.
      if (snap.get('pedidoRef') !== doc.id) {
        item.espelhosPerdidos++;
        continue;
      }
      const espelho = snap.get('codigoPedido');
      if (espelho === undefined || espelho === null) item.espelhosAusentes++;
      else if (item.codigo === null || espelho !== item.codigo) item.espelhosDivergentes++;
    }
  }

  const precisaEspelho = item.espelhosAusentes + item.espelhosDivergentes > 0;
  if (item.codigo === null) item.desfecho = 'carimbar';
  else if (item.reservaFalta || precisaEspelho) item.desfecho = 'remendar';
  else item.desfecho = 'ja_ok';
  return item;
}

// -----------------------------------------------------------------------------
// Escrita: uma transação por pedido — carimbo e reserva no MESMO commit
// -----------------------------------------------------------------------------

/**
 * FASE DE LEITURA do sorteio, com a forma de `sortearCodigoPedidoNaTx`.
 *
 * ⚠️ POR QUE NÃO CHAMO `sortearCodigoPedidoNaTx` DIRETO, sendo ela o mecanismo
 * vivo: a assinatura dela é `(db, tx, random = Math.random)`, e o parâmetro
 * default APAGA o sorteio criptográfico que `d36afb64` pôs em
 * `gerarCodigoPedido`. Chamá-la sem argumento sortearia com o PRNG do V8 —
 * exatamente o que aquele commit veio fechar. Como `sorteioUniforme` não é
 * exportado pelo barrel do core, não há como lhe passar a fonte boa de fora.
 * Então aqui o sorteio chama `gerarCodigoPedido()` SEM argumento (default =
 * entropia do sistema) e reusa o resto: o nome da coleção, o teto de
 * tentativas, o motivo nomeado e o gravador da reserva.
 * Isto está declarado no handoff da lane como achado — a mesma linha vale para
 * o caminho da VENDA, que passa `random` explicitamente até o fim.
 */
async function sortearLivreNaTx(tx, col) {
  for (let i = 0; i < TENTATIVAS_CODIGO_PEDIDO; i++) {
    const candidato = gerarCodigoPedido();
    const ref = col.doc(candidato);
    const ocupado = await tx.get(ref);
    if (!ocupado.exists) return { codigo: candidato, ref };
  }
  return null;
}

/**
 * Carimba UM pedido. Todas as leituras antes de qualquer escrita (disciplina
 * de transação do Firestore), e o doc do pedido é RELIDO aqui dentro: é essa
 * leitura que entra no read-set e faz duas execuções simultâneas do backfill
 * serializarem em vez de darem dois códigos ao mesmo pedido.
 */
async function aplicarUm(pedidoId) {
  const pedidoRef = db.collection('pedidos').doc(pedidoId);
  const col = db.collection(PEDIDO_CODIGOS_COL);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) return { desfecho: 'sumiu' };

    const dados = snap.data();
    const atual = dados['codigoPedido'];
    const eventoId = typeof dados['eventoId'] === 'string' ? dados['eventoId'] : null;
    const inscritoIds = idsDosInscritos(dados);
    const refsInscritos =
      eventoId === null ? [] : inscritoIds.map((id) => refDoInscrito(eventoId, id));
    const snapsInscritos =
      refsInscritos.length > 0 ? await tx.getAll(...refsInscritos) : [];

    let codigo;
    let reservaRef;
    let criarReserva = false;
    let carimbarPedido = false;

    if (isCodigoPedidoValido(atual)) {
      // JÁ TEM CÓDIGO: sai cedo do sorteio, para sempre. Só o que falta ao
      // redor (reserva, espelho) pode ser acrescentado.
      codigo = atual;
      reservaRef = col.doc(codigo);
      const reserva = await tx.get(reservaRef);
      if (!reserva.exists) criarReserva = true;
      else if (reserva.get('pedidoId') !== pedidoId) {
        return {
          desfecho: 'reserva_de_outro',
          codigo,
          dono: reserva.get('pedidoId'),
        };
      }
    } else if (atual !== undefined && atual !== null) {
      // Campo torto (não é código canônico). NÃO se apaga e NÃO se sobrescreve
      // por conta própria: pode ser resíduo de escrita manual, e decidir por
      // ele é decisão de gente.
      return { desfecho: 'codigo_torto', valor: String(atual) };
    } else {
      const sorteado = await sortearLivreNaTx(tx, col);
      if (sorteado === null) return { desfecho: MOTIVO_SEM_CODIGO_PEDIDO_LIVRE };
      codigo = sorteado.codigo;
      reservaRef = sorteado.ref;
      criarReserva = true;
      carimbarPedido = true;
    }

    const espelhosAEscrever = [];
    snapsInscritos.forEach((s, i) => {
      if (!s.exists) return;
      if (s.get('pedidoRef') !== pedidoId) return;
      if (s.get('codigoPedido') === codigo) return;
      espelhosAEscrever.push(refsInscritos[i]);
    });

    if (!criarReserva && !carimbarPedido && espelhosAEscrever.length === 0) {
      return { desfecho: 'ja_ok', codigo };
    }

    // `gravarReservaCodigoPedidoNaTx` usa `create`, nunca `set`: reserva
    // alheia jamais é sobrescrita — o commit falha e o Firestore re-executa o
    // callback inteiro, sorteando de novo.
    if (criarReserva) {
      gravarReservaCodigoPedidoNaTx(tx, { codigo, ref: reservaRef }, pedidoId);
    }
    // Só o campo do código. Nada de `atualizadoEm`: o backfill não moveu a
    // compra.
    if (carimbarPedido) tx.update(pedidoRef, { codigoPedido: codigo });
    for (const ref of espelhosAEscrever) tx.update(ref, { codigoPedido: codigo });

    return {
      desfecho: 'aplicado',
      codigo,
      carimbou: carimbarPedido,
      reserva: criarReserva,
      espelhos: espelhosAEscrever.length,
    };
  });
}

// -----------------------------------------------------------------------------
// Execução
// -----------------------------------------------------------------------------

const snapPedidos = await db.collection('pedidos').get();
const plano = [];
for (const doc of snapPedidos.docs) plano.push(await planejar(doc));

const aCarimbar = plano.filter((p) => p.desfecho === 'carimbar');
const aRemendar = plano.filter((p) => p.desfecho === 'remendar');
const jaOk = plano.filter((p) => p.desfecho === 'ja_ok');
const tortos = plano.filter((p) => p.desfecho === 'codigo_torto');
const deOutro = plano.filter((p) => p.desfecho === 'reserva_de_outro');
const espelhosPendentes = plano.reduce(
  (n, p) => n + p.espelhosAusentes + p.espelhosDivergentes,
  0
);

console.log(`Projeto: ${projectId}`);
console.log(`Modo: ${aplicar ? 'APLICAR (escreve)' : 'DRY-RUN (não escreve)'}`);
console.log(`Pedidos lidos: ${snapPedidos.size}`);
console.log(`Já completos: ${jaOk.length} · sem código: ${aCarimbar.length}`);
console.log(
  `A remendar (código existe, falta reserva ou espelho): ${aRemendar.length}`
);
console.log(`Espelhos a carimbar: ${espelhosPendentes}`);
console.log(
  `NÃO tocados — código fora do formato: ${tortos.length} · reserva de outro pedido: ${deOutro.length}`
);

for (const p of [...aCarimbar, ...aRemendar]) {
  const partes = [];
  if (p.codigo === null) partes.push('código novo + reserva');
  else if (p.reservaFalta) partes.push(`reserva de ${formatarCodigoPedido(p.codigo)}`);
  if (p.espelhosAusentes > 0) partes.push(`${p.espelhosAusentes} espelho(s) ausente(s)`);
  if (p.espelhosDivergentes > 0) {
    partes.push(`${p.espelhosDivergentes} espelho(s) divergente(s)`);
  }
  const perdidos =
    p.espelhosPerdidos > 0 ? ` · ${p.espelhosPerdidos} inscrito(s) fora de alcance` : '';
  console.log(
    `  ${p.id}\n    evento=${p.eventoId ?? '(sem eventoId)'} status=${p.status} ` +
      `inscritos=${p.inscritos}${perdidos}\n    → ${partes.join(' + ')}`
  );
}
for (const p of tortos) {
  console.log(`  [FORA DO FORMATO] ${p.id} — codigoPedido=${JSON.stringify(p.codigoTorto)}`);
}
for (const p of deOutro) {
  console.log(
    `  [RESERVA DE OUTRO] ${p.id} — ${formatarCodigoPedido(p.codigo)} pertence a ${p.reservaDeOutro}`
  );
}

if (!aplicar) {
  // O ensaio NÃO sorteia de propósito. Um código impresso aqui não seria o que
  // o `--apply` grava (o sorteio acontece dentro da transação, na hora), e um
  // código de mentira colado num chamado é pior que nenhum. O que o ensaio
  // promete é a CONTA, e ela é exata.
  console.log(
    '\nDRY-RUN — nada foi escrito e nenhum código foi sorteado.\n' +
      'Repita com --apply para aplicar.'
  );
  process.exit(0);
}

let carimbados = 0;
let reservas = 0;
let espelhos = 0;
const ficaramDeFora = [];

for (const p of [...aCarimbar, ...aRemendar]) {
  try {
    const r = await aplicarUm(p.id);
    if (r.desfecho === 'aplicado') {
      if (r.carimbou) carimbados++;
      if (r.reserva) reservas++;
      espelhos += r.espelhos;
      console.log(
        `  ${p.id}  ${formatarCodigoPedido(r.codigo)}  ` +
          `(${r.carimbou ? 'pedido + ' : ''}${r.reserva ? 'reserva + ' : ''}${r.espelhos} espelho(s))`
      );
    } else if (r.desfecho === 'ja_ok') {
      console.log(`  ${p.id}  já estava completo — nada escrito`);
    } else {
      ficaramDeFora.push({ id: p.id, motivo: r.desfecho, detalhe: r });
      console.error(`  ${p.id}  DEIXADO DE FORA — ${r.desfecho}`);
    }
  } catch (erro) {
    // Falha alto e SEGUE: um pedido que não pegou não pode segurar os outros,
    // e o relatório final diz exatamente quem ficou.
    ficaramDeFora.push({
      id: p.id,
      motivo: 'erro',
      detalhe: erro instanceof Error ? erro.message : String(erro),
    });
    console.error(`  ${p.id}  FALHOU — ${erro instanceof Error ? erro.message : String(erro)}`);
  }
}

console.log(
  `\nAplicado: ${carimbados} pedido(s) carimbado(s) · ${reservas} reserva(s) · ${espelhos} espelho(s).`
);
console.log(
  `Não tocados: ${tortos.length} fora do formato · ${deOutro.length} com reserva de outro pedido.`
);

if (ficaramDeFora.length > 0 || tortos.length > 0 || deOutro.length > 0) {
  console.error('\nFICOU DE FORA (precisa de gente):');
  for (const p of tortos) console.error(`  ${p.id} — codigoPedido fora do formato`);
  for (const p of deOutro) console.error(`  ${p.id} — reserva pertence a ${p.reservaDeOutro}`);
  for (const f of ficaramDeFora) {
    console.error(
      `  ${f.id} — ${f.motivo}${f.motivo === MOTIVO_SEM_CODIGO_PEDIDO_LIVRE ? ' (o espaço encolheu: acrescentar um símbolo, não aumentar o teto)' : ''}`
    );
  }
  process.exit(1);
}

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
// O DESTINO É DECLARADO, NÃO ADIVINHADO (REV-5B). `--project` sozinho NÃO diz
// para onde a escrita vai: `FIRESTORE_EMULATOR_HOST` no ambiente desvia o
// Admin SDK inteiro para o emulator, e o script continuaria imprimindo
// "Projeto: leela-hub · Aplicado: 17" enquanto produção não recebe UMA letra.
// Medido: com a variável no ambiente, `--project leela-hub --apply` escreve no
// emulator, sai 0 e é indistinguível de uma execução real — o mesmo acidente
// clássico que a obrigatoriedade do `--project` existe para fechar, entrando
// pela porta de trás. Por isso o destino é declarado nos DOIS sentidos:
//   - variável no ambiente  ⇒ `--emulador` é OBRIGATÓRIO;
//   - variável ausente      ⇒ `--emulador` é RECUSADO.
// Assim "achei que estava no emulator" não escreve em produção, e "achei que
// estava em produção" não escreve no vazio. O destino sai impresso na primeira
// linha, antes de qualquer leitura.
//
// Uso:
//   node functions/scripts/backfill-codigo-pedido.mjs --project leela-hub
//   node functions/scripts/backfill-codigo-pedido.mjs --project leela-hub --apply
//   node functions/scripts/backfill-codigo-pedido.mjs --project demo-x --emulador --apply
//
// Pré-requisito de build: o script importa o gerador do core e o mecanismo de
// reserva de `functions/lib` — reusar é o ponto, duplicar o alfabeto ou o nome
// da coleção seria plantar a divergência que ele existe para evitar. Rode
// `pnpm build` (ou `npm --prefix functions run build`) antes.
//
// Ambiente:
//   GOOGLE_APPLICATION_CREDENTIALS / credencial padrão do ambiente.
//   FIRESTORE_EMULATOR_HOST — quando presente, exige `--emulador` (ver acima).
// =============================================================================

import admin from 'firebase-admin';

const args = process.argv.slice(2);
const aplicar = args.includes('--apply');
const emuladorDeclarado = args.includes('--emulador');
const projectId = valorDe('--project');

function valorDe(flag) {
  const i = args.indexOf(flag);
  if (i < 0 || i + 1 >= args.length) return undefined;
  const valor = args[i + 1];
  // `--project --apply` fazia `projectId = '--apply'` e seguia em MODO APLICAR
  // até morrer com pilha do gRPC. Valor que começa com `--` é flag comida por
  // flag, não é id de projeto.
  return valor.startsWith('--') ? undefined : valor;
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

// O DESTINO, declarado nos dois sentidos (ver cabeçalho). `--project` diz o
// NOME do projeto; só esta variável diz para qual BANCO a escrita vai.
const hostEmulador = process.env.FIRESTORE_EMULATOR_HOST;
const contraEmulador = typeof hostEmulador === 'string' && hostEmulador.length > 0;

if (contraEmulador && !emuladorDeclarado) {
  console.error(
    `ERRO: FIRESTORE_EMULATOR_HOST=${hostEmulador} está no ambiente.\n` +
      `Esta execução NÃO chega ao projeto "${projectId}" — ela vai para o emulator,\n` +
      'e o relatório de sucesso seria indistinguível de uma execução real.\n' +
      '  ensaio/execução local  → repita com --emulador\n' +
      '  produção               → limpe a variável e repita'
  );
  process.exit(1);
}
if (!contraEmulador && emuladorDeclarado) {
  console.error(
    'ERRO: você pediu --emulador e NÃO há FIRESTORE_EMULATOR_HOST no ambiente.\n' +
      `Esta execução iria para o Firestore REAL do projeto "${projectId}".\n` +
      'Suba o emulator (e exporte a variável) ou tire o --emulador.'
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

/**
 * Um id de documento do Firestore: string não vazia, sem `/` (que faria a
 * `.doc()` receber caminho de coleção) e que não seja `.` nem `..`.
 */
function ehIdDeDocumento(id) {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    !id.includes('/') &&
    id !== '.' &&
    id !== '..'
  );
}

/**
 * Os inscritos ALCANÇÁVEIS da compra, e quantos ficaram para trás.
 *
 * ⚠️ Filtrar por `length > 0` não bastava: um `inscritoRefs` com `'a/b'`
 * derrubava a VARREDURA INTEIRA — `.doc('a/b')` lança, ninguém pega, e o dono
 * via pilha do gRPC em vez do relatório, com os outros dezesseis pedidos sem
 * atendimento (medido em REV-5B). Um dado torto num pedido não pode calar os
 * outros; ele vira linha do relatório.
 *
 * Repetido também sai: `[A, A, B]` fazia a conta de espelhos dizer 3 onde há 2
 * documentos, e a conta é justamente o que o dono confere antes de aplicar.
 */
function idsDosInscritos(dados) {
  const refs = dados['inscritoRefs'];
  if (!Array.isArray(refs)) {
    return { ids: [], foraDeAlcance: 0, formaTorta: refs !== undefined };
  }
  const bons = [];
  let foraDeAlcance = 0;
  for (const id of refs) {
    if (!ehIdDeDocumento(id)) {
      foraDeAlcance++;
      continue;
    }
    if (!bons.includes(id)) bons.push(id);
  }
  return { ids: bons, foraDeAlcance, formaTorta: false };
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
  const { ids: inscritoIds, foraDeAlcance, formaTorta } = idsDosInscritos(dados);
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
    vestigio: null,
    espelhosAusentes: 0,
    espelhosDivergentes: 0,
    // Inscrito listado que este script NÃO alcança: id torto, doc inexistente,
    // `pedidoRef` de outra compra, ou pedido sem `eventoId` (sem a sala, não há
    // caminho até o inscrito). Todos entram no relatório em vez de sumirem.
    espelhosPerdidos: foraDeAlcance + (eventoId === null ? inscritoIds.length : 0),
    inscritoRefsTorto: formaTorta,
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
      // VESTÍGIO: o pedido não tem código, mas o ESPELHO tem um canônico. Só o
      // pedido é autoritativo, então o remendo normal escreveria por cima —
      // e por cima de um código que pode ter saído num e-mail, com o agravante
      // de que o valor apagado fica SEM reserva e volta ao sorteio de amanhã.
      // A mesma doutrina do campo torto vale aqui: decidir por ele é decisão
      // de gente.
      if (item.codigo === null && isCodigoPedidoValido(espelho)) {
        item.vestigio = `espelho ${snap.id} guarda ${formatarCodigoPedido(espelho)}`;
      }
    }
  }

  // VESTÍGIO, o outro lado: uma reserva já aponta para este pedido, mas o
  // pedido não tem o campo. Sortear outro deixaria a primeira órfã para sempre
  // — código que ninguém mais alcança e que a busca do operador não acha.
  // Consulta por `pedidoId` (nunca por código): não é o oráculo que a spec
  // recusou, é a pergunta inversa, feita pelo Admin SDK numa operação.
  if (item.codigo === null && item.vestigio === null) {
    const antiga = await db
      .collection(PEDIDO_CODIGOS_COL)
      .where('pedidoId', '==', doc.id)
      .limit(1)
      .get();
    if (!antiga.empty) {
      item.vestigio = `reserva ${formatarCodigoPedido(antiga.docs[0].id)} já é deste pedido`;
    }
  }

  if (item.vestigio !== null) {
    item.desfecho = 'vestigio';
    return item;
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
    const { ids: inscritoIds } = idsDosInscritos(dados);
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
      // VESTÍGIO relido DENTRO da transação: se algum espelho desta compra já
      // guarda um código canônico, ele é a única testemunha de um código que
      // pode ter sido comunicado. Sortear outro apagaria a testemunha e
      // devolveria o código antigo ao sorteio de amanhã, sem reserva. Não se
      // decide isso sozinho.
      const vestigio = snapsInscritos.find(
        (s) =>
          s.exists &&
          s.get('pedidoRef') === pedidoId &&
          isCodigoPedidoValido(s.get('codigoPedido'))
      );
      if (vestigio !== undefined) {
        return {
          desfecho: 'vestigio',
          detalhe: `espelho ${vestigio.id} guarda ${formatarCodigoPedido(vestigio.get('codigoPedido'))}`,
        };
      }
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
const vestigios = plano.filter((p) => p.desfecho === 'vestigio');
const espelhosPendentes = plano.reduce(
  (n, p) => n + p.espelhosAusentes + p.espelhosDivergentes,
  0
);
/** Quem o script NÃO resolve sozinho — a fila que exige decisão de gente. */
const precisamDeGente = tortos.length + deOutro.length + vestigios.length;

console.log(`Projeto: ${projectId}`);
console.log(
  `Destino: ${contraEmulador ? `EMULATOR ${hostEmulador}` : 'PRODUÇÃO — Firestore real'}`
);
console.log(`Modo: ${aplicar ? 'APLICAR (escreve)' : 'DRY-RUN (não escreve)'}`);
console.log(`Pedidos lidos: ${snapPedidos.size}`);
console.log(`Já completos: ${jaOk.length} · sem código: ${aCarimbar.length}`);
console.log(
  `A remendar (código existe, falta reserva ou espelho): ${aRemendar.length}`
);
console.log(`Espelhos a carimbar: ${espelhosPendentes}`);
console.log(
  `NÃO tocados — código fora do formato: ${tortos.length} · reserva de outro pedido: ${deOutro.length} · vestígio de código anterior: ${vestigios.length}`
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
    (p.espelhosPerdidos > 0 ? ` · ${p.espelhosPerdidos} inscrito(s) fora de alcance` : '') +
    (p.inscritoRefsTorto ? ' · inscritoRefs não é lista (nenhum espelho alcançado)' : '');
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
for (const p of vestigios) {
  console.log(`  [VESTÍGIO] ${p.id} — sem codigoPedido, mas ${p.vestigio}`);
}

if (!aplicar) {
  // O ensaio NÃO SORTEIA de propósito: um código sorteado aqui não seria o que
  // o `--apply` grava (o sorteio acontece dentro da transação, na hora), e um
  // código de mentira colado num chamado é pior que nenhum. O que o ensaio
  // promete é a CONTA, e ela é exata.
  //
  // ⚠️ Isto NÃO quer dizer que nenhum `PED-XXXXX` apareça na saída do ensaio:
  // código JÁ GRAVADO é impresso (reserva que falta, reserva de outro,
  // vestígio) porque é dado real e é o que o dono precisa para agir. A
  // promessa é "nenhum código NOVO nasce no ensaio", não "nenhum código é
  // impresso" — a redação anterior prometia a segunda e o teste que a
  // guardava só valia para o cenário sem código nenhum (REV-5B).
  console.log(
    '\nDRY-RUN — nada foi escrito e nenhum código foi sorteado.\n' +
      'Repita com --apply para aplicar.'
  );
  // O ensaio é também a CONFERÊNCIA do runbook, e ali o código de saída era
  // sempre 0 — inclusive com pedido torto e reserva alheia na lista. Quem
  // confiasse no código de saída não veria ninguém ficar para trás.
  process.exit(precisamDeGente > 0 ? 1 : 0);
}

/**
 * A falha é TRAVA TEMPORÁRIA (espera resolve) ou estado que precisa de gente?
 *
 * Medido em REV-5B: matar o script no meio (Ctrl-C / queda do terminal) deixa
 * a transação em voo segurando a trava do pedido no servidor. Repetir o
 * comando em seguida falha NAQUELE pedido com `10 ABORTED: Transaction lock
 * timeout` por cerca de um minuto, e depois passa sozinho. O relatório antigo
 * jogava isso no balaio "precisa de gente", que manda o dono investigar um
 * estado que só precisava de um minuto de relógio.
 */
function ehTravaTemporaria(erro) {
  const codigo = erro !== null && typeof erro === 'object' ? erro['code'] : undefined;
  const texto = erro instanceof Error ? erro.message : String(erro);
  // 10 = ABORTED, 4 = DEADLINE_EXCEEDED, 14 = UNAVAILABLE (gRPC)
  return (
    codigo === 10 ||
    codigo === 4 ||
    codigo === 14 ||
    /ABORTED|lock timeout|DEADLINE_EXCEEDED|UNAVAILABLE|too much contention/i.test(texto)
  );
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
    const texto = erro instanceof Error ? erro.message : String(erro);
    ficaramDeFora.push({
      id: p.id,
      motivo: ehTravaTemporaria(erro) ? 'temporario' : 'erro',
      detalhe: texto,
    });
    console.error(`  ${p.id}  FALHOU — ${texto}`);
  }
}

console.log(
  `\nAplicado: ${carimbados} pedido(s) carimbado(s) · ${reservas} reserva(s) · ${espelhos} espelho(s).`
);
console.log(
  `Não tocados: ${tortos.length} fora do formato · ${deOutro.length} com reserva de outro pedido · ${vestigios.length} com vestígio de código anterior.`
);

const temporarios = ficaramDeFora.filter((f) => f.motivo === 'temporario');
const paraGente = ficaramDeFora.filter((f) => f.motivo !== 'temporario');

if (temporarios.length > 0) {
  console.error('\nTRAVA TEMPORÁRIA — repita o comando em um ou dois minutos:');
  for (const f of temporarios) console.error(`  ${f.id} — ${f.detalhe}`);
}

if (paraGente.length > 0 || precisamDeGente > 0) {
  console.error('\nFICOU DE FORA (precisa de gente):');
  for (const p of tortos) console.error(`  ${p.id} — codigoPedido fora do formato`);
  for (const p of deOutro) console.error(`  ${p.id} — reserva pertence a ${p.reservaDeOutro}`);
  for (const p of vestigios) console.error(`  ${p.id} — ${p.vestigio}`);
  for (const f of paraGente) {
    console.error(
      `  ${f.id} — ${f.motivo}${f.motivo === MOTIVO_SEM_CODIGO_PEDIDO_LIVRE ? ' (o espaço encolheu: acrescentar um símbolo, não aumentar o teto)' : ''}`
    );
  }
}

if (ficaramDeFora.length > 0 || precisamDeGente > 0) process.exit(1);

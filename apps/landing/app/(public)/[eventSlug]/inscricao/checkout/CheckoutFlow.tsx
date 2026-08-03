'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  cotarInscricaoCheckout,
  createInscricaoCharge,
  confirmarPagamentoSandbox,
  expirarPixPendente,
  getCheckoutPrefill,
  loginAnonimo,
  type ConfirmarPagamentoSandboxResult,
  type CotarInscricaoCheckoutResult,
  type CotarParcelaResult,
  type CreateInscricaoChargeResult,
} from '@leela/api-client';
import {
  MOTIVO_ACEITE_VERSAO_DIVERGENTE,
  MOTIVO_GATEWAY_SEM_RESPOSTA,
} from '@leela/core';
import { Button, ToastProvider } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import { ensureLeela } from '@/lib/leelaClient';
import type { EventoPublico } from '@/lib/tipos';
import {
  enderecoVazio,
  inscritoVazio,
  kitEnumFromId,
  kitNomeFromId,
  kitsDaModalidade,
  type EnderecoForm,
  type FormaUI,
  type InscritoForm,
  itensTamanhadosDoKit,
} from './tipos';
import {
  validarEndereco,
  validarInscrito,
  validarResponsavel,
  temErro,
  type ErrosEndereco,
  type ErrosInscrito,
  type ErrosResponsavel,
} from './validacao';
import type { CupomCampoProps } from './CupomCampo';
import { AceitesCompra } from './AceitesCompra';
import { StepDados } from './StepDados';
import { StepModalidadeKit } from './StepModalidadeKit';
import { StepResumo, type LinhaResumo } from './StepResumo';
import { StepPagamento, type CartaoForm } from './StepPagamento';
import { StepConfirmacao, type LinhaConfirmacao } from './StepConfirmacao';
import { CheckoutStepper } from './CheckoutStepper';
import { LeelaWordmark } from './LeelaWordmark';
import { mascaraCep, mascaraTelefone } from './cep';
import { lerCupomCapturado } from '../../CupomTracker';

// Copy humana do erro de sessão (BC-2): o comprador NUNCA vê jargão de infra
// ("Firebase Anonymous Auth", erro cru do SDK) — o detalhe técnico fica só no
// console. Uma frase, ação clara, sem beco sem saída.
const COPY_ERRO_AUTH =
  'Não conseguimos preparar seu pagamento. Verifique sua conexão e tente de novo.';
// S1217-T4 · RN-439: uma frase, o fato e a ação. Nada sobre o que mudou no
// texto novo nem sobre quando ele foi publicado — a tela não recebeu esses
// dados do servidor, e não é ela quem os contaria.
const COPY_ACEITE_DESATUALIZADO =
  'Os termos deste evento foram atualizados enquanto você preenchia. Leia a versão nova e confirme os aceites para continuar.';
// Quantas vezes a sessão anônima re-tenta sozinha (backoff curto) antes de
// pedir ação manual ao comprador. Mantém erro transitório invisível.
const MAX_AUTH_RETRY_AUTO = 1;

/**
 * Janela de coalescing da cotação (T-CKUX-1). Curta de propósito: o objetivo é
 * juntar o vaivém de uma mesma decisão (trocar de kit e voltar, mexer nas
 * parcelas), não fazer o comprador esperar. Cada round-trip de cotação custou
 * 1,7-9,8 s em produção — 200 ms para evitar um deles é troca óbvia.
 */
const DEBOUNCE_COTACAO_MS = 200;

/**
 * Janela do pré-carregamento da escada do cartão (C2-0803). Um pouco maior que
 * a da cotação visível, de propósito: a escada é dado de segundo plano e não
 * pode disputar a vez com o número que o comprador está esperando ver.
 */
const DEBOUNCE_ESCADA_MS = DEBOUNCE_COTACAO_MS + 50;

// Etapas INTERNAS (4), na ordem do mockup/TicketSports (o dono):
//   [0] modalidade+kit · [1] dados · [2] PAGAR · [3] confirmação
// Modalidade e kit ficam juntos na etapa 0 (o kit é filtrado pela modalidade);
// os dados vêm depois (job vence o pixel: o wireframe do Figma põe dados antes
// do kit). O comprador VÊ 3 macro-etapas — o agrupamento 4→3 mora em
// `CheckoutStepper`/`macroDaEtapa` (LEELA-R13 · adendo 10).
//
// DEC-0729 · achados 3, 12 e 17 — o PAGAR era DUAS telas internas (resumo e
// pagamento) dentro da MESMA macro-etapa "Pagamento". Consequências que o dono
// encontrou na compra real:
//   · escolher "cartão de crédito" não abria campo nenhum: era preciso um
//     segundo clique em "Ir para pagamento" para o formulário aparecer, e a
//     barra de progresso não se mexia (achado 17 / D-0729-6);
//   · ao chegar no pagamento, o que estava na frente dele eram os dois aceites,
//     não o meio de pagamento (achado 3);
//   · o resumo do pedido ficava na tela anterior, longe da hora de pagar
//     (achado 12 / D-0729-3).
// As duas viraram UMA: resumo → instrumento → aceites → botão de pagar, na
// ordem em que a decisão acontece. O indicador de progresso não mudou.
//
// O que NÃO mudou, e não pode mudar: a cobrança continua nascendo com a prova
// dos dois aceites (flip F-4a — o servidor recusa `createInscricaoCharge` sem
// eles, antes de qualquer escrita). Por isso o QR do PIX não pode preceder o
// aceite; o que se corrigiu foi a ORDEM da tela, não a regra do dinheiro.

/** Chave de idempotência do cliente (RN-333): [A-Za-z0-9_-]{8,64}. */
function novaChaveIdempotencia(): string {
  const rnd =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `chk-${rnd}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

/**
 * `failed-precondition` do callable (S1209-REV · RN-157): o SERVIDOR conferiu
 * o próprio relógio e disse que a cobrança AINDA vale. É o único erro que
 * carrega veredito — os demais só dizem que a conversa não chegou. O SDK
 * prefixa o código (`functions/failed-precondition`), o emulador não; por isso
 * a comparação é pelo último segmento.
 */
function ehPrecondicaoNaoAtendida(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && code.split('/').pop() === 'failed-precondition';
}

/**
 * DEC-0727 (item 28) — o provedor de pagamento não respondeu no teto de 15s
 * do adapter. É o único erro do checkout que NÃO carrega veredito: a cobrança
 * pode ter nascido no gateway e a resposta não ter voltado. Por isso ele não
 * pinta a tela de vermelho; ele vira "processando pagamento".
 *
 * DOIS canais, na ordem de confiança:
 *   1. `details.motivo` — o contrato tipado que o servidor carimba
 *      (`MOTIVO_GATEWAY_SEM_RESPOSTA`, do core: a Function escreve, a UI
 *      reconhece a MESMA constante). É a leitura boa.
 *   2. o `code` do callable — rede de segurança para o caso de `details` não
 *      atravessar (proxy, SDK antigo, resposta remontada). Comparado pelo
 *      último segmento porque o SDK prefixa (`functions/deadline-exceeded`) e
 *      o emulador não — mesma disciplina de `ehPrecondicaoNaoAtendida`.
 *
 * Comparar TEXTO de mensagem ficou de fora de propósito: mensagem é para
 * humano, não para código.
 *
 * ⚠️ O `typeof motivo === 'string'` NÃO é cerimônia. Sem ele, um erro SEM
 * `details` compara `undefined === MOTIVO_GATEWAY_SEM_RESPOSTA` — e no dia em
 * que a constante chegar `undefined` (build de `@leela/core` defasado: o
 * pacote resolve por `dist`, não por src), a comparação vira `undefined ===
 * undefined` e TODO erro do checkout passa a ser lido como "gateway sem
 * resposta". Recusa de cupom, lote fechado, PIX anterior vivo: tudo viraria
 * "processando pagamento", e o comprador perderia a única informação que
 * poderia usar. O bug foi observado nesta lane, não imaginado.
 */
function ehGatewaySemResposta(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const motivo = (err as { details?: { motivo?: unknown } }).details?.motivo;
  if (typeof motivo === 'string' && motivo === MOTIVO_GATEWAY_SEM_RESPOSTA) {
    return true;
  }
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && code.split('/').pop() === 'deadline-exceeded';
}

/**
 * S1217-T4 · RN-439 — a compra foi recusada porque a versão que ESTA TELA
 * exibiu envelheceu (o organizador publicou material novo enquanto a pessoa
 * preenchia). Mesmos dois canais do `ehGatewaySemResposta`, na mesma ordem de
 * confiança: o `details.motivo` tipado que a Function carimba, e o `code` do
 * callable como rede de segurança.
 *
 * O `code` sozinho NÃO basta aqui, e isso é deliberado: `failed-precondition`
 * é o código de meia dúzia de recusas do checkout (PIX anterior vivo, lote
 * fechado, termo custom não aceito). Tratar todas elas como "termo
 * desatualizado" desmarcaria os aceites de quem levou uma recusa por outro
 * motivo — por isso o `code` só conta quando o motivo tipado veio junto.
 */
function ehVersaoDivergente(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const motivo = (err as { details?: { motivo?: unknown } }).details?.motivo;
  return (
    typeof motivo === 'string' && motivo === MOTIVO_ACEITE_VERSAO_DIVERGENTE
  );
}

function mensagemErro(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return fallback;
}

// ── C1-0803 · o total muda no ATO da escolha ────────────────────────────────
//
// Verbatim do dono (DEC-0803): *"sub total, nao altera imediatamente, quando eu
// faço a seleção."* Ele trocava de parcela e o número ficava parado até o
// round-trip da cotação nova voltar — 1,7-9,8 s medidos em produção, com o
// botão de pagar travado em "Atualizando o total…" no meio do caminho.
//
// A causa não era a espera: era pedir de novo o que o servidor JÁ MANDOU. A
// cotação chega com a ESCADA INTEIRA (`opcoesParcelamento`: parcelas,
// valorParcela e valorTotal de cada opção ofertável) e com o total à vista de
// cada meio (`totaisPorMeio`). Trocar entre opções já cotadas é, portanto,
// troca de LEITURA — a resposta certa já está na mão.
//
// A disciplina de dinheiro fica intacta: NADA aqui é somado, subtraído ou
// arredondado. Cada número exibido é um número que o servidor calculou e
// enviou; a projeção só escolhe QUAL deles responde pela seleção atual. O que
// não estiver na resposta não é inventado — a projeção devolve `null` e a
// guarda do item 64 assume, exatamente como antes.

/**
 * A opção de parcelamento que responde por `forma × parcelas`, tirada do que o
 * servidor já cotou. `null` = não dá para responder sem round-trip.
 */
function opcaoParcelamentoDe(
  cot: CotarInscricaoCheckoutResult,
  escadaCartao: readonly CotarParcelaResult[] | null,
  forma: FormaUI,
  parcelas: number,
): CotarParcelaResult | null {
  if (forma === 'pix') {
    // RN-436: PIX é sempre à vista. A "opção" é o total à vista do comprador,
    // que o servidor mandou pronto em `totalAVista` — nenhuma aritmética.
    if (parcelas !== 1 || typeof cot.totalAVista !== 'number') return null;
    return { parcelas: 1, valorParcela: cot.totalAVista, valorTotal: cot.totalAVista };
  }
  // A escada do CARTÃO: a que veio na cotação vigente quando ela é de cartão,
  // ou a escada cotada à parte (C2-0803) para a mesma base de preço.
  const escada =
    escadaCartao ?? (cot.forma === 'cartao_credito' ? cot.opcoesParcelamento : null);
  if (escada === null) return null;
  return escada.find((o) => o.parcelas === parcelas) ?? null;
}

/**
 * A cotação que responde pela seleção ATUAL, montada com valores que o servidor
 * já enviou. `null` quando a resposta não está na mão — e aí quem manda é a
 * guarda de cotação em voo (item 64 · CKUX-REV).
 *
 * O chamador garante que `cot` é da MESMA base de preço (itens + cupom) da
 * seleção atual: mudar item ou cupom troca o valor de face e nada aqui projeta
 * isso.
 */
function projetarCotacao(
  cot: CotarInscricaoCheckoutResult | null,
  escadaCartao: readonly CotarParcelaResult[] | null,
  forma: FormaUI,
  parcelas: number,
): CotarInscricaoCheckoutResult | null {
  if (cot === null) return null;
  // A cotação vigente já É a da seleção — nada a projetar.
  if (cot.forma === forma && cot.parcelamento.parcelas === parcelas) return cot;

  if (cot.forma !== forma) {
    // Trocar de MEIO só é projetável quando a composição do total não muda,
    // isto é, quando os dois totais por meio existem e são IGUAIS (taxa
    // incorporada, ou repassada com a mesma taxa nos dois meios). Com totais
    // diferentes, a linha "Taxa de serviço" do resumo passaria a ser a do
    // outro meio, e derivá-la aqui (total do meio − valorFinal) criaria a
    // segunda autoridade sobre o dinheiro que a RN-437 proíbe. Nesse caso a
    // projeção se recusa e a guarda de cotação em voo assume.
    const tp = cot.totaisPorMeio;
    if (tp === undefined) return null;
    const alvo = tp[forma];
    const vigente = tp[cot.forma];
    if (alvo === null || vigente === null || alvo !== vigente) return null;
  }

  const opcao = opcaoParcelamentoDe(cot, escadaCartao, forma, parcelas);
  if (opcao === null) return null;

  // RN-437 · o juro continua sem ser derivado na tela. Ele só acompanha a
  // projeção quando é um FATO do contrato (à vista não tem juro) ou quando a
  // parcela projetada é a mesma que o servidor cotou (troca só de meio com
  // total idêntico). Nos demais casos a linha some até a cotação nova chegar —
  // preferível a exibir o juro de outra parcela ao lado do total certo.
  const { jurosParcelamento: jurosCotado, ...semJuros } = cot;
  const juros =
    opcao.parcelas === 1
      ? 0
      : opcao.parcelas === cot.parcelamento.parcelas
        ? jurosCotado
        : undefined;

  return {
    ...semJuros,
    forma,
    parcelamento: opcao,
    totalCobrado: opcao.valorTotal,
    ...(juros !== undefined ? { jurosParcelamento: juros } : {}),
  };
}

interface Atribuicao {
  cupom?: string;
  /** refCodigo do link de afiliado (R9-E · RN-313) — vindo da URL. */
  ref?: string;
}

const REF_RE = /^[A-Z0-9]{4,20}$/;

/**
 * Resolve a atribuição de afiliado (RN-313): o refCodigo da URL do checkout
 * OU o capturado na landing (RefTracker); o instante do PRIMEIRO clique vem
 * do localStorage — sem captura, o servidor assume o instante da compra.
 */
function refDaCompra(
  slug: string,
  refDaUrl: string | undefined
): { codigo: string; clicadoEmMillis?: number } | undefined {
  interface RefStorage {
    codigo?: unknown;
    clicadoEmMillis?: unknown;
  }
  let capturado: RefStorage | null = null;
  try {
    const raw = window.localStorage.getItem(`leela:ref:${slug}`);
    capturado = raw !== null ? (JSON.parse(raw) as RefStorage) : null;
  } catch {
    capturado = null;
  }
  const codigoUrl =
    refDaUrl !== undefined ? refDaUrl.trim().toUpperCase() : undefined;
  const codigoStorage =
    capturado !== null && typeof capturado.codigo === 'string'
      ? capturado.codigo
      : undefined;
  const codigo = codigoUrl ?? codigoStorage;
  if (codigo === undefined || !REF_RE.test(codigo)) return undefined;
  const clicadoEmMillis =
    codigoStorage === codigo &&
    capturado !== null &&
    typeof capturado.clicadoEmMillis === 'number' &&
    Number.isInteger(capturado.clicadoEmMillis) &&
    capturado.clicadoEmMillis > 0
      ? capturado.clicadoEmMillis
      : undefined;
  return { codigo, ...(clicadoEmMillis !== undefined ? { clicadoEmMillis } : {}) };
}

export function CheckoutFlow({
  evento,
  atribuicao,
  recarregarMaterial = () => window.location.reload(),
}: {
  evento: EventoPublico;
  atribuicao: Atribuicao;
  /**
   * S1217-T4 · RN-439 — como a tela vai buscar o TEXTO NOVO quando o
   * servidor recusar a compra por divergência de versão.
   *
   * Existe porque a recusa, sozinha, seria um beco: `evento.politicaVendas`
   * é prop renderizada no servidor, então reconfirmar sem recarregar
   * mandaria a MESMA versão velha e levaria a MESMA recusa, em laço. O
   * default recarrega a rota inteira, que é a única porta que esta árvore
   * tem para o material fresco sem importar o roteador do Next (ver
   * premissa registrada no handoff: `router.refresh()` preservaria o
   * formulário, e a troca é de uma linha aqui).
   */
  recarregarMaterial?: () => void;
}): React.JSX.Element {
  const [step, setStep] = useState(0);

  // Dados (ADR-011 + CKFORM §5.1: telefone do responsável + endereço 1×/pedido)
  const [responsavel, setResponsavel] = useState({ nome: '', email: '', telefone: '' });
  const [euCorro, setEuCorro] = useState(true);
  const [inscritos, setInscritos] = useState<InscritoForm[]>([inscritoVazio()]);
  const [endereco, setEndereco] = useState<EnderecoForm>(enderecoVazio());
  const [errosResponsavel, setErrosResponsavel] = useState<ErrosResponsavel>({});
  const [errosInscritos, setErrosInscritos] = useState<ErrosInscrito[]>([]);
  const [errosEndereco, setErrosEndereco] = useState<ErrosEndereco>({});
  const [errosModalidade, setErrosModalidade] = useState<(string | undefined)[]>([]);
  const [errosKit, setErrosKit] = useState<(string | undefined)[]>([]);
  // RN-231: erro por (inscrito × itemId) — tamanho obrigatório do item do kit.
  const [errosTamanhos, setErrosTamanhos] = useState<Record<string, string>[]>([]);

  // Pagamento / cotação.
  //
  // S1217-T2 · RN-440 · D-ACH-12 — `null` = NENHUMA forma pré-selecionada, e
  // isso é decisão de dinheiro, não de UX. A auto-geração do PIX (A-3) dispara
  // com `step === 2 && forma === 'pix' && aceitesOk`. Enquanto os aceites eram
  // o último gesto humano antes disso, a cobrança nascia porque a pessoa
  // marcava dois checkboxes nesta tela. Com a S1217-T1 os aceites vêm da etapa
  // anterior: com `'pix'` no default, ENTRAR no pagamento passaria a criar
  // cobrança sozinho — e `createInscricaoCharge` grava pedido, pagamento e
  // inscritos como pendentes ANTES de falar com o gateway, recomputando os
  // contadores do evento no caminho. Cada visita ao PAGAR viraria inscrição
  // pendente e cobrança real no Asaas para quem só queria ver o preço.
  const [forma, setForma] = useState<FormaUI | null>(null);
  /**
   * A forma que a COTAÇÃO assume enquanto ninguém escolheu: PIX à vista. O
   * preço não depende dela para ser mostrado — o bloco de totais exibe essa
   * composição e cada opção carrega o próprio total no rótulo (S1216-T4), então
   * a pessoa vê os dois preços antes de decidir. Só o ATO de pagar exige uma
   * escolha explícita.
   */
  const formaCotada: FormaUI = forma ?? 'pix';
  const [parcelas, setParcelas] = useState(1);
  const [cupomInput, setCupomInput] = useState(atribuicao.cupom ?? '');
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null);
  const [cotacao, setCotacao] = useState<CotarInscricaoCheckoutResult | null>(null);
  /**
   * C1-0803 · a BASE de preço (evento + seleção + cupom) da cotação que está em
   * `cotacao`. É a régua que autoriza a projeção do total: com a base igual à
   * da tela, trocar parcela ou meio é releitura do que o servidor já mandou;
   * com a base diferente, o valor de face mudou e só a cotação nova responde.
   */
  const [baseCotada, setBaseCotada] = useState<string | null>(null);
  const [cotando, setCotando] = useState(false);
  const [erroCotacao, setErroCotacao] = useState<string | null>(null);
  const [aplicandoCupom, setAplicandoCupom] = useState(false);
  // Retry manual da cotação (BC-1): incrementar re-dispara o efeito de cotação
  // com a MESMA lógica (mesmo guard de cancelamento) — nada de caminho paralelo.
  const [recotarNonce, setRecotarNonce] = useState(0);
  // Auto-aplicar cupom da URL (A-2): pendente até a 1ª cotação possível tentar
  // o cupom do link; `erroCupomUrl` é o banner honesto quando ele não cola.
  const [cupomUrlPendente, setCupomUrlPendente] = useState<boolean>(Boolean(atribuicao.cupom));
  const [erroCupomUrl, setErroCupomUrl] = useState<string | null>(null);
  // S1215-T2 (RN-430): o cupom do LINK, que pode vir da URL desta página OU do
  // que o `CupomTracker` guardou na página do evento. Estado, e não constante,
  // porque a leitura do storage só pode acontecer depois da montagem — este
  // componente também renderiza no servidor.
  const [cupomDoLink, setCupomDoLink] = useState<string | null>(atribuicao.cupom ?? null);
  // Origem do cupom EFETIVAMENTE aplicado: alimenta a marca "(desconto
  // aplicado)" na linha de desconto do resumo (D-KC-8). É exibição, nunca
  // cálculo — o número continua vindo inteiro da cotação.
  const [origemCupom, setOrigemCupom] = useState<'link' | 'manual' | null>(null);
  // D-4 (S1209-T1): o cupom agora é aplicável já no step 0, longe do bloco de
  // totais. A recusa do cupom deixa de se disfarçar de "erro de cotação" (que
  // significa "não consegui calcular o total") e ganha canal próprio.
  const [erroCupom, setErroCupom] = useState<string | null>(null);

  // S1217-T1 · RN-438 (supersede a CKFORM §5.3 de 2026-07-18) — os DOIS
  // aceites saíram do PAGAR e passaram a fechar a etapa de INSCRIÇÃO: eles
  // gateiam o "Continuar" do step 1, e chegar ao pagamento já significa aceite
  // dado. Continuam entrando no input do `createInscricaoCharge` como
  // booleans; versão, instante e hash seguem carimbados pelo SERVIDOR dentro
  // da transação (CKMOD) — a coleta mudou de etapa, a prova não mudou de dono.
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteSaude, setAceiteSaude] = useState(false);
  // S1217-T3 · RN-441 — terceiro aceite, condicional ao evento. O servidor já
  // exigia `saudeCustom === true` quando o evento tem termo próprio ativo e a
  // tela nunca coletou nem enviou o campo: TODO evento com termo custom estava
  // com a compra quebrada, sempre. O leitor público já projetava texto e
  // versão desde a CK2 — faltava a coleta.
  const [aceiteSaudeCustom, setAceiteSaudeCustom] = useState(false);
  // Leitura Postel: `undefined` (projeção sem o campo) é AUSÊNCIA de termo,
  // igual a `null`. Tratar os dois de forma diferente exigiria um aceite que a
  // tela não renderiza — o gate travaria a compra em vez de protegê-la.
  const termoSaudeCustom = evento.termoSaudeCustom ?? null;
  const exigeSaudeCustom = termoSaudeCustom !== null;
  const aceitesOk =
    aceiteTermos && aceiteSaude && (!exigeSaudeCustom || aceiteSaudeCustom);
  // Erro do gate: só aparece depois de a pessoa TENTAR avançar sem marcar —
  // acusar antes da ação puniria quem ainda está preenchendo o formulário.
  const [erroAceites, setErroAceites] = useState<string | null>(null);

  // Cobrança / confirmação
  const chaveRef = useRef<string | undefined>(undefined);
  const [charge, setCharge] = useState<CreateInscricaoChargeResult | null>(null);
  const [criandoCharge, setCriandoCharge] = useState(false);
  const [erroCharge, setErroCharge] = useState<string | null>(null);
  // DEC-0727 (item 28): o provedor estourou o teto de 15s. Estado PRÓPRIO, e
  // não um `erroCharge` com outro texto, porque o desfecho é DESCONHECIDO — a
  // tela não pode afirmar que a cobrança falhou (nem que deu certo). Também é
  // ele que segura a auto-geração do PIX: sem esse freio, a tela re-tentaria
  // sozinha em loop, cada volta custando outros 15s ao gateway e ao comprador.
  const [gatewaySemResposta, setGatewaySemResposta] = useState(false);
  const [confirmacao, setConfirmacao] = useState<ConfirmarPagamentoSandboxResult | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [cartao, setCartao] = useState<CartaoForm>({ nome: '', numero: '', validade: '', cvv: '' });
  // RN-157 · D-6: a cobrança PIX vale 30 min. Quando o timer da UI zera, a
  // expiração é MATERIALIZADA no servidor (`expirarPixPendente`, que confere o
  // próprio relógio) e a tela para de oferecer um código morto. O estado
  // também segura a auto-geração — expirar não pode virar cobrança nova sem a
  // pessoa pedir (seria cobrança dupla à revelia).
  //
  // S1209-REV: são TRÊS estados, não um booleano. O relógio do comprador pode
  // estar adiantado, e nesse caso o servidor RECUSA a expiração — 'contestado'
  // é exatamente esse caso: a cobrança está VIVA e a tela tem de voltar a
  // mostrar a chave em vez de anunciar um fim que não aconteceu (e oferecer
  // uma segunda cobrança sobre uma primeira ainda cobrável).
  // S1209-PIXBE-T5: quanto o relógio do SERVIDOR está à frente do relógio
  // deste aparelho (ms), medido no instante da cobrança. A contagem do PIX
  // parte daqui — o aparelho só marca a passagem do tempo, não o ponto de
  // partida. 0 enquanto não há cobrança (ou com servidor antigo).
  const [desvioRelogioMs, setDesvioRelogioMs] = useState(0);
  const [pixEstado, setPixEstado] = useState<'vivo' | 'expirado' | 'contestado'>('vivo');
  const pixExpirado = pixEstado === 'expirado';
  const pixContestado = pixEstado === 'contestado';

  // Auth anônima (checkout sem login)
  const [authPronto, setAuthPronto] = useState(false);
  const [erroAuth, setErroAuth] = useState<string | null>(null);
  const [tentandoAuth, setTentandoAuth] = useState(true);

  // BC-2: a sessão anônima é RECUPERÁVEL. Uma tentativa no mount + 1 retry
  // automático com backoff curto (erro transitório fica invisível); se ainda
  // falhar, banner com copy humana + botão "Tentar novamente". O erro cru do
  // SDK só vai ao console — nunca ao comprador.
  const montadoRef = useRef(true);
  const authTentativaRef = useRef(0);
  const authTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const iniciarAuth = useCallback(() => {
    setErroAuth(null);
    setTentandoAuth(true);
    try {
      ensureLeela();
    } catch (err) {
      if (typeof console !== 'undefined') console.error('[checkout] Falha ao inicializar o cliente Leela.', err);
      if (montadoRef.current) {
        setErroAuth(COPY_ERRO_AUTH);
        setTentandoAuth(false);
      }
      return;
    }
    loginAnonimo()
      .then(() => {
        if (!montadoRef.current) return;
        authTentativaRef.current = 0;
        setAuthPronto(true);
        setTentandoAuth(false);
      })
      .catch((err) => {
        if (typeof console !== 'undefined') console.error('[checkout] Falha na sessão anônima do checkout.', err);
        if (!montadoRef.current) return;
        authTentativaRef.current += 1;
        if (authTentativaRef.current <= MAX_AUTH_RETRY_AUTO) {
          // Backoff curto e crescente; o comprador segue vendo "preparando".
          authTimerRef.current = setTimeout(() => {
            if (montadoRef.current) iniciarAuth();
          }, 1200 * authTentativaRef.current);
        } else {
          setErroAuth(COPY_ERRO_AUTH);
          setTentandoAuth(false);
        }
      });
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    iniciarAuth();
    return () => {
      montadoRef.current = false;
      if (authTimerRef.current) clearTimeout(authTimerRef.current);
    };
  }, [iniciarAuth]);

  // ── Prefill do comprador conhecido (RN-154 · RN-174 · S1209-T3) ────────────
  //
  // O que a tela PODE fazer aqui é muito pouco, e isso é o desenho, não uma
  // limitação: `getCheckoutPrefill` não aceita nenhum parâmetro. Não existe
  // canal para perguntar "o que você sabe sobre ESTE CPF" — o servidor resolve
  // pela pessoa VINCULADA à conta autenticada, e a RN-174 exige as três
  // condições de posse (pagamento confirmado + e-mail da conta igual ao da
  // compra + e-mail verificado). Sem isso a resposta é `prefill: null`.
  //
  // Consequência que esta lane NÃO pode afrouxar: `null` é indistinguível
  // entre "CPF sem ficha", "CPF de terceiro" e "sessão anônima". A tela trata
  // os três do mesmo jeito — formulário vazio, sem mensagem, sem estado
  // diferente. Qualquer atalho de cliente (cache local da compra anterior,
  // consulta disparada ao digitar o CPF) reabriria o oráculo de CPF que o
  // CLAIM-FIX fechou. Por isso a chamada é UMA, no mount, sem input.
  //
  // S1209-REV: "eu também vou correr" é lido no INSTANTE DA RESPOSTA, por ref.
  // A resposta pode chegar depois de a pessoa desmarcar o checkbox — e aí o
  // card 1 já é de um TERCEIRO. Com o valor congelado na closure, o CPF e o
  // nascimento do comprador aterrissavam no card de outra pessoa.
  const prefillPedidoRef = useRef(false);
  const euCorroRef = useRef(euCorro);
  useEffect(() => {
    euCorroRef.current = euCorro;
  }, [euCorro]);
  useEffect(() => {
    if (!authPronto || prefillPedidoRef.current) return;
    prefillPedidoRef.current = true;
    getCheckoutPrefill()
      .then((r) => {
        if (!montadoRef.current || r.prefill === null) return;
        const p = r.prefill;
        // Prefill NUNCA sobrescreve o que a pessoa já digitou — só preenche
        // campo vazio (a resposta chega depois do primeiro paint).
        const manter = (atual: string, vindo: string): string =>
          atual.trim().length > 0 ? atual : vindo;

        setResponsavel((prev) => ({
          nome: manter(prev.nome, p.nome),
          // E-mail do pedido é escolha do comprador nesta compra — não vem do
          // prefill (é ele que a RN-174 usa para casar a posse; preenchê-lo
          // sozinho misturaria a chave com o dado).
          email: prev.email,
          telefone: manter(prev.telefone, mascaraTelefone(p.telefone)),
        }));

        setInscritos((prev) =>
          prev.map((ins, i) =>
            // Os dados são da PRÓPRIA pessoa: só cabem no 1º inscrito, e só
            // quando ele é o comprador ("eu também vou correr") NO MOMENTO em
            // que a resposta chega — não quando a chamada saiu.
            i === 0 && euCorroRef.current
              ? {
                  ...ins,
                  nome: manter(ins.nome, p.nome),
                  cpf: manter(ins.cpf, p.cpf),
                  nascimento: manter(ins.nascimento, p.nascimento),
                  genero: ins.genero.length > 0 ? ins.genero : p.genero,
                }
              : ins,
          ),
        );

        const end = p.endereco;
        if (end !== undefined) {
          setEndereco((prev) => ({
            cep: manter(prev.cep, mascaraCep(end.cep)),
            logradouro: manter(prev.logradouro, end.logradouro),
            bairro: manter(prev.bairro, end.bairro),
            cidade: manter(prev.cidade, end.cidade),
            uf: manter(prev.uf, end.uf),
            numero: manter(prev.numero, end.numero),
            complemento: manter(prev.complemento, end.complemento ?? ''),
          }));
        }
      })
      .catch((err) => {
        // Falha de prefill é INVISÍVEL: sem dado conhecido a tela é a mesma de
        // quem nunca comprou. Nada de banner que revele o estado da ficha.
        if (typeof console !== 'undefined')
          console.error('[checkout] Prefill indisponível — seguindo com o formulário vazio.', err);
      });
  }, [authPronto]);

  const parcelasEfetivas = formaCotada === 'pix' ? 1 : parcelas;
  // Assinatura de (modalidade, kit) por inscrito — recotar quando qualquer um muda.
  const selecaoSig = inscritos.map((i) => `${i.modalidade}:${i.kitId}`).join('|');
  const todasModalidades = inscritos.every((i) => i.modalidade.length > 0);
  // ── S1216-T1 · RN-434 · D-ACH-1 — o total está pronto na chegada ──────────
  //
  // Era `step >= 2`: o primeiro pedido de preço saía no instante em que a
  // pessoa entrava no PAGAR, e ela assistia ao round-trip. Medido em produção
  // pela lane anterior: de 1,7 s no piso a 9,8 s quando a function acorda fria.
  //
  // Agora a cotação sai na etapa de DADOS. Preencher nome, CPF, nascimento e
  // endereço de cada participante leva dezenas de segundos; o round-trip cabe
  // inteiro nessa janela, inclusive o despertar frio. Ao chegar no PAGAR a
  // assinatura não mudou, então o efeito cai no ramo de
  // `assinaturaCotadaRef.current === assinaturaAtual` e NENHUMA chamada nova
  // sai — o número já está na tela.
  //
  // O step 0 continua sem cotar, e isso é decisão, não esquecimento: a
  // assinatura de preço inclui `selecaoSig`, que muda a cada clique em
  // modalidade ou kit. Cotar ali transformaria a exploração da oferta numa
  // chamada por clique — o excesso que a T-CKUX-1 acabou de cortar. O step 1 é
  // o primeiro momento em que a seleção está congelada.
  //
  // O pré-aquecimento é SILENCIOSO (D-ACH-2). No step 1 não existe bloco de
  // totais, então `cotando` alto é invisível, e essa invisibilidade é a
  // feature. Falha aqui não pinta erro no meio do formulário: o estado de erro
  // e o "Tentar novamente" continuam morando no bloco de totais do PAGAR.
  // Punir a pessoa por um problema que ela ainda não tem seria pior do que a
  // espera que esta decisão elimina.
  const precisaCotar = step >= 1;
  // Cotar exige sessão pronta + modalidade de TODO mundo (o servidor precifica
  // o item para dizer se o cupom cola). É o gate do "Aplicar" do step 0 (D-4).
  const podeCotar = authPronto && todasModalidades;

  // ── Sincronização do 1º inscrito com o responsável quando "eu vou correr" ──
  const patchInscrito = useCallback((index: number, patch: Partial<InscritoForm>) => {
    setInscritos((prev) => prev.map((ins, i) => (i === index ? { ...ins, ...patch } : ins)));
  }, []);

  const patchEndereco = useCallback((patch: Partial<EnderecoForm>) => {
    setEndereco((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleResponsavel = useCallback(
    (patch: { nome?: string; email?: string; telefone?: string }) => {
      setResponsavel((prev) => ({ ...prev, ...patch }));
      setEuCorro((corro) => {
        if (corro) {
          setInscritos((prev) =>
            prev.map((ins, i) =>
              i === 0
                ? {
                    ...ins,
                    nome: patch.nome ?? ins.nome,
                    email: patch.email ?? ins.email,
                  }
                : ins,
            ),
          );
        }
        return corro;
      });
    },
    [],
  );

  const handleEuCorro = useCallback(
    (v: boolean) => {
      setEuCorro(v);
      if (v) {
        setInscritos((prev) =>
          prev.map((ins, i) =>
            i === 0 ? { ...ins, nome: responsavel.nome, email: responsavel.email } : ins,
          ),
        );
      }
    },
    [responsavel.nome, responsavel.email],
  );

  const addInscrito = useCallback(() => {
    setInscritos((prev) => [...prev, inscritoVazio()]);
  }, []);

  const removeInscrito = useCallback((index: number) => {
    setInscritos((prev) => prev.filter((_, i) => i !== index));
    // D-2 (S1209-T4): remover um atleta reindexa TODO mundo depois dele. As
    // listas de erro são posicionais — sem encolher junto, o erro do atleta 3
    // passaria a acusar o atleta 2, que não fez nada. Com o remover agora em
    // duas etapas, esse deslocamento deixou de ser hipótese.
    const semIndice = <T,>(prev: T[]): T[] => prev.filter((_, i) => i !== index);
    setErrosInscritos(semIndice);
    setErrosModalidade(semIndice);
    setErrosKit(semIndice);
    setErrosTamanhos(semIndice);
  }, []);

  // ── Cotação (read-only; consome computeSaleState no servidor) ──────────────
  //
  // C2-0803: a forma e as parcelas passaram a ser PARÂMETRO. A cotação que a
  // tela exibe continua saindo de `cotarCom` (a seleção vigente); o
  // pré-carregamento da escada do cartão usa a mesma função pedindo o meio que
  // ele precisa conhecer, sem duplicar o mapeamento dos itens.
  const cotarComForma = useCallback(
    async (
      cupom: string | null,
      formaAlvo: FormaUI,
      parcelasAlvo: number,
    ): Promise<{ ok: true; data: CotarInscricaoCheckoutResult } | { ok: false; error: string }> => {
      try {
        const data = await cotarInscricaoCheckout({
          eventoId: evento.slug,
          itens: inscritos.map((i) => ({
            modalidade: i.modalidade,
            ...(i.kitId.length > 0 ? { kitId: i.kitId } : {}),
          })),
          forma: formaAlvo,
          parcelas: formaAlvo === 'pix' ? 1 : parcelasAlvo,
          ...(cupom ? { cupomCodigo: cupom } : {}),
        });
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: mensagemErro(err, 'Não foi possível calcular o total.') };
      }
    },
    [evento.slug, inscritos],
  );
  const cotarCom = useCallback(
    (
      cupom: string | null,
    ): Promise<{ ok: true; data: CotarInscricaoCheckoutResult } | { ok: false; error: string }> =>
      // Sem escolha, a cotação assume PIX à vista (D-ACH-12) — é leitura, não
      // compromisso: nada é gravado e nada é cobrado.
      cotarComForma(cupom, formaCotada, parcelasEfetivas),
    [cotarComForma, formaCotada, parcelasEfetivas],
  );

  // ── T-CKUX-1 · coalescing da cotação ──────────────────────────────────────
  //
  // Medido em produção na sessão do dono: TRÊS chamadas de
  // `cotarInscricaoCheckout` em 4,4 s (14:07:16 / :18 / :20) e outros pares em
  // 14:26-14:27, cada round-trip custando 1,7-9,8 s. Era isso que deixava
  // "Calculando total" preso na tela.
  //
  // Duas causas somadas:
  //
  //   1. O efeito dependia de `cotarCom`, cuja identidade muda a cada edição de
  //      QUALQUER campo de inscrito (o `useCallback` fecha sobre `inscritos`).
  //      Digitar o nome de um atleta re-disparava a cotação, embora nome não
  //      mude preço nenhum.
  //   2. Aplicar cupom cotava DUAS vezes: uma direto no `aplicarCupom` e outra
  //      pelo efeito, que reagia ao `cupomAplicado` recém-escrito.
  //
  // O remédio é uma ASSINATURA: a lista curta do que de fato move preço
  // (evento, modalidade+kit de cada inscrito, forma, parcelas, cupom). O efeito
  // só olha para ela; tudo o mais que muda de identidade passa por ref e não
  // acorda ninguém. Quem já cotou uma assinatura registra qual foi, então o
  // caminho manual do cupom não gera a segunda chamada.
  //
  // Debounce curto para o vaivém (trocar de kit A→B→A) e um número de sequência
  // porque respostas de 1,7-9,8 s chegam fora de ordem: a última pedida vence,
  // nunca a última a chegar — sem isso o comprador podia ver o preço de uma
  // seleção que ele já abandonou.
  const cotarComRef = useRef(cotarCom);
  cotarComRef.current = cotarCom;

  /**
   * A BASE de preço: o que define o valor de face da venda (evento, seleção de
   * cada inscrito, cupom). Mudar qualquer coisa daqui é uma cotação nova de
   * verdade — nenhuma projeção de tela responde por isso (C1-0803).
   */
  const assinaturaBaseDe = useCallback(
    (cupom: string | null): string => `${evento.slug}|${selecaoSig}|${cupom ?? ''}`,
    [evento.slug, selecaoSig],
  );
  /** A lista curta do que move preço. Igualdade aqui = cotação igual. */
  const assinaturaDe = useCallback(
    (cupom: string | null): string =>
      `${assinaturaBaseDe(cupom)}|${formaCotada}|${parcelasEfetivas}`,
    [assinaturaBaseDe, formaCotada, parcelasEfetivas],
  );
  const baseAtual = assinaturaBaseDe(cupomAplicado);
  const assinaturaAtual = assinaturaDe(cupomAplicado);

  /** Assinatura da última cotação BEM-SUCEDIDA — `null` quando não há. */
  const assinaturaCotadaRef = useRef<string | null>(null);
  /** Nº de sequência: só a resposta da chamada mais recente aterrissa. */
  const cotacaoSeqRef = useRef(0);
  /**
   * ACHADOS-REV · DEF-2 — a assinatura SEMPRE fresca, para o "Aplicar" do
   * cupom conferir na volta o que ele conferiu na ida. O `assinaturaDe` que o
   * `aplicarCupom` fecha é o do instante do clique, e é justamente o que a
   * guarda precisa comparar contra o AGORA.
   */
  const assinaturaDeRef = useRef(assinaturaDe);
  assinaturaDeRef.current = assinaturaDe;
  /** Idem para a BASE de preço (C1-0803), usada nos caminhos assíncronos. */
  const assinaturaBaseDeRef = useRef(assinaturaBaseDe);
  assinaturaBaseDeRef.current = assinaturaBaseDe;

  useEffect(() => {
    if (!precisaCotar || !podeCotar || cupomUrlPendente) return;
    // Nada que move preço mudou — inclusive o caso de o comprador voltar à
    // seleção anterior no meio do debounce. Sem este `setCotando(false)` a
    // tela ficaria com "Calculando total" para sempre numa cotação que foi
    // cancelada e nunca precisou ser refeita.
    if (assinaturaCotadaRef.current === assinaturaAtual) {
      // CKUX-REV · o número de sequência sobe TAMBÉM aqui. Sem isto, a
      // cotação da seleção ABANDONADA continua valendo enquanto está no ar:
      // trocar PIX→cartão (a chamada sai), voltar a PIX (este ramo) e a
      // resposta do cartão aterrissar depois deixava a tela com o total do
      // cartão sobre uma seleção PIX — e o botão de pagar exibindo um valor
      // que não é o que seria cobrado. Voltar à seleção já cotada é
      // exatamente o momento de invalidar o que está em voo: o `cotacao` que
      // a tela já tem É a resposta certa para esta assinatura.
      cotacaoSeqRef.current++;
      setCotando(false);
      return;
    }
    const seq = ++cotacaoSeqRef.current;
    setCotando(true);
    const timer = setTimeout(() => {
      void cotarComRef.current(cupomAplicado).then((r) => {
        // Resposta obsoleta: outra cotação foi pedida depois desta.
        if (seq !== cotacaoSeqRef.current) return;
        setCotando(false);
        if (r.ok) {
          assinaturaCotadaRef.current = assinaturaAtual;
          setBaseCotada(baseAtual);
          setCotacao(r.data);
          setErroCotacao(null);
        } else {
          assinaturaCotadaRef.current = null;
          setBaseCotada(null);
          setCotacao(null);
          setErroCotacao(r.error);
        }
      });
    }, DEBOUNCE_COTACAO_MS);
    return () => clearTimeout(timer);
  }, [precisaCotar, podeCotar, cupomUrlPendente, baseAtual, assinaturaAtual, cupomAplicado, recotarNonce]);

  // ── C2-0803 · a escada do cartão, pronta antes do clique ──────────────────
  //
  // Verbatim do dono: *"Na primeira vez que cliquei no select apareceu apenas a
  // opção como valor do ingresso, e não o parcelamento, somente na segunda vez
  // que apareciam as opções."*
  //
  // A causa era a escada da forma ERRADA. Enquanto ninguém escolheu meio, a
  // cotação é pedida com `forma: 'pix'` (D-ACH-12), e cotação de PIX traz UMA
  // opção por contrato do servidor (`saleState`: cartão constrói a escada do
  // termo, PIX devolve `[{ parcelas: 1 }]`). O painel do cartão abre no 1º
  // clique (D-0729-6) e encontrava lá dentro a escada do PIX; a de verdade só
  // chegava com a cotação de cartão, um debounce e um round-trip depois.
  //
  // O remédio é o mesmo da RN-434 (o total pronto na chegada): pedir ANTES do
  // gesto. Ao entrar no PAGAR, a escada do cartão é cotada em segundo plano —
  // invisível (não acende `cotando`), sem tocar em `cotacao`, e atrás do
  // debounce da cotação visível para nunca disputar a vez com ela. Uma chamada
  // por BASE de preço, não por clique.
  const [escadaCartao, setEscadaCartao] = useState<{
    base: string;
    opcoes: readonly CotarParcelaResult[];
  } | null>(null);
  /** Base já pedida — impede a segunda chamada enquanto a primeira está no ar. */
  const escadaPedidaRef = useRef<string | null>(null);
  const cotarComFormaRef = useRef(cotarComForma);
  cotarComFormaRef.current = cotarComForma;

  /**
   * A escada de parcelamento do CARTÃO para a base de preço vigente. A cotação
   * na tela serve quando ela própria é de cartão; senão vale a pré-carregada.
   * Fora da base, nada serve — escada de outro preço não é escada.
   */
  const escadaCartaoAtual: readonly CotarParcelaResult[] | null =
    baseCotada === baseAtual && cotacao !== null && cotacao.forma === 'cartao_credito'
      ? cotacao.opcoesParcelamento
      : escadaCartao !== null && escadaCartao.base === baseAtual
        ? escadaCartao.opcoes
        : null;

  useEffect(() => {
    // Só no PAGAR: é onde a escolha do meio acontece. Nas etapas de coleta a
    // chamada seria gasto sem consumidor — e a T-CKUX-1 existe justamente para
    // não cotar o que ninguém vai ler.
    if (step !== 2 || !podeCotar || cupomUrlPendente) return;
    if (escadaCartaoAtual !== null) return;
    if (escadaPedidaRef.current === baseAtual) return;
    escadaPedidaRef.current = baseAtual;
    let vivo = true;
    const timer = setTimeout(() => {
      void cotarComFormaRef.current(cupomAplicado, 'cartao_credito', 1).then((r) => {
        if (!vivo || !montadoRef.current) return;
        if (r.ok) {
          setEscadaCartao({ base: baseAtual, opcoes: r.data.opcoesParcelamento });
        } else {
          // Falha do pré-carregamento é SILENCIOSA (mesma disciplina da
          // D-ACH-2): o comprador não levou erro nenhum, e escolher o cartão
          // continua pedindo a cotação de cartão pelo caminho normal. Liberar
          // a base permite a próxima tentativa sem virar laço — sem `setState`
          // aqui, este efeito não re-roda sozinho.
          escadaPedidaRef.current = null;
        }
      });
    }, DEBOUNCE_ESCADA_MS);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [step, podeCotar, cupomUrlPendente, baseAtual, escadaCartaoAtual, cupomAplicado]);

  // ── C1-0803 · a cotação que a TELA usa ────────────────────────────────────
  //
  // `cotacaoExibida` é a resposta do servidor relida para a seleção de AGORA —
  // e é `null` quando essa resposta não está na mão. Daí saem duas coisas:
  //
  //   · o que a tela mostra (`cotacaoNaTela`): a projeção quando existe, senão
  //     a última cotação boa, como antes;
  //   · quem pode PROMETER preço (`totalDefasado`): só a projeção. Item 64
  //     (CKUX-REV) continua exato — botão travado com cotação NOVA em voo —,
  //     mas deixa de disparar onde não há cotação nova nenhuma a esperar: na
  //     troca entre opções que o servidor já cotou.
  const cotacaoExibida = useMemo(
    () =>
      baseCotada === baseAtual
        ? projetarCotacao(cotacao, escadaCartaoAtual, formaCotada, parcelasEfetivas)
        : null,
    [baseCotada, baseAtual, cotacao, escadaCartaoAtual, formaCotada, parcelasEfetivas],
  );
  const cotacaoNaTela = cotacaoExibida ?? cotacao;
  /**
   * CKUX-REV (item 64) · a cotação em voo é de um preço que a tela ainda não
   * tem. Com a projeção respondendo pela seleção atual, não é o caso.
   */
  const totalDefasado = cotando && cotacaoExibida === null;

  // S1215-T2 (RN-430) · o cupom do link SOBREVIVE à navegação. Sem cupom na URL
  // do checkout, procura o que o `CupomTracker` guardou na página do evento.
  //
  // Roda em efeito de montagem, e não no inicializador do `useState`, por dois
  // motivos que não são estilo: este componente renderiza no SERVIDOR (a rota é
  // `force-dynamic`, mas o Client Component ainda é pré-renderizado), onde
  // `window` não existe; e ler storage durante o render produziria HTML de
  // servidor diferente do primeiro render do cliente — hydration mismatch na
  // tela do dinheiro.
  //
  // A URL VENCE o storage: é o clique de agora contra o clique de antes, a
  // mesma precedência que o `refDaCompra` aplica na atribuição.
  useEffect(() => {
    if (atribuicao.cupom !== undefined) return;
    const guardado = lerCupomCapturado(evento.slug);
    if (guardado === null) return;
    setCupomDoLink(guardado.codigo);
    setCupomInput((atual) => (atual.length > 0 ? atual : guardado.codigo));
    setCupomUrlPendente(true);
    // Deps vazias DE PROPÓSITO: o storage é lido uma vez, na montagem, e daí em
    // diante quem manda é o que a pessoa fizer na tela. Re-ler traria de volta
    // um cupom que ela acabou de remover.
  }, []);

  // A-2 · auto-aplica o cupom vindo da URL. Na 1ª cotação possível, tenta o
  // cupom do link: sucesso ⇒ vira `cupomAplicado` (o efeito acima recota e
  // exibe o desconto); falha ⇒ banner honesto e segue sem cupom (o servidor
  // revalida tudo — risco zero de preço no cliente). Roda no máximo 1×.
  //
  // D-4 (S1209-T1): o gate `precisaCotar` saiu — o cupom do link resolve assim
  // que houver modalidade, AINDA NO STEP 0, que é onde o campo passou a viver.
  // O sucesso já grava a cotação (antes só levantava `cupomAplicado` e deixava
  // o efeito de cima assumir, o que no step 0 travaria o "Calculando…").
  useEffect(() => {
    if (!cupomUrlPendente || !podeCotar) return;
    const codigo = (cupomDoLink ?? '').trim().toUpperCase();
    if (codigo.length === 0) {
      setCupomUrlPendente(false);
      return;
    }
    // S1216-T1 · RN-434 — o auto-apply do link entra no MESMO número de
    // sequência do efeito. O `vivo` só cobre desmontagem/rerun DESTE efeito;
    // ele não sabe nada de uma cotação pedida por outro caminho. Trocar de kit
    // enquanto o cupom do link está no ar fazia a resposta dele aterrissar
    // sobre a seleção nova — o preço da seleção abandonada na tela.
    const seq = ++cotacaoSeqRef.current;
    let vivo = true;
    setCotando(true);
    cotarCom(codigo).then((r) => {
      if (!vivo || seq !== cotacaoSeqRef.current) return;
      setCotando(false);
      if (r.ok) {
        // T-CKUX-1: esta chamada JÁ é a cotação com o cupom. Registrar a
        // assinatura resultante impede que o efeito de cotação reaja ao
        // `cupomAplicado` recém-escrito e peça a mesma coisa de novo.
        assinaturaCotadaRef.current = assinaturaDe(codigo);
        setBaseCotada(assinaturaBaseDe(codigo));
        setCupomAplicado(codigo);
        setOrigemCupom('link');
        setCotacao(r.data);
        setErroCotacao(null);
        setErroCupomUrl(null);
      } else {
        setErroCupomUrl(`O cupom ${codigo} não pôde ser aplicado (${r.error})`);
      }
      setCupomUrlPendente(false);
    });
    return () => {
      vivo = false;
    };
  }, [cupomUrlPendente, podeCotar, cupomDoLink, cotarCom]);

  // Qualquer mudança de preço invalida a cobrança já criada (evita replay com
  // valores antigos — a UI reflete sempre a seleção atual).
  useEffect(() => {
    chaveRef.current = undefined;
    setCharge(null);
    setConfirmacao(null);
    setErroCharge(null);
    setErroConfirmar(null);
    setPixEstado('vivo');
  }, [cupomAplicado, formaCotada, parcelasEfetivas, selecaoSig]);

  const aplicarCupom = useCallback(async () => {
    const code = cupomInput.trim().toUpperCase();
    if (code.length === 0) return;
    // Guarda de estado: sem sessão/modalidade não há cotação para validar o
    // código — a UI já desabilita o botão; aqui é defesa em profundidade.
    if (!podeCotar) return;
    setErroCupomUrl(null);
    setErroCupom(null);
    setAplicandoCupom(true);
    // S1216-T1 · RN-434 — o "Aplicar" manual entra no MESMO número de
    // sequência. Esta função cota POR FORA do efeito e escreve `cotacao` na
    // volta usando a assinatura da closure: aplicar o cupom e trocar de kit
    // antes da resposta fazia o preço da seleção abandonada aterrissar na
    // tela. Era a ressalva R-2 da CKUX-REV, e o B1 alarga a janela dela porque
    // agora existe pré-aquecimento rodando ao lado em duas etapas.
    const seq = ++cotacaoSeqRef.current;
    // ACHADOS-REV · DEF-2 — a assinatura PEDIDA, para conferir na volta.
    //
    // O número de sequência só sobe quando ALGUÉM pede outra cotação, e no
    // step 0 ninguém pede: o efeito de cotação começa em `step >= 1` e sai
    // pela porta de cima antes de tocar no contador. Como o campo do cupom
    // vive no step 0 (D-4), aplicar o cupom e trocar de modalidade ou de kit
    // ali deixava a resposta da seleção ABANDONADA aterrissar — a tela
    // declarava "Cupom X aplicado — menos R$ Y" com o Y da escolha anterior.
    // A assinatura é a régua que não depende de haver uma segunda chamada.
    const assinaturaPedida = assinaturaDeRef.current(code);
    const r = await cotarCom(code);
    // O spinner do campo é DESTA ação e sai sempre — travá-lo por causa de uma
    // resposta obsoleta deixaria o cupom em "Aplicando…" para sempre. O que a
    // sequência descarta é o NÚMERO, não o estado da interação.
    setAplicandoCupom(false);
    if (seq !== cotacaoSeqRef.current) return;
    if (assinaturaPedida !== assinaturaDeRef.current(code)) return;
    if (r.ok) {
      // T-CKUX-1: mesma disciplina do cupom de link — o "Aplicar" já cotou; o
      // efeito não precisa cotar de novo por causa do `cupomAplicado` novo.
      assinaturaCotadaRef.current = assinaturaDe(code);
      setBaseCotada(assinaturaBaseDeRef.current(code));
      setCupomAplicado(code);
      // RN-430: o código digitado à mão PREVALECE sobre o do link — é ação
      // deliberada da pessoa. A marca do resumo passa a não ser "do link"
      // mesmo quando o texto digitado for igual ao que o link trazia.
      setOrigemCupom('manual');
      setCotacao(r.data);
      setErroCotacao(null);
    } else {
      // Cupom recusado ≠ cotação quebrada: a mensagem fica no campo do cupom
      // (D-4: o campo vive no step 0, onde não existe bloco de totais).
      setErroCupom(`O cupom ${code} não pôde ser aplicado (${r.error})`);
    }
  }, [cupomInput, podeCotar, cotarCom]);

  const removerCupom = useCallback(() => {
    setErroCupomUrl(null);
    setErroCupom(null);
    setCupomAplicado(null);
    setCupomInput('');
    setOrigemCupom(null);
    // KITCUPOM-REV (defeito herdado da S1209) · a cotação que está na tela foi
    // calculada COM o cupom. Mantê-la depois do "Remover" fazia o campo do
    // step 0 continuar exibindo "Cupom X aplicado — menos R$ Y" para SEMPRE:
    // ali o efeito de cotação não roda (`precisaCotar` é `step >= 2`), então
    // nada nunca substituía o número velho. E como o campo de digitação só
    // aparece quando NÃO há código aplicado, a pessoa também não conseguia
    // reaplicar — desligava o desconto, a tela seguia prometendo desconto, e
    // não havia caminho de volta sem recarregar a página.
    //
    // Descartar a cotação velha é o que faz a tela voltar a dizer a verdade.
    // No step 0 não há bloco de totais, então o efeito visível é só o campo
    // voltar; no PAGAR o efeito recota na hora, e o botão de pagar já está
    // travado por `totalDefasado` (CKUX-REV) enquanto isso.
    assinaturaCotadaRef.current = null;
    setBaseCotada(null);
    setCotacao(null);
    // S1215-T2: remover DESLIGA o cupom do link também. Sem isto, o efeito de
    // auto-apply poderia trazer de volta o que a pessoa acabou de tirar.
    setCupomDoLink(null);
    setCupomUrlPendente(false);
  }, []);

  // BC-1 · retry manual da cotação: bump do nonce → o efeito de cotação re-roda
  // (re-dispara `cotarCom(cupomAplicado)`) com o mesmo guard de cancelamento.
  const tentarCotarNovamente = useCallback(() => {
    setErroCotacao(null);
    // T-CKUX-1: o retry manual é o ÚNICO caminho que precisa furar o dedupe —
    // a assinatura não mudou, e é justamente a mesma cotação que se quer refazer.
    assinaturaCotadaRef.current = null;
    setRecotarNonce((n) => n + 1);
  }, []);

  // ── Cobrança + confirmação (produtor de escrita + webhook sandbox) ─────────
  const gerarCobranca = useCallback(async (): Promise<CreateInscricaoChargeResult | null> => {
    if (charge) return charge;
    if (!authPronto) {
      setErroCharge('Sessão de pagamento ainda não pronta. Aguarde um instante.');
      return null;
    }
    // S1217-T2 · RN-440: sem meio ESCOLHIDO não existe cobrança. O PIX que a
    // cotação assume é preço na tela, nunca instrução de cobrar — e é aqui,
    // no produtor de escrita, que a diferença entre os dois vira código.
    if (forma === null) {
      setErroCharge('Escolha a forma de pagamento para continuar.');
      return null;
    }
    // §5.3: defesa em profundidade — a UI já desabilita os botões, e o
    // SERVIDOR rejeita pedido sem aceites (flip F-4a). Nunca cria cobrança
    // sem os dois confirmados.
    if (!aceitesOk) {
      setErroCharge('Confirme os dois aceites para concluir o pagamento.');
      return null;
    }
    // A chave nasce UMA vez e é reusada em toda tentativa deste carrinho — é
    // ela que faz do retry um REPLAY (o servidor devolve o mesmo pedido e o
    // adapter reencontra a cobrança pelo `externalReference`) em vez de uma
    // segunda compra. Depois do teto de 15s isso deixa de ser detalhe de
    // idempotência e passa a ser a única defesa contra cobrança dupla.
    if (chaveRef.current === undefined) chaveRef.current = novaChaveIdempotencia();
    setCriandoCharge(true);
    setErroCharge(null);
    setGatewaySemResposta(false);
    // S1209-PIXBE-T5: marca do relógio LOCAL antes da chamada. O servidor
    // devolve o `agora` DELE; a diferença entre os dois é o desvio deste
    // aparelho, e é ele que ancora a contagem do PIX (achado #6). Medir
    // ANTES e não depois é deliberado: a latência entra a favor da segurança
    // (a tela nunca mostra MAIS tempo do que a cobrança tem).
    const antesDaChamada = Date.now();
    try {
      const data = await createInscricaoCharge({
        eventoId: evento.slug,
        inscritos: inscritos.map((ins) => ({
          nome: ins.nome.trim(),
          email: ins.email.trim(),
          cpf: ins.cpf,
          // CKFORM §5.1 item 2: nascimento por atleta (yyyy-mm-dd do input
          // date — o servidor valida civil/passado e persiste no [reg]).
          ...(ins.nascimento.length > 0 ? { nascimento: ins.nascimento } : {}),
          // RN-154: gênero por inscrito. Só sobe quando a pessoa RESPONDEU —
          // '' (não escolheu) não vira 'nao_informado' no caminho, porque
          // isso seria inventar uma declaração que ela não fez.
          ...(ins.genero !== '' ? { genero: ins.genero } : {}),
          modalidade: ins.modalidade,
          kit: kitEnumFromId(ins.kitId),
          ...(ins.kitId.length > 0 ? { kitId: ins.kitId } : {}),
          // RN-231: corte→tamanho por atleta (sufixo de SKU) — o servidor
          // valida contra a grade do evento e persiste no inscrito.
          ...(Object.keys(ins.tamanhos).length > 0 ? { tamanhos: ins.tamanhos } : {}),
        })),
        ...(euCorro ? { responsavelIndex: 0 } : {}),
        responsavel: {
          nome: responsavel.nome.trim(),
          email: responsavel.email.trim(),
          // CKFORM §5.1 item 1: canal de contato do pedido (máscara é UX;
          // o servidor persiste canônico só-dígitos — F-3 CKMOD).
          ...(responsavel.telefone.trim().length > 0
            ? { telefone: responsavel.telefone.trim() }
            : {}),
        },
        // CKFORM §5.1 item 3: endereço do comprador — 1× por pedido; o
        // servidor valida o shape (core) e canoniza o CEP p/ 8 dígitos.
        endereco: {
          cep: endereco.cep,
          logradouro: endereco.logradouro.trim(),
          bairro: endereco.bairro.trim(),
          cidade: endereco.cidade.trim(),
          uf: endereco.uf,
          numero: endereco.numero.trim(),
          ...(endereco.complemento.trim().length > 0
            ? { complemento: endereco.complemento.trim() }
            : {}),
        },
        forma,
        parcelas: forma === 'pix' ? 1 : parcelas,
        ...(cupomAplicado ? { cupomCodigo: cupomAplicado } : {}),
        // CKFORM §5.3: SÓ os booleans confirmados cruzam — versão vigente,
        // timestamp e hash do material são carimbados pelo servidor (in-tx).
        //
        // S1217-T3 · RN-441: o payload REFLETE o que a pessoa marcou. Antes
        // ele afirmava `{ termos: true, saude: true }` literal — um cliente
        // dizendo ao servidor que houve aceite porque o código o escreveu
        // assim, não porque alguém clicou. `saudeCustom` só cruza nos eventos
        // que têm o termo próprio ativo (o servidor ignora nos demais).
        //
        // S1217-T4 · RN-439: junto dos booleans vai a VERSÃO QUE ESTA TELA
        // EXIBIU. É conferência, não gravação: o servidor compara com a
        // vigente lida na transação e recusa a compra quando divergem. A
        // RN-438 tirou o aceite da tela de pagar e o pôs no fim da
        // inscrição — a distância entre o gesto e o carimbo saiu de segundos
        // para minutos, e nesse intervalo cabe o organizador publicar uma
        // política nova.
        aceites: {
          termos: aceiteTermos,
          saude: aceiteSaude,
          ...(exigeSaudeCustom ? { saudeCustom: aceiteSaudeCustom } : {}),
          versoesExibidas: {
            termos: evento.politicaVendas.versao,
            saude: evento.termoSaudeVersao,
            ...(termoSaudeCustom !== null
              ? { saudeCustom: termoSaudeCustom.versao }
              : {}),
          },
        },
        ...((): { ref?: { codigo: string; clicadoEmMillis?: number } } => {
          // Atribuição de afiliado (RN-313) — nunca bloqueia a compra: o
          // servidor descarta ref inválido/fora da janela em silêncio.
          const ref = refDaCompra(evento.slug, atribuicao.ref);
          return ref !== undefined ? { ref } : {};
        })(),
        idempotencyKey: chaveRef.current,
      });
      // Servidor antigo (sem o campo) ⇒ desvio 0: a contagem cai no
      // comportamento vigente em vez de quebrar a tela do dinheiro.
      setDesvioRelogioMs(
        typeof data.servidorAgoraMillis === 'number'
          ? data.servidorAgoraMillis - antesDaChamada
          : 0,
      );
      setCharge(data);
      return data;
    } catch (err) {
      // DEC-0727: teto estourado ⇒ "processando pagamento", nunca alerta de
      // erro. Dizer "não foi possível criar a cobrança" seria afirmar um
      // fracasso que a plataforma não apurou — a cobrança pode existir.
      if (ehGatewaySemResposta(err)) {
        setGatewaySemResposta(true);
        return null;
      }
      // S1217-T4 · RN-439: o organizador publicou versão nova entre o
      // aceite e a compra. A tela REPÕE o aceite em vez de insistir: os
      // checkboxes voltam a vazio, a pessoa volta à etapa de inscrição e uma
      // frase diz o que aconteceu. Recarregar os dados do servidor é o que
      // traz o TEXTO novo para os modais — sem isso ela reconfirmaria o
      // mesmo material velho e levaria a mesma recusa em loop.
      if (ehVersaoDivergente(err)) {
        setAceiteTermos(false);
        setAceiteSaude(false);
        setAceiteSaudeCustom(false);
        setErroAceites(COPY_ACEITE_DESATUALIZADO);
        setStep(1);
        recarregarMaterial();
        return null;
      }
      setErroCharge(mensagemErro(err, 'Não foi possível criar a cobrança.'));
      return null;
    } finally {
      setCriandoCharge(false);
    }
  }, [charge, authPronto, aceitesOk, aceiteTermos, aceiteSaude, aceiteSaudeCustom, exigeSaudeCustom, evento.slug, evento.politicaVendas.versao, evento.termoSaudeVersao, termoSaudeCustom, recarregarMaterial, inscritos, euCorro, responsavel, endereco, forma, parcelas, cupomAplicado, atribuicao.ref]);

  const confirmar = useCallback(async (pedidoId: string) => {
    setConfirmando(true);
    setErroConfirmar(null);
    setGatewaySemResposta(false);
    try {
      const data = await confirmarPagamentoSandbox({ pedidoId });
      setConfirmacao(data);
      setStep(3);
    } catch (err) {
      // DEC-0727 · cartão: o teto vale para os dois meios. O comprador de
      // cartão passa por aqui na mesma tacada do `pagarCartao`, e um "não foi
      // possível confirmar" sobre um pagamento de estado desconhecido é a
      // mesma mentira que o PIX não pode contar.
      if (ehGatewaySemResposta(err)) {
        setGatewaySemResposta(true);
        return;
      }
      setErroConfirmar(mensagemErro(err, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setConfirmando(false);
    }
  }, []);

  const pagarCartao = useCallback(async () => {
    const c = await gerarCobranca();
    if (c) await confirmar(c.pedidoId);
  }, [gerarCobranca, confirmar]);

  // A-3 · PIX gera a cobrança automaticamente — o QR/copia-e-cola aparece sem
  // clique extra. CKFORM §5.3: SÓ depois dos 2 aceites (a cobrança nasce com a
  // prova de aceite no servidor — não existe cobrança sem aceite). O botão
  // "Gerar código PIX" fica como fallback se der erro (idempotência RN-333).
  useEffect(() => {
    if (
      step === 2 &&
      forma === 'pix' &&
      authPronto &&
      aceitesOk &&
      charge === null &&
      !criandoCharge &&
      erroCharge === null &&
      // DEC-0727: teto estourado NÃO regenera sozinho. O efeito não olha para
      // `gatewaySemResposta` como cortesia — sem este freio ele re-dispararia
      // no mesmo instante (o erro não pousa em `erroCharge`), e cada volta
      // gastaria outros 15s do gateway sobre uma cobrança que talvez JÁ
      // exista. A retomada é um clique, como no caminho de erro.
      !gatewaySemResposta &&
      // RN-157: PIX expirado NÃO regenera sozinho — a pessoa pede.
      !pixExpirado &&
      // CKUX-REV: cotação nova no ar ⇒ o total na tela ainda é o da seleção
      // anterior. Nascer aqui produziria um código PIX do preço novo embaixo
      // de um total antigo — a mesma mentira do botão do cartão, só que já
      // com a cobrança criada. 200 ms de debounce mais o round-trip é o que
      // se espera; o QR aparece sozinho logo depois. C1-0803: a guarda é a
      // mesma do botão — cotação NOVA em voo, não qualquer chamada no ar.
      !totalDefasado
    ) {
      void gerarCobranca();
    }
  }, [step, forma, authPronto, aceitesOk, charge, criandoCharge, erroCharge, gatewaySemResposta, pixExpirado, totalDefasado, gerarCobranca]);

  // ── Expiração do PIX (RN-157) ──────────────────────────────────────────────
  // O timer da UI zerou. A tela NÃO decide que a cobrança morreu: ela pede ao
  // servidor que materialize a transição pendente → cancelado (`pix_expirado`)
  // com o relógio DELE.
  //
  // S1209-REV — quem tem a palavra final é a RESPOSTA, não a chamada:
  //   - resolveu com `expirado`/`jaFinal` ⇒ o servidor confirmou o fim.
  //   - `failed-precondition` ⇒ o servidor diz que a cobrança AINDA vale (o
  //     relógio deste dispositivo está adiantado). Anunciar "expirado" aqui
  //     escondia um PIX cobrável e ainda abria o botão de gerar OUTRA — duas
  //     cobranças vivas no mesmo pedido. Agora vira 'contestado': a chave
  //     volta à tela e o relógio local perde a palavra.
  //   - qualquer outra falha ⇒ sem veredito: a UI para de oferecer o código
  //     (não empurra um código provavelmente morto), mas a cobrança nova passa
  //     a exigir confirmação do servidor antes de nascer (ver abaixo).
  const pixExpirandoRef = useRef(false);
  // O servidor CONFIRMOU o fim desta cobrança? Só então gerar outra é seguro.
  const pixFimConfirmadoRef = useRef(false);
  const aoExpirarPix = useCallback(() => {
    if (pixExpirandoRef.current || charge === null) return;
    pixExpirandoRef.current = true;
    expirarPixPendente({ pedidoId: charge.pedidoId })
      .then((r) => {
        if (!montadoRef.current) return;
        if (r.expirado || r.jaFinal) {
          pixFimConfirmadoRef.current = true;
          setPixEstado('expirado');
          return;
        }
        // Respondeu sem encerrar: a cobrança continua de pé.
        pixExpirandoRef.current = false;
        setPixEstado('contestado');
      })
      .catch((err) => {
        if (typeof console !== 'undefined')
          console.error('[checkout] Falha ao materializar a expiração do PIX.', err);
        if (!montadoRef.current) return;
        if (ehPrecondicaoNaoAtendida(err)) {
          pixExpirandoRef.current = false;
          setPixEstado('contestado');
          return;
        }
        setPixEstado('expirado');
      });
  }, [charge]);

  // Recomeço explícito: cobrança NOVA (chave de idempotência nova), nunca a
  // mesma — replay da chave antiga devolveria a cobrança já cancelada.
  //
  // S1209-REV: antes de abrir a segunda, o fim da PRIMEIRA precisa estar
  // confirmado pelo servidor. Sem isso, um relógio adiantado (ou uma falha de
  // rede no momento da expiração) deixaria duas cobranças vivas para o mesmo
  // pedido, e a pessoa poderia pagar as duas.
  const novaCobrancaPix = useCallback(() => {
    const recomecar = (): void => {
      pixExpirandoRef.current = false;
      pixFimConfirmadoRef.current = false;
      chaveRef.current = undefined;
      setCharge(null);
      setConfirmacao(null);
      setErroCharge(null);
      setErroConfirmar(null);
      setPixEstado('vivo');
      setStep(2);
    };

    if (charge === null || pixFimConfirmadoRef.current) {
      recomecar();
      return;
    }

    setErroCharge(null);
    expirarPixPendente({ pedidoId: charge.pedidoId })
      .then((r) => {
        if (!montadoRef.current) return;
        if (r.expirado || r.jaFinal) {
          pixFimConfirmadoRef.current = true;
          recomecar();
          return;
        }
        pixExpirandoRef.current = false;
        setPixEstado('contestado');
      })
      .catch((err) => {
        if (typeof console !== 'undefined')
          console.error('[checkout] Falha ao encerrar a cobrança anterior.', err);
        if (!montadoRef.current) return;
        if (ehPrecondicaoNaoAtendida(err)) {
          pixExpirandoRef.current = false;
          setPixEstado('contestado');
          return;
        }
        setErroCharge(
          'Não conseguimos encerrar a cobrança anterior. Tente de novo em alguns instantes.',
        );
      });
  }, [charge]);

  // ── Navegação com gate de validação ────────────────────────────────────────
  const avancar = useCallback(() => {
    // BC-2: sessão anônima falha travada ⇒ não deixa a pessoa investir esforço
    // preenchendo tudo para só descobrir o beco no Resumo. Barra já no step 0.
    if (erroAuth !== null) return;
    if (step === 0) {
      // Modalidade e kit: modalidade obrigatória; kit obrigatório SE a
      // modalidade ofertar kits (RN-210). Modalidade sem kits segue sem kit.
      const eMod = inscritos.map((ins) =>
        ins.modalidade.length === 0 ? 'Escolha uma modalidade.' : undefined,
      );
      const eKit = inscritos.map((ins) => {
        if (ins.modalidade.length === 0) return undefined;
        const ofertados = kitsDaModalidade(evento.kits, ins.modalidade);
        return ofertados.length > 0 && ins.kitId.length === 0 ? 'Escolha um kit.' : undefined;
      });
      // RN-231: cada item tamanhado (com grade) do kit escolhido exige a
      // escolha de corte→tamanho DESTE atleta — o servidor revalida fail-closed.
      const eTam = inscritos.map((ins) => {
        const pendentes: Record<string, string> = {};
        for (const item of itensTamanhadosDoKit(evento.itensTamanhados, ins.kitId)) {
          if ((ins.tamanhos[item.id] ?? '').length === 0) {
            pendentes[item.id] = 'Escolha o tamanho.';
          }
        }
        return pendentes;
      });
      setErrosModalidade(eMod);
      setErrosKit(eKit);
      setErrosTamanhos(eTam);
      if (
        eMod.some((e) => e !== undefined) ||
        eKit.some((e) => e !== undefined) ||
        eTam.some((e) => Object.keys(e).length > 0)
      )
        return;
      setStep(1);
      return;
    }
    if (step === 1) {
      const eResp = validarResponsavel(responsavel.nome, responsavel.email, responsavel.telefone);
      const eIns = inscritos.map((ins, i) =>
        validarInscrito(
          euCorro && i === 0
            ? { ...ins, nome: responsavel.nome, email: responsavel.email }
            : ins,
        ),
      );
      // CKFORM §5.1 item 3: endereço gateia o avanço junto com os demais
      // (o lookup de CEP é fail-open, mas o ENDEREÇO em si é coletado).
      const eEnd = validarEndereco(endereco);
      setErrosResponsavel(eResp);
      setErrosInscritos(eIns);
      setErrosEndereco(eEnd);
      // S1217-T1 · RN-438: os aceites gateiam o avanço junto com os campos.
      // O erro é calculado sempre (não só quando o resto passa), senão a
      // pessoa corrigiria o formulário e levaria um segundo "não" logo depois.
      setErroAceites(
        aceitesOk
          ? null
          : exigeSaudeCustom
            ? 'Confirme os três aceites acima para continuar.'
            : 'Confirme os dois aceites acima para continuar.',
      );
      if (temErro(eResp) || eIns.some((e) => temErro(e)) || temErro(eEnd)) return;
      if (!aceitesOk) return;
      setStep(2);
      return;
    }
    // Do step 2 não se "avança": paga-se. A ação de pagar vive no próprio
    // instrumento (Gerar código PIX / Pagar), com os aceites como gate.
  }, [
    step,
    evento.kits,
    evento.itensTamanhados,
    responsavel,
    inscritos,
    euCorro,
    endereco,
    erroAuth,
    aceitesOk,
    exigeSaudeCustom,
  ]);

  const voltar = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // ── B6/B7 (achados 10 e 12) · para onde a tela olha ao trocar de etapa ─────
  //
  // Achado 10: passando de inscrição para pagamento, a página continuava na
  // posição de rolagem anterior — o comprador aterrissava no rodapé de uma tela
  // cujo primeiro campo está no topo. Toda troca de etapa passa a levar ao topo.
  //
  // Exceção deliberada: quando a troca veio de "Alterar" no resumo (achado 12 /
  // D-0729-3), o destino não é o topo, é o card do atleta que a pessoa quer
  // corrigir. Ir ao topo ali seria devolvê-la ao começo do formulário — perto
  // demais de "recomeçar", que é exatamente o que a decisão proíbe.
  const alvoScrollRef = useRef<string | null>(null);
  const jaMontouRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const alvo = alvoScrollRef.current;
    alvoScrollRef.current = null;
    // A primeira renderização não é "troca de etapa": a página já está onde
    // deve, e rolar aqui atropelaria uma âncora vinda da URL.
    if (!jaMontouRef.current) {
      jaMontouRef.current = true;
      return;
    }
    // Rolagem é enfeite, nunca pré-condição: ambiente sem as APIs (jsdom, ou
    // navegador com a implementação capada) apenas não rola. A jornada de
    // compra não pode quebrar por causa de uma animação.
    if (alvo !== null) {
      const el = document.getElementById(alvo);
      if (el !== null && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  /**
   * D-0729-3 · "Alterar" no resumo do pedido. Volta ao passo da escolha com o
   * card DAQUELE atleta na frente — todo o resto do formulário (dados,
   * endereço, cupom, forma de pagamento) continua preenchido, porque é estado
   * do fluxo e nada é remontado. Corrigir um tamanho custa dois cliques.
   */
  const editarItem = useCallback((index: number) => {
    alvoScrollRef.current = `atleta-${index}`;
    setStep(0);
  }, []);

  // ── Linhas do resumo/confirmação (metadados; preço vem da cotação/cobrança) ─
  const linhasResumo: LinhaResumo[] = useMemo(
    () =>
      inscritos.map((ins, i) => ({
        titulo:
          (euCorro && i === 0 ? 'Você' : `Participante ${euCorro ? i : i + 1}`) +
          (ins.nome.trim() ? ` · ${ins.nome.trim()}` : ''),
        kitLabel: kitNomeFromId(evento.kits, ins.kitId),
      })),
    [inscritos, euCorro, evento.kits],
  );

  const linhasConfirmacao: LinhaConfirmacao[] = useMemo(
    () =>
      inscritos.map((ins, i) => ({
        titulo: euCorro && i === 0 ? `Você${ins.nome.trim() ? ` · ${ins.nome.trim()}` : ''}` : ins.nome.trim() || `Participante ${i + 1}`,
        modalidade: ins.modalidade || '—',
        kitLabel: kitNomeFromId(evento.kits, ins.kitId),
      })),
    [inscritos, euCorro, evento.kits],
  );

  // D-4 · props do campo de cupom do STEP 0 (mesma peça do Resumo). O bloqueio
  // é honesto: sem modalidade não há item para o servidor precificar, então o
  // "Aplicar" fica desabilitado com a razão à vista — nunca um "aplicado" falso.
  const propsCupomStep0: CupomCampoProps = {
    valor: cupomInput,
    onValor: setCupomInput,
    onAplicar: () => void aplicarCupom(),
    onRemover: removerCupom,
    aplicando: aplicandoCupom,
    codigoAplicado: cotacao?.cupomAplicado?.codigo ?? null,
    descontoLabel:
      cotacao && cotacao.desconto > 0 ? `menos ${formatarPreco(cotacao.desconto)}` : '',
    erro: erroCupom ?? erroCupomUrl,
    bloqueio: !todasModalidades
      ? 'Escolha a modalidade de cada participante para validar o cupom.'
      : !authPronto
        ? 'Preparando sua sessão — o cupom pode ser aplicado em instantes.'
        : null,
    apoio: 'Tem um código? Aplique agora — o desconto entra no total do resumo.',
  };

  // Nav de "Continuar" só nas etapas de coleta — no PAGAR a ação é pagar.
  const mostraNav = step <= 1;

  return (
    // ToastProvider do DS (Radix-free, ADR-017): a fila de feedback do
    // checkout. Hoje serve o auto-copy da chave PIX (RN-157); é o mesmo
    // provider para qualquer toast futuro desta tela — nada de viewport ad hoc.
    <ToastProvider>
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Frente 3: voltar em ghost, rótulo curto (sem "excesso de textos"). */}
      <Button asChild variant="ghost" size="sm">
        <Link href={`/${evento.slug}`} aria-label={`Voltar para ${evento.nome}`}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden className="mr-1.5" />
          Voltar
        </Link>
      </Button>

      {/* Frente 1: título em escala tipográfica do DS (tokens `--font-size-*`). */}
      <h1 className="mt-5 font-display text-[length:var(--font-size-2xl)] font-[var(--font-weight-extrabold)] tracking-tight text-text-primary sm:text-[length:var(--font-size-3xl)]">
        Inscrição · {evento.nome}
      </h1>

      {/* Frentes 5+6: 3 macro-etapas visíveis, com ícone por etapa. */}
      <div className="mt-8">
        <CheckoutStepper step={step} />
      </div>

      {erroAuth ? (
        <div role="alert" className="mt-8 rounded-ds-md border border-border-default bg-feedback-warning-surface p-4">
          <p className="text-[length:var(--font-size-base)] font-[var(--font-weight-medium)] text-feedback-warning-fg">{erroAuth}</p>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={iniciarAuth} disabled={tentandoAuth}>
              {tentandoAuth ? 'Tentando…' : 'Tentar novamente'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        {step === 0 ? (
          <StepModalidadeKit
            modalidades={evento.modalidades}
            kits={evento.kits}
            itensTamanhados={evento.itensTamanhados}
            inscritos={inscritos}
            euCorro={euCorro}
            onInscrito={patchInscrito}
            onAddInscrito={addInscrito}
            onRemoveInscrito={removeInscrito}
            errosModalidade={errosModalidade}
            errosKit={errosKit}
            errosTamanhos={errosTamanhos}
            taxaRepassada={evento.taxaRepassada}
            cupom={propsCupomStep0}
          />
        ) : null}

        {step === 1 ? (
          <StepDados
            responsavelNome={responsavel.nome}
            responsavelEmail={responsavel.email}
            responsavelTelefone={responsavel.telefone}
            onResponsavel={handleResponsavel}
            euCorro={euCorro}
            onEuCorro={handleEuCorro}
            inscritos={inscritos}
            onInscrito={patchInscrito}
            onRemoveInscrito={removeInscrito}
            endereco={endereco}
            onEndereco={patchEndereco}
            errosResponsavel={errosResponsavel}
            errosInscritos={errosInscritos}
            errosEndereco={errosEndereco}
            aceites={
              <div className="flex flex-col gap-2">
                <AceitesCompra
                  politica={evento.politicaVendas}
                  termoSaudeVersao={evento.termoSaudeVersao}
                  termoSaudeCustom={termoSaudeCustom}
                  eventoNome={evento.nome}
                  organizadorNome={evento.organizador?.nome ?? null}
                  aceiteTermos={aceiteTermos}
                  aceiteSaude={aceiteSaude}
                  aceiteSaudeCustom={aceiteSaudeCustom}
                  onAceiteTermos={(v) => {
                    setAceiteTermos(v);
                    if (v) setErroAceites(null);
                  }}
                  onAceiteSaude={(v) => {
                    setAceiteSaude(v);
                    if (v) setErroAceites(null);
                  }}
                  onAceiteSaudeCustom={(v) => {
                    setAceiteSaudeCustom(v);
                    if (v) setErroAceites(null);
                  }}
                  // RN-438: prova já carimbada no servidor ⇒ o bloco fica
                  // travado ONDE QUER QUE seja renderizado, inclusive quando o
                  // comprador volta a esta etapa. A tela não pode sugerir que
                  // um aceite registrado é reversível.
                  desabilitado={charge !== null}
                />
                {erroAceites !== null ? (
                  <p role="alert" className="text-sm text-feedback-danger-fg">
                    {erroAceites}
                  </p>
                ) : null}
              </div>
            }
          />
        ) : null}

        {/* PAGAR — uma tela só: resumo (editável) → instrumento → aceites →
            botão de pagar. O resumo e o pagamento eram duas telas internas
            dentro da mesma macro-etapa (DEC-0729 · achados 3, 12 e 17). */}
        {step === 2 ? (
          <div className="flex flex-col gap-6">
            <StepResumo
              cotacao={cotacaoNaTela}
              cotando={cotando}
              erroCotacao={erroCotacao}
              onTentarCotacao={tentarCotarNovamente}
              linhas={linhasResumo}
              onEditarItem={editarItem}
              cupomInput={cupomInput}
              onCupomInput={setCupomInput}
              onAplicarCupom={aplicarCupom}
              onRemoverCupom={removerCupom}
              aplicandoCupom={aplicandoCupom}
              erroCupomUrl={erroCupom ?? erroCupomUrl}
              descontoVeioDoLink={origemCupom === 'link'}
              taxaRepassada={evento.taxaRepassada}
              forma={forma}
              onForma={setForma}
              parcelas={parcelas}
              onParcelas={setParcelas}
              // C2-0803 · a escada do CARTÃO, e só ela. Nunca a do PIX
              // disfarçada de parcelamento.
              opcoesParcelamento={escadaCartaoAtual}
              cartao={cartao}
              onCartao={(patch) => setCartao((c) => ({ ...c, ...patch }))}
            />
            <StepPagamento
              forma={forma}
              total={cotacaoNaTela?.totalCobrado ?? null}
              charge={charge}
              criandoCharge={criandoCharge}
              erroCharge={erroCharge}
              onGerarCobranca={() => void gerarCobranca()}
              onPagarCartao={() => void pagarCartao()}
              confirmando={confirmando}
              erroConfirmar={erroConfirmar}
              onConfirmar={() => {
                if (charge) void confirmar(charge.pedidoId);
              }}
              aceitesOk={aceitesOk}
              pixExpirado={pixExpirado}
              pixVivoPeloServidor={pixContestado}
              pixDesvioRelogioMs={desvioRelogioMs}
              onPixExpirar={aoExpirarPix}
              onNovaCobranca={novaCobrancaPix}
              gatewaySemResposta={gatewaySemResposta}
              // CKUX-REV (item 64) · cotação NOVA no ar ⇒ o total desta
              // renderização é o da seleção anterior. Nenhum botão de pagar
              // oferece preço velho. C1-0803: a guarda vale onde há preço novo
              // a esperar — não na troca entre opções que o servidor já cotou.
              totalDefasado={totalDefasado}
            />
          </div>
        ) : null}

        {step === 3 && charge ? (
          <StepConfirmacao
            charge={charge}
            confirmacao={confirmacao}
            eventoNome={evento.nome}
            slug={evento.slug}
            responsavelEmail={responsavel.email.trim()}
            linhas={linhasConfirmacao}
            {...(forma !== null ? { forma } : {})}
            taxaRepassada={evento.taxaRepassada}
            pixExpirado={pixExpirado}
            pixVivoPeloServidor={pixContestado}
            pixDesvioRelogioMs={desvioRelogioMs}
            onPixExpirar={aoExpirarPix}
            onNovaCobranca={novaCobrancaPix}
          />
        ) : null}
      </div>

      {mostraNav ? (
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-subtle pt-6">
          <Button variant="ghost" onClick={voltar} disabled={step === 0}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden className="mr-1.5" />
            Voltar
          </Button>
          <Button onClick={avancar} disabled={erroAuth !== null}>
            Continuar
          </Button>
        </div>
      ) : step === 2 ? (
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-subtle pt-6">
          <Button variant="ghost" onClick={voltar} disabled={confirmando}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden className="mr-1.5" />
            Voltar
          </Button>
          {cotacaoNaTela ? (
            <p className="text-[length:var(--font-size-base)] text-text-secondary">
              Total: <span className="font-[var(--font-weight-semibold)] text-text-primary">{formatarPreco(cotacaoNaTela.totalCobrado)}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Frente 2: logo (wordmark) no rodapé do checkout — recolor por token,
          nunca a variante box. */}
      <footer className="mt-16 flex flex-col items-center gap-2 border-t border-border-subtle pt-8">
        <LeelaWordmark className="h-5 w-auto text-text-brand" />
        <p className="text-[length:var(--font-size-sm)] text-text-tertiary">
          Inscrição segura · pagamento processado no ambiente Leela
        </p>
      </footer>
    </div>
    </ToastProvider>
  );
}

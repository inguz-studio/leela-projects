'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  cotarInscricaoCheckout,
  createInscricaoCharge,
  confirmarPagamentoSandbox,
  loginAnonimo,
  type ConfirmarPagamentoSandboxResult,
  type CotarInscricaoCheckoutResult,
  type CreateInscricaoChargeResult,
} from '@leela/api-client';
import { Button } from '@/app/_ds/ds';
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
import { StepDados } from './StepDados';
import { StepModalidadeKit } from './StepModalidadeKit';
import { StepResumo, type LinhaResumo } from './StepResumo';
import { StepPagamento, type CartaoForm } from './StepPagamento';
import { StepConfirmacao, type LinhaConfirmacao } from './StepConfirmacao';
import { CheckoutStepper } from './CheckoutStepper';
import { LeelaWordmark } from './LeelaWordmark';

// Copy humana do erro de sessão (BC-2): o comprador NUNCA vê jargão de infra
// ("Firebase Anonymous Auth", erro cru do SDK) — o detalhe técnico fica só no
// console. Uma frase, ação clara, sem beco sem saída.
const COPY_ERRO_AUTH =
  'Não conseguimos preparar seu pagamento. Verifique sua conexão e tente de novo.';
// Quantas vezes a sessão anônima re-tenta sozinha (backoff curto) antes de
// pedir ação manual ao comprador. Mantém erro transitório invisível.
const MAX_AUTH_RETRY_AUTO = 1;

// Etapas INTERNAS (5), na ordem do mockup/TicketSports (o dono):
//   [0] modalidade+kit · [1] dados · [2] resumo · [3] pagamento · [4] confirmação
// Modalidade e kit ficam juntos na etapa 0 (o kit é filtrado pela modalidade);
// os dados vêm depois (job vence o pixel: o wireframe do Figma põe dados antes
// do kit). O comprador VÊ só 3 macro-etapas — o agrupamento 5→3 mora em
// `CheckoutStepper`/`macroDaEtapa` (LEELA-R13 · adendo 10). As validações e o
// fluxo abaixo seguem por índice interno 0-4, intactos.

/** Chave de idempotência do cliente (RN-333): [A-Za-z0-9_-]{8,64}. */
function novaChaveIdempotencia(): string {
  const rnd =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `chk-${rnd}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

function mensagemErro(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return fallback;
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
}: {
  evento: EventoPublico;
  atribuicao: Atribuicao;
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

  // Pagamento / cotação
  const [forma, setForma] = useState<FormaUI>('pix');
  const [parcelas, setParcelas] = useState(1);
  const [cupomInput, setCupomInput] = useState(atribuicao.cupom ?? '');
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null);
  const [cotacao, setCotacao] = useState<CotarInscricaoCheckoutResult | null>(null);
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

  // CKFORM §5.3 — os DOIS aceites do pagar (termos da compra + termo de
  // saúde). Gateiam Gerar PIX/Pagar; entram no input do createInscricaoCharge
  // como booleans (versão/timestamp/hash carimbados pelo servidor — CKMOD).
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteSaude, setAceiteSaude] = useState(false);
  const aceitesOk = aceiteTermos && aceiteSaude;

  // Cobrança / confirmação
  const chaveRef = useRef<string | undefined>(undefined);
  const [charge, setCharge] = useState<CreateInscricaoChargeResult | null>(null);
  const [criandoCharge, setCriandoCharge] = useState(false);
  const [erroCharge, setErroCharge] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmarPagamentoSandboxResult | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [cartao, setCartao] = useState<CartaoForm>({ nome: '', numero: '', validade: '', cvv: '' });

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

  const parcelasEfetivas = forma === 'pix' ? 1 : parcelas;
  // Assinatura de (modalidade, kit) por inscrito — recotar quando qualquer um muda.
  const selecaoSig = inscritos.map((i) => `${i.modalidade}:${i.kitId}`).join('|');
  const todasModalidades = inscritos.every((i) => i.modalidade.length > 0);
  const precisaCotar = step >= 2;

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
  }, []);

  // ── Cotação (read-only; consome computeSaleState no servidor) ──────────────
  const cotarCom = useCallback(
    async (
      cupom: string | null,
    ): Promise<{ ok: true; data: CotarInscricaoCheckoutResult } | { ok: false; error: string }> => {
      try {
        const data = await cotarInscricaoCheckout({
          eventoId: evento.slug,
          itens: inscritos.map((i) => ({
            modalidade: i.modalidade,
            ...(i.kitId.length > 0 ? { kitId: i.kitId } : {}),
          })),
          forma,
          parcelas: forma === 'pix' ? 1 : parcelas,
          ...(cupom ? { cupomCodigo: cupom } : {}),
        });
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: mensagemErro(err, 'Não foi possível calcular o total.') };
      }
    },
    [evento.slug, inscritos, forma, parcelas],
  );

  // Recalcula o total ao entrar no Resumo e quando seleção/forma/parcelas mudam.
  // Enquanto o cupom da URL ainda não resolveu (A-2), o efeito de auto-aplicação
  // faz a 1ª cotação — este espera para não disparar duas cotações concorrentes.
  useEffect(() => {
    if (!precisaCotar || !authPronto || !todasModalidades || cupomUrlPendente) return;
    let vivo = true;
    setCotando(true);
    cotarCom(cupomAplicado).then((r) => {
      if (!vivo) return;
      setCotando(false);
      if (r.ok) {
        setCotacao(r.data);
        setErroCotacao(null);
      } else {
        setCotacao(null);
        setErroCotacao(r.error);
      }
    });
    return () => {
      vivo = false;
    };
  }, [precisaCotar, authPronto, cupomAplicado, forma, parcelasEfetivas, selecaoSig, todasModalidades, cupomUrlPendente, recotarNonce, cotarCom]);

  // A-2 · auto-aplica o cupom vindo da URL. Na 1ª cotação possível, tenta o
  // cupom do link: sucesso ⇒ vira `cupomAplicado` (o efeito acima recota e
  // exibe o desconto); falha ⇒ banner honesto e segue sem cupom (o servidor
  // revalida tudo — risco zero de preço no cliente). Roda no máximo 1×.
  useEffect(() => {
    if (!cupomUrlPendente || !precisaCotar || !authPronto || !todasModalidades) return;
    const codigo = (atribuicao.cupom ?? '').trim().toUpperCase();
    if (codigo.length === 0) {
      setCupomUrlPendente(false);
      return;
    }
    let vivo = true;
    setCotando(true);
    cotarCom(codigo).then((r) => {
      if (!vivo) return;
      if (r.ok) {
        setCupomAplicado(codigo);
        setErroCupomUrl(null);
      } else {
        setCotando(false);
        setErroCupomUrl(`O cupom ${codigo} não pôde ser aplicado (${r.error})`);
      }
      setCupomUrlPendente(false);
    });
    return () => {
      vivo = false;
    };
  }, [cupomUrlPendente, precisaCotar, authPronto, todasModalidades, atribuicao.cupom, cotarCom]);

  // Qualquer mudança de preço invalida a cobrança já criada (evita replay com
  // valores antigos — a UI reflete sempre a seleção atual).
  useEffect(() => {
    chaveRef.current = undefined;
    setCharge(null);
    setConfirmacao(null);
    setErroCharge(null);
    setErroConfirmar(null);
  }, [cupomAplicado, forma, parcelasEfetivas, selecaoSig]);

  const aplicarCupom = useCallback(async () => {
    const code = cupomInput.trim().toUpperCase();
    if (code.length === 0) return;
    setErroCupomUrl(null);
    setAplicandoCupom(true);
    const r = await cotarCom(code);
    setAplicandoCupom(false);
    if (r.ok) {
      setCupomAplicado(code);
      setCotacao(r.data);
      setErroCotacao(null);
    } else {
      setErroCotacao(r.error);
    }
  }, [cupomInput, cotarCom]);

  const removerCupom = useCallback(() => {
    setErroCupomUrl(null);
    setCupomAplicado(null);
    setCupomInput('');
  }, []);

  // BC-1 · retry manual da cotação: bump do nonce → o efeito de cotação re-roda
  // (re-dispara `cotarCom(cupomAplicado)`) com o mesmo guard de cancelamento.
  const tentarCotarNovamente = useCallback(() => {
    setErroCotacao(null);
    setRecotarNonce((n) => n + 1);
  }, []);

  // ── Cobrança + confirmação (produtor de escrita + webhook sandbox) ─────────
  const gerarCobranca = useCallback(async (): Promise<CreateInscricaoChargeResult | null> => {
    if (charge) return charge;
    if (!authPronto) {
      setErroCharge('Sessão de pagamento ainda não pronta. Aguarde um instante.');
      return null;
    }
    // §5.3: defesa em profundidade — a UI já desabilita os botões, e o
    // SERVIDOR rejeita pedido sem aceites (flip F-4a). Nunca cria cobrança
    // sem os dois confirmados.
    if (!aceitesOk) {
      setErroCharge('Confirme os dois aceites para concluir o pagamento.');
      return null;
    }
    if (chaveRef.current === undefined) chaveRef.current = novaChaveIdempotencia();
    setCriandoCharge(true);
    setErroCharge(null);
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
          modalidade: ins.modalidade,
          kit: kitEnumFromId(ins.kitId),
          ...(ins.kitId.length > 0 ? { kitId: ins.kitId } : {}),
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
        aceites: { termos: true, saude: true },
        ...((): { ref?: { codigo: string; clicadoEmMillis?: number } } => {
          // Atribuição de afiliado (RN-313) — nunca bloqueia a compra: o
          // servidor descarta ref inválido/fora da janela em silêncio.
          const ref = refDaCompra(evento.slug, atribuicao.ref);
          return ref !== undefined ? { ref } : {};
        })(),
        idempotencyKey: chaveRef.current,
      });
      setCharge(data);
      return data;
    } catch (err) {
      setErroCharge(mensagemErro(err, 'Não foi possível criar a cobrança.'));
      return null;
    } finally {
      setCriandoCharge(false);
    }
  }, [charge, authPronto, aceitesOk, evento.slug, inscritos, euCorro, responsavel, endereco, forma, parcelas, cupomAplicado, atribuicao.ref]);

  const confirmar = useCallback(async (pedidoId: string) => {
    setConfirmando(true);
    setErroConfirmar(null);
    try {
      const data = await confirmarPagamentoSandbox({ pedidoId });
      setConfirmacao(data);
      setStep(4);
    } catch (err) {
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
      step === 3 &&
      forma === 'pix' &&
      authPronto &&
      aceitesOk &&
      charge === null &&
      !criandoCharge &&
      erroCharge === null
    ) {
      void gerarCobranca();
    }
  }, [step, forma, authPronto, aceitesOk, charge, criandoCharge, erroCharge, gerarCobranca]);

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
      setErrosModalidade(eMod);
      setErrosKit(eKit);
      if (eMod.some((e) => e !== undefined) || eKit.some((e) => e !== undefined)) return;
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
      if (temErro(eResp) || eIns.some((e) => temErro(e)) || temErro(eEnd)) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (cotacao === null || erroCotacao !== null) return;
      setStep(3);
      return;
    }
  }, [step, evento.kits, responsavel, inscritos, euCorro, endereco, cotacao, erroCotacao, erroAuth]);

  const voltar = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // ── Linhas do resumo/confirmação (metadados; preço vem da cotação/cobrança) ─
  const linhasResumo: LinhaResumo[] = useMemo(
    () =>
      inscritos.map((ins, i) => ({
        titulo:
          (euCorro && i === 0 ? 'Você' : `Atleta ${euCorro ? i : i + 1}`) +
          (ins.nome.trim() ? ` · ${ins.nome.trim()}` : ''),
        kitLabel: kitNomeFromId(evento.kits, ins.kitId),
      })),
    [inscritos, euCorro, evento.kits],
  );

  const linhasConfirmacao: LinhaConfirmacao[] = useMemo(
    () =>
      inscritos.map((ins, i) => ({
        titulo: euCorro && i === 0 ? `Você${ins.nome.trim() ? ` · ${ins.nome.trim()}` : ''}` : ins.nome.trim() || `Atleta ${i + 1}`,
        modalidade: ins.modalidade || '—',
        kitLabel: kitNomeFromId(evento.kits, ins.kitId),
      })),
    [inscritos, euCorro, evento.kits],
  );

  const mostraNav = step <= 2;

  return (
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
            inscritos={inscritos}
            euCorro={euCorro}
            onInscrito={patchInscrito}
            onAddInscrito={addInscrito}
            onRemoveInscrito={removeInscrito}
            errosModalidade={errosModalidade}
            errosKit={errosKit}
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
            endereco={endereco}
            onEndereco={patchEndereco}
            errosResponsavel={errosResponsavel}
            errosInscritos={errosInscritos}
            errosEndereco={errosEndereco}
          />
        ) : null}

        {step === 2 ? (
          <StepResumo
            cotacao={cotacao}
            cotando={cotando}
            erroCotacao={erroCotacao}
            onTentarCotacao={tentarCotarNovamente}
            linhas={linhasResumo}
            cupomInput={cupomInput}
            onCupomInput={setCupomInput}
            onAplicarCupom={aplicarCupom}
            onRemoverCupom={removerCupom}
            aplicandoCupom={aplicandoCupom}
            erroCupomUrl={erroCupomUrl}
            forma={forma}
            onForma={setForma}
            parcelas={parcelas}
            onParcelas={setParcelas}
          />
        ) : null}

        {step === 3 ? (
          <StepPagamento
            forma={forma}
            total={cotacao?.totalCobrado ?? null}
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
            cartao={cartao}
            onCartao={(patch) => setCartao((c) => ({ ...c, ...patch }))}
            politica={evento.politicaVendas}
            termoSaudeVersao={evento.termoSaudeVersao}
            eventoNome={evento.nome}
            organizadorNome={evento.organizador?.nome ?? null}
            aceiteTermos={aceiteTermos}
            aceiteSaude={aceiteSaude}
            onAceiteTermos={setAceiteTermos}
            onAceiteSaude={setAceiteSaude}
          />
        ) : null}

        {step === 4 && charge ? (
          <StepConfirmacao
            charge={charge}
            confirmacao={confirmacao}
            eventoNome={evento.nome}
            slug={evento.slug}
            responsavelEmail={responsavel.email.trim()}
            linhas={linhasConfirmacao}
          />
        ) : null}
      </div>

      {mostraNav ? (
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-subtle pt-6">
          <Button variant="ghost" onClick={voltar} disabled={step === 0}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden className="mr-1.5" />
            Voltar
          </Button>
          <Button
            onClick={avancar}
            disabled={erroAuth !== null || (step === 2 && (cotacao === null || erroCotacao !== null))}
          >
            {step === 2 ? 'Ir para pagamento' : 'Continuar'}
          </Button>
        </div>
      ) : step === 3 ? (
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-subtle pt-6">
          <Button variant="ghost" onClick={voltar} disabled={confirmando}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden className="mr-1.5" />
            Voltar
          </Button>
          {cotacao ? (
            <p className="text-[length:var(--font-size-base)] text-text-secondary">
              Total: <span className="font-[var(--font-weight-semibold)] text-text-primary">{formatarPreco(cotacao.totalCobrado)}</span>
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
  );
}

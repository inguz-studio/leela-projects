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
  type CreateInscricaoChargeResult,
} from '@leela/api-client';
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
import { StepDados } from './StepDados';
import { StepModalidadeKit } from './StepModalidadeKit';
import { StepResumo, type LinhaResumo } from './StepResumo';
import { StepPagamento, type CartaoForm } from './StepPagamento';
import { StepConfirmacao, type LinhaConfirmacao } from './StepConfirmacao';
import { CheckoutStepper } from './CheckoutStepper';
import { LeelaWordmark } from './LeelaWordmark';
import { mascaraCep, mascaraTelefone } from './cep';

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
  // RN-231: erro por (inscrito × itemId) — tamanho obrigatório do item do kit.
  const [errosTamanhos, setErrosTamanhos] = useState<Record<string, string>[]>([]);

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
  // D-4 (S1209-T1): o cupom agora é aplicável já no step 0, longe do bloco de
  // totais. A recusa do cupom deixa de se disfarçar de "erro de cotação" (que
  // significa "não consegui calcular o total") e ganha canal próprio.
  const [erroCupom, setErroCupom] = useState<string | null>(null);

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

  const parcelasEfetivas = forma === 'pix' ? 1 : parcelas;
  // Assinatura de (modalidade, kit) por inscrito — recotar quando qualquer um muda.
  const selecaoSig = inscritos.map((i) => `${i.modalidade}:${i.kitId}`).join('|');
  const todasModalidades = inscritos.every((i) => i.modalidade.length > 0);
  const precisaCotar = step >= 2;
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
    if (!precisaCotar || !podeCotar || cupomUrlPendente) return;
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
  }, [precisaCotar, podeCotar, cupomAplicado, forma, parcelasEfetivas, selecaoSig, cupomUrlPendente, recotarNonce, cotarCom]);

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
    const codigo = (atribuicao.cupom ?? '').trim().toUpperCase();
    if (codigo.length === 0) {
      setCupomUrlPendente(false);
      return;
    }
    let vivo = true;
    setCotando(true);
    cotarCom(codigo).then((r) => {
      if (!vivo) return;
      setCotando(false);
      if (r.ok) {
        setCupomAplicado(codigo);
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
  }, [cupomUrlPendente, podeCotar, atribuicao.cupom, cotarCom]);

  // Qualquer mudança de preço invalida a cobrança já criada (evita replay com
  // valores antigos — a UI reflete sempre a seleção atual).
  useEffect(() => {
    chaveRef.current = undefined;
    setCharge(null);
    setConfirmacao(null);
    setErroCharge(null);
    setErroConfirmar(null);
    setPixEstado('vivo');
  }, [cupomAplicado, forma, parcelasEfetivas, selecaoSig]);

  const aplicarCupom = useCallback(async () => {
    const code = cupomInput.trim().toUpperCase();
    if (code.length === 0) return;
    // Guarda de estado: sem sessão/modalidade não há cotação para validar o
    // código — a UI já desabilita o botão; aqui é defesa em profundidade.
    if (!podeCotar) return;
    setErroCupomUrl(null);
    setErroCupom(null);
    setAplicandoCupom(true);
    const r = await cotarCom(code);
    setAplicandoCupom(false);
    if (r.ok) {
      setCupomAplicado(code);
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
        aceites: { termos: true, saude: true },
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
      erroCharge === null &&
      // RN-157: PIX expirado NÃO regenera sozinho — a pessoa pede.
      !pixExpirado
    ) {
      void gerarCobranca();
    }
  }, [step, forma, authPronto, aceitesOk, charge, criandoCharge, erroCharge, pixExpirado, gerarCobranca]);

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
      setStep(3);
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
      if (temErro(eResp) || eIns.some((e) => temErro(e)) || temErro(eEnd)) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (cotacao === null || erroCotacao !== null) return;
      setStep(3);
      return;
    }
  }, [step, evento.kits, evento.itensTamanhados, responsavel, inscritos, euCorro, endereco, cotacao, erroCotacao, erroAuth]);

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
      ? 'Escolha a modalidade de cada atleta para validar o cupom.'
      : !authPronto
        ? 'Preparando sua sessão — o cupom pode ser aplicado em instantes.'
        : null,
    apoio: 'Tem um código? Aplique agora — o desconto entra no total do resumo.',
  };

  const mostraNav = step <= 2;

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
            erroCupomUrl={erroCupom ?? erroCupomUrl}
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
            pixExpirado={pixExpirado}
            pixVivoPeloServidor={pixContestado}
            pixDesvioRelogioMs={desvioRelogioMs}
            onPixExpirar={aoExpirarPix}
            onNovaCobranca={novaCobrancaPix}
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
            forma={forma}
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
    </ToastProvider>
  );
}

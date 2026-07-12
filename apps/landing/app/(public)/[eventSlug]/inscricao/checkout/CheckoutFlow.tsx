'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  cotarInscricaoCheckout,
  createInscricaoCharge,
  confirmarPagamentoSandbox,
  loginAnonimo,
  type ConfirmarPagamentoSandboxResult,
  type CotarInscricaoCheckoutResult,
  type CreateInscricaoChargeResult,
} from '@leela/api-client';
import { Button, Stepper } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import { ensureLeela } from '@/lib/leelaClient';
import type { EventoPublico } from '@/lib/tipos';
import { KIT_OPCOES, inscritoVazio, type FormaUI, type InscritoForm } from './tipos';
import {
  validarInscrito,
  validarResponsavel,
  temErro,
  type ErrosInscrito,
  type ErrosResponsavel,
} from './validacao';
import { StepDados } from './StepDados';
import { StepModalidadeKit } from './StepModalidadeKit';
import { StepResumo, type LinhaResumo } from './StepResumo';
import { StepPagamento, type CartaoForm } from './StepPagamento';
import { StepConfirmacao, type LinhaConfirmacao } from './StepConfirmacao';

const PASSOS = [
  { id: 'dados', label: 'Dados' },
  { id: 'modalidade', label: 'Modalidade e kit' },
  { id: 'resumo', label: 'Resumo' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'confirmacao', label: 'Confirmação' },
];

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

function kitLabel(kit: InscritoForm['kit']): string {
  return KIT_OPCOES.find((k) => k.value === kit)?.label ?? 'Sem kit';
}

interface Atribuicao {
  cupom?: string;
}

export function CheckoutFlow({
  evento,
  atribuicao,
}: {
  evento: EventoPublico;
  atribuicao: Atribuicao;
}): React.JSX.Element {
  const [step, setStep] = useState(0);

  // Dados (ADR-011)
  const [responsavel, setResponsavel] = useState({ nome: '', email: '' });
  const [euCorro, setEuCorro] = useState(true);
  const [inscritos, setInscritos] = useState<InscritoForm[]>([inscritoVazio()]);
  const [errosResponsavel, setErrosResponsavel] = useState<ErrosResponsavel>({});
  const [errosInscritos, setErrosInscritos] = useState<ErrosInscrito[]>([]);
  const [errosModalidade, setErrosModalidade] = useState<(string | undefined)[]>([]);

  // Pagamento / cotação
  const [forma, setForma] = useState<FormaUI>('pix');
  const [parcelas, setParcelas] = useState(1);
  const [cupomInput, setCupomInput] = useState(atribuicao.cupom ?? '');
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null);
  const [cotacao, setCotacao] = useState<CotarInscricaoCheckoutResult | null>(null);
  const [cotando, setCotando] = useState(false);
  const [erroCotacao, setErroCotacao] = useState<string | null>(null);
  const [aplicandoCupom, setAplicandoCupom] = useState(false);

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

  useEffect(() => {
    let vivo = true;
    try {
      ensureLeela();
    } catch (err) {
      setErroAuth(mensagemErro(err, 'Falha ao inicializar o pagamento.'));
      return;
    }
    loginAnonimo()
      .then(() => {
        if (vivo) setAuthPronto(true);
      })
      .catch((err) => {
        if (vivo) setErroAuth(mensagemErro(err, 'Não foi possível iniciar a sessão de pagamento.'));
      });
    return () => {
      vivo = false;
    };
  }, []);

  const parcelasEfetivas = forma === 'pix' ? 1 : parcelas;
  const modalidadesSig = inscritos.map((i) => i.modalidade).join('|');
  const todasModalidades = inscritos.every((i) => i.modalidade.length > 0);
  const precisaCotar = step >= 2;

  // ── Sincronização do 1º inscrito com o responsável quando "eu vou correr" ──
  const patchInscrito = useCallback((index: number, patch: Partial<InscritoForm>) => {
    setInscritos((prev) => prev.map((ins, i) => (i === index ? { ...ins, ...patch } : ins)));
  }, []);

  const handleResponsavel = useCallback(
    (patch: { nome?: string; email?: string }) => {
      setResponsavel((prev) => {
        const next = { ...prev, ...patch };
        return next;
      });
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
          itens: inscritos.map((i) => ({ modalidade: i.modalidade })),
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

  // Recalcula o total ao entrar no Resumo e quando preço/forma/parcelas mudam.
  useEffect(() => {
    if (!precisaCotar || !authPronto || !todasModalidades) return;
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
  }, [precisaCotar, authPronto, cupomAplicado, forma, parcelasEfetivas, modalidadesSig, todasModalidades, cotarCom]);

  // Qualquer mudança de preço invalida a cobrança já criada (evita replay com
  // valores antigos — a UI reflete sempre a seleção atual).
  useEffect(() => {
    chaveRef.current = undefined;
    setCharge(null);
    setConfirmacao(null);
    setErroCharge(null);
    setErroConfirmar(null);
  }, [cupomAplicado, forma, parcelasEfetivas, modalidadesSig]);

  const aplicarCupom = useCallback(async () => {
    const code = cupomInput.trim().toUpperCase();
    if (code.length === 0) return;
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
    setCupomAplicado(null);
    setCupomInput('');
  }, []);

  // ── Cobrança + confirmação (produtor de escrita + webhook sandbox) ─────────
  const gerarCobranca = useCallback(async (): Promise<CreateInscricaoChargeResult | null> => {
    if (charge) return charge;
    if (!authPronto) {
      setErroCharge('Sessão de pagamento ainda não pronta. Aguarde um instante.');
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
          modalidade: ins.modalidade,
          kit: ins.kit,
        })),
        ...(euCorro ? { responsavelIndex: 0 } : {}),
        responsavel: { nome: responsavel.nome.trim(), email: responsavel.email.trim() },
        forma,
        parcelas: forma === 'pix' ? 1 : parcelas,
        ...(cupomAplicado ? { cupomCodigo: cupomAplicado } : {}),
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
  }, [charge, authPronto, evento.slug, inscritos, euCorro, responsavel, forma, parcelas, cupomAplicado]);

  const confirmar = useCallback(
    async (pedidoId: string) => {
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
    },
    [],
  );

  const pagarCartao = useCallback(async () => {
    const c = await gerarCobranca();
    if (c) await confirmar(c.pedidoId);
  }, [gerarCobranca, confirmar]);

  // ── Navegação com gate de validação ────────────────────────────────────────
  const avancar = useCallback(() => {
    if (step === 0) {
      const eResp = validarResponsavel(responsavel.nome, responsavel.email);
      const eIns = inscritos.map((ins, i) =>
        validarInscrito(
          euCorro && i === 0
            ? { ...ins, nome: responsavel.nome, email: responsavel.email }
            : ins,
        ),
      );
      setErrosResponsavel(eResp);
      setErrosInscritos(eIns);
      if (temErro(eResp) || eIns.some((e) => temErro(e))) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      const eMod = inscritos.map((ins) =>
        ins.modalidade.length === 0 ? 'Escolha uma modalidade.' : undefined,
      );
      setErrosModalidade(eMod);
      if (eMod.some((e) => e !== undefined)) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (cotacao === null || erroCotacao !== null) return;
      setStep(3);
      return;
    }
  }, [step, responsavel, inscritos, euCorro, cotacao, erroCotacao]);

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
        kitLabel: kitLabel(ins.kit),
      })),
    [inscritos, euCorro],
  );

  const linhasConfirmacao: LinhaConfirmacao[] = useMemo(
    () =>
      inscritos.map((ins, i) => ({
        titulo: euCorro && i === 0 ? `Você${ins.nome.trim() ? ` · ${ins.nome.trim()}` : ''}` : ins.nome.trim() || `Atleta ${i + 1}`,
        modalidade: ins.modalidade || '—',
        kitLabel: kitLabel(ins.kit),
      })),
    [inscritos, euCorro],
  );

  const mostraNav = step <= 2;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/${evento.slug}`}
        className="text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        ← Voltar para {evento.nome}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
        Inscrição · {evento.nome}
      </h1>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-max">
          <Stepper steps={PASSOS} current={step} aria-label="Etapas do checkout" />
        </div>
      </div>

      {erroAuth ? (
        <div className="mt-6 rounded-ds-md border border-border-default bg-feedback-warning-surface p-4">
          <p className="text-sm font-medium text-feedback-warning-fg">{erroAuth}</p>
          <p className="mt-1 text-sm text-text-secondary">
            O checkout precisa de uma sessão anônima (Firebase Anonymous Auth). Verifique se o
            provedor está habilitado no ambiente.
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        {step === 0 ? (
          <StepDados
            responsavelNome={responsavel.nome}
            responsavelEmail={responsavel.email}
            onResponsavel={handleResponsavel}
            euCorro={euCorro}
            onEuCorro={handleEuCorro}
            inscritos={inscritos}
            onInscrito={patchInscrito}
            onAddInscrito={addInscrito}
            onRemoveInscrito={removeInscrito}
            errosResponsavel={errosResponsavel}
            errosInscritos={errosInscritos}
          />
        ) : null}

        {step === 1 ? (
          <StepModalidadeKit
            modalidades={evento.modalidades}
            inscritos={inscritos}
            euCorro={euCorro}
            onInscrito={patchInscrito}
            errosModalidade={errosModalidade}
          />
        ) : null}

        {step === 2 ? (
          <StepResumo
            cotacao={cotacao}
            cotando={cotando}
            erroCotacao={erroCotacao}
            linhas={linhasResumo}
            cupomInput={cupomInput}
            onCupomInput={setCupomInput}
            onAplicarCupom={aplicarCupom}
            onRemoverCupom={removerCupom}
            aplicandoCupom={aplicandoCupom}
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
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
          <Button variant="ghost" onClick={voltar} disabled={step === 0}>
            Voltar
          </Button>
          <Button
            onClick={avancar}
            disabled={step === 2 && (cotacao === null || erroCotacao !== null)}
          >
            {step === 2 ? 'Ir para pagamento' : 'Continuar'}
          </Button>
        </div>
      ) : step === 3 ? (
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
          <Button variant="ghost" onClick={voltar} disabled={confirmando}>
            Voltar
          </Button>
          {cotacao ? (
            <p className="text-sm text-text-secondary">
              Total: <span className="font-semibold text-text-primary">{formatarPreco(cotacao.totalCobrado)}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

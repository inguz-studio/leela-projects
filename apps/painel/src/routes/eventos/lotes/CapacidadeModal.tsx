// =============================================================================
// CapacidadeModal — ajuste de capacidade de um lote (reabrir vagas — LEELA-S307-T2
// · E04 · RN-304, verbatim do Vitor 2026-07-17). Mostra o painel
// CONFIGURADO / VENDIDO / DISPONÍVEL (derivado do kernel — `capacidadeDoLote`)
// e deixa o organizador AUMENTAR a capacidade e salvar. Reduzir ABAIXO do
// vendido é BLOQUEADO com o limite à mostra (não esconde): `validarAjusteCapacidade`
// (kernel) é o espelho client-side; o callable `ajustarCapacidadeLote` é a
// autoridade (guard + auditoria).
//
// ⛔ SEM campo de motivo desde 28/08 (V2708-26): o dono cortou a exigência de
// motivo dos fluxos do organizador — o servidor o trata como opcional e a
// trilha (RN-304) continua com quem/quando/de→para.
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal, useToast } from '@leela/design-system';
import {
  capacidadeDoLote,
  mensagemContagemInvalida,
  parseContagemPtBr,
  validarAjusteCapacidade,
  type Lote,
} from '@leela/core';
import { formatInt } from '../_lib/format';
import { capacidadePrevista } from './_lib/loteForm';

export interface CapacidadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lote em ajuste; null = modal fechado (sem lote selecionado). */
  lote: Lote | null;
  /** Aplica o ajuste (callable). Resolve → fecha; rejeita → Toast honesto. */
  onAjustar: (loteId: string, novaCapacidade: number) => Promise<void>;
}

export function CapacidadeModal({
  open,
  onOpenChange,
  lote,
  onAjustar,
}: CapacidadeModalProps): JSX.Element {
  const { toast } = useToast();
  const [capacidade, setCapacidade] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // (Re)carrega o form ao abrir: parte da capacidade configurada atual.
  React.useEffect(() => {
    if (!open || !lote) return;
    setCapacidade(String(lote.quantidadeLimite));
  }, [open, lote]);

  if (!lote) {
    return <Modal open={open} onOpenChange={onOpenChange} title="Ajustar capacidade" />;
  }

  // Capacidade pelo parser único de contagem (FIX-PARSE-MILHAR): esta é a
  // única tela onde a vaga de um lote COM VENDA muda, e `Number("1.000")` é 1.
  // Um ajuste de mil lugares entrava aqui como um — aprovado por
  // `Number.isInteger`, e o kernel não tinha por que reprovar reduzir.
  const lida = parseContagemPtBr(capacidade);
  const nova = lida.ok ? lida.valor : Number.NaN;
  const capacidadeParseavel = lida.ok;
  // REV-LOTES · frente D (achado #1): o painel acompanha o total DIGITADO, não
  // o gravado. Esta é a ÚNICA tela onde a vaga de um lote COM VENDA é editável
  // (no LoteModal o campo está `disabled` justamente quando `vendidos > 0`), e
  // era aqui que o caso verbatim do dono aparecia errado: 50 configurados com
  // 19 vendidos, digitando 20, o painel seguia mostrando "Disponível 31" — o
  // número que ele reclamou. A aritmética é a do kernel (`capacidadePrevista`
  // → `capacidadeDoLote`): disponível = configurado − vendido, nunca negativo.
  // Total ilegível (vazio, meio-digitado, negativo) cai no gravado, então o
  // painel nunca pisca em branco nem exibe dívida de vaga.
  const painel = capacidadeParseavel
    ? capacidadePrevista(lote, String(nova))
    : capacidadeDoLote(lote);
  const previa = capacidadeParseavel && nova !== lote.quantidadeLimite;
  // Espelho client-side do veredito do kernel (o callable é a autoridade).
  // Recusa que EXPLICA: campo em branco segue com o pedido de sempre, e o
  // resto (casa decimal, pontuação torta) diz o que fazer em vez de repetir
  // "inteira" para todo texto que a tela não entendeu.
  const erroCapacidade = lida.ok
    ? validarAjusteCapacidade(lote, lida.valor)
    : lida.motivo === 'vazio'
      ? 'Informe uma capacidade inteira.'
      : mensagemContagemInvalida(lida.motivo);
  const semAlteracao = capacidadeParseavel && nova === lote.quantidadeLimite;
  const podeSalvar = erroCapacidade === null && !semAlteracao && !busy;

  async function salvar(): Promise<void> {
    if (!lote || !podeSalvar) return;
    setBusy(true);
    try {
      await onAjustar(lote.id, nova);
      toast({ title: 'Capacidade ajustada', variant: 'success' });
      onOpenChange(false);
    } catch {
      // O callable nega reduzir < vendido e cross-tenant — mensagem honesta.
      toast({
        title: 'Não foi possível ajustar',
        description: 'Reduzir abaixo do vendido é bloqueado, e só o dono da conta ajusta a capacidade.',
        variant: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Ajustar capacidade · ${lote.nome}`}
      description={`${lote.modalidade} · reabrir vagas sobe a capacidade (a vaga cancelada não volta sozinha)`}
      footer={
        <div className="flex justify-end gap-[var(--spacing-3)]">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void salvar()} disabled={!podeSalvar}>
            Salvar capacidade
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        {/* Painel configurado / vendido / disponível (verbatim do Vitor). */}
        <div className="grid grid-cols-3 gap-[var(--spacing-2)]">
          <PainelItem rotulo="Configurado" valor={painel.configurado} tom="primary" />
          <PainelItem rotulo="Vendido" valor={painel.vendido} tom="neutral" />
          <PainelItem rotulo="Disponível" valor={painel.disponivel} tom="success" />
        </div>
        {previa && (
          <p role="status" className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
            {`Prévia do total digitado (${formatInt(painel.configurado)}). Ainda não salvo — ` +
              `o gravado hoje é ${formatInt(lote.quantidadeLimite)}.`}
          </p>
        )}

        {/* PARSE-1: campo de TEXTO com teclado numérico. Como `type="number"` o
            navegador higienizava "1.234,56" para vazio antes de o código ver o
            texto, e a recusa montada logo acima não tinha o que explicar. E o
            guard `capacidadeParseavel &&` que morava aqui apagava a mensagem
            exatamente no caso em que ela existe: a frase do parser só nasce
            quando o parse FALHA. */}
        <Input
          id="capacidade-nova"
          type="text"
          inputMode="numeric"
          label="Nova capacidade (vagas configuradas)"
          value={capacidade}
          onChange={(e) => setCapacidade(e.target.value)}
          aria-describedby="capacidade-hint"
          {...(erroCapacidade ? { errorMessage: erroCapacidade } : {})}
        />
        <span id="capacidade-hint" className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          {`Não pode ficar abaixo de ${formatInt(lote.vendidos)} (já vendidos). Aumente para reabrir vagas.`}
        </span>
        {/* V2708-26: o campo de motivo saiu — o dono cortou a exigência dos
            fluxos do organizador; a trilha (RN-304) segue com quem/de→para. */}
      </div>
    </Modal>
  );
}

function PainelItem({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom: 'primary' | 'neutral' | 'success';
}): JSX.Element {
  const cor =
    tom === 'success'
      ? 'text-[var(--text-success)]'
      : tom === 'neutral'
        ? 'text-[var(--text-secondary)]'
        : 'text-[var(--text-primary)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-[var(--spacing-3)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{rotulo}</span>
      <span className={`text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] [font-variant-numeric:tabular-nums] ${cor}`}>
        {formatInt(valor)}
      </span>
    </div>
  );
}

CapacidadeModal.displayName = 'CapacidadeModal';

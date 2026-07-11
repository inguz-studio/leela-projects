// =============================================================================
// PainelOperacional — coluna direita (40%) do balcão (S204 · painel operacional).
// 4 cards, na ordem do mockup Entrega de Kit: (1) Retirada de kits — progressos
// de kit/chip + Ritmo com Sparkline do DS; (2) Alertas do balcão — pendências
// DERIVADAS dos carimbos reais (retirada + chip órfão), nunca inventadas;
// (3) Últimos atendimentos; (4) Ações rápidas. Presentational puro.
// =============================================================================

import * as React from 'react';
import { Badge, Button, Sparkline } from '@leela/design-system';
import type { FaixaChips, Inscrito } from '@leela/core';
import { presencaRegistrada } from '@leela/core';
import { alertasChipBalcao, resumoBalcaoDetalhado, ritmoAtendimentos } from '../_lib/balcao';
import { formatInt } from '../_lib/format';

export interface PainelOperacionalProps {
  inscritos: Inscrito[];
  /** Nomes dos últimos atendidos nesta sessão (mais recente primeiro). */
  ultimosAtendidos: string[];
  /** Evento usa chip? Governa os alertas de chip (RN-207). */
  usaChip: boolean;
  /** Faixa do lote de chips (F-T1) — dá os alertas de estoque/fora-da-faixa. */
  faixaChips: FaixaChips | null;
}

export function PainelOperacional({
  inscritos,
  ultimosAtendidos,
  usaChip,
  faixaChips,
}: PainelOperacionalProps): JSX.Element {
  const resumo = resumoBalcaoDetalhado(inscritos);
  const ritmo = ritmoAtendimentos(inscritos);
  const jaComPresenca = inscritos.filter((i) => presencaRegistrada(i)).map((i) => i.atletaNome);
  const ultimos = ultimosAtendidos.length > 0 ? ultimosAtendidos : jaComPresenca.slice(0, 5);

  // Alertas de chip DERIVADOS do core (chipOrfao/chipForaDaFaixa/derivarEstoque)
  // — mesma verdade da Function, nunca contador fabricado.
  const chip = alertasChipBalcao(inscritos, faixaChips, usaChip);
  const estoque = chip.estoque;
  const semPendencias =
    resumo.pendentes === 0 &&
    chip.orfaos.length === 0 &&
    chip.foraDaFaixa.length === 0 &&
    !estoque?.esgotado &&
    !estoque?.quaseEsgotado;

  return (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      {/* Card 1 · Retirada de kits */}
      <section aria-label="Retirada de kits" className={CARD}>
        <CardTitulo titulo="Retirada de kits" sub="Progresso ao vivo do balcão" />
        <div className="flex flex-col gap-[var(--spacing-4)]">
          <KpiProgresso
            rotulo="Kits entregues"
            valor={resumo.kitsEntregues}
            total={resumo.kitElegiveis}
            tom="success"
          />
          <KpiProgresso
            rotulo="Chips vinculados"
            valor={resumo.chipsVinculados}
            total={resumo.confirmados}
            tom="brand"
          />
          <Ritmo porHora={ritmo.porHora} ultimaHora={ritmo.ultimaHora} />
        </div>
      </section>

      {/* Card 2 · Alertas do balcão */}
      <section aria-label="Alertas do balcão" className={CARD}>
        <CardTitulo titulo="Alertas do balcão" sub="Pendências que exigem ação" />
        <div className="flex flex-col gap-[var(--spacing-2)]">
          {semPendencias ? (
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Sem pendências no balcão.
            </p>
          ) : (
            <>
              {resumo.pendentes > 0 && (
                <Alerta variant="alerta" rotulo="Retirada">
                  {formatInt(resumo.pendentes)} atleta(s) confirmados ainda sem retirada de kit.
                </Alerta>
              )}
              {chip.orfaos.length > 0 && (
                <Alerta variant="vulcao" rotulo="Chips">
                  {chip.orfaos.length === 1 ? (
                    <>
                      <strong className="text-[var(--text-primary)]">{chip.orfaos[0]}</strong>{' '}
                      retirou o kit mas o chip não foi vinculado.
                    </>
                  ) : (
                    <>{formatInt(chip.orfaos.length)} atletas retiraram o kit sem vincular o chip.</>
                  )}
                </Alerta>
              )}
              {estoque?.esgotado && (
                <Alerta variant="vulcao" rotulo="Estoque">
                  Chips esgotados: {formatInt(estoque.vinculados)} de {formatInt(estoque.total)} do
                  lote já vinculados.
                </Alerta>
              )}
              {estoque?.quaseEsgotado && (
                <Alerta variant="alerta" rotulo="Estoque">
                  Estoque baixo: restam {formatInt(estoque.disponiveis)} de {formatInt(estoque.total)}{' '}
                  chips do lote.
                </Alerta>
              )}
              {chip.foraDaFaixa.length > 0 && (
                <Alerta variant="vulcao" rotulo="Fora do lote">
                  {chip.foraDaFaixa.length === 1 ? (
                    <>
                      <strong className="text-[var(--text-primary)]">{chip.foraDaFaixa[0]}</strong>{' '}
                      usa um chip fora da faixa do evento.
                    </>
                  ) : (
                    <>
                      {formatInt(chip.foraDaFaixa.length)} atletas com chip vinculado fora da faixa do
                      evento.
                    </>
                  )}
                </Alerta>
              )}
            </>
          )}
        </div>
      </section>

      {/* Card 3 · Últimos atendimentos */}
      <section aria-label="Últimos atendimentos" className={CARD}>
        <CardTitulo titulo="Últimos atendimentos" sub="Presenças registradas nesta sessão" />
        {ultimos.length === 0 ? (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Nenhum atendimento ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-[var(--spacing-2)]">
            {ultimos.slice(0, 5).map((nome, i) => (
              <li
                key={`${nome}-${i}`}
                className="flex items-center justify-between gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
              >
                {nome}
                <Badge variant="vitoria">Presente</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Card 4 · Ações rápidas */}
      <section aria-label="Ações rápidas" className={CARD}>
        <CardTitulo titulo="Ações rápidas" sub="Operações auxiliares do balcão" />
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <Button variant="secondary" className="justify-start">
            Cadastrar atleta presencialmente
          </Button>
          <Button variant="ghost" className="justify-start">
            Imprimir lista completa
          </Button>
          <Button variant="ghost" className="justify-start">
            Exportar retiradas do dia
          </Button>
        </div>
      </section>
    </div>
  );
}

const CARD =
  'flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]';

function CardTitulo({ titulo, sub }: { titulo: string; sub: string }): JSX.Element {
  return (
    <header className="flex flex-col gap-[var(--spacing-1)]">
      <h4 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {titulo}
      </h4>
      <p className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">{sub}</p>
    </header>
  );
}

function KpiProgresso({
  rotulo,
  valor,
  total,
  tom,
}: {
  rotulo: string;
  valor: number;
  total: number;
  tom: 'success' | 'brand';
}): JSX.Element {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  const fill = tom === 'success' ? 'bg-[var(--text-success)]' : 'bg-[var(--text-brand)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <div className="flex items-baseline justify-between gap-[var(--spacing-2)]">
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          {rotulo}
        </span>
        <span className="text-[length:var(--font-size-sm)] tabular-nums text-[var(--text-primary)]">
          <strong className="font-[var(--font-weight-semibold)]">{formatInt(valor)}</strong>
          <span className="text-[var(--text-tertiary)]"> / {formatInt(total)}</span>
          <span className="ml-[var(--spacing-2)] text-[var(--text-tertiary)]">{pct}%</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={rotulo}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[var(--spacing-1)] overflow-hidden rounded-[var(--radius-pill)] bg-[var(--surface-high)]"
      >
        <div className={`h-full rounded-[var(--radius-pill)] ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Ritmo({ porHora, ultimaHora }: { porHora: number[]; ultimaHora: number }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <div className="flex items-baseline justify-between gap-[var(--spacing-2)]">
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">Ritmo</span>
        <span className="text-[length:var(--font-size-sm)] tabular-nums text-[var(--text-primary)]">
          <strong className="font-[var(--font-weight-semibold)]">{formatInt(ultimaHora)}</strong>
          <span className="text-[var(--text-tertiary)]"> atletas · última hora</span>
        </span>
      </div>
      <div className="text-[var(--text-brand)]">
        <Sparkline values={porHora} aria-label="Atendimentos por hora na última janela" />
      </div>
    </div>
  );
}

function Alerta({
  variant,
  rotulo,
  children,
}: {
  variant: 'alerta' | 'vulcao';
  rotulo: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-3)]">
      <Badge variant={variant}>{rotulo}</Badge>
      <span className="text-[length:var(--font-size-sm)] leading-snug text-[var(--text-secondary)]">
        {children}
      </span>
    </div>
  );
}

PainelOperacional.displayName = 'PainelOperacional';

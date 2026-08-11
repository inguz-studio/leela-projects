// =============================================================================
// MinhasAfiliacoesPage — `/clubes/minhas-afiliacoes` (R9-E · S-R9-11-T7/T8 ·
// RN-318/319, lado do INFLUENCIADOR). O clube-influenciador (dono do clube)
// ou o influenciador PF vê SÓ as PRÓPRIAS conversões — projeção fechada do
// reader (qtd/valor/instantes; nunca dado de outros compradores nem afiliado
// de terceiro). Funciona para qualquer conta logada (não exige claim de
// tenant): quem não tem afiliação vê EmptyState honesto.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  KpiCard,
  PageHeader,
  Skeleton,
  Table,
  useToast,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import { linkPromocional, MSG_SEM_LINK_PROMOCIONAL } from '../../../lib/linkPublico';
import {
  getMinhasAfiliacoes,
  type ConversaoProjetada,
  type MinhaAfiliacao,
} from '@leela/api-client';
import { ExtratoRepasses } from './_components/ExtratoRepasses';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(millis: number | null): string {
  if (millis === null) return '—';
  return new Date(millis).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CartaoAfiliacao({
  a,
  onCopiar,
}: {
  a: MinhaAfiliacao;
  onCopiar: (a: MinhaAfiliacao) => void;
}): JSX.Element {
  const gateFechado =
    a.minimoInscricoes !== null && a.conversoes < a.minimoInscricoes;
  // RN-318: comissão só existe quando o organizador a configurou p/ este link.
  const temComissao = a.comissao !== null;
  const devendo = a.saldoComissao < 0;
  const colunas: TableColumn<ConversaoProjetada>[] = [
    { key: 'quando', header: 'Confirmada em', render: (c) => formatData(c.convertidoEmMillis) },
    { key: 'inscricoes', header: 'Inscrições', align: 'right', render: (c) => String(c.qtdInscricoes) },
    { key: 'valor', header: 'Valor', align: 'right', render: (c) => formatBRL(c.valor) },
    ...(temComissao
      ? [{ key: 'comissao', header: 'Comissão', align: 'right' as const, render: (c: ConversaoProjetada) => formatBRL(c.comissao) }]
      : []),
  ];
  return (
    <article className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            {a.eventoNome}
          </h2>
          <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Seu link <code>?ref={a.refCodigo}</code> · janela {a.janelaAtribuicaoDias} dias
              {a.cupomCodigo !== null ? ` · cupom ${a.cupomCodigo}` : ''}
            </span>
            <Button
              variant="ghost"
              onClick={() => onCopiar(a)}
              aria-label={`Copiar link de indicação de ${a.eventoNome}`}
            >
              Copiar link
            </Button>
          </div>
        </div>
        {a.status === 'ativo' ? (
          <Badge variant="vitoria">Ativa</Badge>
        ) : (
          <Badge variant="neutro">{a.status === 'convite_pendente' ? 'Aguardando aceite' : 'Inativa'}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-3">
        <KpiCard label="Inscrições atribuídas" value={a.conversoes.toLocaleString('pt-BR')} />
        <KpiCard label="Valor atribuído (bruto)" value={formatBRL(a.valorAtribuido)} />
        {a.minimoInscricoes !== null ? (
          <KpiCard
            label="Desconto do cupom"
            value={gateFechado ? `${a.conversoes}/${a.minimoInscricoes}` : 'Ativo'}
            hint={gateFechado ? 'ativa ao atingir o mínimo (sem retroativo)' : 'mínimo atingido'}
          />
        ) : null}
      </div>

      {temComissao ? (
        <div className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-3">
          <KpiCard label="Comissão acumulada" value={formatBRL(a.comissaoAcumulada)} />
          <KpiCard label="Já repassada" value={formatBRL(a.comissaoRepassada)} />
          <KpiCard
            label="Saldo"
            value={`${formatBRL(a.saldoComissao)}${devendo ? ' (dívida)' : ''}`}
            hint={devendo ? 'estorno após repasse — saldo devedor' : 'a receber do organizador'}
          />
        </div>
      ) : null}

      {a.ultimasConversoes.length > 0 ? (
        <Table
          columns={colunas}
          data={a.ultimasConversoes}
          keyExtractor={(c) => `${a.refCodigo}-${c.convertidoEmMillis ?? 'sem-data'}-${c.valor}-${c.qtdInscricoes}`}
          caption={`Últimas conversões de ${a.eventoNome}`}
        />
      ) : (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nenhuma conversão confirmada ainda — compartilhe seu link.
        </p>
      )}

      {/* Cada parcial é um evento próprio, com valor e data (S705-T3 · RN-385)
          — o mesmo componente que o organizador vê do lado dele. */}
      {temComissao ? (
        <ExtratoRepasses
          repasses={a.ultimosRepasses}
          chaveBase={a.refCodigo}
          caption={`Repasses de ${a.eventoNome}`}
          titulo="Repasses que você recebeu"
        />
      ) : null}
    </article>
  );
}

/**
 * Resumo consolidado (o "meu negócio" do promotor cross-eventos) — soma os
 * agregados das PRÓPRIAS afiliações que o reader já devolveu (RN-318: nenhum
 * dado de terceiro entra na conta; a query server-side já é keyed no uid). É a
 * visão de hub do influenciador materializada por evolução da tela existente,
 * não por rota nova. `aReceber` soma só os saldos POSITIVOS — dívidas (estorno
 * pós-repasse) não abatem o que o organizador ainda deve, igual ao lado dele.
 */
function resumirAfiliacoes(afiliacoes: MinhaAfiliacao[]): {
  ativas: number;
  inscricoes: number;
  valor: number;
  temComissao: boolean;
  aReceber: number;
} {
  return {
    ativas: afiliacoes.filter((a) => a.status === 'ativo').length,
    inscricoes: afiliacoes.reduce((acc, a) => acc + a.conversoes, 0),
    valor: afiliacoes.reduce((acc, a) => acc + a.valorAtribuido, 0),
    temComissao: afiliacoes.some((a) => a.comissao !== null),
    aReceber: afiliacoes.reduce((acc, a) => acc + Math.max(0, a.saldoComissao), 0),
  };
}

export function MinhasAfiliacoesPage(): JSX.Element {
  const { toast } = useToast();
  const [afiliacoes, setAfiliacoes] = useState<MinhaAfiliacao[] | null>(null);
  const [erro, setErro] = useState<Error | null>(null);

  useEffect(() => {
    let vivo = true;
    getMinhasAfiliacoes()
      .then((r) => {
        if (vivo) setAfiliacoes(r.afiliacoes);
      })
      .catch((e) => {
        if (vivo) setErro(e instanceof Error ? e : new Error('falha'));
      });
    return () => {
      vivo = false;
    };
  }, []);

  const resumo = useMemo(
    () => resumirAfiliacoes(afiliacoes ?? []),
    [afiliacoes],
  );

  // "Qual link uso": com o eventoSlug projetado pelo reader (E08-PROMOTOR ·
  // T-extra TAMANHOS-GRADE), copia a URL COMPLETA do gerador ÚNICO do core
  // (S1215-T1 · RN-429) — a MESMA que a AfiliadosPage do organizador entrega,
  // agora com o cupom vinculado dentro quando existe.
  // Sem slug (função antiga em cache) ou sem base configurada, degrada para
  // copiar só o código: um link torto distribuído é pior que código nu.
  function copiarLink(a: MinhaAfiliacao): void {
    const slug = (a as { eventoSlug?: string }).eventoSlug ?? '';
    const link = slug.length > 0 ? linkPromocional(slug, a.refCodigo, a.cupomCodigo) : null;
    const valor = link ?? a.refCodigo;
    void navigator.clipboard
      .writeText(valor)
      .then(() =>
        toast({
          variant: 'success',
          title: link !== null ? 'Link copiado' : 'Código copiado',
          description:
            link !== null
              ? 'Divulgue este link — as inscrições ficam atribuídas a você.'
              : slug.length > 0
                ? MSG_SEM_LINK_PROMOCIONAL
                : `Use ?ref=${a.refCodigo} no link do evento`,
        }),
      )
      .catch(() => toast({ variant: 'danger', title: 'Não foi possível copiar' }));
  }

  const temAfiliacoes = (afiliacoes ?? []).length > 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      {/* D-1008-R8: frase de apoio cortada — KPIs e cartões dizem o que há; o
          recorte "só as suas conversões" segue garantido pela RN-318 (dado),
          não por aviso. */}
      {/* D-1008-R16: o menu secundário da área é da MOLDURA (ClubesAreaLayout). */}
      <PageHeader title="Minhas afiliações" />
      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {temAfiliacoes ? (
          <section
            aria-label="Resumo consolidado das suas afiliações"
            className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4"
          >
            <KpiCard label="Afiliações ativas" value={String(resumo.ativas)} />
            <KpiCard
              label="Inscrições no total"
              value={resumo.inscricoes.toLocaleString('pt-BR')}
              hint="somando seus eventos"
            />
            <KpiCard
              label="Valor total (bruto)"
              value={formatBRL(resumo.valor)}
              hint="antes de comissão"
            />
            {resumo.temComissao ? (
              <KpiCard
                label="Comissão a receber"
                value={formatBRL(resumo.aReceber)}
                hint="saldo somado (dívidas não abatem)"
              />
            ) : null}
          </section>
        ) : null}
        {afiliacoes === null && erro === null ? (
          <div role="status" aria-label="Carregando afiliações" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-40" />
            <Skeleton variant="rect" className="h-40" />
          </div>
        ) : erro !== null ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar suas afiliações. Tente novamente.
          </div>
        ) : (afiliacoes ?? []).length === 0 ? (
          <EmptyState
            title="Você ainda não tem afiliações"
            description="Quando um organizador criar um link de divulgação para você (ou para o seu clube), as conversões aparecem aqui."
          />
        ) : (
          (afiliacoes ?? []).map((a) => (
            <CartaoAfiliacao
              key={`${a.eventoId}:${a.refCodigo}`}
              a={a}
              onCopiar={copiarLink}
            />
          ))
        )}
      </div>
    </div>
  );
}

MinhasAfiliacoesPage.displayName = 'MinhasAfiliacoesPage';

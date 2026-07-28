// =============================================================================
// ComunicacaoView — aba Comunicação do evento (E06-L3 · consome FABLE-G-T1).
//
// JOB (Organizador · JTBD 04.2 "avisar todo mundo sem WhatsApp"): VER o
// histórico do que já foi enviado (log real) e DISPARAR comunicação nova.
// Nesta V1 há LEITURA real (∑ + timeline do log FABLE-G); o ENVIO ainda não
// tem callable (functions/src não expõe `enviarCampanha`/`enviarComunicacao`)
// → CTA DESABILITADO honesto (nunca um fluxo fabricado). Entra com E06 campanhas.
//
// PII (LGPD): o log FABLE-G já é PII-mínimo por construção — SEM corpo, nome ou
// e-mail; só assunto/canal/tipo/status + uma `ref` OPACA do destinatário. A
// superfície densa NÃO conta logs no cliente (contadores vêm do ∑) e mascara a
// ref (`mascararRef`, reuso do util de PII do slide-in). A identidade real e o
// status por pessoa vivem no slide-in `[com]` do inscrito, não aqui.
//
// Reuso-first: DS (Badge, Button, EmptyState, Skeleton) + helpers puros do _lib
// (format, pii). Presentational — o fetch (TanStack Query) vive no container.
// =============================================================================

import { Bell, Mail, Send } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton, type BadgeProps } from '@leela/design-system';
import {
  CANAIS_LOG_COMUNICACAO,
  TIPOS_LOG_COMUNICACAO,
  type CanalLogComunicacao,
  type LogComunicacao,
  type ResumoComunicacoes,
  type StatusLogComunicacao,
  type TipoDestinatarioComunicacao,
  type TipoLogComunicacao,
} from '@leela/core';
import { formatDataHoraCurta, formatInt } from '../_lib/format';
import { mascararRef } from '../_lib/pii';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const STATUS_LABEL: Record<StatusLogComunicacao, string> = {
  enfileirado: 'Enfileirado',
  enviado: 'Enviado',
  entregue: 'Entregue',
  aberto: 'Aberto',
  falhou: 'Falhou',
};

const STATUS_VARIANT: Record<StatusLogComunicacao, BadgeVariant> = {
  enfileirado: 'neutro',
  enviado: 'brand',
  entregue: 'heroico',
  aberto: 'vitoria',
  falhou: 'vulcao',
};

const TIPO_LABEL: Record<TipoLogComunicacao, string> = {
  ingresso: 'Ingresso',
  campanha: 'Campanha',
  transacional: 'Transacional',
};

const CANAL_LABEL: Record<CanalLogComunicacao, string> = {
  email: 'E-mail',
  push: 'Push',
};

const DESTINATARIO_LABEL: Record<TipoDestinatarioComunicacao, string> = {
  inscrito: 'Inscrito',
  membro: 'Membro',
  // S904-T3 (RN-342): notificação transacional ao organizador (abertura de
  // reembolso). O tipo entrou no kernel com o backend do Lote 1 (0ff90ee).
  organizador: 'Organizador',
  // S706-T1 (RN-386): avisos de repasse e de marco de comissão ao afiliado.
  afiliado: 'Influenciador',
};

export interface ComunicacaoViewProps {
  /** Agregado ∑ do evento (contadores); null = sem comunicação ainda. */
  resumo: ResumoComunicacoes | null;
  /** Timeline do log (recentes primeiro); null enquanto carrega/idle. */
  timeline: LogComunicacao[] | null;
  loading: boolean;
  error: Error | null;
  /** Há callable de envio? (agora true — E06 campanhas: CTA leva ao editor). */
  podeEnviar: boolean;
  /** Ação do CTA "Enviar comunicação" (abre o editor de campanha). */
  onEnviar?: () => void;
}

export function ComunicacaoView({
  resumo,
  timeline,
  loading,
  error,
  podeEnviar,
  onEnviar,
}: ComunicacaoViewProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <div className="flex items-start justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Comunicação
          </h2>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Histórico do que foi enviado aos inscritos, com status de entrega.
          </span>
        </div>
        <CtaEnviar podeEnviar={podeEnviar} {...(onEnviar ? { onEnviar } : {})} />
      </div>

      <Corpo resumo={resumo} timeline={timeline} loading={loading} error={error} />
    </div>
  );
}

/**
 * CTA de envio. Enquanto não há callable de envio (E06 campanhas), o botão fica
 * DESABILITADO com hint honesto — o mesmo padrão do estorno no slide-in `[pag]`
 * (botão desabilitado + hint), mais acessível que tooltip só-no-hover de um
 * controle desabilitado. `title` cobre o hover; o hint cobre teclado/leitor.
 */
function CtaEnviar({
  podeEnviar,
  onEnviar,
}: {
  podeEnviar: boolean;
  onEnviar?: () => void;
}): JSX.Element {
  const motivo = 'Envio de comunicação entra com as campanhas do evento (E06).';
  return (
    <div className="flex flex-col items-end gap-[var(--spacing-1)]">
      <Button
        variant="primary"
        disabled={!podeEnviar}
        title={podeEnviar ? undefined : motivo}
        {...(podeEnviar && onEnviar ? { onClick: onEnviar } : {})}
      >
        <Send aria-hidden className="size-4" />
        Enviar comunicação
      </Button>
      {!podeEnviar && (
        <span className="max-w-[28ch] text-right text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          {motivo}
        </span>
      )}
    </div>
  );
}

function Corpo({
  resumo,
  timeline,
  loading,
  error,
}: {
  resumo: ResumoComunicacoes | null;
  timeline: LogComunicacao[] | null;
  loading: boolean;
  error: Error | null;
}): JSX.Element {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando comunicação"
        className="flex flex-col gap-[var(--spacing-3)]"
      >
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
        Não foi possível carregar a comunicação deste evento.
      </p>
    );
  }

  // AUSÊNCIA honesta: sem ∑ ou ∑ zerado = nenhuma comunicação registrada.
  if (!resumo || resumo.total === 0) {
    return (
      <EmptyState
        title="Nenhuma comunicação enviada ainda"
        description="Quando você (ou o sistema) enviar e-mails e mensagens aos inscritos, o histórico com status de entrega aparece aqui."
      />
    );
  }

  const itens = timeline ?? [];

  return (
    <>
      <ResumoContadores resumo={resumo} />

      <section aria-label="Histórico de comunicações" className="flex flex-col gap-[var(--spacing-3)]">
        <div className="flex items-baseline justify-between gap-[var(--spacing-2)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Histórico
          </h3>
          {resumo.total > itens.length && (
            <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] [font-variant-numeric:tabular-nums]">
              {`Mostrando as ${formatInt(itens.length)} mais recentes de ${formatInt(resumo.total)}`}
            </span>
          )}
        </div>

        {itens.length > 0 ? (
          <ul className="flex flex-col gap-[var(--spacing-2)]">
            {itens.map((log) => (
              <LinhaComunicacao key={log.id} log={log} />
            ))}
          </ul>
        ) : (
          // ∑ > 0 mas a janela recente veio vazia (limite/timing) — honesto.
          <EmptyState
            title="Sem itens recentes para mostrar"
            description="O agregado registra comunicações, mas nenhuma entrou na janela recente carregada."
          />
        )}
      </section>
    </>
  );
}

/**
 * Contadores da aba — lidos SEMPRE do ∑ (nunca contados no cliente). Cabeçalho
 * com os 4 números que importam (total, entregues, abertos, falhas) + o
 * detalhamento por canal e por tipo.
 */
function ResumoContadores({ resumo }: { resumo: ResumoComunicacoes }): JSX.Element {
  return (
    <section aria-label="Resumo de comunicação" className="flex flex-col gap-[var(--spacing-4)]">
      <div className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4">
        <CardValor rotulo="Total enviado" valor={formatInt(resumo.total)} tom="primary" />
        <CardValor rotulo="Entregues" valor={formatInt(resumo.porStatus.entregue)} tom="primary" />
        <CardValor rotulo="Abertos" valor={formatInt(resumo.porStatus.aberto)} tom="success" />
        <CardValor rotulo="Falhas" valor={formatInt(resumo.porStatus.falhou)} tom="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-x-[var(--spacing-4)] gap-y-[var(--spacing-2)]">
        <LinhaBreakdown
          rotulo="Por canal"
          itens={CANAIS_LOG_COMUNICACAO.map((c) => ({
            chave: c,
            label: CANAL_LABEL[c],
            valor: resumo.porCanal[c],
          }))}
        />
        <LinhaBreakdown
          rotulo="Por tipo"
          itens={TIPOS_LOG_COMUNICACAO.map((t) => ({
            chave: t,
            label: TIPO_LABEL[t],
            valor: resumo.porTipo[t],
          }))}
        />
      </div>
    </section>
  );
}

function LinhaBreakdown({
  rotulo,
  itens,
}: {
  rotulo: string;
  itens: { chave: string; label: string; valor: number }[];
}): JSX.Element {
  return (
    <div className="flex items-center gap-[var(--spacing-2)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {rotulo}
      </span>
      <div className="flex flex-wrap gap-[var(--spacing-2)]">
        {itens.map((i) => (
          <Badge key={i.chave} variant="neutro">
            {`${i.label} ${formatInt(i.valor)}`}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/** Uma linha do histórico — assunto + canal/tipo + destinatário (ref mascarada) + status. */
function LinhaComunicacao({ log }: { log: LogComunicacao }): JSX.Element {
  const CanalIcon = log.canal === 'email' ? Mail : Bell;
  return (
    <li className="flex items-start gap-[var(--spacing-3)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-4)]">
      <span
        aria-hidden
        className="mt-[var(--spacing-1)] flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-sunken,var(--surface-base))] text-[var(--text-secondary)]"
      >
        <CanalIcon className="size-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-1)]">
        <span className="truncate text-[length:var(--font-size-base)] font-[var(--font-weight-medium)] text-[var(--text-primary)]">
          {log.assunto}
        </span>
        <div className="flex flex-wrap items-center gap-x-[var(--spacing-2)] gap-y-[var(--spacing-1)] text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          <span>{CANAL_LABEL[log.canal]}</span>
          <span aria-hidden>·</span>
          <span>{TIPO_LABEL[log.tipo]}</span>
          <span aria-hidden>·</span>
          <span>
            {DESTINATARIO_LABEL[log.destinatario.tipo]}{' '}
            <span className="font-mono">{mascararRef(log.destinatario.ref)}</span>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-[var(--spacing-1)]">
        <Badge variant={STATUS_VARIANT[log.status]}>{STATUS_LABEL[log.status]}</Badge>
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] [font-variant-numeric:tabular-nums]">
          {formatDataHoraCurta(log.enfileiradoEm)}
        </span>
      </div>
    </li>
  );
}

function CardValor({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom: 'primary' | 'success' | 'danger';
}): JSX.Element {
  const cor =
    tom === 'success'
      ? 'text-[var(--text-success)]'
      : tom === 'danger'
        ? 'text-[var(--text-danger)]'
        : 'text-[var(--text-primary)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {rotulo}
      </span>
      <span
        className={`text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] [font-variant-numeric:tabular-nums] ${cor}`}
      >
        {valor}
      </span>
    </div>
  );
}

ComunicacaoView.displayName = 'ComunicacaoView';

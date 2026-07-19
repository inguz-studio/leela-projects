// =============================================================================
// ComunicadoEditor — editor de comunicado (S109-T2 / SPEC §2.9). Layout 70/30:
// esquerda com 4 cards (identidade, segmentação, envio, revisão) e direita
// STICKY com preview Push/Email (tabs). Push trunca 160 chars (RN-134); email
// suporta capa (RN-135). Radio de agendamento revela data+hora. Validação via
// core (validarComunicado). Persistência por porta injetada.
// =============================================================================

import { useMemo, useState } from 'react';
import { Badge, Button, Chip, Input, RadioCard, RadioGroup, Tabs, useToast } from '@leela/design-system';
import type { TabItem } from '@leela/design-system';
import { DateField } from '@/components/fields/DateField';
import type {
  AgregadosSegmentacao,
  CanalComunicado,
  TipoSegmento,
} from '@leela/core';
import { PUSH_MAX_CHARS, segmentoDispensaReferencia } from '@leela/core';
import { canalLabel } from '../../_lib/comunicados';
import { formatInt } from '../../_lib/format';
import {
  buildSegmento,
  estimativaSegmento,
  previewComunicado,
  toggleCanalForm,
  validarComunicadoForm,
  VALORES_INICIAIS_COMUNICADO,
  type ComunicadoFormValues,
} from '../../_lib/comunicadoForm';

export interface ComunicadoEditorProps {
  modo: 'create' | 'edit';
  inicial?: ComunicadoFormValues | undefined;
  /** Agregados do club para estimar o alcance do segmento. */
  agregados: AgregadosSegmentacao;
  onSalvar: (values: ComunicadoFormValues, status: 'rascunho' | 'agendado') => void | Promise<void>;
  onCancelar: () => void;
}

const CANAIS: CanalComunicado[] = ['push', 'email'];
// Segmentos como cards de decisão (S109). design-principles (a): escolher para
// quem enviar é uma decisão que precisa de contexto (quem é cada segmento) →
// radio-card com descrição, não chip. Cada card revela seu sub-seletor
// (referência) só quando marcado — espelha o mockup Club-Comunicacao-Nova.
const SEGMENTOS: { id: TipoSegmento; label: string; descricao: string }[] = [
  { id: 'todos', label: 'Todos os membros', descricao: 'Toda a base ativa do clube recebe o comunicado.' },
  { id: 'novos_membros', label: 'Novos membros', descricao: 'Quem entrou nos últimos 7 dias (automação de boas-vindas).' },
  { id: 'por_desafio', label: 'Por desafio', descricao: 'Só os membros participantes de um desafio específico.' },
  { id: 'por_pilar', label: 'Por pilar', descricao: 'Membros cujo pilar mais praticado é o escolhido.' },
  { id: 'por_engajamento', label: 'Por engajamento', descricao: 'Membros ativos numa janela recente (7, 14 ou 30 dias).' },
];

/**
 * Rótulo do badge de contagem do card de segmento — só para os segmentos que
 * têm ∑ pronto: 'todos' (base ativa) e 'novos_membros' quando o agregado
 * `membrosNovos` já foi computado (senão o badge some e o alcance mostra "—",
 * ausência honesta — CONS-4-T2). null = sem badge.
 */
function badgeSegmento(id: TipoSegmento, agregados: AgregadosSegmentacao): string | null {
  if (id === 'todos') return `${formatInt(agregados.totalMembrosAtivos)} membros`;
  if (id === 'novos_membros' && agregados.membrosNovos !== undefined) {
    return `${formatInt(agregados.membrosNovos)} novos`;
  }
  return null;
}

function CardSecao({ titulo, children }: { titulo: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function ComunicadoEditor({
  modo,
  inicial,
  agregados,
  onSalvar,
  onCancelar,
}: ComunicadoEditorProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = useState<ComunicadoFormValues>(inicial ?? VALORES_INICIAIS_COMUNICADO);
  const [enviando, setEnviando] = useState(false);

  const erros = useMemo(() => validarComunicadoForm(values), [values]);
  const preview = useMemo(() => previewComunicado(values), [values]);
  const estimativa = useMemo(() => estimativaSegmento(values, agregados), [values, agregados]);
  const charCount = Array.from(values.conteudo).length;

  function patch(p: Partial<ComunicadoFormValues>): void {
    setValues((v) => ({ ...v, ...p }));
  }

  async function salvar(): Promise<void> {
    const status: 'rascunho' | 'agendado' = values.agendamento === 'agendar' ? 'agendado' : 'rascunho';
    const e = validarComunicadoForm(values);
    if (e.length > 0) {
      toast({ variant: 'danger', title: 'Revise o comunicado', description: e[0] ?? 'Há campos pendentes.' });
      return;
    }
    setEnviando(true);
    try {
      await onSalvar(values, status);
      toast({ variant: 'success', title: status === 'agendado' ? 'Comunicado agendado' : 'Comunicado salvo' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível salvar o comunicado' });
    } finally {
      setEnviando(false);
    }
  }

  const previewTabs: TabItem[] = [
    {
      id: 'push',
      label: 'Push',
      content: (
        <div className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-4)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {values.titulo.trim() || 'Título do push'}
          </span>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {preview.push || 'Corpo da notificação…'}
          </p>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
            {charCount}/{PUSH_MAX_CHARS} caracteres{preview.pushTruncado ? ' · truncado no push' : ''}
          </span>
        </div>
      ),
    },
    {
      id: 'email',
      label: 'Email',
      content: (
        <div className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-4)]">
          {preview.capaUrl ? (
            <div className="rounded-[var(--radius-sm)] bg-[var(--surface-overlay)] p-[var(--spacing-6)] text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Imagem de capa
            </div>
          ) : null}
          <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {values.titulo.trim() || 'Assunto do email'}
          </span>
          <p className="whitespace-pre-wrap text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {values.conteudo || 'Corpo do email — quebras de linha preservadas.'}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          {modo === 'edit' ? 'Editar comunicado' : 'Nova campanha'}
        </h1>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[7fr_3fr]">
        <form noValidate aria-label="Editor de comunicado" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-[var(--spacing-5)]">
          <CardSecao titulo="Identidade">
            <Input
              id="comunicado-titulo"
              label="Título"
              value={values.titulo}
              onChange={(e) => patch({ titulo: e.target.value })}
              placeholder="Treino especial de sábado"
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="comunicado-conteudo" className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                Conteúdo
              </label>
              <textarea
                id="comunicado-conteudo"
                rows={4}
                value={values.conteudo}
                onChange={(e) => patch({ conteudo: e.target.value })}
                className="w-full rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-base)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
              />
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
                {charCount} caracteres{values.canais.includes('push') ? ` · push corta em ${PUSH_MAX_CHARS}` : ''}
              </span>
            </div>
          </CardSecao>

          <CardSecao titulo="Segmentação">
            <RadioGroup
              name="comunicado-segmento"
              aria-label="Tipo de segmento"
              value={values.segmentoTipo}
              onValueChange={(v) => patch({ segmentoTipo: v as TipoSegmento })}
            >
              {SEGMENTOS.map((s) => {
                const badge = badgeSegmento(s.id, agregados);
                return (
                  <RadioCard
                    key={s.id}
                    value={s.id}
                    aria-label={s.label}
                    title={s.label}
                    description={s.descricao}
                    badge={badge ? <Badge variant="vitoria">{badge}</Badge> : undefined}
                  >
                    {!segmentoDispensaReferencia(s.id) ? (
                      <Input
                        id="comunicado-segmento-ref"
                        label="Referência do segmento"
                        value={values.segmentoRef}
                        onChange={(e) => patch({ segmentoRef: e.target.value })}
                        placeholder="id do desafio, pilar ou janela (7d/14d/30d)"
                      />
                    ) : null}
                  </RadioCard>
                );
              })}
            </RadioGroup>
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]" aria-live="polite">
              Alcance estimado: {estimativa !== null ? `${formatInt(estimativa)} membros` : '—'}
            </p>
          </CardSecao>

          <CardSecao titulo="Envio">
            <div className="flex flex-col gap-[var(--spacing-2)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Canais</span>
              <div role="group" aria-label="Canais" className="flex gap-[var(--spacing-2)]">
                {CANAIS.map((c) => (
                  <Chip key={c} active={values.canais.includes(c)} onClick={() => setValues((v) => toggleCanalForm(v, c))}>
                    {canalLabel(c)}
                  </Chip>
                ))}
              </div>
            </div>
            {values.canais.includes('email') ? (
              <Input
                id="comunicado-capa"
                label="Imagem de capa (só email — RN-135)"
                value={values.capaUrl}
                onChange={(e) => patch({ capaUrl: e.target.value })}
                placeholder="https://…"
              />
            ) : null}
            <div className="flex flex-col gap-[var(--spacing-2)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Quando enviar</span>
              <div role="radiogroup" aria-label="Agendamento" className="flex gap-[var(--spacing-2)]">
                <Chip active={values.agendamento === 'agora'} onClick={() => patch({ agendamento: 'agora' })}>
                  Salvar para envio
                </Chip>
                <Chip active={values.agendamento === 'agendar'} onClick={() => patch({ agendamento: 'agendar' })}>
                  Agendar
                </Chip>
              </div>
              {values.agendamento === 'agendar' ? (
                <div className="grid grid-cols-1 gap-[var(--spacing-3)] sm:grid-cols-2">
                  <DateField id="comunicado-data" label="Data" value={values.agendadoData} onChange={(agendadoData) => patch({ agendadoData })} />
                  <Input id="comunicado-hora" type="time" label="Hora" value={values.agendadoHora} onChange={(e) => patch({ agendadoHora: e.target.value })} />
                </div>
              ) : null}
            </div>
          </CardSecao>

          <CardSecao titulo="Revisão">
            {erros.length > 0 ? (
              <ul aria-label="Pendências do comunicado" className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
                {erros.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            ) : (
              <Badge variant="vitoria">Pronto para {values.agendamento === 'agendar' ? 'agendar' : 'salvar'}</Badge>
            )}
          </CardSecao>
        </form>

        <aside className="flex flex-col gap-[var(--spacing-4)] lg:sticky lg:top-[var(--spacing-6)] lg:self-start">
          <section aria-label="Prévia do comunicado" className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
            <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Prévia</h3>
            <Tabs tabs={previewTabs} aria-label="Prévia por canal" />
            <p className="flex flex-wrap gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              <span>{buildSegmento(values).tipo}</span>
              {preview.temPush ? <Badge variant="neutro">Push</Badge> : null}
              {preview.temEmail ? <Badge variant="neutro">Email</Badge> : null}
            </p>
          </section>

          <div className="flex flex-col gap-[var(--spacing-2)]">
            <Button variant="primary" disabled={enviando} onClick={() => void salvar()}>
              {enviando ? 'Salvando…' : values.agendamento === 'agendar' ? 'Agendar comunicado' : 'Salvar comunicado'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

ComunicadoEditor.displayName = 'ComunicadoEditor';

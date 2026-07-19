// =============================================================================
// DesafioEditor — editor de desafio (S106-T2). Layout 70/30: esquerda com 4
// cards (identidade, modelo, ações & metas, recompensa & visibilidade) e
// direita STICKY com resumo ao vivo + preview do card + dica contextual.
// Catálogo de 16 ações em tabs por pilar. Modelo dual (A/B/C) com campos
// condicionais; publicar valida via core (RN-110/111 — Modelo C exige mínimo
// nos 3 pilares). Marcar ação recalcula resumo + preview ao vivo (C16).
// =============================================================================

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Chip,
  Input,
  RadioCard,
  RadioGroup,
  Tabs,
  CardDesafio,
  useToast,
} from '@leela/design-system';
import type { TabItem } from '@leela/design-system';
import { DateField } from '@/components/fields/DateField';
import type {
  CatalogoAcao,
  ModeloDesafio,
  Pilar,
  RecompensaTipo,
  VisibilidadeDesafio,
} from '@leela/core';
import { CATALOGO_ACOES, PILARES, copyPreparacao } from '@leela/core';
import { modeloDesafioLabel, recompensaLabel } from '../../_lib/desafios';
import {
  buildAcoes,
  buildParaPublicar,
  resumoDesafio,
  setMetaAcao,
  toggleAcao,
  validarDesafioForm,
  VALORES_INICIAIS_DESAFIO,
  type DesafioFormValues,
} from '../../_lib/desafioForm';

export interface DesafioEditorProps {
  modo: 'create' | 'edit';
  inicial?: DesafioFormValues | undefined;
  catalogo?: readonly CatalogoAcao[];
  onPublicar: (values: DesafioFormValues) => void | Promise<void>;
  onSalvarRascunho: (values: DesafioFormValues) => void | Promise<void>;
  onCancelar: () => void;
}

const PILAR_LABEL: Record<Pilar, string> = {
  fisico: 'Físico',
  mental: 'Mental',
  espiritual: 'Espiritual',
};

const MODELOS: ModeloDesafio[] = ['A', 'B', 'C'];
const RECOMPENSAS: RecompensaTipo[] = ['medalha_digital', 'cupom', 'medalha_fisica', 'custom'];
const VISIBILIDADES: { id: VisibilidadeDesafio; label: string }[] = [
  { id: 'membros', label: 'Só membros' },
  { id: 'convite', label: 'Por convite' },
  { id: 'publico', label: 'Público' },
];

const DICA_MODELO: Record<ModeloDesafio, string> = {
  A: 'Cada ação selecionada precisa de uma meta própria. Ideal para desafios objetivos ("corra 100 km").',
  B: 'Uma meta total de pontos; o atleta mistura ações livremente até atingi-la.',
  C: 'Equilíbrio: meta total + mínimo em cada um dos 3 pilares. É a assinatura do produto (RN-111).',
};

// Metadados dos cards de decisão do MODELO (S106). design-principles (a): a
// escolha do modelo é uma decisão que precisa de contexto (o quê cada modelo é)
// → radio-card com título + descrição + selo, não chip. Ícone/descrição/selo
// espelham o mockup Club-Desafios-Editar.
const MODELO_META: Record<
  ModeloDesafio,
  { titulo: string; descricao: string; badge: JSX.Element; icon: JSX.Element }
> = {
  A: {
    titulo: 'Meta por ação',
    descricao: 'Cada ação tem sua meta. Concluir = bater todas as obrigatórias.',
    badge: <Badge variant="neutro">Mais simples</Badge>,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="h-full w-full">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  B: {
    titulo: 'Meta de pontos',
    descricao: 'Ações somam pontos. O membro bate uma meta total combinando o mix que quiser.',
    badge: <Badge variant="vitoria">Flexível</Badge>,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-full w-full">
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="21 12 21 7 16 7" />
      </svg>
    ),
  },
  C: {
    titulo: 'Equilíbrio mínimo',
    descricao: 'Meta total + mínimo em cada pilar. Único modelo que opera os 3 pilares da Be Hero.',
    badge: <Badge variant="heroico">Be Hero signature</Badge>,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-full w-full">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
};

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

export function DesafioEditor({
  modo,
  inicial,
  catalogo = CATALOGO_ACOES,
  onPublicar,
  onSalvarRascunho,
  onCancelar,
}: DesafioEditorProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = useState<DesafioFormValues>(inicial ?? VALORES_INICIAIS_DESAFIO);
  const [pilarAtivo, setPilarAtivo] = useState<Pilar>('fisico');
  const [enviando, setEnviando] = useState(false);
  const [errosPublicar, setErrosPublicar] = useState<string[]>([]);

  const resumo = useMemo(() => resumoDesafio(values, catalogo), [values, catalogo]);
  const errosAoVivo = useMemo(() => validarDesafioForm(values), [values]);

  function patch(p: Partial<DesafioFormValues>): void {
    setValues((v) => ({ ...v, ...p }));
  }

  async function submeter(
    fn: (v: DesafioFormValues) => void | Promise<void>,
    validar: boolean,
    okTitle: string,
  ): Promise<void> {
    if (validar) {
      const erros = validarDesafioForm(values);
      setErrosPublicar(erros);
      if (erros.length > 0) {
        toast({
          variant: 'danger',
          title: 'Revise o desafio antes de publicar',
          description: erros[0] ?? 'Há campos pendentes.',
        });
        return;
      }
    }
    setEnviando(true);
    try {
      await fn(values);
      toast({ variant: 'success', title: okTitle });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível salvar o desafio' });
    } finally {
      setEnviando(false);
    }
  }

  const previewNome = values.nome.trim() || 'Novo desafio';
  const prep = values.eventoVinculadoNome ? copyPreparacao(values.eventoVinculadoNome) : '';

  function catalogoTab(pilar: Pilar): TabItem {
    const doPilar = catalogo.filter((a) => a.pilar === pilar);
    return {
      id: pilar,
      label: `${PILAR_LABEL[pilar]} (${doPilar.length})`,
      content: (
        <ul className="flex flex-col gap-[var(--spacing-2)]">
          {doPilar.map((a) => {
            const sel = values.acoes[a.id];
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-[var(--spacing-3)]">
                <label className="flex flex-1 items-center gap-[var(--spacing-2)] text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={Boolean(sel)}
                    aria-label={`Selecionar ${a.nome}`}
                    onChange={() => setValues((v) => toggleAcao(v, a.id))}
                  />
                  <span>{a.nome}</span>
                  <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                    {a.pontosBase} pts / {a.unidadeBase} {a.unidade}
                  </span>
                </label>
                {sel && values.modelo === 'A' ? (
                  <Input
                    type="number"
                    inputMode="numeric"
                    aria-label={`Meta de ${a.nome}`}
                    value={sel.meta}
                    onChange={(e) => setValues((v) => setMetaAcao(v, a.id, e.target.value))}
                    placeholder="meta"
                    wrapperClassName="w-28"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ),
    };
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          {modo === 'edit' ? 'Editar desafio' : 'Novo desafio'}
        </h1>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[7fr_3fr]">
        {/* Coluna 70% — cards do formulário */}
        <form
          noValidate
          aria-label="Editor de desafio"
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-[var(--spacing-5)]"
        >
          <CardSecao titulo="Identidade">
            <Input
              id="desafio-nome"
              label="Nome do desafio"
              value={values.nome}
              onChange={(e) => patch({ nome: e.target.value })}
              placeholder="Desafio 21 dias de constância"
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="desafio-descricao" className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                Descrição
              </label>
              <textarea
                id="desafio-descricao"
                rows={2}
                value={values.descricao}
                onChange={(e) => patch({ descricao: e.target.value })}
                className="w-full rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-base)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
              />
            </div>
            <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
              <DateField id="desafio-inicio" label="Início" value={values.dataInicio} onChange={(dataInicio) => patch({ dataInicio })} />
              <DateField id="desafio-fim" label="Término" value={values.dataFim} onChange={(dataFim) => patch({ dataFim })} />
            </div>
            <Input
              id="desafio-evento"
              label="Vincular a um evento (opcional)"
              value={values.eventoVinculadoNome ?? ''}
              onChange={(e) => patch({ eventoVinculadoNome: e.target.value })}
              placeholder="Meia Maratona Floripa 2026"
            />
          </CardSecao>

          <CardSecao titulo="Modelo de conclusão">
            <RadioGroup
              name="desafio-modelo"
              aria-label="Modelo de conclusão"
              value={values.modelo}
              onValueChange={(v) => patch({ modelo: v as ModeloDesafio })}
            >
              {MODELOS.map((m) => (
                <RadioCard
                  key={m}
                  value={m}
                  aria-label={`Modelo ${m} · ${MODELO_META[m].titulo}`}
                  title={MODELO_META[m].titulo}
                  description={MODELO_META[m].descricao}
                  icon={MODELO_META[m].icon}
                  badge={MODELO_META[m].badge}
                />
              ))}
            </RadioGroup>
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{DICA_MODELO[values.modelo]}</p>

            {values.modelo !== 'A' ? (
              <Input
                id="desafio-meta-total"
                type="number"
                inputMode="numeric"
                label="Meta total de pontos"
                value={values.metaTotalPontos}
                onChange={(e) => patch({ metaTotalPontos: e.target.value })}
                placeholder="1000"
              />
            ) : null}

            {values.modelo === 'C' ? (
              <fieldset className="flex flex-col gap-[var(--spacing-2)]">
                <legend className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                  Mínimo por pilar (RN-111)
                </legend>
                <div className="grid grid-cols-1 gap-[var(--spacing-3)] sm:grid-cols-3">
                  {PILARES.map((p) => (
                    <Input
                      key={p}
                      id={`desafio-minimo-${p}`}
                      type="number"
                      inputMode="numeric"
                      label={PILAR_LABEL[p]}
                      value={values.minimoPorPilar[p]}
                      onChange={(e) => patch({ minimoPorPilar: { ...values.minimoPorPilar, [p]: e.target.value } })}
                      placeholder="mín."
                    />
                  ))}
                </div>
              </fieldset>
            ) : null}
          </CardSecao>

          <CardSecao titulo="Ações & metas">
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Selecione as ações do catálogo (16 no total, 3 pilares). {values.modelo === 'A' ? 'No Modelo A cada ação exige uma meta.' : ''}
            </p>
            <Tabs
              tabs={PILARES.map(catalogoTab)}
              value={pilarAtivo}
              onValueChange={(id) => setPilarAtivo(id as Pilar)}
              aria-label="Catálogo de ações por pilar"
            />
          </CardSecao>

          <CardSecao titulo="Recompensa & visibilidade">
            <div className="flex flex-col gap-[var(--spacing-2)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Recompensa</span>
              <div role="group" aria-label="Tipo de recompensa" className="flex flex-wrap gap-[var(--spacing-2)]">
                {RECOMPENSAS.map((r) => (
                  <Chip key={r} active={values.recompensaTipo === r} onClick={() => patch({ recompensaTipo: r })}>
                    {recompensaLabel(r)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-[var(--spacing-2)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Visibilidade</span>
              <div role="group" aria-label="Visibilidade" className="flex flex-wrap gap-[var(--spacing-2)]">
                {VISIBILIDADES.map((v) => (
                  <Chip key={v.id} active={values.visibilidade === v.id} onClick={() => patch({ visibilidade: v.id })}>
                    {v.label}
                  </Chip>
                ))}
              </div>
            </div>
          </CardSecao>
        </form>

        {/* Coluna 30% — resumo + preview + dica (sticky) */}
        <aside className="flex flex-col gap-[var(--spacing-4)] lg:sticky lg:top-[var(--spacing-6)] lg:self-start">
          <section aria-label="Resumo do desafio" className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
            <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Resumo ao vivo</h3>
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]" aria-live="polite">
              {resumo.totalAcoes} ação(ões) · {PILARES.map((p) => `${PILAR_LABEL[p]} ${resumo.porPilar[p]}`).join(' · ')}
            </p>
            {values.modelo === 'C' ? (
              <Badge variant={resumo.cobreTresPilares ? 'vitoria' : 'alerta'}>
                {resumo.cobreTresPilares ? '3 pilares cobertos' : 'Cubra os 3 pilares'}
              </Badge>
            ) : null}
            {errosAoVivo.length > 0 ? (
              <ul aria-label="Pendências para publicar" className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
                {errosAoVivo.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            ) : (
              <Badge variant="vitoria">Pronto para publicar</Badge>
            )}
          </section>

          <section aria-label="Prévia do card no app" className="flex flex-col gap-[var(--spacing-2)]">
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">Prévia no app</span>
            <CardDesafio
              title={prep ? `${previewNome} ${prep}` : previewNome}
              progress={0}
              meta={
                <span className="flex flex-wrap items-center gap-[var(--spacing-2)]">
                  <span>{modeloDesafioLabel(values.modelo)}</span>
                  <span aria-hidden>·</span>
                  <span>{recompensaLabel(values.recompensaTipo)}</span>
                </span>
              }
            />
          </section>

          {errosPublicar.length > 0 ? (
            <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
              {errosPublicar[0]}
            </p>
          ) : null}

          <div className="flex flex-col gap-[var(--spacing-2)]">
            <Button
              variant="primary"
              disabled={enviando}
              onClick={() => void submeter(onPublicar, true, 'Desafio publicado')}
            >
              {enviando ? 'Salvando…' : 'Publicar desafio'}
            </Button>
            <Button
              variant="secondary"
              disabled={enviando}
              onClick={() => void submeter(onSalvarRascunho, false, 'Rascunho salvo')}
            >
              Salvar rascunho
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

DesafioEditor.displayName = 'DesafioEditor';

/** Reexport para o container montar o payload real. */
export { buildAcoes, buildParaPublicar };

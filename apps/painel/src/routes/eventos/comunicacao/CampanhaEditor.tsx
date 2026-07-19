// =============================================================================
// CampanhaEditor — editor "Nova campanha" do evento (S401-T3 · E06-L3). Layout
// 70/30: à esquerda 4 cards (identidade, segmentação, envio, revisão), à direita
// STICKY o preview Push/E-mail. Push trunca 160 (RN-134, `truncarPush`); e-mail
// suporta capa (RN-135). Estimativa de alcance AO VIVO via callable
// `estimarAlcance` (debounced a cada troca de segmento — item 8 do brief).
// Envio via `enviarCampanha` com estados HONESTOS (cota RN-133 → limite_push;
// segmento sem inscritos → não envia). Persistência/estimativa por portas
// injetadas (testável sem Firebase).
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Chip,
  Input,
  RadioCard,
  RadioGroup,
  Select,
  Switch,
  Tabs,
  Textarea,
  useToast,
  type SelectOption,
  type TabItem,
} from '@leela/design-system';
import { DateField } from '@/components/fields/DateField';
import type {
  CanalCampanha,
  SegmentoCampanha,
  TipoSegmentoCampanha,
} from '@leela/core';
import {
  KITS_INSCRITO,
  PUSH_MAX_CHARS,
  PUSH_SEMANA_MAX,
  STATUS_INSCRITO,
  contarChars,
} from '@leela/core';
import type { EnviarCampanhaResult } from '@leela/api-client';
import { canalCampanhaLabel } from '../_lib/campanhas';
import { kitInscritoLabel } from '../_lib/kitLabels';
import { statusInscritoBadge } from '../_lib/statusInscrito';
import { formatInt } from '../_lib/format';
import {
  previewCampanha,
  toggleCanalForm,
  validarCampanhaForm,
  VALORES_INICIAIS_CAMPANHA,
  type CampanhaFormValues,
} from '../_lib/campanhaForm';

/** Intenção de persistência de rascunho/agendamento (envio é caminho próprio). */
export type SalvarCampanhaIntent = 'rascunho' | 'agendar';

export interface CampanhaEditorProps {
  modo: 'create' | 'edit';
  inicial?: CampanhaFormValues | undefined;
  /** Estimativa ao vivo (count() no servidor) — debounced pela tela. */
  onEstimar: (segmento: Pick<SegmentoCampanha, 'tipo' | 'referencia'>) => Promise<number>;
  /** Persiste rascunho/agendado (write direto — Rules-guarded). Navega ao concluir. */
  onSalvar: (values: CampanhaFormValues, intent: SalvarCampanhaIntent) => Promise<void>;
  /** Salva + dispara (callable). Navega SÓ no sucesso; bloqueios voltam ao editor. */
  onEnviar: (values: CampanhaFormValues) => Promise<EnviarCampanhaResult>;
  onCancelar: () => void;
}

const CANAIS: CanalCampanha[] = ['push', 'email'];

interface SegmentoDef {
  id: TipoSegmentoCampanha;
  label: string;
  descricao: string;
}

const SEGMENTOS: SegmentoDef[] = [
  { id: 'todos_inscritos', label: 'Todos os inscritos', descricao: 'Toda a base não cancelada do evento recebe a campanha.' },
  { id: 'por_modalidade', label: 'Por modalidade', descricao: 'Só os inscritos de um percurso (ex.: 5k, 10k, 21k).' },
  { id: 'por_kit', label: 'Por kit', descricao: 'Só os inscritos de um kit específico.' },
  { id: 'por_status', label: 'Por status', descricao: 'Inscritos num status específico (confirmado, pendente…).' },
];

const KIT_OPCOES: SelectOption[] = KITS_INSCRITO.map((k) => ({
  value: k,
  label: kitInscritoLabel(k),
}));

const STATUS_OPCOES: SelectOption[] = STATUS_INSCRITO.map((s) => ({
  value: s,
  label: statusInscritoBadge(s).label,
}));

type Estimativa =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; valor: number }
  | { status: 'erro' };

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

export function CampanhaEditor({
  modo,
  inicial,
  onEstimar,
  onSalvar,
  onEnviar,
  onCancelar,
}: CampanhaEditorProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = useState<CampanhaFormValues>(inicial ?? VALORES_INICIAIS_CAMPANHA);
  const [salvando, setSalvando] = useState(false);
  const [estimativa, setEstimativa] = useState<Estimativa>({ status: 'idle' });

  const erros = useMemo(() => validarCampanhaForm(values), [values]);
  const preview = useMemo(() => previewCampanha(values), [values]);
  const charCount = contarChars(values.conteudo);

  const { segmentoTipo, segmentoRef } = values;
  const refPreenchida = segmentoTipo === 'todos_inscritos' || segmentoRef.trim() !== '';

  // Estimativa ao vivo: debounce 400ms + guarda contra respostas obsoletas
  // (item 8: round-trip de callable, o evento não mantém agregados como o clube).
  const pedidoRef = useRef(0);
  useEffect(() => {
    if (!refPreenchida) {
      setEstimativa({ status: 'idle' });
      return;
    }
    const id = ++pedidoRef.current;
    setEstimativa({ status: 'loading' });
    const segmento: Pick<SegmentoCampanha, 'tipo' | 'referencia'> =
      segmentoTipo === 'todos_inscritos'
        ? { tipo: segmentoTipo }
        : { tipo: segmentoTipo, referencia: segmentoRef.trim() };
    const timer = setTimeout(() => {
      onEstimar(segmento)
        .then((valor) => {
          if (pedidoRef.current === id) setEstimativa({ status: 'ok', valor });
        })
        .catch(() => {
          if (pedidoRef.current === id) setEstimativa({ status: 'erro' });
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [segmentoTipo, segmentoRef, refPreenchida, onEstimar]);

  const segmentoVazio = estimativa.status === 'ok' && estimativa.valor === 0;

  function patch(p: Partial<CampanhaFormValues>): void {
    setValues((v) => ({ ...v, ...p }));
  }

  function estimativaTexto(): string {
    switch (estimativa.status) {
      case 'loading':
        return 'calculando…';
      case 'ok':
        return `${formatInt(estimativa.valor)} inscritos`;
      case 'erro':
        return 'não foi possível estimar';
      default:
        return '—';
    }
  }

  async function salvarRascunhoOuAgendar(): Promise<void> {
    const intent: SalvarCampanhaIntent = values.quando === 'agendar' ? 'agendar' : 'rascunho';
    const e = validarCampanhaForm(values);
    if (e.length > 0) {
      toast({ variant: 'danger', title: 'Revise a campanha', description: e[0] ?? 'Há campos pendentes.' });
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(values, intent);
      toast({ variant: 'success', title: intent === 'agendar' ? 'Campanha agendada' : 'Rascunho salvo' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível salvar a campanha' });
    } finally {
      setSalvando(false);
    }
  }

  async function enviarAgora(): Promise<void> {
    const e = validarCampanhaForm(values);
    if (e.length > 0) {
      toast({ variant: 'danger', title: 'Revise a campanha', description: e[0] ?? 'Há campos pendentes.' });
      return;
    }
    setSalvando(true);
    try {
      const r = await onEnviar(values);
      if ('ok' in r) {
        toast({
          variant: 'success',
          title: r.jaEnviada ? 'Campanha já enviada' : 'Campanha enviada',
          ...(r.jaEnviada ? {} : { description: `${formatInt(r.alcance)} inscritos alcançados` }),
        });
      } else if (r.bloqueado === 'limite_push') {
        toast({
          variant: 'danger',
          title: `Limite de ${PUSH_SEMANA_MAX} pushes por semana atingido`,
          description: `Já foram ${formatInt(r.pushNaJanela)} nos últimos 7 dias. A campanha ficou como rascunho — envie por e-mail ou aguarde a janela liberar.`,
        });
      } else {
        toast({
          variant: 'danger',
          title: 'Segmento sem inscritos',
          description: 'Nenhum inscrito neste segmento — a campanha não foi enviada.',
        });
      }
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível enviar a campanha' });
    } finally {
      setSalvando(false);
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
      label: 'E-mail',
      content: (
        <div className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-4)]">
          {preview.capaUrl ? (
            <div className="rounded-[var(--radius-sm)] bg-[var(--surface-overlay)] p-[var(--spacing-6)] text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Imagem de capa
            </div>
          ) : null}
          <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {values.titulo.trim() || 'Assunto do e-mail'}
          </span>
          <p className="whitespace-pre-wrap text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {values.conteudo || 'Corpo do e-mail — quebras de linha preservadas.'}
          </p>
        </div>
      ),
    },
  ];

  const primarioLabel = values.quando === 'agendar' ? 'Agendar campanha' : 'Enviar agora';
  const enviarDesabilitado = salvando || (values.quando === 'agora' && segmentoVazio);

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          {modo === 'edit' ? 'Editar campanha' : 'Nova campanha'}
        </h1>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[7fr_3fr]">
        <form
          noValidate
          aria-label="Editor de campanha"
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-[var(--spacing-5)]"
        >
          <CardSecao titulo="Identidade">
            <Input
              id="campanha-titulo"
              label="Título"
              value={values.titulo}
              onChange={(e) => patch({ titulo: e.target.value })}
              placeholder="Seu kit está pronto para retirada"
            />
            <div className="flex flex-col gap-1">
              <Textarea
                id="campanha-conteudo"
                label="Conteúdo"
                rows={4}
                value={values.conteudo}
                onChange={(e) => patch({ conteudo: e.target.value })}
              />
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
                {charCount} caracteres
                {values.canais.includes('push') ? ` · push corta em ${PUSH_MAX_CHARS}` : ''}
                {values.canais.includes('push') && preview.pushTruncado ? ' (será truncado)' : ''}
              </span>
            </div>
          </CardSecao>

          <CardSecao titulo="Segmentação">
            <RadioGroup
              name="campanha-segmento"
              aria-label="Tipo de segmento"
              value={values.segmentoTipo}
              onValueChange={(v) => patch({ segmentoTipo: v as TipoSegmentoCampanha, segmentoRef: '' })}
            >
              {SEGMENTOS.map((s) => (
                <RadioCard key={s.id} value={s.id} aria-label={s.label} title={s.label} description={s.descricao}>
                  {s.id === 'por_modalidade' ? (
                    <Input
                      id="campanha-segmento-modalidade"
                      label="Modalidade"
                      value={values.segmentoRef}
                      onChange={(e) => patch({ segmentoRef: e.target.value })}
                      placeholder="ex.: 21k"
                    />
                  ) : null}
                  {s.id === 'por_kit' ? (
                    <Select
                      id="campanha-segmento-kit"
                      label="Kit"
                      value={values.segmentoRef}
                      onChange={(e) => patch({ segmentoRef: e.target.value })}
                      options={[{ value: '', label: 'Selecione um kit' }, ...KIT_OPCOES]}
                    />
                  ) : null}
                  {s.id === 'por_status' ? (
                    <Select
                      id="campanha-segmento-status"
                      label="Status do inscrito"
                      value={values.segmentoRef}
                      onChange={(e) => patch({ segmentoRef: e.target.value })}
                      options={[{ value: '', label: 'Selecione um status' }, ...STATUS_OPCOES]}
                    />
                  ) : null}
                </RadioCard>
              ))}
            </RadioGroup>
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]" aria-live="polite">
              Alcance estimado: {estimativaTexto()}
            </p>
          </CardSecao>

          <CardSecao titulo="Envio">
            <div className="flex flex-col gap-[var(--spacing-2)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Canais</span>
              <div role="group" aria-label="Canais" className="flex gap-[var(--spacing-2)]">
                {CANAIS.map((c) => (
                  <Chip key={c} active={values.canais.includes(c)} onClick={() => setValues((v) => toggleCanalForm(v, c))}>
                    {canalCampanhaLabel(c)}
                  </Chip>
                ))}
              </div>
            </div>
            {values.canais.includes('email') ? (
              <Input
                id="campanha-capa"
                label="Imagem de capa (só e-mail — RN-135)"
                value={values.capaUrl}
                onChange={(e) => patch({ capaUrl: e.target.value })}
                placeholder="https://…"
              />
            ) : null}
            <div className="flex flex-col gap-[var(--spacing-2)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Quando enviar</span>
              <div role="radiogroup" aria-label="Quando enviar" className="flex gap-[var(--spacing-2)]">
                <Chip active={values.quando === 'agora'} onClick={() => patch({ quando: 'agora' })}>
                  Agora
                </Chip>
                <Chip active={values.quando === 'agendar'} onClick={() => patch({ quando: 'agendar' })}>
                  Agendar
                </Chip>
              </div>
              {values.quando === 'agendar' ? (
                <>
                  <div className="grid grid-cols-1 gap-[var(--spacing-3)] sm:grid-cols-2">
                    <DateField id="campanha-data" label="Data" value={values.agendadoData} onChange={(agendadoData) => patch({ agendadoData })} />
                    <Input id="campanha-hora" type="time" label="Hora" value={values.agendadoHora} onChange={(e) => patch({ agendadoHora: e.target.value })} />
                  </div>
                  {/* S402-T2 · automação de disparo. Estado HONESTO: o gate real
                      do envio é o envelope transacional do backend (S402-T1
                      ainda não landou a subcoleção `automacoes`/flag PODE_ENVIAR)
                      — a UI NÃO promete envio automático. Toggle desabilitado +
                      "Em breve", mesmo padrão das seções sem persistência V1. */}
                  <fieldset className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-4)]">
                    <legend className="flex items-center gap-[var(--spacing-2)] px-[var(--spacing-1)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                      Automação de disparo
                      <Badge variant="neutro">Em breve</Badge>
                    </legend>
                    <Switch
                      id="campanha-automacao"
                      label="Disparar automaticamente no horário agendado"
                      description="Quando ligar, o sistema envia a campanha no horário — sem clique manual."
                      checked={false}
                      disabled
                      onCheckedChange={() => {}}
                    />
                    <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                      O disparo automático NESTE horário agendado ainda é decidido pelo servidor — a tela
                      não promete envio automático. Para automação por GATILHO (novo inscrito, véspera,
                      pós-evento), use a aba Comunicação › Automações.
                    </span>
                  </fieldset>
                </>
              ) : null}
            </div>
          </CardSecao>

          <CardSecao titulo="Revisão">
            {erros.length > 0 ? (
              <ul aria-label="Pendências da campanha" className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
                {erros.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            ) : segmentoVazio && values.quando === 'agora' ? (
              <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
                Este segmento não tem inscritos — nada a enviar. Ajuste o segmento ou salve como rascunho.
              </p>
            ) : (
              <Badge variant="vitoria">Pronto para {values.quando === 'agendar' ? 'agendar' : 'enviar'}</Badge>
            )}
          </CardSecao>
        </form>

        <aside className="flex flex-col gap-[var(--spacing-4)] lg:sticky lg:top-[var(--spacing-6)] lg:self-start">
          <section aria-label="Prévia da campanha" className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
            <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Prévia</h3>
            <Tabs tabs={previewTabs} aria-label="Prévia por canal" />
            <p className="flex flex-wrap items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {preview.temPush ? <Badge variant="neutro">Push</Badge> : null}
              {preview.temEmail ? <Badge variant="neutro">E-mail</Badge> : null}
            </p>
          </section>

          <div className="flex flex-col gap-[var(--spacing-2)]">
            <Button variant="primary" disabled={enviarDesabilitado} onClick={() => void (values.quando === 'agendar' ? salvarRascunhoOuAgendar() : enviarAgora())}>
              {salvando ? 'Enviando…' : primarioLabel}
            </Button>
            {values.quando === 'agora' ? (
              <Button variant="ghost" disabled={salvando} onClick={() => void salvarRascunhoOuAgendar()}>
                Salvar rascunho
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

CampanhaEditor.displayName = 'CampanhaEditor';

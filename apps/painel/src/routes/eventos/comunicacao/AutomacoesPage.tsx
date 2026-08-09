// =============================================================================
// AutomacoesPage (`/eventos/:slug/comunicacao/automacoes`) — comunicação por
// GATILHO (E06 · S402). CRUD/toggle por escrita DIRETA Rules-guarded; o DISPARO
// é EXCLUSIVO das Functions (trigger novo_inscrito + cron), que reusam o
// pipeline único de envio. Estado HONESTO: pausar NÃO dispara, e o gate real do
// envio (cota RN-133, tenant suspenso) fica no servidor — a tela não promete
// envio, só configura a regra.
//
// Uma automação amarra um GATILHO a uma CAMPANHA-MODELO do evento (templateRef —
// RN-132). Sem campanhas, a tela direciona a criar uma antes (dependência real).
// =============================================================================

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Badge,
  Button,
  Chip,
  ConfirmModal,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Switch,
  useToast,
  type SelectOption,
} from '@leela/design-system';
import {
  alternarAutomacao,
  getLeelaDb,
  listarAutomacoes,
  listarCampanhas,
  removerAutomacao,
  salvarAutomacao,
} from '@leela/api-client';
import {
  GATILHOS_AUTOMACAO,
  type Automacao,
  type Campanha,
  type CanalCampanha,
} from '@leela/core';
import type { EventoOutletContext } from '../evento/EventoLayout';
import { mensagemDeContagem } from '../../../lib/mensagemDoParser';
import { canalCampanhaLabel } from '../_lib/campanhas';
import {
  AUTOMACAO_VALORES_INICIAIS,
  gatilhoDescricao,
  gatilhoLabel,
  gatilhoUsaOffset,
  paraAutomacaoInput,
  toggleCanal,
  validarAutomacaoForm,
  type AutomacaoFormValues,
} from './_lib/automacaoForm';

const CANAIS: CanalCampanha[] = ['push', 'email'];
const SECAO =
  'flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]';

function mensagemErro(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) {
    return 'Você não tem permissão para gerir automações neste evento.';
  }
  if (code.includes('failed-precondition')) {
    return 'Não foi possível salvar — verifique se o organizador está ativo.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

/**
 * Estado exibido do card (RN-136 · decisão 17). `vencido` = gatilho PONTUAL de
 * relógio (véspera/pós) que perdeu a janela: o cron DESATIVOU (`ativa=false` +
 * `vencidoEm`) — terminal, não dispara. "Vencida" é rótulo de UI. @pure
 */
function estadoAutomacao(a: Automacao): { label: string; variant: 'vitoria' | 'neutro' | 'vulcao' } {
  if (a.ativa) return { label: 'Ativa', variant: 'vitoria' };
  if (a.vencidoEm) return { label: 'Vencida', variant: 'vulcao' };
  return { label: 'Pausada', variant: 'neutro' };
}

export function AutomacoesPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [values, setValues] = useState<AutomacaoFormValues>(AUTOMACAO_VALORES_INICIAIS);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [alvoRemocao, setAlvoRemocao] = useState<Automacao | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const db = getLeelaDb();
      const [autos, camps] = await Promise.all([
        listarAutomacoes(db, evento.id),
        listarCampanhas(db, evento.id),
      ]);
      setAutomacoes(autos);
      setCampanhas(camps);
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setLoading(false);
    }
  }, [evento.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const templateOpcoes: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Selecione uma campanha-modelo' },
      ...campanhas.map((c) => ({ value: c.id, label: `${c.titulo} (${c.status})` })),
    ],
    [campanhas]
  );

  const nomeTemplate = useCallback(
    (ref: string) => campanhas.find((c) => c.id === ref)?.titulo ?? ref,
    [campanhas]
  );

  const gatilhoOpcoes: SelectOption[] = GATILHOS_AUTOMACAO.map((g) => ({
    value: g,
    label: gatilhoLabel(g),
  }));

  const erros = useMemo(() => validarAutomacaoForm(values), [values]);
  const podeSalvar = erros.length === 0 && !salvando && campanhas.length > 0;

  // PARSE-1: o intervalo é campo de contagem e não tinha mensagem nenhuma.
  // Texto ilegível some do payload (`paraAutomacaoInput` só copia o que leu) e
  // a automação salva com as vinte e quatro horas padrão, calada — RS1-22. A
  // frase do parser passa a aparecer; o campo em branco fala pela dica, que diz
  // o que acontece, porque a decisão foi AVISAR e não recusar.
  const erroOffset = gatilhoUsaOffset(values.gatilho)
    ? mensagemDeContagem(values.offsetHoras)
    : null;

  function set<K extends keyof AutomacaoFormValues>(campo: K, valor: AutomacaoFormValues[K]): void {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function iniciarEdicao(a: Automacao): void {
    setEditandoId(a.id);
    setValues({
      gatilho: a.gatilho,
      templateRef: a.templateRef,
      canal: a.canal,
      ativa: a.ativa,
      offsetHoras: String(a.offsetHoras ?? AUTOMACAO_VALORES_INICIAIS.offsetHoras),
    });
  }

  function cancelarEdicao(): void {
    setEditandoId(null);
    setValues(AUTOMACAO_VALORES_INICIAIS);
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await salvarAutomacao(
        getLeelaDb(),
        evento.id,
        { ...paraAutomacaoInput(values), tenantId: evento.tenantId },
        editandoId ?? undefined
      );
      toast({ variant: 'success', title: editandoId ? 'Automação atualizada' : 'Automação criada' });
      cancelarEdicao();
      await carregar();
    } catch (err) {
      toast({ variant: 'danger', title: mensagemErro(err) });
    } finally {
      setSalvando(false);
    }
  }

  async function toggle(a: Automacao): Promise<void> {
    try {
      await alternarAutomacao(getLeelaDb(), evento.id, a.id, !a.ativa);
      await carregar();
    } catch (err) {
      toast({ variant: 'danger', title: mensagemErro(err) });
    }
  }

  async function confirmarRemocao(): Promise<void> {
    if (!alvoRemocao) return;
    try {
      await removerAutomacao(getLeelaDb(), evento.id, alvoRemocao.id);
      toast({ variant: 'success', title: 'Automação removida' });
      setAlvoRemocao(null);
      await carregar();
    } catch (err) {
      toast({ variant: 'danger', title: mensagemErro(err) });
    }
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <header className="flex flex-col gap-[var(--spacing-1)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          Automações de comunicação
        </h1>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Dispare uma campanha-modelo automaticamente por gatilho. Pausar interrompe sem apagar — o
          envio real é decidido pelo servidor (cota e limites valem sempre).
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-[var(--spacing-3)]" role="status" aria-label="Carregando automações">
          <Skeleton variant="rect" className="h-40" />
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : (
        <>
          {/* Lista */}
          <section className="flex flex-col gap-[var(--spacing-3)]" aria-label="Automações configuradas">
            {automacoes.length === 0 ? (
              <EmptyState
                title="Nenhuma automação"
                description="Crie uma automação abaixo para disparar uma campanha por gatilho (novo inscrito, véspera, pós-evento…)."
              />
            ) : (
              automacoes.map((a) => (
                <article key={a.id} className={SECAO}>
                  <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-3)]">
                    <div className="flex flex-col gap-[var(--spacing-1)]">
                      <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
                        <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                          {gatilhoLabel(a.gatilho)}
                        </span>
                        {(() => {
                          const e = estadoAutomacao(a);
                          return <Badge variant={e.variant}>{e.label}</Badge>;
                        })()}
                        {gatilhoUsaOffset(a.gatilho) && a.offsetHoras ? (
                          <Badge variant="neutro">{`${a.offsetHoras}h`}</Badge>
                        ) : null}
                      </div>
                      <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                        Modelo: {nomeTemplate(a.templateRef)} · canais {a.canal.map(canalCampanhaLabel).join(', ')}
                      </span>
                      <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                        {a.disparos} disparo{a.disparos === 1 ? '' : 's'} registrado{a.disparos === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex items-center gap-[var(--spacing-2)]">
                      <Switch
                        id={`auto-toggle-${a.id}`}
                        label={estadoAutomacao(a).label}
                        checked={a.ativa}
                        onCheckedChange={() => void toggle(a)}
                      />
                      <Button variant="ghost" onClick={() => iniciarEdicao(a)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setAlvoRemocao(a)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Editor */}
          {campanhas.length === 0 ? (
            <EmptyState
              title="Crie uma campanha primeiro"
              description="A automação dispara uma campanha-modelo do evento. Crie uma campanha para poder automatizá-la."
              action={
                <Button variant="primary" onClick={() => navigate(`/eventos/${evento.slug}/comunicacao/nova`)}>
                  Criar campanha
                </Button>
              }
            />
          ) : (
            <form className={SECAO} onSubmit={(e) => void onSubmit(e)} aria-label="Editor de automação">
              <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {editandoId ? 'Editar automação' : 'Nova automação'}
              </h2>
              {erro ? (
                <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg,var(--text-primary))]">
                  {erro}
                </p>
              ) : null}

              <Select
                id="auto-gatilho"
                label="Gatilho"
                value={values.gatilho}
                onChange={(e) => set('gatilho', e.target.value as AutomacaoFormValues['gatilho'])}
                options={gatilhoOpcoes}
              />
              <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {gatilhoDescricao(values.gatilho)}
              </p>

              <Select
                id="auto-template"
                label="Campanha-modelo"
                value={values.templateRef}
                onChange={(e) => set('templateRef', e.target.value)}
                options={templateOpcoes}
              />

              <div className="flex flex-col gap-[var(--spacing-2)]">
                <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                  Canais
                </span>
                <div role="group" aria-label="Canais" className="flex gap-[var(--spacing-2)]">
                  {CANAIS.map((c) => (
                    <Chip
                      key={c}
                      active={values.canal.includes(c)}
                      onClick={() => set('canal', toggleCanal(values.canal, c))}
                    >
                      {canalCampanhaLabel(c)}
                    </Chip>
                  ))}
                </div>
              </div>

              {gatilhoUsaOffset(values.gatilho) ? (
                <Input
                  id="auto-offset"
                  type="text"
                  inputMode="numeric"
                  label="Horas de offset (1–720)"
                  value={values.offsetHoras}
                  onChange={(e) => set('offsetHoras', e.target.value)}
                  {...(erroOffset !== null ? { errorMessage: erroOffset } : {})}
                />
              ) : null}

              <Switch
                id="auto-ativa"
                label="Ativa"
                description="Ligada dispara pelo gatilho; pausada fica configurada mas não dispara."
                checked={values.ativa}
                onCheckedChange={(checked) => set('ativa', checked)}
              />

              <div className="flex items-center gap-[var(--spacing-3)]">
                <Button type="submit" variant="primary" disabled={!podeSalvar}>
                  {salvando ? 'Salvando…' : editandoId ? 'Salvar automação' : 'Criar automação'}
                </Button>
                {editandoId ? (
                  <Button type="button" variant="ghost" onClick={cancelarEdicao}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </>
      )}

      <ConfirmModal
        open={alvoRemocao !== null}
        onOpenChange={(o) => !o && setAlvoRemocao(null)}
        title="Remover automação"
        description="A automação deixa de existir. O histórico do que já foi enviado permanece no log de comunicação (nunca some)."
        loses={['A regra de disparo automático deste gatilho']}
        keeps={['A campanha-modelo em si', 'O histórico de disparos já realizados']}
        confirmLabel="Remover automação"
        onConfirm={() => void confirmarRemocao()}
      />
    </div>
  );
}

AutomacoesPage.displayName = 'AutomacoesPage';

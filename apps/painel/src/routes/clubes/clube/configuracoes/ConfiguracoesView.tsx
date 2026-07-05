// =============================================================================
// ConfiguracoesView - configuracoes do clube (S110-T1 / SPEC 2.10). Layout
// 25/75: esquerda com navegacao ancora sticky + scroll spy; direita com 5
// secoes (Identidade, Pagina publica, Regras, Moderacao, Admin avancada).
// Estado HONESTO (fix S4 do review Onda1): Moderacao (RN-143) e Permissoes
// (RN-142) nao tem persistencia de cliente modelada na V1 — secoes ficam
// desabilitadas com badge "Em breve" (padrao do popover de desafios), SEM
// toast de sucesso falso. Slug e read-only (docId = slug por design; mudar
// slug e recriar o doc). Modelo "Pago" desabilitado (RN-104); card "Deletar
// clube" com borda Vulcao (excecao 2.16, abre o modal S110-T2).
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Chip } from '@leela/design-system';
import type { Clube, ModeloEntradaClube, VisibilidadeClube } from '@leela/core';
import type { AtualizarClubeInput } from '@leela/api-client';
import {
  COMPORTAMENTOS,
  MODELOS_ENTRADA,
  PERMISSOES_ADMIN,
  SECOES_CONFIG,
  VISIBILIDADES,
  type ComportamentoMembros,
  type PermissaoAdminId,
  type SecaoConfigId,
} from '../../_lib/configClube';

export interface ConfiguracoesViewProps {
  clube: Clube;
  /** Persiste os campos de configuracao do clube (write real). */
  onSalvar: (patch: AtualizarClubeInput) => void | Promise<void>;
  /** Abre o fluxo de exclusao (S110-T2). */
  onDeletar: () => void;
}

function Secao({
  id,
  titulo,
  refCb,
  children,
  onSalvar,
  salvarDisabled = false,
  emBreve = false,
}: {
  id: SecaoConfigId;
  titulo: string;
  refCb: (el: HTMLElement | null) => void;
  children: React.ReactNode;
  onSalvar?: () => void;
  /** Desabilita o salvar (ex.: nome vazio — espelho do guard das Rules). */
  salvarDisabled?: boolean;
  /** Secao sem persistencia na V1: badge + botao desabilitado, sem sucesso falso. */
  emBreve?: boolean;
}): JSX.Element {
  return (
    <section
      id={`config-${id}`}
      ref={refCb}
      aria-label={titulo}
      className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-6)]"
    >
      <h2 className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {titulo}
        {emBreve ? <Badge variant="neutro">Em breve</Badge> : null}
      </h2>
      {children}
      <div>
        {emBreve ? (
          <Button variant="secondary" disabled>
            Disponível em breve
          </Button>
        ) : (
          <Button variant="secondary" disabled={salvarDisabled} onClick={onSalvar}>
            Salvar alterações
          </Button>
        )}
      </div>
    </section>
  );
}

export function ConfiguracoesView({
  clube,
  onSalvar,
  onDeletar,
}: ConfiguracoesViewProps): JSX.Element {
  const [nome, setNome] = useState(clube.nome);
  const [descricao, setDescricao] = useState(clube.descricao);
  const [visibilidade, setVisibilidade] = useState<VisibilidadeClube>(clube.visibilidade);
  const [aprovacaoManual, setAprovacaoManual] = useState(clube.aprovacaoManual);
  const [modeloEntrada, setModeloEntrada] = useState<ModeloEntradaClube>(clube.modeloEntrada);
  const [comportamento, setComportamento] = useState<ComportamentoMembros>('livre');
  const [permissoes, setPermissoes] = useState<Set<PermissaoAdminId>>(
    () => new Set<PermissaoAdminId>(['gerenciar_membros']),
  );
  const [ativa, setAtiva] = useState<SecaoConfigId>('identidade');

  const refs = useRef<Partial<Record<SecaoConfigId, HTMLElement>>>({});

  // Scroll spy — destaca a secao visivel (no-op onde IntersectionObserver
  // nao existe, ex.: jsdom; a navegacao por clique continua funcionando).
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visivel = entries.find((e) => e.isIntersecting);
        if (visivel) {
          const id = visivel.target.id.replace('config-', '') as SecaoConfigId;
          setAtiva(id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  function irPara(id: SecaoConfigId): void {
    setAtiva(id);
    // jsdom nao implementa scrollIntoView — guard coerente com o do observer acima.
    const el = refs.current[id];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function togglePermissao(id: PermissaoAdminId): void {
    setPermissoes((atual) => {
      const prox = new Set(atual);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[1fr_3fr]">
      <nav aria-label="Seções das configurações" className="lg:sticky lg:top-[var(--spacing-6)] lg:self-start">
        <ul className="flex flex-col gap-[var(--spacing-1)]">
          {SECOES_CONFIG.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-current={ativa === s.id ? 'true' : undefined}
                onClick={() => irPara(s.id)}
                className={
                  ativa === s.id
                    ? 'w-full rounded-[var(--radius-sm)] bg-[var(--action-ghost-hover)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-left font-[var(--font-weight-semibold)] text-[var(--text-primary)]'
                    : 'w-full rounded-[var(--radius-sm)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-[var(--spacing-6)]">
        <Secao
          id="identidade"
          titulo="Identidade"
          refCb={(el) => { if (el) refs.current.identidade = el; }}
          onSalvar={() => void onSalvar({ nome: nome.trim(), descricao: descricao.trim() })}
          salvarDisabled={nome.trim().length === 0}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Nome do clube</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-label="Nome do clube"
              className="rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-base)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              aria-label="Descrição"
              rows={2}
              className="rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-base)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
            />
          </label>
        </Secao>

        <Secao
          id="pagina"
          titulo="Página pública"
          refCb={(el) => { if (el) refs.current.pagina = el; }}
          onSalvar={() => void onSalvar({ visibilidade })}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Slug público</span>
            {/* Read-only (fix S4): docId = slug por design — editar aqui era
                descartado em silêncio sob o toast de sucesso da seção. */}
            <input
              value={clube.slug}
              readOnly
              aria-label="Slug público"
              aria-describedby="slug-hint"
              className="rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-base)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-tertiary)] focus:outline-none"
            />
            <span id="slug-hint" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              be-hero.com.br/c/{clube.slug} — o endereço público é definido na criação do clube e não pode ser alterado.
            </span>
          </label>
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Visibilidade</span>
            <div role="group" aria-label="Visibilidade" className="flex flex-wrap gap-[var(--spacing-2)]">
              {VISIBILIDADES.map((v) => (
                <Chip key={v.id} active={visibilidade === v.id} onClick={() => setVisibilidade(v.id)}>
                  {v.label}
                </Chip>
              ))}
            </div>
          </div>
        </Secao>

        <Secao
          id="regras"
          titulo="Regras"
          refCb={(el) => { if (el) refs.current.regras = el; }}
          onSalvar={() => void onSalvar({ aprovacaoManual, modeloEntrada })}
        >
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Modelo de entrada</span>
            <div role="group" aria-label="Modelo de entrada" className="flex flex-wrap gap-[var(--spacing-2)]">
              {MODELOS_ENTRADA.map((m) => (
                <span key={m.id} className="flex items-center gap-[var(--spacing-1)]">
                  <Chip active={modeloEntrada === m.id} disabled={m.disabled} onClick={() => !m.disabled && setModeloEntrada(m.id)}>
                    {m.label}
                  </Chip>
                  {m.disabled ? <Badge variant="neutro">Em breve</Badge> : null}
                </span>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-[var(--spacing-2)]">
            <input
              type="checkbox"
              checked={aprovacaoManual}
              onChange={(e) => setAprovacaoManual(e.target.checked)}
            />
            <span className="text-[var(--text-primary)]">Exigir aprovação manual de novos membros (RN-141)</span>
          </label>
        </Secao>

        {/* Moderação (RN-143) e Permissões (RN-142): sem persistência de
            cliente modelada na V1 (permissoesAdmin é por profissional e
            write de admin) — estado honesto "Em breve", nunca sucesso falso
            (fix S4). */}
        <Secao
          id="moderacao"
          titulo="Moderação"
          refCb={(el) => { if (el) refs.current.moderacao = el; }}
          emBreve
        >
          <div role="group" aria-label="Comportamento dos membros" className="flex flex-col gap-[var(--spacing-2)]">
            {COMPORTAMENTOS.map((c) => (
              <label key={c.id} className="flex items-center gap-[var(--spacing-2)]">
                <input
                  type="radio"
                  name="comportamento"
                  disabled
                  checked={comportamento === c.id}
                  onChange={() => setComportamento(c.id)}
                />
                <span className="text-[var(--text-secondary)]">{c.label}</span>
                <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">{c.hint}</span>
              </label>
            ))}
          </div>
        </Secao>

        <Secao
          id="admin"
          titulo="Admin avançada"
          refCb={(el) => { if (el) refs.current.admin = el; }}
          emBreve
        >
          <div role="group" aria-label="Permissões de admin" className="flex flex-col gap-[var(--spacing-2)]">
            {PERMISSOES_ADMIN.map((p) => (
              <label key={p.id} className="flex items-center gap-[var(--spacing-2)]">
                <input
                  type="checkbox"
                  disabled
                  checked={permissoes.has(p.id)}
                  onChange={() => togglePermissao(p.id)}
                  aria-label={p.label}
                />
                <span className="text-[var(--text-secondary)]">{p.label}</span>
              </label>
            ))}
          </div>
        </Secao>

        {/* Card critico - excecao 2.16: border-left Vulcao */}
        <section
          aria-label="Deletar clube"
          className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--feedback-danger)] bg-[var(--surface-raised)] p-[var(--spacing-6)]"
        >
          <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-danger)]">
            Deletar clube
          </h2>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Ação irreversível. Todos os membros, desafios, parcerias e comunicados serão removidos (RN-144).
          </p>
          <div>
            <Button variant="destructive" onClick={onDeletar}>
              Deletar clube
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

ConfiguracoesView.displayName = 'ConfiguracoesView';

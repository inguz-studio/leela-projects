// =============================================================================
// ConfiguracoesView - configuracoes do club (S110-T1 / SPEC 2.10). Layout
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
import { Badge, Button, Chip, FileInput, Input, Select } from '@leela/design-system';
import type { Clube, ModeloEntradaClube, VisibilidadeClube } from '@leela/core';
import type { AtualizarClubeInput } from '@leela/api-client';
import {
  CATEGORIA_OPCOES,
  COMPORTAMENTOS,
  ESTADO_OPCOES,
  MODALIDADE_OPCOES,
  MODELOS_ENTRADA,
  PERMISSOES_ADMIN,
  SECOES_CONFIG,
  TIPOS_LOCALIZACAO,
  VISIBILIDADES,
  type ComportamentoMembros,
  type PermissaoAdminId,
  type SecaoConfigId,
} from '../../_lib/configClube';

export interface ConfiguracoesViewProps {
  clube: Clube;
  /** Persiste os campos de configuracao do club (write real). */
  onSalvar: (patch: AtualizarClubeInput) => void | Promise<void>;
  /** Abre o fluxo de exclusao (S110-T2). */
  onDeletar: () => void;
  /**
   * Upload da capa (LEELA-R5): sobe o arquivo pro Storage
   * (`clubes/{clubeId}/capa`) e resolve a downloadURL, que PREENCHE o campo
   * `imagemUrl` (persistir segue no "Salvar alterações" da seção). Erro deve
   * vir como Error com mensagem amigável (erro inline do FileInput).
   * Ausente = só o caminho de URL colada.
   */
  onUploadCapa?: (file: File) => Promise<string>;
}

/** URL http(s) válida? Só decide se mostra a prévia da capa. @pure */
function urlDeImagemValida(valor: string): boolean {
  const v = valor.trim();
  if (v.length === 0) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
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
  onUploadCapa,
}: ConfiguracoesViewProps): JSX.Element {
  const [nome, setNome] = useState(clube.nome);
  const [descricao, setDescricao] = useState(clube.descricao);
  // Capa `imagemUrl` (RN-166) — string vazia = sem capa (fallback gradiente).
  const [imagemUrl, setImagemUrl] = useState(clube.imagemUrl ?? '');
  // Upload da capa (LEELA-R5) — a URL resultante preenche o campo acima.
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const [erroCapa, setErroCapa] = useState<string | null>(null);
  const [categoria, setCategoria] = useState(clube.categoria);
  const [modalidade, setModalidade] = useState(clube.modalidade);
  const [cidade, setCidade] = useState(clube.localizacao.cidade);
  const [estado, setEstado] = useState(clube.localizacao.estado);
  const [online, setOnline] = useState(clube.localizacao.online);
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

  async function enviarCapa(file: File, upload: (file: File) => Promise<string>): Promise<void> {
    setErroCapa(null);
    setEnviandoCapa(true);
    try {
      const url = await upload(file);
      setImagemUrl(url);
    } catch (err) {
      setErroCapa(
        err instanceof Error && err.message ? err.message : 'Não foi possível enviar a imagem.',
      );
    } finally {
      setEnviandoCapa(false);
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
          onSalvar={() =>
            void onSalvar({
              nome: nome.trim(),
              descricao: descricao.trim(),
              categoria,
              modalidade,
              // Capa vazia é enviada como '' de propósito (api-client mapeia
              // para deleteField → sem capa, a página cai no gradiente do DS).
              imagemUrl: imagemUrl.trim(),
              localizacao: online
                ? { cidade: '', estado: '', online: true }
                : { cidade: cidade.trim(), estado, online: false },
            })
          }
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
          {/* Capa do clube (RN-166 · S1702-T1 + LEELA-R5) — upload de arquivo
              OU URL colada + prévia; sem capa a página pública usa o gradiente
              do DS. */}
          <div className="flex flex-col gap-[var(--spacing-2)]">
            {onUploadCapa ? (
              <FileInput
                id="config-capa-arquivo"
                label="Enviar imagem de capa"
                busy={enviandoCapa}
                hint="JPG, PNG, WebP, GIF ou AVIF até 5MB. Depois, salve as alterações."
                {...(erroCapa ? { errorMessage: erroCapa } : {})}
                onFileSelected={(file) => void enviarCapa(file, onUploadCapa)}
              />
            ) : null}
            <Input
              id="config-capa"
              type="url"
              inputMode="url"
              label={onUploadCapa ? 'Ou cole uma URL' : 'Imagem de capa (URL)'}
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              placeholder="https://…/capa.jpg"
              aria-describedby="config-capa-hint"
            />
            <span id="config-capa-hint" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Sem capa, a página do clube usa um gradiente.
            </span>
            {urlDeImagemValida(imagemUrl) ? (
              <div className="overflow-hidden rounded-[var(--card-radius)] bg-[var(--surface-base)]">
                <img
                  src={imagemUrl.trim()}
                  alt="Prévia da capa do clube"
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            ) : null}
          </div>
          {/* Mesmos selects do form de criação — criar e editar não divergem. */}
          <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
            <Select
              id="config-categoria"
              label="Tipo de clube"
              options={CATEGORIA_OPCOES}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
            <Select
              id="config-modalidade"
              label="Modalidade"
              options={MODALIDADE_OPCOES}
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              Localização
            </span>
            <div role="group" aria-label="Tipo de localização" className="flex flex-wrap gap-[var(--spacing-2)]">
              {TIPOS_LOCALIZACAO.map((t) => (
                <Chip
                  key={t.id}
                  active={online === (t.id === 'online')}
                  onClick={() => setOnline(t.id === 'online')}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
            {online ? (
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                Clube online — sem sede física. Cidade e estado ficam opcionais.
              </span>
            ) : (
              <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
                <Input
                  id="config-cidade"
                  label="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
                <Select
                  id="config-estado"
                  label="Estado"
                  options={ESTADO_OPCOES}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                />
              </div>
            )}
          </div>
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

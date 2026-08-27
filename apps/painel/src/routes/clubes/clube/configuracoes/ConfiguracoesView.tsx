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
import { Badge, Button, CheckboxField, Chip, Input, Radio, RadioGroup, Select, Textarea } from '@leela/design-system';
import type { Clube, ModeloEntradaClube, VisibilidadeClube } from '@leela/core';
import type { AtualizarClubeInput } from '@leela/api-client';
import { ImageUploadField } from '@/components/upload';
import { TerciarioLayout, TerciarioNav } from '@/components/nav/TerciarioNav';
import { linkClubePublico } from '@/lib/linkPublico';
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
   * Upload da capa (LEELA-R5 · RN-168 upload-only): sobe o arquivo pro Storage
   * (`clubes/{clubeId}/capa`) e resolve a downloadURL, que PREENCHE o campo
   * `imagemUrl` (persistir segue no "Salvar alterações" da seção). OBRIGATÓRIO —
   * não existe mais fallback de URL colada.
   */
  onUploadCapa: (file: File) => Promise<string>;
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
  // Upload-only (RN-168): a downloadURL do ImageUploadField preenche este campo.
  const [imagemUrl, setImagemUrl] = useState(clube.imagemUrl ?? '');
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

  function togglePermissao(id: PermissaoAdminId): void {
    setPermissoes((atual) => {
      const prox = new Set(atual);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  }

  // V2708-03 · o molde que estava ESCRITO AQUI virou peça (`TerciarioNav`).
  //
  // Este é o menu que o dono elogiou em 27/08 — e era, pela medição da S049, o
  // único menu do painel fora do cânone: `<ul>` de `<button>` à mão dentro da
  // rota, escapando da catraca `menu-secundario-cru` por não parecer um SubNav.
  // O elogio dele não mudou nada do COMPORTAMENTO daqui (âncora + scroll spy
  // seguem intactos, linha por linha); mudou a PROCEDÊNCIA: a aparência agora
  // vem do mesmo lugar que a de Configurações do evento, então padronizar no
  // desktop deixou de significar "copiar estas classes numa 3ª tela".
  //
  // De brinde, o formato ganhou responsividade que não tinha: abaixo de `lg` a
  // coluna virava uma pilha de 5 botões comendo ~200px antes do primeiro campo.
  const itensDoMenu = SECOES_CONFIG.map((s) => ({
    id: s.id,
    label: s.label,
    active: ativa === s.id,
    onClick: () => irPara(s.id),
  }));

  return (
    <TerciarioLayout
      nav={<TerciarioNav itens={itensDoMenu} aria-label="Seções das configurações" />}
    >
      <>
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
          <Input
            label="Nome do clube"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Textarea
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
          />
          {/* Capa do clube (RN-166 · S1702-T1 + LEELA-R5 · RN-168 upload-only) —
              arquivo → crop 16/9 (RN-170) → preenche `imagemUrl`; sem capa a
              página pública usa o gradiente do DS. */}
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <ImageUploadField
              id="config-capa"
              label="Imagem de capa"
              hint="JPG, PNG, WebP, GIF ou AVIF até 5MB. Ajustada para 16:9. Depois, salve as alterações."
              value={imagemUrl}
              onChange={setImagemUrl}
              onUpload={onUploadCapa}
              aspecto={{ w: 16, h: 9 }}
              previewAlt="Prévia da capa do clube"
              permiteRemover
              removerLabel="Remover capa"
            />
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Sem capa, a página do clube usa um gradiente.
            </span>
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
          {/* Read-only (fix S4): docId = slug por design — editar aqui era
              descartado em silêncio sob o toast de sucesso da seção. */}
          <div className="flex flex-col gap-1">
            <Input
              label="Slug público"
              value={clube.slug}
              readOnly
              aria-describedby="slug-hint"
            />
            <span id="slug-hint" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {linkClubePublico(clube.slug)} — o endereço público é definido na criação do clube e não pode ser alterado.
            </span>
          </div>
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
          <CheckboxField
            checked={aprovacaoManual}
            onChange={(e) => setAprovacaoManual(e.target.checked)}
            label="Exigir aprovação manual de novos membros"
          />
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
          <RadioGroup
            name="comportamento"
            aria-label="Comportamento dos membros"
            value={comportamento}
            onValueChange={(v) => setComportamento(v as ComportamentoMembros)}
            disabled
          >
            {COMPORTAMENTOS.map((c) => (
              <Radio key={c.id} value={c.id} label={c.label} description={c.hint} />
            ))}
          </RadioGroup>
        </Secao>

        <Secao
          id="admin"
          titulo="Admin avançada"
          refCb={(el) => { if (el) refs.current.admin = el; }}
          emBreve
        >
          <div role="group" aria-label="Permissões de admin" className="flex flex-col gap-[var(--spacing-2)]">
            {PERMISSOES_ADMIN.map((p) => (
              <CheckboxField
                key={p.id}
                disabled
                checked={permissoes.has(p.id)}
                onChange={() => togglePermissao(p.id)}
                label={p.label}
              />
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
            Ação irreversível. Todos os membros, desafios, parcerias e comunicados serão removidos.
          </p>
          <div>
            <Button variant="destructive" onClick={onDeletar}>
              Deletar clube
            </Button>
          </div>
        </section>
      </>
    </TerciarioLayout>
  );
}

ConfiguracoesView.displayName = 'ConfiguracoesView';

// =============================================================================
// PaginaVendasView — editor de conteúdo da página de vendas do evento
// (S300-T3 · E04). Presentational: recebe as seções (agrupadas por canal), o
// SEO e o estado de publicação e delega toda escrita ao container.
//
// Controles (design-principles): SWITCH por seção (on/off imediato, sem Salvar —
// persiste na hora, read-your-writes); o CHECKOUT é travado (Switch desabilitado
// + cadeado) e nunca desliga (invariante S300). Seção desativada ESMAECE. Card
// SEO com título/descrição editáveis, imagem OG opcional e URL amigável
// READ-ONLY com {DOMINIO_LEELA}. Publicar/despublicar são ações de alto impacto
// → confirmação (ConfirmModal) é orquestrada pelo container.
// =============================================================================

import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Skeleton,
  Switch,
  Textarea,
} from '@leela/design-system';
import type { Evento, SecaoVendas, SeoVendas } from '@leela/core';
import { Globe, Lock } from 'lucide-react';
import { agruparSecoes, descricaoSecao, labelSecao, urlAmigavelExibida } from './_lib/paginaVendasView';

export interface SeoEditavel {
  titulo: string;
  descricao: string;
  imagemUrl?: string;
}

export interface PaginaVendasViewProps {
  evento: Evento;
  loading: boolean;
  error: Error | null;
  secoes: SecaoVendas[];
  seo: SeoVendas;
  publicada: boolean;
  /** Doc ainda não materializado (draft de seções padrão do kernel). */
  isNovo: boolean;
  onToggleSecao: (id: string, ativa: boolean) => void;
  onSalvarSeo: (seo: SeoEditavel) => void;
  onPublicar: () => void;
  onDespublicar: () => void;
  /** id da seção em gravação (feedback no switch). */
  secaoSalvandoId?: string | null;
  salvandoSeo?: boolean;
  publicando?: boolean;
}

export function PaginaVendasView({
  evento,
  loading,
  error,
  secoes,
  seo,
  publicada,
  isNovo,
  onToggleSecao,
  onSalvarSeo,
  onPublicar,
  onDespublicar,
  secaoSalvandoId = null,
  salvandoSeo = false,
  publicando = false,
}: PaginaVendasViewProps): JSX.Element {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando página de vendas"
        className="flex flex-col gap-[var(--spacing-4)]"
      >
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar a página de vendas"
        description="Tente recarregar a página. Se persistir, verifique sua conexão."
      />
    );
  }

  const grupos = agruparSecoes(secoes);

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PublicacaoHeader
        publicada={publicada}
        isNovo={isNovo}
        publicando={publicando}
        onPublicar={onPublicar}
        onDespublicar={onDespublicar}
      />

      {grupos.map((grupo) => (
        <section
          key={grupo.canal}
          aria-label={grupo.label}
          className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
        >
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
              {grupo.label}
            </h3>
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              {grupo.descricao}
            </p>
          </div>

          <ul className="flex flex-col gap-[var(--spacing-2)]">
            {grupo.secoes.map((secao) => (
              <SecaoLinha
                key={secao.id}
                secao={secao}
                salvando={secaoSalvandoId === secao.id}
                onToggle={onToggleSecao}
              />
            ))}
          </ul>
        </section>
      ))}

      <SeoCard
        seo={seo}
        eventoSlug={evento.slug}
        salvando={salvandoSeo}
        onSalvar={onSalvarSeo}
      />
    </div>
  );
}

PaginaVendasView.displayName = 'PaginaVendasView';

// ---------------------------------------------------------------------------
// Header de publicação
// ---------------------------------------------------------------------------

interface PublicacaoHeaderProps {
  publicada: boolean;
  isNovo: boolean;
  publicando: boolean;
  onPublicar: () => void;
  onDespublicar: () => void;
}

function PublicacaoHeader({
  publicada,
  isNovo,
  publicando,
  onPublicar,
  onDespublicar,
}: PublicacaoHeaderProps): JSX.Element {
  return (
    <header className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <div className="flex items-center gap-[var(--spacing-3)]">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            Página de vendas
          </h2>
          <Badge variant={publicada ? 'vitoria' : 'neutro'}>
            {publicada ? 'Publicada' : 'Rascunho'}
          </Badge>
        </div>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          {isNovo
            ? 'Ligue e desligue as seções da página. Salve o SEO e publique quando estiver pronto.'
            : 'Configure as seções, o SEO e a publicação da página pública do evento.'}
        </p>
      </div>

      {publicada ? (
        <Button variant="secondary" size="sm" onClick={onDespublicar} disabled={publicando}>
          Despublicar
        </Button>
      ) : (
        <Button variant="primary" size="sm" onClick={onPublicar} disabled={publicando}>
          Publicar página
        </Button>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Linha de seção (toggle)
// ---------------------------------------------------------------------------

interface SecaoLinhaProps {
  secao: SecaoVendas;
  salvando: boolean;
  onToggle: (id: string, ativa: boolean) => void;
}

function SecaoLinha({ secao, salvando, onToggle }: SecaoLinhaProps): JSX.Element {
  const label = labelSecao(secao.id);
  const descricao = descricaoSecao(secao.id);
  // Esmaece a seção desligada (mantém o checkout, sempre ativo, em destaque).
  const esmaecida = !secao.ativa;

  return (
    <li
      className={
        'flex items-center justify-between gap-[var(--spacing-4)] rounded-[var(--radius-md)] ' +
        'bg-[var(--surface-sunken)] px-[var(--spacing-4)] py-[var(--spacing-3)] ' +
        (esmaecida ? 'opacity-60' : '')
      }
    >
      <div className="flex min-w-0 flex-col gap-[var(--spacing-0-5)]">
        <div className="flex items-center gap-[var(--spacing-2)]">
          <span className="font-[var(--font-weight-semibold)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            {label}
          </span>
          {secao.travada ? (
            <Badge variant="neutro">
              <Lock className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
              Sempre ativa
            </Badge>
          ) : null}
        </div>
        {descricao ? (
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {descricao}
          </span>
        ) : null}
      </div>

      <Switch
        checked={secao.ativa}
        disabled={secao.travada || salvando}
        onCheckedChange={(v) => onToggle(secao.id, v)}
        aria-label={
          secao.travada
            ? `${label} (sempre ativa, não pode desligar)`
            : `Ativar seção ${label}`
        }
      />
    </li>
  );
}

// ---------------------------------------------------------------------------
// Card SEO
// ---------------------------------------------------------------------------

interface SeoCardProps {
  seo: SeoVendas;
  eventoSlug: string;
  salvando: boolean;
  onSalvar: (seo: SeoEditavel) => void;
}

function SeoCard({ seo, eventoSlug, salvando, onSalvar }: SeoCardProps): JSX.Element {
  const [titulo, setTitulo] = React.useState(seo.titulo);
  const [descricao, setDescricao] = React.useState(seo.descricao);
  const [imagemUrl, setImagemUrl] = React.useState(seo.imagemUrl ?? '');

  // Re-sincroniza os campos quando o SEO carregado muda (read-your-writes).
  React.useEffect(() => {
    setTitulo(seo.titulo);
    setDescricao(seo.descricao);
    setImagemUrl(seo.imagemUrl ?? '');
  }, [seo.titulo, seo.descricao, seo.imagemUrl]);

  const url = urlAmigavelExibida(seo.slugAmigavel, eventoSlug);
  const sujo =
    titulo !== seo.titulo ||
    descricao !== seo.descricao ||
    imagemUrl !== (seo.imagemUrl ?? '');

  function salvar(): void {
    const limpo = imagemUrl.trim();
    onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      ...(limpo.length > 0 ? { imagemUrl: limpo } : {}),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO e compartilhamento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="seo-titulo"
          label="Título da página"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Como o evento aparece na aba do navegador e no Google"
        />
        <Textarea
          id="seo-descricao"
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          placeholder="Resumo que aparece na busca e ao compartilhar o link"
        />
        <Input
          id="seo-imagem"
          label="Imagem de compartilhamento (URL)"
          value={imagemUrl}
          onChange={(e) => setImagemUrl(e.target.value)}
          placeholder="https://…"
        />

        {/* URL amigável READ-ONLY: {DOMINIO_LEELA}, nunca o host legado. */}
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            URL amigável
          </span>
          <div className="flex items-center gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] px-[var(--spacing-3)] py-[var(--spacing-2)]">
            <Globe
              aria-hidden
              className="h-[var(--icon-size)] w-[var(--icon-size)] shrink-0 text-[var(--text-tertiary)] [stroke-width:var(--icon-stroke)]"
            />
            <code className="min-w-0 truncate text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              {url}
            </code>
          </div>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            A URL é derivada do evento e não pode ser editada aqui.
          </span>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={salvar} disabled={salvando || !sujo}>
            Salvar SEO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// KitsCadastroView — cadastro de kits (S205-T2): seção A (cards de kit incl.
// "Sem kit"), seção B (catálogo de itens com badges tipo/origem + "usado em")
// e rodapé com 3 cards de resumo. Nomenclatura "kit", nunca "tier" (RN-216).
// Presentational. Edição/adição de item (modal) é S205-T3 (via props opcionais).
// =============================================================================

import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, KpiCard, Skeleton, Thumb } from '@leela/design-system';
import type { ItemKit, Kit } from '@leela/core';
import { siglaDe } from '@/lib/sigla';
import {
  formatPrecoKit,
  itemOrigemBadge,
  itemTipoBadge,
  resumoKits,
  usadoEmTexto,
} from '../_lib/kits';
import { formatInt } from '../_lib/format';

export interface KitsCadastroViewProps {
  slug: string;
  kits: Kit[];
  itens: ItemKit[];
  loading: boolean;
  error: Error | null;
  /** S205-T3: abre o modal de novo item (ausente em T2 = catálogo só leitura). */
  onNovoItem?: () => void;
  onEditarItem?: (item: ItemKit) => void;
}

export function KitsCadastroView({
  slug,
  kits,
  itens,
  loading,
  error,
  onNovoItem,
  onEditarItem,
}: KitsCadastroViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando kits" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }
  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar os kits.</p>;
  }

  const resumo = resumoKits(kits, itens);

  return (
    <div className="flex flex-col gap-[var(--spacing-8)]">
      {/* Resumo ao TOPO — padrão das outras telas, KpiCard canônico do DS. */}
      <section aria-label="Resumo dos kits" className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
        <KpiCard label="Kits configurados" value={formatInt(resumo.kits)} />
        <KpiCard label="Itens no catálogo" value={formatInt(resumo.itens)} />
        <KpiCard label="Marcas ativadas" value={formatInt(resumo.marcasAtivadas)} />
      </section>

      {/* Seção A — Kits */}
      <section aria-label="Kits do evento" className="flex flex-col gap-[var(--spacing-4)]">
        <div className="flex items-center justify-between gap-[var(--spacing-3)]">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Kits
          </h2>
          {/* `Button asChild` POR FORA e `Link` por dentro (REV-PAINEL). O
              inverso gera `<a><button>`: HTML inválido (o `a` não admite
              descendente interativo), dois pontos de tabulação para uma ação
              só, e o primeiro deles um `<a>` sem classe — sem anel de foco. */}
          <Button asChild variant="primary">
            <Link to={`/eventos/${slug}/kits/novo`}>+ Adicionar kit</Link>
          </Button>
        </div>
        {kits.length === 0 ? (
          <EmptyState
            title="Nenhum kit configurado"
            description="Crie o primeiro kit do evento (incluindo a opção 'Sem kit')."
          />
        ) : (
          <div className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
              <KitCard key={kit.id} kit={kit} slug={slug} />
            ))}
          </div>
        )}
      </section>

      {/* Seção B — Catálogo de itens */}
      <section aria-label="Catálogo de itens" className="flex flex-col gap-[var(--spacing-4)]">
        <div className="flex items-center justify-between gap-[var(--spacing-3)]">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Catálogo de itens
          </h2>
          {onNovoItem && (
            <Button variant="secondary" onClick={onNovoItem}>
              + Adicionar item
            </Button>
          )}
        </div>
        {itens.length === 0 ? (
          <EmptyState
            title="Catálogo vazio"
            description="Adicione itens (camisetas, sacochilas, amostras) para compor os kits."
          />
        ) : (
          <div className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-2 lg:grid-cols-3">
            {itens.map((item) => (
              <ItemCard key={item.id} item={item} {...(onEditarItem ? { onEditar: () => onEditarItem(item) } : {})} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KitCard({ kit, slug }: { kit: Kit; slug: string }): JSX.Element {
  return (
    // Card CANÔNICO do DS, não <article> cru com bg (D-1008-R11): sob o vidro
    // ([data-glass="on"]) --surface-raised vira FILME translúcido que só lê
    // como cartão com a receita completa (blur + borda + elevação) — e a
    // receita mora no Card. role="article" preserva a semântica anterior.
    <Card role="article" className="flex flex-col gap-[var(--spacing-3)] p-[var(--spacing-4)]">
      {/* Miniatura 1:1 da imagem do kit (RN-227 · RN-236) ANTES do nome: quem
          varre a grade reconhece o kit de vista, sem abrir para descobrir qual
          é. Decorativa de propósito (alt='') — o nome está ao lado e já é o
          rótulo. Sem imagem, ou com URL morta, o Thumb cai na sigla. */}
      <header className="flex items-start gap-[var(--spacing-3)]">
        <Thumb size="md" src={kit.imagemUrl} fallback={siglaDe(kit.nome)} />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-[var(--spacing-2)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {kit.nome}
          </h3>
          {kit.preco < 0 && <Badge variant="vitoria">Desconto</Badge>}
        </div>
      </header>
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        {formatPrecoKit(kit.preco)}
      </p>
      <dl className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)]">
        <div className="flex justify-between">
          <dt className="text-[var(--text-tertiary)]">Capacidade</dt>
          <dd className="text-[var(--text-primary)]">
            {kit.capacidade > 0 ? formatInt(kit.capacidade) : '—'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--text-tertiary)]">Modalidades</dt>
          <dd className="text-[var(--text-primary)]">
            {kit.modalidades.length > 0 ? kit.modalidades.join(', ') : '—'}
          </dd>
        </div>
      </dl>
      <div className="mt-auto">
        {/* Mesmo par do "+ Adicionar kit": `Button asChild` fora, `Link` dentro. */}
        <Button asChild variant="ghost">
          <Link to={`/eventos/${slug}/kits/editar/${kit.id}`}>Editar</Link>
        </Button>
      </div>
    </Card>
  );
}

function ItemCard({ item, onEditar }: { item: ItemKit; onEditar?: () => void }): JSX.Element {
  const tipo = itemTipoBadge(item.tamanhado);
  const origem = itemOrigemBadge(item.origem);
  return (
    // Mesmo motivo do KitCard (D-1008-R11): Card canônico, nunca bg cru.
    <Card role="article" className="flex flex-col gap-[var(--spacing-3)] p-[var(--spacing-4)]">
      <header className="flex items-start justify-between gap-[var(--spacing-2)]">
        <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {item.nome}
        </h3>
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar ${item.nome}`}
            className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-brand)] hover:underline"
          >
            Editar
          </button>
        )}
      </header>
      <div className="flex flex-wrap gap-[var(--spacing-2)]">
        <Badge variant={tipo.variant}>{tipo.label}</Badge>
        <Badge variant={origem.variant}>{origem.label}</Badge>
        {item.origem === 'patrocinador' && item.marca && <Badge variant="neutro">{item.marca}</Badge>}
      </div>
      {item.origem === 'patrocinador' && item.exibirLogo && (
        <p className="text-[length:var(--font-size-xs)] text-[var(--text-success)]">Logo exibido ao atleta</p>
      )}
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{usadoEmTexto(item)}</p>
    </Card>
  );
}

KitsCadastroView.displayName = 'KitsCadastroView';

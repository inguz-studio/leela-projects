// =============================================================================
// PaginaVendasPage — container da rota `/eventos/:slug/pagina-vendas`
// (S300-T3 · E04). Lê a página de vendas (ou parte das seções padrão do kernel
// quando ainda não existe), orquestra os toggles de seção + o save do SEO
// (escrita direta, read-your-writes) e o publicar/despublicar com ConfirmModal
// (§2.15) + Toast. Escrita via usePaginaVendasMutations → invalida a chave da
// página (ADR-010). `publicada` é escrita de Function; a UI só dispara o seam.
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ConfirmModal, useToast } from '@leela/design-system';
import {
  SECAO_CHECKOUT_ID,
  secoesVendasPadrao,
  type SecaoVendas,
  type SeoVendas,
} from '@leela/core';
import { PaginaVendasView, type SeoEditavel } from './PaginaVendasView';
import { DOMINIO_LEELA } from './_lib/paginaVendasView';
import { usePaginaVendas, usePaginaVendasMutations } from '../_data/paginaVendas';
import type { EventoOutletContext } from '../evento/EventoLayout';

/** SEO em branco para um evento novo — slug amigável derivado do evento. */
function seoInicial(eventoSlug: string): SeoVendas {
  return { titulo: '', descricao: '', slugAmigavel: `${DOMINIO_LEELA}/${eventoSlug}` };
}

type AcaoPublicacao = 'publicar' | 'despublicar';

export function PaginaVendasPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { toast } = useToast();
  const { data: pagina, loading, error } = usePaginaVendas(evento.id);
  const { salvarConteudo, publicar, despublicar } = usePaginaVendasMutations(evento.id);

  // Doc ainda não materializado → parte das seções padrão do kernel (o 1º save
  // cria o doc como rascunho). Não é erro: é AUSÊNCIA honesta.
  const isNovo = !loading && !error && pagina === null;
  const secoes: SecaoVendas[] = pagina?.secoes ?? secoesVendasPadrao();
  const seo: SeoVendas = pagina?.seo ?? seoInicial(evento.slug);
  const publicada = pagina?.publicada ?? false;

  const [secaoSalvandoId, setSecaoSalvandoId] = React.useState<string | null>(null);
  const [salvandoSeo, setSalvandoSeo] = React.useState(false);
  const [acao, setAcao] = React.useState<AcaoPublicacao | null>(null);
  const [publicando, setPublicando] = React.useState(false);

  async function onToggleSecao(id: string, ativa: boolean): Promise<void> {
    // Guard: o checkout nunca desliga (invariante S300) — a UI já o trava.
    if (id === SECAO_CHECKOUT_ID) return;
    const novas = secoes.map((s) => (s.id === id ? { ...s, ativa } : s));
    setSecaoSalvandoId(id);
    try {
      await salvarConteudo({ secoes: novas, seo }, isNovo);
      toast({ title: ativa ? 'Seção ativada' : 'Seção desativada', variant: 'success' });
    } catch {
      toast({ title: 'Não foi possível salvar a seção', variant: 'danger' });
    } finally {
      setSecaoSalvandoId(null);
    }
  }

  async function onSalvarSeo(edit: SeoEditavel): Promise<void> {
    const novoSeo: SeoVendas = {
      titulo: edit.titulo,
      descricao: edit.descricao,
      slugAmigavel: seo.slugAmigavel,
      ...(edit.imagemUrl !== undefined ? { imagemUrl: edit.imagemUrl } : {}),
    };
    setSalvandoSeo(true);
    try {
      await salvarConteudo({ secoes, seo: novoSeo }, isNovo);
      toast({ title: 'SEO salvo', variant: 'success' });
    } catch {
      toast({ title: 'Não foi possível salvar o SEO', variant: 'danger' });
    } finally {
      setSalvandoSeo(false);
    }
  }

  async function confirmarPublicacao(): Promise<void> {
    if (!acao) return;
    const publicar_ = acao === 'publicar';
    setPublicando(true);
    try {
      if (publicar_) await publicar();
      else await despublicar();
      toast({
        title: publicar_ ? 'Página publicada' : 'Página despublicada',
        variant: 'success',
      });
      setAcao(null);
    } catch {
      toast({
        title: publicar_
          ? 'Não foi possível publicar a página'
          : 'Não foi possível despublicar a página',
        variant: 'danger',
      });
    } finally {
      setPublicando(false);
    }
  }

  return (
    <>
      <PaginaVendasView
        evento={evento}
        loading={loading}
        error={error}
        secoes={secoes}
        seo={seo}
        publicada={publicada}
        isNovo={isNovo}
        onToggleSecao={(id, ativa) => void onToggleSecao(id, ativa)}
        onSalvarSeo={(edit) => void onSalvarSeo(edit)}
        onPublicar={() => setAcao('publicar')}
        onDespublicar={() => setAcao('despublicar')}
        secaoSalvandoId={secaoSalvandoId}
        salvandoSeo={salvandoSeo}
        publicando={publicando}
      />

      <ConfirmModal
        open={acao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAcao(null);
        }}
        title={acao === 'despublicar' ? 'Despublicar página' : 'Publicar página'}
        description={
          acao === 'despublicar'
            ? 'A página pública volta a rascunho e some do ar até você publicar de novo.'
            : 'A página fica pública no endereço do evento e passa a aceitar inscrições.'
        }
        loses={
          acao === 'despublicar'
            ? ['A página sai do ar para o público', 'Novos inscritos não conseguem acessar']
            : ['Nada — publicar é reversível a qualquer momento']
        }
        keeps={
          acao === 'despublicar'
            ? ['As inscrições já feitas e a configuração da página', 'Você pode republicar quando quiser']
            : ['O conteúdo e o SEO que você configurou', 'A URL amigável do evento']
        }
        confirmLabel={acao === 'despublicar' ? 'Despublicar' : 'Publicar página'}
        loading={publicando}
        onConfirm={() => void confirmarPublicacao()}
      />
    </>
  );
}

PaginaVendasPage.displayName = 'PaginaVendasPage';

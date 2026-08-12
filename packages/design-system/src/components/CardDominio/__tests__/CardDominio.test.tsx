// =============================================================================
// CardDominio — o cartão de entidade em lista.
//
// Os casos saem dos cinco `<article>` crus medidos em 2026-08-11 (§5/§7.2):
// `clubes/hub/ClubeCard.tsx:67`, `clubes/clube/comunicacao/ComunicadosList.tsx:58`,
// `eventos/comunicacao/CampanhasList.tsx:81`, `clubes/clube/parcerias/ParceriasView.tsx:55`
// e `parcerias/afiliacoes/MinhasAfiliacoesPage.tsx:65`.
//
// O caso mais importante do arquivo é o último: PROVAR que a superfície vem do
// `Card` e não foi reescrita aqui dentro. Um cartão de domínio que reimplanta
// raio, fundo e elevação seria a 193ª superfície reconstruída à mão — só que
// dentro do design system, que é exatamente o defeito que o `ConfirmModal`
// carregava.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardDominio } from '../CardDominio';
import { Card } from '../../Card';

describe('CardDominio', () => {
  it('renderiza <article> por default, com o título como h3', () => {
    render(<CardDominio title="Clube Vento Sul" data-testid="c" />);
    expect(screen.getByTestId('c').tagName).toBe('ARTICLE');
    expect(screen.getByRole('heading', { level: 3, name: 'Clube Vento Sul' })).toBeInTheDocument();
  });

  it.each([2, 3, 4] as const)('titleAs="h%s" muda o nível do heading', (level) => {
    render(
      <CardDominio title="Comunicado" titleAs={`h${level}` as 'h2' | 'h3' | 'h4'} />,
    );
    expect(screen.getByRole('heading', { level })).toBeInTheDocument();
  });

  // Dentro de `<ul>`, `<div>`/`<article>` filho direto quebra a semântica de
  // lista — a mesma regra que a Onda 1 aprendeu convertendo a landing.
  it('as="li" para item de lista', () => {
    render(
      <ul>
        <CardDominio as="li" title="Parceria" data-testid="c" />
      </ul>,
    );
    expect(screen.getByTestId('c').tagName).toBe('LI');
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it.each(['leading', 'badges', 'actions', 'footer'] as const)('renderiza o slot %s', (slot) => {
    render(<CardDominio title="Campanha" {...{ [slot]: <span>{slot}</span> }} />);
    expect(screen.getByText(slot)).toBeInTheDocument();
  });

  it('renderiza descrição, meta e corpo livre', () => {
    render(
      <CardDominio
        title="Comunicado"
        description="Aviso de retirada de kit."
        meta={<span>WhatsApp · manual</span>}
      >
        <span>corpo</span>
      </CardDominio>,
    );
    expect(screen.getByText('Aviso de retirada de kit.')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp · manual')).toBeInTheDocument();
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });

  it('corta a descrição em duas linhas por default, e `clamp={false}` solta', () => {
    const { rerender } = render(
      <CardDominio title="x" description="texto longo" data-testid="c" />,
    );
    expect(screen.getByText('texto longo').className).toContain('line-clamp-2');
    rerender(<CardDominio title="x" description="texto longo" clamp={false} data-testid="c" />);
    expect(screen.getByText('texto longo').className).not.toContain('line-clamp-2');
  });

  // O acento lateral de estado. No painel ele era
  // `style={{ borderLeftColor: 'var(...)' }}` a partir de um mapa de status —
  // cor por objeto de estilo inline, que é por onde valor cru entra sem o gate
  // de marca ver.
  it('sem acento por default — acento é exceção, não regra', () => {
    render(<CardDominio title="x" data-testid="c" />);
    expect(screen.getByTestId('c').className).not.toContain('border-l-4');
  });

  it.each([
    ['brand', '--border-brand'],
    ['vitoria', '--feedback-success'],
    ['alerta', '--feedback-warning'],
    ['vulcao', '--feedback-danger'],
    ['heroico', '--feedback-heroico'],
    ['neutro', '--border-strong'],
  ] as const)('accent="%s" usa o token %s, nunca style inline', (accent, token) => {
    render(<CardDominio title="x" accent={accent} data-testid="c" />);
    const el = screen.getByTestId('c');
    expect(el.className).toContain(`border-l-[var(${token})]`);
    expect(el.getAttribute('style')).toBeNull();
  });

  it('aceita className e props nativas', () => {
    render(<CardDominio title="x" className="teste-cd" aria-label="cartão" data-testid="c" />);
    expect(screen.getByTestId('c')).toHaveClass('teste-cd');
    expect(screen.getByTestId('c')).toHaveAttribute('aria-label', 'cartão');
  });

  // ── A prova de composição ────────────────────────────────────────────────
  //
  // Comparar a assinatura de superfície do CardDominio com a do próprio Card:
  // se alguém reescrever raio/fundo/elevação aqui dentro em vez de compor, o
  // conjunto de classes deixa de conter as do Card e este caso reprova. É a
  // trava contra a lição do ConfirmModal, aplicada ao contrário.
  it('a superfície é a do Card — composta, não reescrita', () => {
    const { unmount } = render(<Card data-testid="card" />);
    const doCard = screen.getByTestId('card').className.split(' ');
    unmount();

    render(<CardDominio title="x" data-testid="c" />);
    const doDominio = screen.getByTestId('c').className.split(' ');

    for (const classe of doCard) {
      expect(doDominio, `classe do Card ausente no CardDominio: ${classe}`).toContain(classe);
    }
  });

  it('não declara padding de cartão próprio — o padding vem do CardHeader', () => {
    render(<CardDominio title="x" data-testid="c" />);
    // A raiz não pinta espaçamento; quem o traz é o CardHeader composto.
    expect(screen.getByTestId('c').className).not.toMatch(/\bp-\[/);
    expect(
      screen.getByRole('heading', { level: 3 }).closest('[class*="p-[var(--spacing-6)]"]'),
    ).not.toBeNull();
  });
});

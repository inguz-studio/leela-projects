// =============================================================================
// FormasDePagamento (E11 · S825-T2) — a rosca que saiu do "em breve".
//
// O que estes casos protegem é UMA distinção: "não computada" (null) e "sem
// venda" (série zerada) não podem colapsar num estado só. Se alguém trocar o
// `serie === null` por um `?? []` para "simplificar", os dois primeiros casos
// deste arquivo reprovam — que é exatamente o momento em que a tela passaria a
// afirmar "ninguém pagou" para quem só está esperando o deploy.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FatiaFormaPagamento } from '@leela/core';
import { FormasDePagamento } from '../_components/FormasDePagamento';

const SERIE: FatiaFormaPagamento[] = [
  { forma: 'cartao_credito', vendas: 4, valor: 1000 },
  { forma: 'pix', vendas: 6, valor: 3000 },
];

const ZERADA: FatiaFormaPagamento[] = [
  { forma: 'cartao_credito', vendas: 0, valor: 0 },
  { forma: 'pix', vendas: 0, valor: 0 },
];

describe('FormasDePagamento — os três estados são três estados', () => {
  it('série null → "em breve" (o servidor não sabe somar isto ainda)', () => {
    render(
      <FormasDePagamento serie={null} receitaConfirmada={4000} loading={false} />
    );
    expect(screen.getByText('Em breve')).toBeInTheDocument();
    expect(screen.queryByText('R$ 4.000')).not.toBeInTheDocument();
  });

  it('série zerada → vazio HONESTO, que é afirmação e não promessa', () => {
    render(
      <FormasDePagamento serie={ZERADA} receitaConfirmada={0} loading={false} />
    );
    expect(screen.getByText('Nenhuma venda confirmada ainda')).toBeInTheDocument();
    // A diferença que importa: aqui NÃO se promete nada.
    expect(screen.queryByText('Em breve')).not.toBeInTheDocument();
  });

  it('série com venda → rosca, legenda por forma e total no centro', () => {
    render(
      <FormasDePagamento serie={SERIE} receitaConfirmada={4000} loading={false} />
    );
    expect(screen.getByText('R$ 4.000')).toBeInTheDocument();
    expect(screen.getByText('Cartão de crédito')).toBeInTheDocument();
    expect(screen.getByText('Pix')).toBeInTheDocument();
    expect(screen.getByText('10 vendas confirmadas')).toBeInTheDocument();
    expect(screen.queryByText('Em breve')).not.toBeInTheDocument();
  });

  it('ordem canônica preservada: cartão antes de Pix, mesmo com Pix vendendo mais', () => {
    render(
      <FormasDePagamento serie={SERIE} receitaConfirmada={4000} loading={false} />
    );
    // Cor categórica é identidade — ordenar por volume trocaria a cor de cada
    // forma entre um recorte e outro, e a rosca de dois eventos lado a lado
    // contaria histórias trocadas.
    const rotulos = screen
      .getAllByText(/Cartão de crédito|^Pix$/)
      .map((el) => el.textContent);
    expect(rotulos).toEqual(['Cartão de crédito', 'Pix']);
  });

  it('cobertura parcial → a nota aparece, com os dois números na cara', () => {
    // O caso real do mock da casa: R$ 2.500 de cobranças sobre R$ 50.560 de
    // receita, porque a base tem venda sem doc de pagamento. Sem esta nota o
    // organizador lê dois números do mesmo dinheiro discordando e conclui,
    // com razão, que sumiu grana.
    render(
      <FormasDePagamento serie={SERIE} receitaConfirmada={50560} loading={false} />
    );
    expect(
      screen.getByText(/A rosca cobre R\$ 4\.000 dos R\$ 50\.560 confirmados/)
    ).toBeInTheDocument();
  });

  it('cobertura total → nenhuma nota (ruído sobre número certo é ruído)', () => {
    render(
      <FormasDePagamento serie={SERIE} receitaConfirmada={4000} loading={false} />
    );
    expect(screen.queryByText(/A rosca cobre/)).not.toBeInTheDocument();
  });

  it('sem receita com que comparar, a nota não é inventada', () => {
    render(
      <FormasDePagamento serie={SERIE} receitaConfirmada={null} loading={false} />
    );
    expect(screen.queryByText(/A rosca cobre/)).not.toBeInTheDocument();
  });

  it('loading → skeleton nomeado, nunca rosca vazia piscando', () => {
    render(
      <FormasDePagamento serie={null} receitaConfirmada={null} loading />
    );
    expect(
      screen.getByRole('status', { name: 'Carregando formas de pagamento' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Em breve')).not.toBeInTheDocument();
  });

  it('venda única fala no singular', () => {
    render(
      <FormasDePagamento
        serie={[
          { forma: 'cartao_credito', vendas: 1, valor: 100 },
          { forma: 'pix', vendas: 0, valor: 0 },
        ]}
        receitaConfirmada={100}
        loading={false}
      />
    );
    expect(screen.getByText('1 venda confirmada')).toBeInTheDocument();
  });
});

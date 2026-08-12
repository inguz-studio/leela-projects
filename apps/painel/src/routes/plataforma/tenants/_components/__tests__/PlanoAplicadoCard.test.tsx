// =============================================================================
// Card do plano aplicado no Resumo da ficha (S1613-T6 · RN-541).
//
// O caso que trava: quando os números vigentes divergem da estampa, a tela
// DECLARA a divergência em vez de exibir o nome do plano como se fosse a
// verdade.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CommercialTerms } from '@leela/core';
import { PlanoAplicadoCard } from '../PlanoAplicadoCard';
import { mkPlano, tabela } from '../../../planos/_test/fixtures';
import { mkTerms } from '../../../_test/fixtures';

function termoEstampado(over: Partial<CommercialTerms> = {}): CommercialTerms {
  return mkTerms({
    taxaPorMetodo: { credit_card: 10, pix: 8 },
    tabelaTaxasParcela: tabela(0),
    saasMonthlyFee: 0,
    planoAplicadoId: 'padrao',
    versao: 4,
    ...over,
  });
}

describe('PlanoAplicadoCard · estampa fiel', () => {
  it('mostra o nome do plano junto da versão do termo', () => {
    render(<PlanoAplicadoCard terms={termoEstampado()} planos={[mkPlano()]} loading={false} />);

    expect(screen.getByText('Plano Padrão')).toBeInTheDocument();
    expect(screen.getByText(/versão 4 do termo/)).toBeInTheDocument();
    expect(screen.queryByText('Termo divergente do plano')).not.toBeInTheDocument();
  });
});

describe('PlanoAplicadoCard · RN-541 · a tela declara a divergência', () => {
  it('termo editado depois acende o aviso e mostra os dois lados', () => {
    const terms = termoEstampado({ taxaPorMetodo: { credit_card: 7.5, pix: 8 } });
    render(<PlanoAplicadoCard terms={terms} planos={[mkPlano()]} loading={false} />);

    expect(screen.getByText('Termo divergente do plano')).toBeInTheDocument();
    expect(screen.getByText('Taxa de cartão à vista')).toBeInTheDocument();
    expect(screen.getByText(/plano 10% · vigente 7,5%/)).toBeInTheDocument();
    expect(
      screen.getByText(/O nome do plano descreve a origem, não o que está cobrando hoje/)
    ).toBeInTheDocument();
  });

  it('mensalidade divergente vem cent-exata, não arredondada', () => {
    const terms = termoEstampado({ saasMonthlyFee: 499.9 });
    render(<PlanoAplicadoCard terms={terms} planos={[mkPlano()]} loading={false} />);

    expect(screen.getByText(/plano R\$ 0,00 · vigente R\$ 499,90/)).toBeInTheDocument();
  });

  it('divergência é sinal de leitura — nenhum bloqueio na tela', () => {
    const terms = termoEstampado({ taxaPorMetodo: { credit_card: 7.5, pix: 8 } });
    render(<PlanoAplicadoCard terms={terms} planos={[mkPlano()]} loading={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('PlanoAplicadoCard · ausências declaradas', () => {
  it('sem planoAplicadoId, a tela diz que o termo é manual', () => {
    render(<PlanoAplicadoCard terms={mkTerms()} planos={[mkPlano()]} loading={false} />);

    expect(screen.getByText(/Nenhum plano aplicado/)).toBeInTheDocument();
    expect(screen.queryByText(/Plano Padrão/)).not.toBeInTheDocument();
  });

  it('sem termo, não inventa plano nem números', () => {
    render(<PlanoAplicadoCard terms={null} planos={[mkPlano()]} loading={false} />);

    expect(screen.getByText(/ainda não tem termo comercial/)).toBeInTheDocument();
  });

  it('plano fora do catálogo é declarado como rastro, não como ausência', () => {
    const terms = termoEstampado({ planoAplicadoId: 'plano-apagado' });
    render(<PlanoAplicadoCard terms={terms} planos={[mkPlano()]} loading={false} />);

    expect(screen.getByText('plano-apagado')).toBeInTheDocument();
    expect(screen.getByText(/não está mais no catálogo/)).toBeInTheDocument();
  });

  it('carregando mostra skeleton nomeado', () => {
    render(<PlanoAplicadoCard terms={null} planos={null} loading />);

    expect(
      screen.getByRole('status', { name: 'Carregando o plano de cobrança' })
    ).toBeInTheDocument();
  });
});

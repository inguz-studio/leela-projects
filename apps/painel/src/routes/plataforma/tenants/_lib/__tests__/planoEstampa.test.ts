// =============================================================================
// Puros do plano aplicado × termo vigente (S1613-T6 · RN-541).
//
// A semântica é a do `estampaIdentica` do servidor
// (`functions/src/platform/aplicarPlano.ts:70-102`): quatro eixos comparáveis,
// e SÓ eles — taxa de cartão, taxa de PIX, tabela por parcela e mensalidade
// SaaS. O resto do termo não vem do plano, e comparar isso acenderia o aviso em
// todo tenant.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { CommercialTerms } from '@leela/core';
import { compararEstampa, estadoDoPlanoAplicado } from '../planoEstampa';
import { mkPlano, tabela } from '../../../planos/_test/fixtures';
import { mkTerms } from '../../../_test/fixtures';

/** Termo que acabou de receber a estampa do plano `padrao` (10 / 8 / 0). */
function termoEstampado(over: Partial<CommercialTerms> = {}): CommercialTerms {
  return mkTerms({
    taxaPorMetodo: { credit_card: 10, pix: 8 },
    tabelaTaxasParcela: tabela(0),
    saasMonthlyFee: 0,
    planoAplicadoId: 'padrao',
    ...over,
  });
}

describe('compararEstampa · estampa fiel não diverge', () => {
  it('termo recém-estampado devolve lista vazia', () => {
    expect(compararEstampa(termoEstampado(), mkPlano())).toEqual([]);
  });

  it('eixos que o plano NÃO carrega não contam como divergência', () => {
    // `platformFeePct`, `retencaoRepassePct` e `modoTaxaDefault` são do termo,
    // nunca do plano — mexer neles não é sair de cima da estampa.
    const terms = termoEstampado({
      platformFeePct: 42,
      retencaoRepassePct: 30,
      modoTaxaDefault: 'repassada',
    });
    expect(compararEstampa(terms, mkPlano())).toEqual([]);
  });
});

describe('compararEstampa · o termo editado à mão', () => {
  it('taxa de cartão mexida aparece com os dois lados', () => {
    const terms = termoEstampado({ taxaPorMetodo: { credit_card: 7.5, pix: 8 } });
    const divergencias = compararEstampa(terms, mkPlano());

    expect(divergencias).toEqual([
      { eixo: 'Taxa de cartão à vista', unidade: 'pct', doPlano: 10, vigente: 7.5 },
    ]);
  });

  it('taxa de PIX mexida aparece sozinha', () => {
    const terms = termoEstampado({ taxaPorMetodo: { credit_card: 10, pix: 5 } });
    const divergencias = compararEstampa(terms, mkPlano());

    expect(divergencias).toHaveLength(1);
    expect(divergencias[0]?.eixo).toBe('Taxa de PIX');
  });

  it('a tabela por parcela diverge LINHA A LINHA, não em bloco', () => {
    const alterada = { ...tabela(0), '6': 3.2 };
    const terms = termoEstampado({ tabelaTaxasParcela: alterada });
    const divergencias = compararEstampa(terms, mkPlano());

    expect(divergencias).toEqual([
      { eixo: 'Taxa em 6x', unidade: 'pct', doPlano: 0, vigente: 3.2 },
    ]);
  });

  it('linha apagada da tabela vigente conta como divergência sem valor', () => {
    const semSeis = { ...tabela(0) };
    delete semSeis['6'];
    const terms = termoEstampado({ tabelaTaxasParcela: semSeis });
    const divergencias = compararEstampa(terms, mkPlano());

    expect(divergencias).toEqual([
      { eixo: 'Taxa em 6x', unidade: 'pct', doPlano: 0, vigente: null },
    ]);
  });

  it('mensalidade SaaS mexida vem em reais, não em porcentagem', () => {
    const terms = termoEstampado({ saasMonthlyFee: 499.9 });
    const divergencias = compararEstampa(terms, mkPlano());

    expect(divergencias).toEqual([
      { eixo: 'Mensalidade SaaS', unidade: 'brl', doPlano: 0, vigente: 499.9 },
    ]);
  });

  it('termo SEM taxaPorMetodo diverge nos dois métodos (alguém tirou)', () => {
    const terms = termoEstampado();
    delete (terms as { taxaPorMetodo?: unknown }).taxaPorMetodo;
    const divergencias = compararEstampa(terms, mkPlano());

    expect(divergencias.map((d) => d.eixo)).toEqual([
      'Taxa de cartão à vista',
      'Taxa de PIX',
    ]);
    expect(divergencias.every((d) => d.vigente === null)).toBe(true);
  });
});

describe('estadoDoPlanoAplicado', () => {
  it('sem termo, a tela não inventa plano', () => {
    expect(estadoDoPlanoAplicado(null, [mkPlano()])).toEqual({ tipo: 'sem_termo' });
  });

  it('sem planoAplicadoId, o termo é manual — e não "plano Padrão"', () => {
    const terms = mkTerms();
    expect(estadoDoPlanoAplicado(terms, [mkPlano()])).toEqual({ tipo: 'sem_plano' });
  });

  it('plano fora do catálogo é declarado, não confundido com ausência', () => {
    const terms = termoEstampado({ planoAplicadoId: 'plano-apagado' });
    expect(estadoDoPlanoAplicado(terms, [mkPlano()])).toEqual({
      tipo: 'plano_fora_do_catalogo',
      planoId: 'plano-apagado',
    });
  });

  it('estampa fiel devolve `identica` com o plano', () => {
    const estado = estadoDoPlanoAplicado(termoEstampado(), [mkPlano()]);
    expect(estado.tipo).toBe('identica');
  });

  it('estampa mexida devolve `divergente` com os eixos', () => {
    const terms = termoEstampado({ taxaPorMetodo: { credit_card: 7.5, pix: 8 } });
    const estado = estadoDoPlanoAplicado(terms, [mkPlano()]);

    expect(estado.tipo).toBe('divergente');
    if (estado.tipo === 'divergente') {
      expect(estado.plano.nome).toBe('Padrão');
      expect(estado.divergencias).toHaveLength(1);
    }
  });
});

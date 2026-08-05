import { describe, it, expect } from 'vitest';
import { diagnosticoVitrine } from '@leela/core';
import { derivaAlertas } from '../alertas';
import { ts } from '../../_test/fixtures';

const AGORA = new Date('2026-04-20T12:00:00Z');

describe('derivaAlertas', () => {
  it('rascunho gera aviso para publicar', () => {
    const alertas = derivaAlertas(
      { slug: 'evento-teste', status: 'rascunho', data: ts(new Date('2026-06-01T00:00:00Z')), qtdInscritos: 0 },
      AGORA,
    );
    expect(alertas.some((a) => a.id === 'rascunho' && a.severidade === 'aviso')).toBe(true);
  });

  it('evento próximo (≤2 dias) publicado é crítico', () => {
    const alertas = derivaAlertas(
      { slug: 'evento-teste', status: 'publicado', data: ts(new Date('2026-04-21T12:00:00Z')), qtdInscritos: 100 },
      AGORA,
    );
    const prox = alertas.find((a) => a.id === 'proximidade');
    expect(prox?.severidade).toBe('critico');
  });

  it('evento distante não gera alerta de proximidade', () => {
    const alertas = derivaAlertas(
      { slug: 'evento-teste', status: 'publicado', data: ts(new Date('2026-08-01T00:00:00Z')), qtdInscritos: 100 },
      AGORA,
    );
    expect(alertas.some((a) => a.id === 'proximidade')).toBe(false);
  });

  it('publicado sem inscritos avisa para divulgar', () => {
    const alertas = derivaAlertas(
      { slug: 'evento-teste', status: 'publicado', data: ts(new Date('2026-08-01T00:00:00Z')), qtdInscritos: 0 },
      AGORA,
    );
    expect(alertas.some((a) => a.id === 'sem-inscritos')).toBe(true);
  });

  it('ordena crítico antes de aviso/info', () => {
    const alertas = derivaAlertas(
      { slug: 'evento-teste', status: 'publicado', data: ts(new Date('2026-04-21T12:00:00Z')), qtdInscritos: 0 },
      AGORA,
    );
    expect(alertas[0]?.severidade).toBe('critico');
  });
});

// ---------------------------------------------------------------------------
// VITRINE-FIX — o organizador precisa saber que publicou e não está vendendo
// ---------------------------------------------------------------------------

describe('derivaAlertas · vitrine publicada que não vende', () => {
  const publicadoFuturo = {
    slug: 'evento-teste',
    status: 'publicado' as const,
    data: ts(new Date('2026-08-01T00:00:00Z')),
    qtdInscritos: 0,
  };

  it('sem preço: alerta CRÍTICO que nomeia as modalidades a configurar', () => {
    const alertas = derivaAlertas(publicadoFuturo, AGORA, {
      vende: false,
      estado: 'encerrado',
      motivo: 'sem_preco',
      modalidadesSemPreco: ['5k', '10k'],
    });
    const a = alertas.find((x) => x.id === 'vitrine-nao-vende');
    expect(a?.severidade).toBe('critico');
    expect(a?.mensagem).toContain('NÃO vende');
    expect(a?.mensagem).toContain('5k');
    expect(a?.mensagem).toContain('10k');
    expect(alertas[0]?.id).toBe('vitrine-nao-vende');
  });

  it('cala o conselho errado de "divulgue a página" quando a página não vende', () => {
    const alertas = derivaAlertas(publicadoFuturo, AGORA, {
      vende: false,
      estado: 'encerrado',
      motivo: 'sem_preco',
      modalidadesSemPreco: ['5k'],
    });
    expect(alertas.some((a) => a.id === 'sem-inscritos')).toBe(false);
  });

  it('esgotado e lotes vencidos têm mensagens próprias', () => {
    const esgotado = derivaAlertas(publicadoFuturo, AGORA, {
      vende: false,
      estado: 'esgotado',
      motivo: 'esgotado',
      modalidadesSemPreco: [],
    });
    expect(esgotado.find((a) => a.id === 'vitrine-nao-vende')?.mensagem).toContain('vagas acabaram');

    const vencido = derivaAlertas(publicadoFuturo, AGORA, {
      vende: false,
      estado: 'encerrado',
      motivo: 'lotes_encerrados',
      modalidadesSemPreco: [],
    });
    expect(vencido.find((a) => a.id === 'vitrine-nao-vende')?.mensagem).toContain('janelas');
  });

  it('evento que já passou NÃO vira alerta — não vender ali é o esperado', () => {
    const alertas = derivaAlertas(
      { slug: 'evento-teste', status: 'publicado', data: ts(new Date('2026-04-01T00:00:00Z')), qtdInscritos: 40 },
      AGORA,
      { vende: false, estado: 'encerrado', motivo: 'evento_passou', modalidadesSemPreco: [] },
    );
    expect(alertas.some((a) => a.id === 'vitrine-nao-vende')).toBe(false);
  });

  it('vende, mas uma modalidade sem preço some da página: aviso, não crítico', () => {
    const alertas = derivaAlertas(publicadoFuturo, AGORA, {
      vende: true,
      estado: 'aberto',
      motivo: null,
      modalidadesSemPreco: ['21k'],
    });
    const a = alertas.find((x) => x.id === 'modalidade-sem-preco');
    expect(a?.severidade).toBe('aviso');
    expect(a?.mensagem).toContain('21k');
    // Vendendo, o conselho de divulgar volta a fazer sentido.
    expect(alertas.some((x) => x.id === 'sem-inscritos')).toBe(true);
  });

  it('sem diagnóstico (lotes ainda carregando) nada é inventado', () => {
    const alertas = derivaAlertas(publicadoFuturo, AGORA, null);
    expect(alertas.some((a) => a.id.startsWith('vitrine'))).toBe(false);
    expect(alertas.some((a) => a.id === 'modalidade-sem-preco')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DIAG-PAINEL-LACUNAS — o alerta que nomeia um lugar do painel leva até ele,
// e o evento sem modalidade nenhuma não vira frase quebrada.
// ---------------------------------------------------------------------------

describe('derivaAlertas · destino do alerta', () => {
  const publicadoFuturo = {
    slug: 'meia-floripa-2026',
    status: 'publicado' as const,
    data: ts(new Date('2026-08-01T00:00:00Z')),
    qtdInscritos: 0,
  };

  it('sem preço: o alerta crítico leva para os lotes do PRÓPRIO evento', () => {
    const alertas = derivaAlertas(publicadoFuturo, AGORA, {
      vende: false,
      estado: 'encerrado',
      motivo: 'sem_preco',
      modalidadesSemPreco: ['5k', '10k'],
    });
    const a = alertas.find((x) => x.id === 'vitrine-nao-vende');
    expect(a?.acao).toEqual({ label: 'Configurar lotes', href: '/eventos/meia-floripa-2026/lotes' });
  });

  it('lotes vencidos e esgotado também levam para os lotes', () => {
    for (const motivo of ['lotes_encerrados', 'esgotado'] as const) {
      const alertas = derivaAlertas(publicadoFuturo, AGORA, {
        vende: false,
        estado: motivo === 'esgotado' ? 'esgotado' : 'encerrado',
        motivo,
        modalidadesSemPreco: [],
      });
      expect(alertas.find((x) => x.id === 'vitrine-nao-vende')?.acao?.href).toBe(
        '/eventos/meia-floripa-2026/lotes',
      );
    }
  });

  it('a modalidade solitária sem preço também ganha o caminho', () => {
    const alertas = derivaAlertas(publicadoFuturo, AGORA, {
      vende: true,
      estado: 'aberto',
      motivo: null,
      modalidadesSemPreco: ['21k'],
    });
    expect(alertas.find((x) => x.id === 'modalidade-sem-preco')?.acao?.href).toBe(
      '/eventos/meia-floripa-2026/lotes',
    );
  });

  it('evento SEM modalidade nenhuma: frase própria, sem "undefined" e sem porta falsa', () => {
    // `sem_preco` com lista vazia é o evento cujo doc não parseia
    // (`eventoDegradado` devolve `modalidades: []`) — 0 sem preço de 0
    // modalidades. A frase antiga saía "As modalidades  e undefined estão".
    const alertas = derivaAlertas(publicadoFuturo, AGORA, {
      vende: false,
      estado: 'encerrado',
      motivo: 'sem_preco',
      modalidadesSemPreco: [],
    });
    const a = alertas.find((x) => x.id === 'vitrine-nao-vende');
    expect(a?.severidade).toBe('critico');
    expect(a?.mensagem).not.toContain('undefined');
    expect(a?.mensagem).toContain('nenhuma modalidade');
    // Mandar para os lotes seria mandar para uma tela sem o que oferecer: o
    // lote pertence a uma modalidade e a Rule exige que ela exista no evento.
    expect(a?.acao).toBeUndefined();
  });

  it('alerta sem destino continua sem destino (proximidade, rascunho, sem inscritos)', () => {
    const alertas = derivaAlertas(
      { slug: 'evento-teste', status: 'rascunho', data: ts(new Date('2026-06-01T00:00:00Z')), qtdInscritos: 0 },
      AGORA,
    );
    expect(alertas.every((a) => a.acao === undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// REV-PAINEL — o estado degradado pelo CAMINHO REAL, não pelo diagnóstico
// fabricado à mão.
//
// Todos os casos acima montam o `DiagnosticoVitrine` na unha. Isso prova a
// frase, mas não prova que o estado que produzia "undefined" é ALCANÇÁVEL: se
// `diagnosticoVitrine` deixasse de classificar o evento sem modalidade como
// `sem_preco`, os testes seguiriam verdes contra um caso que não existe mais —
// e a porta voltaria a abrir por outro lado. Aqui a lista vazia entra no
// `diagnosticoVitrine` de verdade (`@leela/core`) e o resultado dele é o que
// alimenta o `derivaAlertas`.
// ---------------------------------------------------------------------------

describe('derivaAlertas · evento degradado pelo caminho real', () => {
  it('modalidades: [] → diagnosticoVitrine devolve sem_preco com lista vazia', () => {
    // Exatamente o que `eventoDegradado` (api-client) devolve quando o doc do
    // evento não parseia: nenhuma modalidade.
    const vitrine = diagnosticoVitrine([], new Date('2026-08-01T00:00:00Z'), AGORA);
    expect(vitrine.vende).toBe(false);
    expect(vitrine.motivo).toBe('sem_preco');
    expect(vitrine.modalidadesSemPreco).toEqual([]);
  });

  it('e a tela do organizador recebe a frase própria, nunca "undefined"', () => {
    const vitrine = diagnosticoVitrine([], new Date('2026-08-01T00:00:00Z'), AGORA);
    const alertas = derivaAlertas(
      {
        slug: 'evento-degradado',
        status: 'publicado',
        data: ts(new Date('2026-08-01T00:00:00Z')),
        qtdInscritos: 0,
      },
      AGORA,
      vitrine,
    );
    const a = alertas.find((x) => x.id === 'vitrine-nao-vende');
    expect(a?.mensagem).toBeDefined();
    expect(a?.mensagem).not.toMatch(/undefined|\[object Object\]/);
    expect(a?.mensagem).toContain('nenhuma modalidade');
  });

  it('nenhum alerta da família imprime undefined ou [object Object]', () => {
    // Varredura da família inteira nos recortes que a tela realmente monta.
    const recortes = [
      { slug: 'e1', status: 'rascunho' as const, data: ts(new Date('2026-06-01T00:00:00Z')), qtdInscritos: 0 },
      { slug: 'e2', status: 'publicado' as const, data: ts(new Date('2026-04-21T12:00:00Z')), qtdInscritos: 0 },
      { slug: 'e3', status: 'publicado' as const, data: ts(new Date('2026-08-01T00:00:00Z')), qtdInscritos: 12 },
    ];
    const vitrines = [
      null,
      diagnosticoVitrine([], new Date('2026-08-01T00:00:00Z'), AGORA),
      { vende: false, estado: 'esgotado' as const, motivo: 'esgotado' as const, modalidadesSemPreco: [] },
      { vende: false, estado: 'encerrado' as const, motivo: 'lotes_encerrados' as const, modalidadesSemPreco: [] },
      { vende: false, estado: 'encerrado' as const, motivo: 'sem_preco' as const, modalidadesSemPreco: ['5k'] },
      { vende: true, estado: 'aberto' as const, motivo: null, modalidadesSemPreco: ['5k', '10k', '21k', '42k'] },
    ];
    for (const evento of recortes) {
      for (const vitrine of vitrines) {
        for (const a of derivaAlertas(evento, AGORA, vitrine)) {
          expect(a.mensagem).not.toMatch(/undefined|\[object Object\]|NaN/);
          // Destino nomeado nunca vira `/eventos/undefined/...`.
          if (a.acao) expect(a.acao.href).not.toMatch(/undefined/);
        }
      }
    }
  });
});

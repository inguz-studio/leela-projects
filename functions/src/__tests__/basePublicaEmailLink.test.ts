// =============================================================================
// functions/src/__tests__/basePublicaEmailLink.test.ts
//
// Base pública por ambiente + link do ingresso no e-mail (S1214-T3 · RN-423).
// Unit puro — é o ⚔ vetor 8 da review: sem base configurada o e-mail sai sem
// link, e NUNCA com `undefined` no meio da URL nem com o domínio antigo.
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  basePublica,
  ENV_BASE_PUBLICA,
  ENV_BASE_PUBLICA_LANDING,
  urlIngressoPorLink,
  urlPublicaDoEvento,
} from '../eventos/basePublica';
import { renderIngressosCompraEmail } from '../email/templates';
/**
 * Só os QR. A moldura da marca (lane IDENTIDADE-EMAIL) acrescentou UM <img>
 * legítimo ao topo de todo e-mail — a logo —, então contar `<img>` genérico
 * passou a contar a marca junto. O que estas asserções sempre quiseram dizer
 * é "QR embutido", e QR é o único data URI do documento.
 */
const QR_IMG = /<img[^>]*src="data:image\/png[^>]*>/g;


const QR_FAKE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('basePublica — uma base só, vinda do ambiente (RN-423)', () => {
  it('lê a variável desta camada', () => {
    expect(basePublica({ [ENV_BASE_PUBLICA]: 'https://leela.example' })).toBe(
      'https://leela.example'
    );
  });

  it('aceita a MESMA variável que a landing usa — o operador mantém uma só', () => {
    expect(
      basePublica({ [ENV_BASE_PUBLICA_LANDING]: 'https://leela.example' })
    ).toBe('https://leela.example');
  });

  it('a variável desta camada vence quando as duas existem', () => {
    expect(
      basePublica({
        [ENV_BASE_PUBLICA]: 'https://a.example',
        [ENV_BASE_PUBLICA_LANDING]: 'https://b.example',
      })
    ).toBe('https://a.example');
  });

  it('apara a barra final — a montagem nunca produz `//`', () => {
    expect(basePublica({ [ENV_BASE_PUBLICA]: 'https://leela.example///' })).toBe(
      'https://leela.example'
    );
  });

  it.each([
    ['ausente', {}],
    ['vazia', { [ENV_BASE_PUBLICA]: '   ' }],
    ['sem esquema', { [ENV_BASE_PUBLICA]: 'leela.example' }],
    ['esquema perigoso', { [ENV_BASE_PUBLICA]: 'javascript:alert(1)' }],
    ['com espaço', { [ENV_BASE_PUBLICA]: 'https://leela example.com' }],
    ['com aspas', { [ENV_BASE_PUBLICA]: 'https://leela"example.com' }],
  ])('base %s ⇒ null (nunca uma base torta em massa)', (_rotulo, env) => {
    expect(basePublica(env as Record<string, string | undefined>)).toBeNull();
  });

  it('sem base, nenhuma URL é montada — e nada de `undefined` na string', () => {
    expect(urlPublicaDoEvento('meia-floripa-2026', {})).toBeNull();
    expect(urlIngressoPorLink('LLIP1.k1.a.b', {})).toBeNull();
  });

  it('com base, as duas URLs saem completas', () => {
    const env = { [ENV_BASE_PUBLICA]: 'https://leela.example' };
    expect(urlPublicaDoEvento('meia-floripa-2026', env)).toBe(
      'https://leela.example/meia-floripa-2026'
    );
    expect(urlIngressoPorLink('LLIP1.k1.abc.def', env)).toBe(
      'https://leela.example/ingresso/LLIP1.k1.abc.def'
    );
  });

  it('o domínio dos mocks Be Hero não aparece em lugar nenhum do módulo', () => {
    const env = { [ENV_BASE_PUBLICA]: 'https://leela.example' };
    expect(urlPublicaDoEvento('x', env)).not.toContain('beh.ro');
    expect(urlIngressoPorLink('LLIP1.k1.a.b', env)).not.toContain('beh.ro');
  });
});

describe('e-mail da compra com o link por inscrito (RN-423 · ⚔ 8)', () => {
  const base = { nomeComprador: 'Marina', nomeEvento: 'Meia Floripa 2026' };
  const doisInscritos = [
    {
      nome: 'Marina',
      modalidade: '21k',
      codigo: 'AB2CD3',
      qrDataUri: QR_FAKE,
      linkIngresso: 'https://leela.example/ingresso/LLIP1.k1.aaa.bbb',
    },
    {
      nome: 'João',
      modalidade: '10k',
      codigo: 'XY7ZK9',
      qrDataUri: QR_FAKE,
      linkIngresso: 'https://leela.example/ingresso/LLIP1.k1.ccc.ddd',
    },
  ];

  it('UM link por INSCRITO, cada um no bloco do seu dono', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      linkEvento: 'https://leela.example/meia-floripa-2026',
      ingressos: doisInscritos,
    });
    const blocos = email.html.split('data-slot="ingresso"');
    expect(blocos[1]).toContain('LLIP1.k1.aaa.bbb');
    expect(blocos[1]).toContain('AB2CD3');
    expect(blocos[1]).not.toContain('LLIP1.k1.ccc.ddd');
    expect(blocos[2]).toContain('LLIP1.k1.ccc.ddd');
    expect(blocos[2]).toContain('XY7ZK9');
    // E também na parte TEXTO, que é o que sobra com imagem bloqueada.
    expect(email.texto).toContain('LLIP1.k1.aaa.bbb');
    expect(email.texto).toContain('LLIP1.k1.ccc.ddd');
  });

  it('o link é ACRÉSCIMO: código em texto e QR embutido permanecem', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      linkEvento: 'https://leela.example/meia-floripa-2026',
      ingressos: doisInscritos,
    });
    // Código legível mesmo removendo TODA imagem (cliente que bloqueia).
    const semImagens = email.html.replace(/<img[^>]*>/g, '');
    expect(semImagens).toContain('AB2CD3');
    expect(semImagens).toContain('XY7ZK9');
    // E o QR embutido continua lá, um por inscrito.
    expect(email.html.match(QR_IMG) ?? []).toHaveLength(2);
    expect(email.texto).toContain('AB2CD3');
  });

  it('SEM base: e-mail sai sem link nenhum, e o código continua', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      ingressos: doisInscritos.map(({ linkIngresso: _ignorado, ...resto }) => resto),
    });
    expect(email.html).not.toContain('href');
    expect(email.html).toContain('AB2CD3');
    expect(email.texto).toContain('AB2CD3');
    expect(email.texto).toContain('XY7ZK9');
    // As três formas de mentir que a RN-423 proíbe:
    for (const veneno of ['undefined', 'beh.ro', 'null']) {
      expect(email.html).not.toContain(veneno);
      expect(email.texto).not.toContain(veneno);
    }
    expect(email.texto).not.toContain('Página do evento');
  });

  it('link de ingresso torto NÃO vira link — o bloco sai sem ele', () => {
    for (const torto of ['javascript:alert(1)', 'ingresso/abc', 'https://a b.com', '']) {
      const email = renderIngressosCompraEmail({
        ...base,
        ingressos: [
          { nome: 'Marina', modalidade: '21k', codigo: 'AB2CD3', qrDataUri: QR_FAKE, linkIngresso: torto },
        ],
      });
      expect(email.html).not.toContain('Abrir o ingresso');
      expect(email.html).toContain('AB2CD3');
    }
  });

  it('linkEvento PRESENTE e torto continua sendo erro alto (montagem do servidor)', () => {
    expect(() =>
      renderIngressosCompraEmail({
        ...base,
        linkEvento: 'javascript:alert(1)',
        ingressos: doisInscritos,
      })
    ).toThrow(/linkEvento/);
  });

  it('nome do inscrito com HTML não escapa do escape, com o link no bloco', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      ingressos: [
        {
          nome: '<img src=x onerror=alert(1)>',
          modalidade: '21k',
          codigo: 'AB2CD3',
          qrDataUri: QR_FAKE,
          linkIngresso: 'https://leela.example/ingresso/LLIP1.k1.aaa.bbb',
        },
      ],
    });
    // A tag injetada não existe como MARKUP (é o que importa); o texto
    // escapado pode aparecer, e aparece inerte.
    expect(email.html).not.toContain('<img src=x');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    // O rótulo do link é genérico — nome de pessoa não é repetido dentro dele.
    expect(email.html).toContain('>Abrir este ingresso</a>');
    // E o `href` continua sendo só o endereço montado pelo servidor.
    expect(email.html).toContain('href="https://leela.example/ingresso/LLIP1.k1.aaa.bbb"');
  });
});

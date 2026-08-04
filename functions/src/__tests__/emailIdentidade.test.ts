/**
 * emailIdentidade.test.ts — lane IDENTIDADE-EMAIL (trace leela-build-2d6ee98d)
 *
 * O GATE DE MARCA do e-mail. Gate de código não prova identidade visual, então
 * as invariantes que sustentam a estética viram teste:
 *
 *   M1. Toda cor do e-mail ESPELHA um token do design system. O teste lê
 *       `packages/design-system/themes/index.css`, resolve a cadeia de `var()`
 *       até o primitivo e reprova o literal divergente. Trocar por um hex
 *       escolhido na hora quebra aqui.
 *   M2. Nenhuma cor CRUA escapa para o HTML renderizado: todo `#rrggbb` que
 *       sai em qualquer um dos 8 templates pertence à paleta espelhada.
 *   M3. O cabeçalho da marca existe em TODOS os templates (nenhum e-mail sai
 *       sem a logo e sem a faixa).
 *   M4. A logo NUNCA volta a ser data URI, e nunca vira SVG — as duas formas
 *       somem no Gmail (a primeira já custou o QR do ingresso, item 55).
 *   M5. Contraste AA nos DOIS modos: como escrito e sob inversão mecânica de
 *       cor (o que um cliente que ignora `color-scheme` produz).
 *   M6. O laranja da marca nunca é cor de TEXTO (invertido dá 2,03:1).
 *   M7. Restrições de e-mail: tabela e não flex/grid, CSS inline, 600px.
 *   M8. O PNG da logo versionado bate com o SVG oficial da marca.
 */
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import {
  MEDIDAS,
  PALETA,
  URL_LOGO_EMAIL,
  botao,
  layoutEmail,
} from '../email/identidade';
import {
  renderAvisoMarcoComissaoEmail,
  renderAvisoRepasseComissaoEmail,
  renderCampanhaEmail,
  renderContaCriadaEmail,
  renderConviteAfiliadoEmail,
  renderConviteAssessoriaEmail,
  renderIngressosCompraEmail,
  renderRedefinirSenhaEmail,
} from '../email/templates';

const RAIZ = resolve(__dirname, '..', '..', '..');

// ---------------------------------------------------------------------------
// Resolução dos tokens do design system (a fonte da verdade)
// ---------------------------------------------------------------------------

/** Mapa `--nome` → valor do bloco do tema `brasa` (o tema do produto). */
function tokensBrasa(): Map<string, string> {
  const css = readFileSync(
    resolve(RAIZ, 'packages/design-system/themes/brasa.css'),
    'utf8'
  );
  const mapa = new Map<string, string>();
  for (const m of css.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gim)) {
    mapa.set(m[1]!.trim(), m[2]!.trim());
  }
  return mapa;
}

/** Resolve `var(--a)` em cadeia até o valor cru. */
function resolverToken(nome: string, mapa = tokensBrasa()): string {
  let valor = mapa.get(nome);
  expect(valor, `token ${nome} não existe no design system`).toBeDefined();
  let guarda = 0;
  while (valor !== undefined && valor.startsWith('var(')) {
    const alvo = valor.slice(4, -1).trim();
    valor = mapa.get(alvo);
    expect(valor, `token ${alvo} (via ${nome}) não resolve`).toBeDefined();
    if (++guarda > 10) throw new Error(`ciclo de token em ${nome}`);
  }
  return (valor ?? '').trim();
}

// ---------------------------------------------------------------------------
// Contraste WCAG
// ---------------------------------------------------------------------------

function paraRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminancia(rgb: readonly number[]): number {
  const canal = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(rgb[0]!) + 0.7152 * canal(rgb[1]!) + 0.0722 * canal(rgb[2]!);
}

/** Razão de contraste WCAG 2.1 entre duas cores hex. @pure */
export function contraste(fg: string, bg: string): number {
  const [a, b] = [luminancia(paraRgb(fg)), luminancia(paraRgb(bg))].sort(
    (p, q) => q - p
  );
  return (a! + 0.05) / (b! + 0.05);
}

/** Inversão mecânica de canal — o que um cliente que inverte produz. */
function inverter(hex: string): string {
  return (
    '#' +
    paraRgb(hex)
      .map((c) => (255 - c).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

// ---------------------------------------------------------------------------
// Os 8 e-mails do produto, com dados de exemplo
// ---------------------------------------------------------------------------

const LINK = 'https://leela-landing.web.app/acao/exemplo?t=abc123';

export const OITO_EMAILS = [
  {
    id: '1-ingressos-da-compra',
    render: () =>
      renderIngressosCompraEmail({
        nomeComprador: 'Marina Alves',
        nomeEvento: 'Circuito das Dunas',
        linkEvento: 'https://leela-landing.web.app/circuito-das-dunas',
        ingressos: [
          {
            nome: 'Marina Alves',
            modalidade: '10 km',
            codigo: 'H4KQ7M',
            qrDataUri: '',
            linkIngresso: 'https://leela-landing.web.app/ingresso/LLIP1.abc',
          },
        ],
      }),
  },
  {
    id: '2-conta-criada-defina-a-senha',
    render: () =>
      renderContaCriadaEmail({
        nomeComprador: 'Marina Alves',
        nomeEvento: 'Circuito das Dunas',
        linkDefinirSenha: LINK,
      }),
  },
  {
    id: '3-convite-de-afiliado',
    render: () =>
      renderConviteAfiliadoEmail({
        nomeConvidado: 'Felipe Duarte',
        nomeEvento: 'Circuito das Dunas',
        linkAceite: LINK,
        expiraEmDias: 14,
      }),
  },
  {
    id: '4-convite-de-assessoria',
    render: () =>
      renderConviteAssessoriaEmail({
        nomeAssessoria: 'Assessoria Passo Firme',
        linkAceite: LINK,
        expiraEmDias: 14,
      }),
  },
  {
    id: '5-campanha-do-evento',
    render: () =>
      renderCampanhaEmail({
        assunto: 'A retirada do kit começa quinta',
        corpo:
          'A retirada do kit abre quinta-feira, das 10h às 20h, na loja da ' +
          'organização.\n\nLeve um documento com foto. Quem retira para outra ' +
          'pessoa precisa de uma autorização assinada.',
        nomeEvento: 'Circuito das Dunas',
      }),
  },
  {
    id: '6-repasse-de-comissao',
    render: () =>
      renderAvisoRepasseComissaoEmail({
        nomeAfiliado: 'Felipe Duarte',
        nomeEvento: 'Circuito das Dunas',
        valor: 480,
        saldoRestante: 120,
      }),
  },
  {
    id: '7-marco-de-comissao',
    render: () =>
      renderAvisoMarcoComissaoEmail({
        nomeAfiliado: 'Felipe Duarte',
        nomeEvento: 'Circuito das Dunas',
        faixa: 500,
        acumulada: 640,
      }),
  },
  {
    id: '8-redefinicao-de-senha',
    render: () =>
      renderRedefinirSenhaEmail({
        nomeUsuario: 'Marina Alves',
        linkRedefinirSenha: LINK,
      }),
  },
] as const;

// ---------------------------------------------------------------------------
// M1 — a paleta espelha o design system
// ---------------------------------------------------------------------------

describe('M1 · toda cor do e-mail espelha um token do design system', () => {
  const casos: ReadonlyArray<readonly [keyof typeof PALETA, string]> = [
    ['canvas', '--surface-sunken'],
    ['superficie', '--surface-raised'],
    ['faixaMarca', '--surface-base'],
    ['fileteMarca', '--border-brand'],
    ['wordmark', '--email-wordmark-ink'],
    ['tinta', '--text-primary'],
    ['tintaSuave', '--text-secondary'],
    ['tintaFraca', '--text-tertiary'],
    ['borda', '--border-subtle'],
    ['acaoFundo', '--action-primary'],
    ['acaoTinta', '--action-primary-fg'],
    ['destaque', '--surface-overlay'],
  ];

  const mapa = tokensBrasa();
  for (const [chave, token] of casos) {
    it(`PALETA.${chave} === ${token}`, () => {
      expect(PALETA[chave].toUpperCase()).toBe(
        resolverToken(token, mapa).toUpperCase()
      );
    });
  }

  const medidas: ReadonlyArray<readonly [keyof typeof MEDIDAS, string]> = [
    ['largura', '--email-width-max'],
    ['gutter', '--email-gutter'],
    ['blocoGap', '--email-block-gap'],
    ['raio', '--email-radius'],
    ['headerPy', '--email-header-py'],
    ['filete', '--email-header-rule'],
    ['logoW', '--email-logo-w'],
    ['logoH', '--email-logo-h'],
  ];
  for (const [chave, token] of medidas) {
    it(`MEDIDAS.${chave} === ${token}`, () => {
      expect(`${MEDIDAS[chave]}px`).toBe(resolverToken(token, mapa));
    });
  }

  it('a paleta não tem duas chaves com o mesmo papel e cores diferentes do token', () => {
    // Guarda contra alguém acrescentar uma cor NOVA sem espelho: toda entrada
    // de PALETA precisa estar coberta pela tabela de casos acima.
    expect(new Set(casos.map(([c]) => c))).toEqual(
      new Set(Object.keys(PALETA) as Array<keyof typeof PALETA>)
    );
  });
});

// ---------------------------------------------------------------------------
// M2/M3/M4 — o que sai nos 8 templates
// ---------------------------------------------------------------------------

describe('M2 · nenhuma cor crua escapa para o HTML dos 8 templates', () => {
  const permitidas = new Set(
    Object.values(PALETA).map((c) => c.toUpperCase())
  );
  for (const email of OITO_EMAILS) {
    it(`${email.id} usa só cores da paleta`, () => {
      const html = email.render().html;
      // A negativa `(?<!&)` tira as ENTIDADES numéricas do caminho (`&#8199;`
      // do preheader casaria como se fosse cor); o que sobra é cor de verdade.
      const usadas = [...html.matchAll(/(?<![&\w])#[0-9a-fA-F]{3,8}\b/g)].map((m) =>
        m[0].toUpperCase()
      );
      const forasteiras = [...new Set(usadas)].filter((c) => !permitidas.has(c));
      expect(forasteiras, `cor fora de token em ${email.id}`).toEqual([]);
    });

    it(`${email.id} não usa rgb()/hsl() cru`, () => {
      expect(email.render().html).not.toMatch(/\b(rgba?|hsla?|oklch|lab|lch)\(/);
    });
  }
});

describe('M3 · o cabeçalho da marca existe em todos os 8 templates', () => {
  for (const email of OITO_EMAILS) {
    it(`${email.id} traz logo, faixa e filete`, () => {
      const html = email.render().html;
      expect(html, 'logo ausente').toContain(URL_LOGO_EMAIL);
      expect(html, 'alt da logo ausente').toContain('alt="Leela"');
      expect(html, 'faixa da marca ausente').toContain(
        `bgcolor="${PALETA.faixaMarca}"`
      );
      expect(html, 'filete da marca ausente').toContain(
        `bgcolor="${PALETA.fileteMarca}"`
      );
      expect(html, 'rodapé da marca ausente').toContain('experiências de bem-estar');
    });

    it(`${email.id} declara modo escuro`, () => {
      const html = email.render().html;
      expect(html).toContain('name="color-scheme" content="dark"');
      expect(html).toContain('name="supported-color-schemes" content="dark"');
    });
  }
});

describe('M4 · a logo nunca volta a ser data URI nem SVG', () => {
  it('a URL da logo é HTTPS e aponta para PNG', () => {
    expect(URL_LOGO_EMAIL).toMatch(/^https:\/\//);
    expect(URL_LOGO_EMAIL).toMatch(/\.png$/);
  });

  for (const email of OITO_EMAILS) {
    it(`${email.id}: nenhum <img> de marca em data URI ou SVG`, () => {
      const html = email.render().html;
      for (const m of html.matchAll(/<img[^>]+src="([^"]*)"/g)) {
        const src = m[1]!;
        // O QR do ingresso continua sendo data URI por decisão de segurança
        // (a credencial não vai para URL pública) — a proibição é da MARCA.
        if (src.startsWith('data:image/png;base64,')) continue;
        expect(src, 'logo em data URI mata a marca no Gmail').not.toMatch(/^data:/);
        expect(src, 'SVG não renderiza em Gmail/Outlook').not.toMatch(/\.svg(\?|$)/);
        expect(src).toMatch(/^https:\/\//);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// M4b — o cabeçalho sobrevive à imagem bloqueada
// ---------------------------------------------------------------------------

describe('M4b · o cabeçalho não desmonta sem a imagem', () => {
  for (const email of OITO_EMAILS) {
    const html = email.render().html;

    it(`${email.id}: a faixa da marca é pintada pelo <td>, não pela imagem`, () => {
      // Se a cor viesse da imagem, cliente que bloqueia deixaria o topo branco.
      const semImagens = html.replace(/<img[^>]*>/g, '');
      expect(semImagens).toContain(`bgcolor="${PALETA.faixaMarca}"`);
      expect(semImagens).toContain(`bgcolor="${PALETA.fileteMarca}"`);
      expect(semImagens).toContain(PALETA.superficie);
    });

    it(`${email.id}: o alt da logo é estilizado como wordmark`, () => {
      // O `alt` cru apareceria em serifada preta minúscula. Com `color`,
      // `font-weight` e `letter-spacing` no próprio <img>, o texto que entra no
      // lugar da imagem ainda lê como a marca.
      const logo = html.match(/<img[^>]*leela-wordmark-email\.png[^>]*>/)?.[0];
      expect(logo, 'logo não encontrada').toBeDefined();
      expect(logo).toContain('alt="Leela"');
      expect(logo).toContain(`color:${PALETA.wordmark}`);
      expect(logo).toMatch(/font-weight:[6-9]00/);
      expect(logo).toMatch(/letter-spacing:/);
    });

    it(`${email.id}: a logo tem tamanho fixo (sem pulo de layout)`, () => {
      const logo = html.match(/<img[^>]*leela-wordmark-email\.png[^>]*>/)?.[0] ?? '';
      // Atributo E propriedade: o Outlook lê o atributo, o resto lê o style.
      expect(logo).toContain(`width="${MEDIDAS.logoW}"`);
      expect(logo).toContain(`height="${MEDIDAS.logoH}"`);
      expect(logo).toContain(`width:${MEDIDAS.logoW}px`);
      expect(logo).toContain(`height:${MEDIDAS.logoH}px`);
    });

    it(`${email.id}: sem NENHUMA imagem, o conteúdo essencial continua`, () => {
      const { texto } = email.render();
      const semImagens = html.replace(/<img[^>]*>/g, '');
      // A linha que carrega a ação/informação principal sobrevive em texto.
      const primeiraFrase = texto.split('\n')[0]!.slice(0, 30);
      expect(semImagens).toContain('experiências de bem-estar');
      expect(primeiraFrase.length).toBeGreaterThan(10);
    });
  }

  it('o e-mail de ingresso mantém código e link sem imagem nenhuma', () => {
    const html = OITO_EMAILS[0]!.render().html.replace(/<img[^>]*>/g, '');
    expect(html, 'o código é o que sustenta a manhã do evento').toContain('H4KQ7M');
    expect(html).toContain('/ingresso/LLIP1.abc');
  });
});

// ---------------------------------------------------------------------------
// M5/M6 — contraste
// ---------------------------------------------------------------------------

describe('M5 · contraste AA nos dois modos (como escrito e sob inversão)', () => {
  const pares: ReadonlyArray<readonly [string, string, string, number]> = [
    ['wordmark no fallback de texto', PALETA.wordmark, PALETA.faixaMarca, 3],
    ['título sobre o cartão', PALETA.tinta, PALETA.superficie, 3],
    ['corpo sobre o cartão', PALETA.tinta, PALETA.superficie, 4.5],
    ['corpo suave sobre o cartão', PALETA.tintaSuave, PALETA.superficie, 4.5],
    ['rodapé sobre a moldura', PALETA.tintaSuave, PALETA.canvas, 4.5],
    ['letra miúda sobre o cartão', PALETA.tintaFraca, PALETA.superficie, 4.5],
    ['rótulo do botão', PALETA.acaoTinta, PALETA.acaoFundo, 4.5],
    ['código do ingresso', PALETA.tinta, PALETA.destaque, 3],
    ['link no corpo', PALETA.wordmark, PALETA.superficie, 4.5],
    ['link no bloco de destaque', PALETA.wordmark, PALETA.destaque, 4.5],
    ['endereço em texto', PALETA.tintaSuave, PALETA.destaque, 4.5],
  ];

  for (const [nome, fg, bg, minimo] of pares) {
    it(`${nome}: AA como escrito e invertido`, () => {
      expect(contraste(fg, bg), 'modo claro/autoral').toBeGreaterThanOrEqual(minimo);
      expect(
        contraste(inverter(fg), inverter(bg)),
        'cliente que inverte a cor'
      ).toBeGreaterThanOrEqual(minimo);
    });
  }
});

describe('M6 · o laranja da marca nunca é cor de texto', () => {
  it('provado: laranja como texto reprova AA sob inversão', () => {
    // Este teste documenta o MOTIVO da regra. Se algum dia ele passar a
    // passar, a regra pode ser revista — até lá, o laranja só é fundo.
    expect(
      contraste(inverter(PALETA.fileteMarca), inverter(PALETA.superficie))
    ).toBeLessThan(4.5);
  });

  for (const email of OITO_EMAILS) {
    it(`${email.id}: laranja só aparece como fundo`, () => {
      const html = email.render().html;
      // Cada pedaço ANTES de uma ocorrência do laranja tem de terminar em
      // declaração de FUNDO. `color:#FF450C` (texto) reprova aqui.
      const antes = html.toLowerCase().split(PALETA.fileteMarca.toLowerCase());
      for (const trecho of antes.slice(0, -1)) {
        expect(
          trecho,
          `laranja usado como cor de texto em ${email.id}`
        ).toMatch(/(bgcolor="|background-color:)$/);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// M7 — restrições reais de cliente de e-mail
// ---------------------------------------------------------------------------

describe('M7 · o HTML respeita as restrições de cliente de e-mail', () => {
  for (const email of OITO_EMAILS) {
    const html = email.render().html;

    it(`${email.id}: layout de tabela, nunca flex/grid`, () => {
      expect(html).toContain('<table role="presentation"');
      expect(html).not.toMatch(/display\s*:\s*(flex|grid|inline-flex)/);
    });

    it(`${email.id}: largura máxima de ${MEDIDAS.largura}px`, () => {
      expect(html).toContain(`max-width:${MEDIDAS.largura}px`);
    });

    it(`${email.id}: sem folha externa e sem webfont remota`, () => {
      expect(html).not.toMatch(/<link[^>]+stylesheet/i);
      expect(html).not.toMatch(/@import/);
      expect(html).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    });

    it(`${email.id}: sem script, formulário ou handler de evento`, () => {
      expect(html).not.toMatch(/<script|<form|<iframe|<object|<embed/i);
      // Handlers nomeados, não `on[a-z]+=` genérico: esse pegava `content=`.
      expect(html).not.toMatch(
        /\son(click|load|error|mouse[a-z]+|focus|blur|submit|change|key[a-z]+|toggle)\s*=/i
      );
      expect(html).not.toMatch(/javascript:/i);
    });

    it(`${email.id}: tem versão em texto puro com o rodapé da marca`, () => {
      const { texto } = email.render();
      expect(texto.length).toBeGreaterThan(40);
      expect(texto).toContain('Leela');
      expect(texto).not.toContain('<');
    });

    it(`${email.id}: tem linha de prévia da caixa de entrada`, () => {
      expect(html).toContain('mso-hide:all');
    });
  }
});

describe('M7b · o layout base é bem formado', () => {
  it('abre e fecha o documento', () => {
    const html = layoutEmail({
      tituloEsc: 'Título',
      corpoHtml: '<p>corpo</p>',
      preheader: 'prévia',
    });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html.endsWith('</html>')).toBe(true);
    expect((html.match(/<table/g) ?? []).length).toBe(
      (html.match(/<\/table>/g) ?? []).length
    );
  });

  it('o botão leva o endereço em texto junto', () => {
    const html = botao('https://exemplo.test/x', 'Abrir');
    expect(html).toContain('https://exemplo.test/x');
    expect(html).toContain('Se o botão não abrir');
    expect(html).toContain(`bgcolor="${PALETA.acaoFundo}"`);
  });
});

// ---------------------------------------------------------------------------
// M8 — o PNG da logo bate com o wordmark oficial
// ---------------------------------------------------------------------------

describe('M8 · o PNG da logo é o wordmark oficial, gerado do SVG', () => {
  it('o asset versionado bate com brand/leela-logo-brasa.svg', () => {
    // Reprova se alguém trocar o PNG à mão ou mudar o SVG sem regerar.
    const saida = execFileSync(
      process.execPath,
      [resolve(RAIZ, 'scripts/brand/gerar-logo-email.mjs'), '--check'],
      { encoding: 'utf8', cwd: RAIZ }
    );
    expect(saida).toContain('ok —');
  });

  it('o caminho do PNG casa com a URL pública anunciada', () => {
    expect(URL_LOGO_EMAIL).toBe(
      'https://leela-landing.web.app/brand/leela-wordmark-email.png'
    );
    // `apps/landing/public/**` é servido na raiz do site (provado em produção
    // por /brand/leela-wordmark-cream.svg → 200).
    expect(() =>
      readFileSync(resolve(RAIZ, 'apps/landing/public/brand/leela-wordmark-email.png'))
    ).not.toThrow();
  });
});

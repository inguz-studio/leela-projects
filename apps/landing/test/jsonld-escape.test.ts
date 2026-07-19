// =============================================================================
// PROVA do fix W2-F-01 (GATE-DS-W2 · stored XSS via JSON-LD).
//
// `JSON.stringify` cru dentro de `<script type="application/ld+json">` permite
// que um nome/descrição de evento contendo `</script><script>…` termine a tag
// e execute script na página pública. Estes testes provam que:
//   1. `serializeJsonLd` nunca emite `<`, `>`, `&` nem U+2028/U+2029 crus;
//   2. a semântica JSON é preservada (round-trip via JSON.parse);
//   3. o componente <JsonLd> renderiza UM único `</script>` (o legítimo) mesmo
//      com payload malicioso — o breakout não acontece;
//   4. o payload é REAL: sem o escape, o breakout existiria (guarda contra
//      apodrecimento do fixture).
//
// Nota de grafia: os textos ASCII dos escapes (barra + uXXXX) são construídos
// via String.fromCharCode para não depender de escapes no fonte do teste.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { eventoJsonLd, serializeJsonLd } from '../lib/seo';
import { JsonLd } from '../app/components/JsonLd';
import type { EventoPublico } from '../lib/tipos';

const BS = String.fromCharCode(92); // backslash
const LS = String.fromCharCode(0x2028); // line separator
const PS = String.fromCharCode(0x2029); // paragraph separator
const ESC_LT = BS + 'u003c'; // texto ASCII do escape de `<`

// Payloads da review antagonista do gate: breakout clássico, entidades HTML,
// escapes unicode LITERAIS no texto, aspas p/ quebrar a string JSON, e
// separadores de linha U+2028/U+2029.
const PAYLOAD_BREAKOUT = '</script><script>alert(document.cookie)</script>';
const PAYLOAD_ENTIDADES = '&lt;/script&gt; &amp; &#x3C;script&#x3E;alert(1)';
const PAYLOAD_UNICODE_TEXT = ESC_LT + '/script' + BS + 'u003e texto com escapes escritos';
const PAYLOAD_ASPAS = '","injected":"<script>alert(1)</script>","x":"';
const PAYLOAD_SEPARADORES = 'linha' + LS + 'quebrada' + PS + 'fim';

function eventoMalicioso(): EventoPublico {
  return {
    slug: 'prova-teste',
    nome: PAYLOAD_BREAKOUT,
    dataISO: '2026-04-27T07:00:00-03:00',
    dataLabel: '27 de abril de 2026',
    diaSemanaLabel: 'dom.',
    horaLabel: '07:00',
    local: PAYLOAD_UNICODE_TEXT,
    modalidadeEsporte: 'Corrida de rua',
    usaChip: true,
    qtdInscritos: 100,
    organizador: null,
    modalidades: [{ nome: PAYLOAD_ASPAS, precoVigente: 90 }],
    kits: [],
  itensTamanhados: [],
    precoMinimo: 90,
    janelasRetirada: [],
    secoes: [],
    seo: { titulo: 'Prova Teste', descricao: PAYLOAD_ENTIDADES + PAYLOAD_SEPARADORES },
    estadoVenda: 'aberto',
    // CKMOD — projeção nova do leitor (defaults legais/flags OFF)
    exigenciasSaude: { atestado: false, parq: false },
    politicaVendas: {
      versao: 1,
      reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
      transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
      trocaIngresso: { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
    },
    termoSaudeVersao: 1,
    taxaRepassada: false,
  };
}

describe('serializeJsonLd (W2-F-01)', () => {
  it('o payload é real: JSON.stringify cru CONTERIA o breakout de </script>', () => {
    const cru = JSON.stringify(eventoJsonLd(eventoMalicioso()));
    expect(cru).toContain('</script');
  });

  it('nunca emite <, >, & nem U+2028/U+2029 crus com payload malicioso', () => {
    const html = serializeJsonLd(eventoJsonLd(eventoMalicioso()));
    expect(html).not.toContain('<');
    expect(html).not.toContain('>');
    expect(html).not.toContain('&');
    expect(html).not.toContain(LS);
    expect(html).not.toContain(PS);
    expect(html).not.toContain('</script');
  });

  it('preserva a semântica JSON (round-trip devolve o objeto original)', () => {
    const data = eventoJsonLd(eventoMalicioso());
    const html = serializeJsonLd(data);
    expect(JSON.parse(html)).toEqual(data);
  });

  it('escapes unicode LITERAIS no dado não viram < ao desserializar', () => {
    const data = eventoJsonLd(eventoMalicioso());
    const roundTrip = JSON.parse(serializeJsonLd(data)) as Record<string, unknown>;
    const location = roundTrip['location'] as Record<string, unknown>;
    // O texto do organizador continha a GRAFIA do escape (barra + u003c);
    // ela volta como texto, nunca como `<` de verdade.
    expect(location['name']).toBe(PAYLOAD_UNICODE_TEXT);
    expect(String(location['name'])).not.toContain('<');
  });
});

describe('<JsonLd> (componente)', () => {
  it('renderiza UM único </script> — payload não termina a tag', () => {
    const html = renderToStaticMarkup(
      createElement(JsonLd, { data: eventoJsonLd(eventoMalicioso()) }),
    );
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html.endsWith('</script>')).toBe(true);
    // Um ÚNICO fechamento de script em todo o HTML (o legítimo).
    expect(html.split('</script').length - 1).toBe(1);
    // O conteúdo inline não contém NENHUM `<` cru.
    const inner = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
    expect(inner).not.toContain('<');
    expect(inner).toContain(ESC_LT); // a forma escapada está lá
  });
});

/**
 * Escala responsiva do preset — REDESIGN-V2 · item 6.
 *
 * Os breakpoints são CONTRATO versionado do DS (LEELA-RESP-M1-T1): o preset
 * declara a escala inteira em vez de herdar os defaults implícitos do Tailwind.
 * Contrato sem teste é intenção, não contrato — e este arquivo é o que
 * transforma a escala em algo que quebra quando alguém mexe.
 *
 * O item 6 acrescenta UM degrau (`xs`, 480px) e não move nenhum outro. As duas
 * coisas são igualmente afirmadas aqui: o degrau novo existe, e os cinco
 * antigos seguem exatamente onde estavam — em especial `lg`, que é o ponto de
 * colapso do shell e a fronteira entre rail fixo e drawer off-canvas.
 */

import { describe, it, expect } from 'vitest';
import leelaPreset from '../../tailwind-preset';

const screens = leelaPreset.theme?.screens as Record<string, string> | undefined;

describe('preset — escala de breakpoints (item 6)', () => {
  it('a escala é declarada pelo DS, não herdada do Tailwind', () => {
    expect(screens).toBeDefined();
  });

  it('xs = 480px: o degrau que o item 6 acrescenta', () => {
    // Medido em 390 e 430 (iPhone real): abaixo de 480 o bloco de 4 KPIs em
    // 2×2 corta rótulo e a legenda de donut trunca "Crédito 7 a 12x".
    expect(screens?.xs).toBe('480px');
  });

  it('os cinco degraus anteriores não se moveram', () => {
    expect(screens?.sm).toBe('640px');
    expect(screens?.md).toBe('768px');
    expect(screens?.lg).toBe('1024px');
    expect(screens?.xl).toBe('1280px');
    expect(screens?.['2xl']).toBe('1536px');
  });

  it('lg segue sendo o colapso do shell (rail fixo ↔ drawer off-canvas)', () => {
    // Afirmado à parte de propósito: mover `lg` muda o AppShell em produção,
    // e o item 6 explicitamente NÃO faz isso ("os breakpoints seguem valendo,
    // com lg como colapso do shell — nada muda aí").
    expect(screens?.lg).toBe('1024px');
  });

  it('a escala é estritamente crescente e xs é o primeiro degrau', () => {
    const emPx = Object.entries(screens ?? {}).map(([nome, valor]) => [nome, Number.parseInt(valor, 10)] as const);
    const valores = emPx.map(([, px]) => px);
    expect(valores).toEqual([...valores].sort((a, b) => a - b));
    expect(emPx[0]?.[0]).toBe('xs');
    // Mobile-first: o estado ESTREITO (< xs) é o default, e `xs:` restaura o
    // 2×2. Se alguém inverter isso com `max-xs:`, some o layout de quem não
    // suporta a variante.
    expect(Math.min(...valores)).toBe(480);
  });
});

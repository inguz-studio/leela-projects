/**
 * avisoAfiliadoTemplates.test.ts — LEELA-E08 · S706-T2 (RN-386, RN-318, RN-172)
 *
 * Unit (sem emulator): o CONTEÚDO dos dois avisos ao afiliado. O que estes
 * textos podem carregar é uma regra de privacidade, não de estilo — o afiliado
 * não pode descobrir pelo e-mail nada que a tela dele não mostre.
 */
import { describe, expect, it } from 'vitest';
import {
  renderAvisoMarcoComissaoEmail,
  renderAvisoRepasseComissaoEmail,
} from '../email/templates';

/** Um pedido real tem comprador; nada disso pode vazar para o afiliado. */
const PII_DO_COMPRADOR = [
  'ana@exemplo.com',
  'Ana Souza',
  '529.982.247-25',
  'OUTROAFILIADO',
];

describe('renderAvisoRepasseComissaoEmail — RN-386', () => {
  const base = {
    nomeAfiliado: 'Téo',
    nomeEvento: 'Meia de Floripa',
    valor: 500,
    saldoRestante: 700,
  };

  it('carrega valor repassado, evento e o que RESTA a receber', () => {
    const r = renderAvisoRepasseComissaoEmail(base);
    expect(r.assunto).toContain('Meia de Floripa');
    for (const parte of [r.html, r.texto]) {
      expect(parte).toContain('500,00');
      expect(parte).toContain('Meia de Floripa');
      expect(parte).toContain('700,00');
    }
  });

  it('saldo restante zero diz que a comissão está toda repassada', () => {
    const r = renderAvisoRepasseComissaoEmail({ ...base, saldoRestante: 0 });
    expect(r.texto).toContain('toda repassada');
  });

  it('saldo negativo (estorno pós-repasse) é dito sem virar cobrança agressiva', () => {
    const r = renderAvisoRepasseComissaoEmail({ ...base, saldoRestante: -120 });
    expect(r.texto).toContain('negativo');
    expect(r.texto).toContain('120,00');
    expect(r.texto).toContain('organizador');
  });

  it('não carrega identidade de comprador nem de outro afiliado (RN-318/RN-172)', () => {
    const r = renderAvisoRepasseComissaoEmail(base);
    for (const pii of PII_DO_COMPRADOR) {
      expect(`${r.assunto} ${r.html} ${r.texto}`).not.toContain(pii);
    }
  });

  it('nome de evento com HTML é escapado (o organizador escreve o nome)', () => {
    const r = renderAvisoRepasseComissaoEmail({
      ...base,
      nomeEvento: '<img src=x onerror=alert(1)>Corrida',
    });
    expect(r.html).not.toContain('<img');
    expect(r.html).toContain('&lt;img');
  });

  it('afiliado sem nome não vira "Olá, ." ', () => {
    const r = renderAvisoRepasseComissaoEmail({ ...base, nomeAfiliado: '' });
    expect(r.texto.startsWith('Olá.')).toBe(true);
  });

  it('assunto cabe no limite do catálogo', () => {
    const r = renderAvisoRepasseComissaoEmail({
      ...base,
      nomeEvento: 'E'.repeat(400),
    });
    expect(r.assunto.length).toBeLessThanOrEqual(150);
  });
});

describe('renderAvisoMarcoComissaoEmail — RN-386', () => {
  const base = {
    nomeAfiliado: 'Téo',
    nomeEvento: 'Meia de Floripa',
    faixa: 100,
    acumulada: 130,
  };

  it('marco de faixa carrega a faixa alcançada, o evento e o acumulado', () => {
    const r = renderAvisoMarcoComissaoEmail(base);
    expect(r.assunto).toContain('100,00');
    expect(r.assunto).toContain('Meia de Floripa');
    for (const parte of [r.html, r.texto]) {
      expect(parte).toContain('100,00');
      expect(parte).toContain('130,00');
    }
  });

  it('primeira comissão tem texto próprio, sem falar em faixa', () => {
    const r = renderAvisoMarcoComissaoEmail({ ...base, faixa: 0, acumulada: 40 });
    expect(r.assunto).toContain('primeira comissão');
    expect(r.texto).toContain('40,00');
    expect(r.texto).not.toContain('passou de');
  });

  it('é boa notícia: não fala de dívida nem de marco perdido', () => {
    const r = renderAvisoMarcoComissaoEmail(base);
    const tudo = `${r.assunto} ${r.texto}`.toLowerCase();
    for (const palavra of ['dívida', 'devendo', 'estorno', 'perdeu']) {
      expect(tudo).not.toContain(palavra);
    }
  });

  it('não carrega identidade de comprador nem de outro afiliado (RN-318/RN-172)', () => {
    const r = renderAvisoMarcoComissaoEmail(base);
    for (const pii of PII_DO_COMPRADOR) {
      expect(`${r.assunto} ${r.html} ${r.texto}`).not.toContain(pii);
    }
  });

  it('nome de evento com HTML é escapado', () => {
    const r = renderAvisoMarcoComissaoEmail({
      ...base,
      nomeEvento: '<script>roubar()</script>',
    });
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
  });

  it('assunto cabe no limite do catálogo', () => {
    const r = renderAvisoMarcoComissaoEmail({
      ...base,
      nomeEvento: 'E'.repeat(400),
    });
    expect(r.assunto.length).toBeLessThanOrEqual(150);
  });
});

describe('os dois avisos, juntos', () => {
  it('não trazem número de evento além do nome (nenhum agregado do organizador)', () => {
    const repasse = renderAvisoRepasseComissaoEmail({
      nomeAfiliado: 'Téo',
      nomeEvento: 'Meia de Floripa',
      valor: 500,
      saldoRestante: 700,
    });
    const marco = renderAvisoMarcoComissaoEmail({
      nomeAfiliado: 'Téo',
      nomeEvento: 'Meia de Floripa',
      faixa: 100,
      acumulada: 130,
    });
    for (const proibido of ['inscritos', 'receita', 'faturamento', 'ranking']) {
      expect(repasse.texto.toLowerCase()).not.toContain(proibido);
      expect(marco.texto.toLowerCase()).not.toContain(proibido);
    }
  });

  it('valor não-numérico degrada para zero em vez de imprimir NaN', () => {
    const r = renderAvisoRepasseComissaoEmail({
      nomeAfiliado: 'Téo',
      nomeEvento: 'Meia de Floripa',
      valor: Number.NaN,
      saldoRestante: Number.NaN,
    });
    expect(r.texto).not.toContain('NaN');
    expect(r.texto).toContain('0,00');
  });
});

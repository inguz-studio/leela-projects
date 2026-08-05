/**
 * codigoAcessoTemplate.test.ts — S1229-T2 · RN-482 · RN-477
 *
 * O NONO e-mail do catálogo é o único cuja copy tem restrição de SEGURANÇA:
 * ele serve os quatro desfechos da RN-477 e não pode revelar se existe conta
 * no endereço. Um template que diga "bem-vindo de volta" para quem tem conta e
 * "conclua seu cadastro" para quem não tem transforma a caixa de entrada no
 * oráculo que a RN-477 fechou no servidor.
 *
 * Puro: sem Emulator, sem rede.
 */

import { describe, expect, it } from 'vitest';
import { renderCodigoDeAcessoEmail } from '../email/templates';

const CODIGO = '048213';

describe('RN-482 · o nono e-mail é neutro', () => {
  it('o assunto não carrega o endereço nem promete conta', () => {
    const { assunto } = renderCodigoDeAcessoEmail({
      codigo: CODIGO,
      validadeMinutos: 10,
    });
    expect(assunto).toBe('Seu código de acesso à Leela');
    expect(assunto).not.toContain('@');
    expect(assunto.toLowerCase()).not.toContain('cadastro');
    expect(assunto.toLowerCase()).not.toContain('bem-vindo');
  });

  it('nenhuma frase serve a um desfecho e nega os outros', () => {
    const { html, texto } = renderCodigoDeAcessoEmail({
      codigo: CODIGO,
      validadeMinutos: 10,
    });
    // As frases proibidas em letra pela RN-477: as duas primeiras dizem que a
    // conta existe, as duas últimas dizem que não existe.
    const proibidas = [
      'já cadastrado',
      'bem-vindo de volta',
      'sua conta',
      'você não tem conta',
      'conclua seu cadastro',
      'crie sua conta',
    ];
    for (const frase of proibidas) {
      expect(html.toLowerCase()).not.toContain(frase);
      expect(texto.toLowerCase()).not.toContain(frase);
    }
  });

  it('o código aparece UMA vez em cada corpo e não vira link', () => {
    const { html, texto } = renderCodigoDeAcessoEmail({
      codigo: CODIGO,
      validadeMinutos: 10,
    });
    const ocorrenciasHtml = html.split(CODIGO).length - 1;
    const ocorrenciasTexto = texto.split(CODIGO).length - 1;
    expect(ocorrenciasHtml).toBe(1);
    expect(ocorrenciasTexto).toBe(1);

    // Nenhum `href` carrega o código: link seria uma superfície de credencial
    // a mais, e clicável por varredor de caixa corporativa antes da pessoa.
    for (const m of html.matchAll(/href="([^"]*)"/g)) {
      expect(m[1]).not.toContain(CODIGO);
    }
    expect(texto).not.toMatch(new RegExp(`https?://[^\\s]*${CODIGO}`));
  });

  it('zeros à esquerda chegam à caixa intactos', () => {
    const { html, texto } = renderCodigoDeAcessoEmail({
      codigo: '000123',
      validadeMinutos: 10,
    });
    expect(html).toContain('000123');
    expect(texto).toContain('000123');
  });

  it('o prazo dito no texto é o que o servidor aplica', () => {
    const { html, texto } = renderCodigoDeAcessoEmail({
      codigo: CODIGO,
      validadeMinutos: 10,
    });
    expect(html).toContain('10 minutos');
    expect(texto).toContain('10 minutos');
    expect(html).toContain('serve uma vez só');
  });

  it('valor fora do formato é DEFEITO nosso e falha alto', () => {
    // Montagem do servidor: um código truncado (zeros perdidos numa conversão)
    // não pode chegar à caixa de ninguém disfarçado de credencial.
    expect(() =>
      renderCodigoDeAcessoEmail({ codigo: '123', validadeMinutos: 10 })
    ).toThrow(/codigo inválido/);
    expect(() =>
      renderCodigoDeAcessoEmail({ codigo: '12345a', validadeMinutos: 10 })
    ).toThrow();
    expect(() =>
      renderCodigoDeAcessoEmail({
        codigo: 123456 as unknown as string,
        validadeMinutos: 10,
      })
    ).toThrow();
  });

  it('usa a moldura da casa e a costura estável do bloco', () => {
    const { html } = renderCodigoDeAcessoEmail({
      codigo: CODIGO,
      validadeMinutos: 10,
    });
    // A costura estável do bloco e do valor — é por ela que quem precisar
    // separar um pedaço do e-mail não fatia o HTML por um pedaço de CSS.
    expect(html).toContain('data-slot="codigo-acesso"');
    expect(html).toContain('data-slot="codigo-acesso-valor"');
    // E a moldura é a da casa (`identidade.ts`), como nos outros oito.
    expect(html).toContain('alt="Leela"');
    expect(html).toContain('Leela &middot; experiências de bem-estar');
  });
});

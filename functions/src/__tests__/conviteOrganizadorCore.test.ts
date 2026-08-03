/**
 * conviteOrganizadorCore.test.ts — LEELA-S1608-T1
 *
 * Núcleo PURO do convite de organizador (RN-413): alfabeto, tamanho,
 * normalização da digitação e elegibilidade contra o relógio do servidor.
 * Sem Firestore — estas decisões precisam ser exercitáveis sem Emulator,
 * porque a Function de resgate reavalia `conviteResgatavel` dentro da
 * transação e é ali que a corrida do uso único é decidida.
 */
import { describe, expect, it } from 'vitest';
import {
  ALFABETO_CODIGO_ORGANIZADOR,
  ERRO_RESGATE_CONVITE,
  JANELA_RESGATE_CONVITE_MS,
  LIMITE_RESGATE_CONVITE,
  TAMANHO_CODIGO_ORGANIZADOR,
  conviteExpirado,
  conviteResgatavel,
  gerarCodigoOrganizador,
  normalizarCodigoOrganizador,
  validarCodigoOrganizador,
} from '@leela/core';

const AGORA = new Date('2026-08-03T12:00:00.000Z');

describe('constantes (RN-413/415)', () => {
  it('alfabeto exclui os ambíguos 0 O 1 I L', () => {
    for (const proibido of ['0', 'O', '1', 'I', 'L']) {
      expect(ALFABETO_CODIGO_ORGANIZADOR.includes(proibido)).toBe(false);
    }
    expect(ALFABETO_CODIGO_ORGANIZADOR.length).toBe(31);
  });

  it('código de plataforma tem 8 caracteres', () => {
    expect(TAMANHO_CODIGO_ORGANIZADOR).toBe(8);
  });

  it('rate-limit é 5 tentativas por hora', () => {
    expect(LIMITE_RESGATE_CONVITE).toBe(5);
    expect(JANELA_RESGATE_CONVITE_MS).toBe(3_600_000);
  });

  it('erro de resgate é único e não distingue o motivo', () => {
    expect(ERRO_RESGATE_CONVITE).toBe('Código inválido ou já utilizado.');
    for (const vazamento of ['expirad', 'revogad', 'usado', 'existe']) {
      expect(ERRO_RESGATE_CONVITE.toLowerCase()).not.toContain(vazamento);
    }
  });
});

describe('normalizarCodigoOrganizador', () => {
  it('aceita a digitação com hífen, espaço e minúscula', () => {
    expect(normalizarCodigoOrganizador('ab23-cd45')).toBe('AB23CD45');
    expect(normalizarCodigoOrganizador('  AB23 CD45  ')).toBe('AB23CD45');
    expect(normalizarCodigoOrganizador('ab23 - cd45')).toBe('AB23CD45');
  });

  it('remove o travessão e o espaço duro que vêm do copiar-colar', () => {
    expect(normalizarCodigoOrganizador('AB23\u2013CD45')).toBe('AB23CD45');
    expect(normalizarCodigoOrganizador('AB23\u00a0CD45')).toBe('AB23CD45');
  });

  it('não engole caracteres do alfabeto (o S não é separador)', () => {
    expect(normalizarCodigoOrganizador('ss23ss45')).toBe('SS23SS45');
  });

  it('entrada não-string vira string vazia', () => {
    expect(normalizarCodigoOrganizador(null)).toBe('');
    expect(normalizarCodigoOrganizador(undefined)).toBe('');
    expect(normalizarCodigoOrganizador(42)).toBe('');
  });
});

describe('validarCodigoOrganizador', () => {
  it('aceita 8 símbolos do alfabeto', () => {
    expect(validarCodigoOrganizador('AB23CD45')).toBe(true);
  });

  it('recusa tamanho errado, minúscula e símbolo ambíguo', () => {
    expect(validarCodigoOrganizador('AB23CD4')).toBe(false);
    expect(validarCodigoOrganizador('AB23CD456')).toBe(false);
    expect(validarCodigoOrganizador('ab23cd45')).toBe(false);
    expect(validarCodigoOrganizador('AB23CD4O')).toBe(false);
    expect(validarCodigoOrganizador('AB23CD41')).toBe(false);
    expect(validarCodigoOrganizador('')).toBe(false);
  });

  it('recusa quebra de linha embutida (regex ancorada de verdade)', () => {
    expect(validarCodigoOrganizador('AB23CD45\nX')).toBe(false);
  });
});

describe('gerarCodigoOrganizador', () => {
  it('gera código válido com RNG real', () => {
    for (let i = 0; i < 200; i++) {
      expect(validarCodigoOrganizador(gerarCodigoOrganizador())).toBe(true);
    }
  });

  it('RNG degenerado nas bordas não sai do alfabeto', () => {
    expect(gerarCodigoOrganizador(() => 0)).toBe('AAAAAAAA');
    expect(gerarCodigoOrganizador(() => 0.999999999)).toBe('99999999');
    expect(validarCodigoOrganizador(gerarCodigoOrganizador(() => -1))).toBe(true);
    expect(validarCodigoOrganizador(gerarCodigoOrganizador(() => 2))).toBe(true);
  });
});

describe('conviteExpirado / conviteResgatavel (RN-413)', () => {
  it('sem expiraEm nunca expira (P3)', () => {
    expect(conviteExpirado({}, AGORA)).toBe(false);
    expect(conviteExpirado({ expiraEm: null }, AGORA)).toBe(false);
    expect(conviteResgatavel({ status: 'ativo' }, AGORA)).toBe(true);
  });

  it('expira no instante exato da validade', () => {
    expect(conviteExpirado({ expiraEm: AGORA }, AGORA)).toBe(true);
    expect(conviteExpirado({ expiraEm: new Date(AGORA.getTime() + 1) }, AGORA)).toBe(false);
  });

  it('entende Timestamp do Firestore (toMillis)', () => {
    const vencido = { toMillis: () => AGORA.getTime() - 1000 };
    const vigente = { toMillis: () => AGORA.getTime() + 1000 };
    expect(conviteResgatavel({ status: 'ativo', expiraEm: vencido }, AGORA)).toBe(false);
    expect(conviteResgatavel({ status: 'ativo', expiraEm: vigente }, AGORA)).toBe(true);
  });

  it('só `ativo` é resgatável', () => {
    for (const status of ['usado', 'revogado', 'expirado'] as const) {
      expect(conviteResgatavel({ status }, AGORA)).toBe(false);
    }
  });
});

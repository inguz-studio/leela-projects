import { describe, it, expect } from 'vitest';
import {
  MODELOS_ENTRADA,
  PERMISSOES_ADMIN,
  SECOES_CONFIG,
  VISIBILIDADES,
  sanitizeSlug,
} from '../configClube';

describe('sanitizeSlug', () => {
  it('minusculas, sem acento, nao-alfanumerico vira hifen', () => {
    expect(sanitizeSlug('Corrida Perfeita Sul!')).toBe('corrida-perfeita-sul');
  });
  it('remove acentos', () => {
    expect(sanitizeSlug('São João da Barra')).toBe('sao-joao-da-barra');
  });
  it('colapsa e apara hifens', () => {
    expect(sanitizeSlug('  --Runners__2026--  ')).toBe('runners-2026');
  });
  it('string sem alfanumericos vira vazia', () => {
    expect(sanitizeSlug('!!!')).toBe('');
  });
});

describe('constantes de configuracao', () => {
  it('5 secoes ancora', () => {
    expect(SECOES_CONFIG.map((s) => s.id)).toEqual(['identidade', 'pagina', 'regras', 'moderacao', 'admin']);
  });
  it('modelo pago vem desabilitado (RN-104)', () => {
    expect(MODELOS_ENTRADA.find((m) => m.id === 'pago_em_breve')?.disabled).toBe(true);
    expect(MODELOS_ENTRADA.find((m) => m.id === 'gratuito')?.disabled).toBe(false);
  });
  it('3 niveis de visibilidade (RN-140)', () => {
    expect(VISIBILIDADES).toHaveLength(3);
  });
  it('6 permissoes de admin independentes (RN-142)', () => {
    expect(PERMISSOES_ADMIN).toHaveLength(6);
    expect(new Set(PERMISSOES_ADMIN.map((p) => p.id)).size).toBe(6);
  });
});

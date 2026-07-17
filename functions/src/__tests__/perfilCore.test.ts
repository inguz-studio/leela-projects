/**
 * perfilCore.test.ts — LEELA-S1700-T1 (core puro, sem emulador)
 *
 * Unit: handle (RN-160 — formato, normalização case-insensitive, reservados),
 * validarPerfilInput e projeção pública SEM PII (RN-161 + allowlist).
 */
import { describe, expect, it } from 'vitest';
import {
  CAMPOS_PRIVADOS_PERFIL,
  HANDLES_RESERVADOS,
  HANDLE_RE,
  PERFIL_BIO_MAX,
  PERFIL_LINKS_MAX,
  PERFIL_NOME_MAX,
  handleProblema,
  normalizarHandle,
  projetarPerfilPublico,
  validarHandle,
  validarPerfilInput,
  type PerfilInput,
} from '@leela/core';

// ── normalizarHandle (RN-160 — unicidade case-insensitive é estrutural) ────

describe('normalizarHandle (RN-160)', () => {
  it('minusculiza (case-variante colide no MESMO docId)', () => {
    expect(normalizarHandle('CorridaPerfeita')).toBe('corridaperfeita');
    expect(normalizarHandle('corridaperfeita')).toBe('corridaperfeita');
  });

  it('remove UM @ inicial e faz trim', () => {
    expect(normalizarHandle('@corrida_sul')).toBe('corrida_sul');
    expect(normalizarHandle('  @Corrida_Sul  ')).toBe('corrida_sul');
  });

  it('@@duplo não é totalmente consumido (só o primeiro @)', () => {
    expect(normalizarHandle('@@abc')).toBe('@abc'); // reprova no formato depois
  });

  it('não-string/vazio → null', () => {
    expect(normalizarHandle(undefined)).toBeNull();
    expect(normalizarHandle(null)).toBeNull();
    expect(normalizarHandle(42)).toBeNull();
    expect(normalizarHandle('   ')).toBeNull();
    expect(normalizarHandle('@')).toBeNull();
  });
});

// ── validarHandle / handleProblema ─────────────────────────────────────────

describe('validarHandle (RN-160)', () => {
  it.each(['abc', 'corrida_sul', 'a1_b2', 'x'.repeat(30)])('aceita %s', (h) => {
    expect(validarHandle(h)).toBe(true);
  });

  it.each([
    'ab', // < 3
    'x'.repeat(31), // > 30
    'Corrida', // maiúscula (formato é pós-normalização)
    'corrida-sul', // hífen fora do alfabeto
    'corrida sul',
    'açao',
    '@abc',
    '',
  ])('rejeita formato %s', (h) => {
    expect(validarHandle(h)).toBe(false);
  });

  it.each(['__id__', '__proto__', '__x__'])(
    'rejeita padrão de docId reservado do Firestore: %s (review #2)',
    (h) => {
      expect(validarHandle(h)).toBe(false);
      expect(handleProblema(h)).toContain('reservado');
    }
  );

  it('rejeita handle sem nenhum alfanumérico (___)', () => {
    expect(validarHandle('___')).toBe(false);
    expect(handleProblema('___')).toContain('inválido');
  });

  it('rejeita TODOS os reservados (e a lista é minúscula/normalizada)', () => {
    for (const reservado of HANDLES_RESERVADOS) {
      expect(validarHandle(reservado)).toBe(false);
      // Todo reservado casa o formato — senão a entrada nem chegaria na lista
      expect(HANDLE_RE.test(reservado)).toBe(true);
    }
  });

  it('handleProblema: null p/ válido, mensagem p/ reservado e formato', () => {
    expect(handleProblema('@Corrida_Sul')).toBeNull(); // normaliza antes
    expect(handleProblema('@admin')).toContain('reservado');
    expect(handleProblema('ab')).toContain('inválido');
    expect(handleProblema(undefined)).toContain('obrigatório');
  });
});

// ── validarPerfilInput ─────────────────────────────────────────────────────

const INPUT_OK: PerfilInput = {
  handle: '@corrida_perfeita',
  nome: 'Corrida Perfeita',
  bio: 'Assessoria de corrida em Floripa.',
  visibilidade: 'publica',
  linksExternos: [{ label: 'Instagram', url: 'https://instagram.com/cps' }],
};

describe('validarPerfilInput', () => {
  it('payload canônico é válido', () => {
    expect(validarPerfilInput(INPUT_OK)).toEqual([]);
  });

  it('payload mínimo (sem opcionais) é válido', () => {
    expect(
      validarPerfilInput({ handle: 'abc', nome: 'A B', visibilidade: 'privada' })
    ).toEqual([]);
  });

  it('rejeita payload não-objeto', () => {
    expect(validarPerfilInput(null).length).toBeGreaterThan(0);
    expect(validarPerfilInput('x').length).toBeGreaterThan(0);
  });

  it('rejeita handle reservado e formato ruim', () => {
    expect(
      validarPerfilInput({ ...INPUT_OK, handle: '@suporte' }).some((e) =>
        e.includes('reservado')
      )
    ).toBe(true);
    expect(
      validarPerfilInput({ ...INPUT_OK, handle: 'a b' }).length
    ).toBeGreaterThan(0);
  });

  it(`rejeita nome vazio/estourado (${PERFIL_NOME_MAX})`, () => {
    expect(validarPerfilInput({ ...INPUT_OK, nome: '  ' }).length).toBeGreaterThan(0);
    expect(
      validarPerfilInput({ ...INPUT_OK, nome: 'x'.repeat(PERFIL_NOME_MAX + 1) }).length
    ).toBeGreaterThan(0);
  });

  it(`rejeita bio acima de ${PERFIL_BIO_MAX}`, () => {
    expect(
      validarPerfilInput({ ...INPUT_OK, bio: 'x'.repeat(PERFIL_BIO_MAX + 1) }).length
    ).toBeGreaterThan(0);
  });

  it('rejeita visibilidade fora do enum (RN-161)', () => {
    expect(
      validarPerfilInput({ ...INPUT_OK, visibilidade: 'oculta' as never }).length
    ).toBeGreaterThan(0);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', ''])(
    'rejeita avatarUrl/imagemUrl perigosa: %s',
    (url) => {
      expect(
        validarPerfilInput({ ...INPUT_OK, avatarUrl: url }).length
      ).toBeGreaterThan(0);
      expect(
        validarPerfilInput({ ...INPUT_OK, imagemUrl: url }).length
      ).toBeGreaterThan(0);
    }
  );

  it(`rejeita mais de ${PERFIL_LINKS_MAX} links e link com URL perigosa`, () => {
    const muitos = Array.from({ length: PERFIL_LINKS_MAX + 1 }, (_, i) => ({
      label: `L${i}`,
      url: 'https://x.dev',
    }));
    expect(validarPerfilInput({ ...INPUT_OK, linksExternos: muitos }).length).toBeGreaterThan(0);
    expect(
      validarPerfilInput({
        ...INPUT_OK,
        linksExternos: [{ label: 'x', url: 'javascript:alert(1)' }],
      }).length
    ).toBeGreaterThan(0);
  });
});

// ── projetarPerfilPublico (fronteira de PII — allowlist) ───────────────────

describe('projetarPerfilPublico (S1700-T1 · sem PII)', () => {
  const DOC = {
    handle: 'corrida_perfeita',
    tipo: 'organizador',
    ownerUid: 'uid-felipe',
    tenantId: 'corrida-perfeita',
    nome: 'Corrida Perfeita',
    bio: 'Assessoria de corrida.',
    avatarUrl: 'https://cdn.leela.dev/a.jpg',
    imagemUrl: 'https://cdn.leela.dev/capa.jpg',
    visibilidade: 'publica',
    linksExternos: [{ label: 'Site', url: 'https://cps.run' }],
  };

  it('privada → null (404 público honesto — RN-161)', () => {
    expect(
      projetarPerfilPublico('corrida_perfeita', { ...DOC, visibilidade: 'privada' })
    ).toBeNull();
    expect(projetarPerfilPublico('x', {})).toBeNull();
  });

  it('NUNCA vaza ownerUid/tenantId/tipo (allowlist, não blocklist)', () => {
    const pub = projetarPerfilPublico('corrida_perfeita', DOC);
    expect(pub).not.toBeNull();
    for (const campo of CAMPOS_PRIVADOS_PERFIL) {
      expect(pub).not.toHaveProperty(campo);
    }
    expect(pub).not.toHaveProperty('tipo');
    // Campo desconhecido no doc também não vaza
    const comExtra = projetarPerfilPublico('corrida_perfeita', {
      ...DOC,
      cpfDoDono: '123.456.789-00',
    });
    expect(comExtra).not.toHaveProperty('cpfDoDono');
  });

  it('projeta os campos públicos e o flag indexavel (RN-161)', () => {
    const pub = projetarPerfilPublico('corrida_perfeita', DOC);
    expect(pub).toMatchObject({
      handle: 'corrida_perfeita',
      nome: 'Corrida Perfeita',
      bio: 'Assessoria de corrida.',
      indexavel: false,
    });
    const idx = projetarPerfilPublico('corrida_perfeita', {
      ...DOC,
      visibilidade: 'indexavel',
    });
    expect(idx?.indexavel).toBe(true);
  });

  it('descarta URL perigosa e link inválido na SAÍDA (defesa em profundidade)', () => {
    const pub = projetarPerfilPublico('corrida_perfeita', {
      ...DOC,
      avatarUrl: 'javascript:alert(1)',
      imagemUrl: 'data:x',
      linksExternos: [
        { label: 'ok', url: 'https://ok.dev' },
        { label: 'mau', url: 'javascript:alert(1)' },
        { label: '', url: 'https://sem-label.dev' },
      ],
    });
    expect(pub?.avatarUrl).toBeUndefined();
    expect(pub?.imagemUrl).toBeUndefined();
    expect(pub?.linksExternos).toEqual([{ label: 'ok', url: 'https://ok.dev' }]);
  });
});

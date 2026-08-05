// =============================================================================
// functions/src/__tests__/linkDosEmails.contract.test.ts
//
// OS LINKS QUE SAEM NOS E-MAILS, E O ÚNICO LUGAR DE ONDE ELES PODEM VIR
// (lane DEPLOY-EMAIL · trace leela-build-2d6ee98d).
//
// Três consertos de uma linha se acumularam porque cada um morava em
// território de outra lane na hora. Os três são a MESMA classe de defeito: o
// link de um e-mail montado a partir de uma fonte que não é a canônica.
//
//   1. `checkout/contaSemFriccao.ts` — `generatePasswordResetLink(email)` sem
//      `actionCodeSettings` e sem reescrita. O e-mail nº 2 ("conta criada,
//      defina a senha") é a PRIMEIRA tela do produto para quem acabou de
//      pagar, e caía no handler HOSPEDADO do Firebase.
//   2. `affiliation/salvarAfiliado.ts` e
//   3. `assessorias/cadastrarAssessoria.ts` — liam
//      `process.env['NEXT_PUBLIC_LEELA_URL']` cru com fallback
//      `http://localhost:3000`. Em produção só `LEELA_PUBLIC_URL` está setada,
//      então os dois caíam no fallback: TODO convite de afiliado e de
//      assessoria emitido em produção carregava link para a máquina de quem
//      enviou. Defeito VIVO até este commit — as duas functions já estavam
//      deployadas (probe da PAINEL-DEPLOY: 400 nas duas, existem).
//
// POR QUE UM TESTE DE CONTRATO SOBRE O FONTE, E NÃO SÓ COMPORTAMENTO: o
// `basePublica()` já existia e já estava certo quando os dois call sites
// nasceram. O que falhou não foi a função — foi um caminho paralelo até o
// mesmo dado. Comportamento prova o call site de hoje; o contrato prova que
// não nasce um quarto amanhã, que é exatamente como estes três nasceram.
// Mesma disciplina de `secretsBinding.contract.test.ts`.
// =============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { basePublica, ENV_BASE_PUBLICA } from '../eventos/basePublica';
import {
  actionCodeSettingsSenha,
  PAINEL_URL_PADRAO,
  ROTA_REDEFINIR_SENHA,
} from '../auth/linkDeAcao';

const SRC = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1 · O e-mail nº 2 cai na NOSSA tela (contaSemFriccao)
// ---------------------------------------------------------------------------

/**
 * Espião do Admin SDK — só o que o adapter usa. `vi.hoisted` porque o factory
 * de `vi.mock` sobe acima dos imports e não enxergaria um `const` normal.
 */
const espiao = vi.hoisted(() => ({
  gerarLink: vi.fn(
    async (email: string, settings?: unknown): Promise<string> =>
      `https://leela-hub.firebaseapp.com/__/auth/action?mode=resetPassword` +
      `&oobCode=OOB-${encodeURIComponent(email)}&apiKey=AK` +
      (settings === undefined ? '' : '&continueUrl=CU')
  ),
}));

vi.mock('firebase-admin', () => ({
  auth: () => ({
    generatePasswordResetLink: (email: string, settings?: unknown) =>
      espiao.gerarLink(email, settings),
    getUserByEmail: async () => ({ uid: 'u1' }),
    createUser: async () => ({ uid: 'u1' }),
  }),
}));

describe('conta criada · o link de definir senha é NOSSO (contaSemFriccao)', () => {
  it('passa `actionCodeSettings` ao Firebase — sem isso o `continueUrl` não existe', async () => {
    const { contaSemFriccaoAuthAdmin } = await import('../checkout/contaSemFriccao');
    espiao.gerarLink.mockClear();

    await contaSemFriccaoAuthAdmin().gerarLinkDefinirSenha('quem.pagou@example.com');

    expect(espiao.gerarLink).toHaveBeenCalledTimes(1);
    const chamada = espiao.gerarLink.mock.calls[0];
    expect(chamada?.[0]).toBe('quem.pagou@example.com');
    // A versão anterior chamava com UM argumento só.
    // S1223-T2: a origem é `comprador` — quem acabou de pagar aterrissa na
    // LANDING, não no painel. Sem `LEELA_PUBLIC_URL` no ambiente deste teste a
    // origem degrada para o painel, e o caso de domínio vive em
    // `linkSenhaPorOrigem.test.ts`, onde a env é declarada.
    expect(chamada?.[1]).toEqual(actionCodeSettingsSenha('comprador'));
  });

  it('sem base pública, o comprador degrada INTEIRO para o painel (S1223-T2)', async () => {
    const { contaSemFriccaoAuthAdmin } = await import('../checkout/contaSemFriccao');
    espiao.gerarLink.mockClear();

    const link = await contaSemFriccaoAuthAdmin().gerarLinkDefinirSenha(
      'quem.pagou@example.com'
    );
    const url = new URL(link);

    expect(`${url.origin}${url.pathname}`).toBe(
      `${PAINEL_URL_PADRAO}${ROTA_REDEFINIR_SENHA}`
    );
    // A credencial é o código, não a URL que o entregou — ele tem de sobreviver.
    expect(url.searchParams.get('oobCode')).toBe('OOB-quem.pagou@example.com');
    // E o handler hospedado não pode sobrar em lugar nenhum do link.
    expect(link).not.toContain('/__/auth/action');
  });
});

// ---------------------------------------------------------------------------
// 2 · A base pública dos convites vem de `basePublica()` — só de lá
// ---------------------------------------------------------------------------

/** Todos os `.ts` de produção sob `functions/src` (os testes ficam de fora). */
function fontesDeProducao(dir: string = SRC): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      if (entrada === '__tests__' || entrada === 'node_modules') continue;
      saida.push(...fontesDeProducao(caminho));
      continue;
    }
    if (entrada.endsWith('.ts') && !entrada.endsWith('.test.ts')) saida.push(caminho);
  }
  return saida;
}

/**
 * O ÚNICO módulo autorizado a nomear as variáveis da base pública. Qualquer
 * outro que as leia está abrindo um caminho paralelo — foi assim que o
 * `localhost` foi parar no convite de produção.
 */
const DONO_DA_BASE = resolve(SRC, 'eventos', 'basePublica.ts');

function ocorrencias(padrao: RegExp): string[] {
  return fontesDeProducao()
    .filter((f) => f !== DONO_DA_BASE)
    .flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((linha, i) => ({ linha, n: i + 1 }))
        .filter(({ linha }) => padrao.test(linha))
        .map(({ n }) => `${relative(SRC, f).replace(/\\/g, '/')}:${n}`)
    );
}

describe('base pública · uma fonte só (RN-423)', () => {
  it('nenhum módulo de produção lê `NEXT_PUBLIC_LEELA_URL` fora de `basePublica.ts`', () => {
    // Antes deste commit: `affiliation/salvarAfiliado.ts:463` e
    // `assessorias/cadastrarAssessoria.ts:436`.
    expect(
      ocorrencias(/process\.env(\[\s*['"`])?\.?NEXT_PUBLIC_LEELA_URL/)
    ).toEqual([]);
  });

  it('nenhum módulo de produção lê `LEELA_PUBLIC_URL` fora de `basePublica.ts`', () => {
    expect(ocorrencias(/process\.env(\[\s*['"`])?\.?LEELA_PUBLIC_URL/)).toEqual([]);
  });

  it('os dois call sites de convite importam `basePublica`', () => {
    for (const arquivo of [
      'affiliation/salvarAfiliado.ts',
      'assessorias/cadastrarAssessoria.ts',
    ]) {
      const fonte = readFileSync(join(SRC, arquivo), 'utf8');
      expect(fonte, arquivo).toMatch(/import \{ basePublica \} from '[^']*basePublica'/);
      expect(fonte, arquivo).toContain('basePublica()');
    }
  });

  it('na FORMA EXATA do ambiente de produção, a base resolve para a landing', () => {
    // `functions/.env` define LEELA_PUBLIC_URL e mais nada; o alias da landing
    // nunca chegou às Functions. É este ambiente que produzia o defeito vivo:
    // a leitura antiga enxergava só o alias e caía no fallback.
    const producao: Record<string, string | undefined> = {
      [ENV_BASE_PUBLICA]: 'https://leela-landing.web.app',
    };

    expect(producao['NEXT_PUBLIC_LEELA_URL']).toBeUndefined();
    const leituraAntiga = producao['NEXT_PUBLIC_LEELA_URL'] ?? 'http://localhost:3000';
    expect(leituraAntiga).toBe('http://localhost:3000');
    expect(basePublica(producao)).toBe('https://leela-landing.web.app');
  });
});

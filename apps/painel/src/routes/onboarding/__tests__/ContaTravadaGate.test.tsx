// =============================================================================
// Escopo da conta travada (S1609-T2 · RN-416) — decisão pura.
//
// O overlay é EXPERIÊNCIA; a tranca real são as Rules. O que estes testes
// protegem é a decisão de quando mostrá-lo: mostrar cedo demais pisca na cara
// de quem tem acesso, e mostrar de menos deixa a pessoa olhando um painel vazio
// sem explicação.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { rotaLiberadaNaConta } from '../ContaTravadaGate';
import { contaTravada, type ContaOnboardingSession } from '../_data/onboarding';

function sessao(over: Partial<ContaOnboardingSession> = {}): ContaOnboardingSession {
  return { status: 'authenticated', uid: 'u1', role: null, tenantId: null, ...over };
}

describe('contaTravada (RN-416)', () => {
  it('sessão ainda resolvendo NÃO é conta travada', () => {
    // Decidir em 'loading' piscaria o overlay na cara de quem já tem acesso.
    expect(contaTravada(sessao({ status: 'loading', uid: null }))).toBe(false);
  });

  it('anônimo não é conta travada (é problema do RequireSessao)', () => {
    expect(contaTravada(sessao({ status: 'anonymous', uid: null }))).toBe(false);
  });

  it('conta COM tenant passa reto', () => {
    expect(contaTravada(sessao({ role: 'tenant_owner', tenantId: 't1' }))).toBe(false);
  });

  it('platform_admin passa reto mesmo SEM tenant', () => {
    // O super-admin não tem tenantId por natureza — tratá-lo como travado
    // trancaria o dono do sistema para fora do próprio sistema.
    expect(contaTravada(sessao({ role: 'platform_admin' }))).toBe(false);
  });

  it('conta autenticada sem tenant e sem papel de plataforma está TRAVADA', () => {
    expect(contaTravada(sessao({ role: 'athlete' }))).toBe(true);
  });

  it('conta autenticada sem claim nenhuma está TRAVADA', () => {
    expect(contaTravada(sessao())).toBe(true);
  });
});

describe('rotaLiberadaNaConta (RN-416)', () => {
  it('/conta é da PESSOA, não do tenant — a conta travada alcança', () => {
    expect(rotaLiberadaNaConta('/conta')).toBe(true);
    expect(rotaLiberadaNaConta('/conta/seguranca')).toBe(true);
  });

  it('rota de operação não é liberada', () => {
    expect(rotaLiberadaNaConta('/')).toBe(false);
    expect(rotaLiberadaNaConta('/eventos')).toBe(false);
    expect(rotaLiberadaNaConta('/plataforma/convites')).toBe(false);
  });

  it('prefixo parecido não vale como liberação', () => {
    // `/contabilidade` não é `/conta`. Sem o teste de fronteira, qualquer rota
    // futura que comece com as mesmas letras entraria de carona.
    expect(rotaLiberadaNaConta('/contabilidade')).toBe(false);
  });
});

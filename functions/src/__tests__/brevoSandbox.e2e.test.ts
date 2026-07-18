/**
 * brevoSandbox.e2e.test.ts — LEELA-R9E · S-R9-14-T3 (RN-137)
 *
 * E2E OPT-IN contra a API REAL do Brevo (padrão `ASAAS_E2E` do R6).
 * ⚠️ SKIP DOCUMENTADO no gate normal: a `BREVO_API_KEY` NÃO existe ainda
 * (ação externa do Vitor — criar conta Brevo + verificar remetente/domínio).
 *
 * Para rodar quando a chave existir:
 *   BREVO_E2E=1 BREVO_API_KEY=xkeysib-… BREVO_SENDER_EMAIL=<sender verificado> \
 *   BREVO_E2E_TO=<caixa de teste> npx vitest run src/__tests__/brevoSandbox.e2e.test.ts
 *
 * O teste envia 1 e-mail transacional de convite (template sanitizado) para
 * a caixa de teste e valida o messageId. Nada além disso — free tier 300/dia.
 */
import { describe, expect, it } from 'vitest';
import { brevoConfigFromEnv, createBrevoProvider } from '../email/brevoProvider';
import { renderConviteAfiliadoEmail } from '../email/templates';

const optIn =
  process.env['BREVO_E2E'] === '1' &&
  typeof process.env['BREVO_API_KEY'] === 'string' &&
  process.env['BREVO_API_KEY'].length > 0 &&
  typeof process.env['BREVO_E2E_TO'] === 'string';

describe.skipIf(!optIn)('Brevo e2e (opt-in — HTTP REAL)', () => {
  it('envia 1 convite transacional real e recebe messageId', async () => {
    const provider = createBrevoProvider(brevoConfigFromEnv(process.env));
    const email = renderConviteAfiliadoEmail({
      nomeConvidado: 'Teste E2E',
      nomeEvento: 'Meia Floripa (e2e Leela)',
      linkAceite: 'https://leela.dev/convite/afiliado?e=e2e&a=TESTE123&t=token-e2e',
      expiraEmDias: 14,
    });
    const r = await provider.sendTransactional({
      to: { email: process.env['BREVO_E2E_TO'] as string, nome: 'Caixa de teste' },
      assunto: email.assunto,
      html: email.html,
      texto: email.texto,
      tag: 'e2e-leela',
    });
    expect(r.ok).toBe(true);
    expect(r.messageId === null || typeof r.messageId === 'string').toBe(true);
  }, 30_000);
});

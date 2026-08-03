// =============================================================================
// packages/core/src/platform/contatoOnboarding.ts
//
// Canal do CTA "Falar com o time Leela" (E16 · S1609-T2 · RN-417 · P1).
//
// O dono não especificou o canal. Default: o destino vive em `platform/
// configOnboarding.contatoOnboarding` e é editável pelo `platform_admin` SEM
// deploy; sem config, cai no mailto oficial (fail-closed com caminho vivo —
// nunca um botão morto). Hardcodar WhatsApp pessoal em string de código morre
// por LGPD e por custo de troca.
//
// NOTA DE PATH (premissa assumida na S1609-T2): a RN-417 grafou
// `platform/config.contatoOnboarding`, mas `platform/config` guarda a TABELA
// GLOBAL DE TAXA e as Rules a mantêm legível só para `platform_admin` — há
// teste de ataque provando isso (`taxaFlexRules`). Rules do Firestore não
// filtram CAMPO: abrir `platform/config` para a conta travada ler o contato
// entregaria a economia da plataforma junto. O contato passa a viver em
// `platform/configOnboarding`, mesma coleção e mesma semântica (editável sem
// deploy, escrita só do admin), com leitura para qualquer conta autenticada.
// =============================================================================

/** Doc que guarda o canal do CTA — legível por qualquer conta autenticada. */
export const PLATFORM_CONFIG_ONBOARDING_DOC = 'configOnboarding';

/** Caminho completo do doc (coleção `platform`). */
export const CONTATO_ONBOARDING_DOC_PATH = `platform/${PLATFORM_CONFIG_ONBOARDING_DOC}`;

/** Canais suportados pelo CTA (RN-417). */
export type TipoContatoOnboarding = 'whatsapp' | 'email';

export interface ContatoOnboarding {
  tipo: TipoContatoOnboarding;
  /** Número (só dígitos, com DDI) para WhatsApp; e-mail para `email`. */
  valor: string;
}

/**
 * Fallback fail-closed (RN-417). Placeholder consciente: o domínio definitivo
 * é decisão do dono (item 12 do painel) e a troca acontece na config, não
 * aqui. O que este default garante é que o botão SEMPRE tem para onde ir.
 */
export const CONTATO_ONBOARDING_PADRAO: ContatoOnboarding = {
  tipo: 'email',
  valor: 'contato@leela.app',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normaliza o que veio da config. Config ausente, malformada ou com valor
 * vazio cai no padrão — a tela nunca renderiza um CTA sem destino.
 * @pure
 */
export function resolverContatoOnboarding(bruto: unknown): ContatoOnboarding {
  if (bruto === null || typeof bruto !== 'object') return CONTATO_ONBOARDING_PADRAO;
  const { tipo, valor } = bruto as Partial<ContatoOnboarding>;
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    return CONTATO_ONBOARDING_PADRAO;
  }
  if (tipo === 'whatsapp') {
    const digitos = valor.replace(/\D/g, '');
    // Número curto demais não é telefone — cai no padrão em vez de gerar um
    // link de WhatsApp que abre uma conversa com ninguém.
    if (digitos.length < 10) return CONTATO_ONBOARDING_PADRAO;
    return { tipo: 'whatsapp', valor: digitos };
  }
  if (tipo === 'email') {
    const email = valor.trim();
    if (!EMAIL_RE.test(email)) return CONTATO_ONBOARDING_PADRAO;
    return { tipo: 'email', valor: email };
  }
  return CONTATO_ONBOARDING_PADRAO;
}

/**
 * `href` do CTA. WhatsApp vai por `wa.me` (abre app ou web, sem SDK);
 * e-mail por `mailto:` com assunto — quem recebe precisa saber do que se
 * trata sem abrir.
 * @pure
 */
export function hrefContatoOnboarding(contato: ContatoOnboarding): string {
  if (contato.tipo === 'whatsapp') {
    return `https://wa.me/${contato.valor}`;
  }
  return `mailto:${contato.valor}?subject=${encodeURIComponent('Liberar acesso ao painel Leela')}`;
}

// =============================================================================
// apps/landing/app/(public)/_perfil/redes.ts
//
// Inferência da rede social a partir do ENDEREÇO do link — S1707-T2 · RN-444 ·
// D-ACH-17.
//
// Por que inferir e não gravar: o perfil já guarda `{label, url}` com rótulo
// livre digitado pelo organizador, e o endereço já carrega a informação de qual
// rede é. Um campo `rede` no modelo atravessaria validação, projeção pública
// (que é allowlist), Function de escrita e editor do painel para produzir o que
// esta função pura produz sozinha — e que é testável sem banco.
//
// Postel na leitura (D-ACH-17): endereço que não casa com rede conhecida vira
// `site` e CONTINUA aparecendo, com ícone genérico. Nada some da fileira por
// não ser reconhecido.
//
// SEGURANÇA DO CASAMENTO: o domínio casa por igualdade ou por sufixo de rótulo
// (`host === d` ou `host.endsWith('.' + d)`). É a diferença entre reconhecer
// `br.instagram.com` e cair em `instagram.com.golpe.net`, que é hostname de
// outro dono. `notinstagram.com` também não casa, pelo mesmo ponto.
// =============================================================================

/** Redes que a fileira de ícones sabe nomear. `site` é o genérico. */
export type RedeId =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'youtube'
  | 'linkedin'
  | 'github'
  | 'twitch'
  | 'whatsapp'
  | 'tiktok'
  | 'strava'
  | 'site';

/**
 * Domínio → rede. Ordem não importa: o casamento é exato ou por sufixo de
 * rótulo, então dois domínios nunca disputam o mesmo hostname.
 */
const DOMINIO_PARA_REDE: ReadonlyArray<readonly [string, RedeId]> = [
  ['instagram.com', 'instagram'],
  ['instagr.am', 'instagram'],
  ['facebook.com', 'facebook'],
  ['fb.com', 'facebook'],
  ['fb.me', 'facebook'],
  ['twitter.com', 'twitter'],
  ['x.com', 'twitter'],
  ['youtube.com', 'youtube'],
  ['youtu.be', 'youtube'],
  ['linkedin.com', 'linkedin'],
  ['lnkd.in', 'linkedin'],
  ['github.com', 'github'],
  ['twitch.tv', 'twitch'],
  ['whatsapp.com', 'whatsapp'],
  ['wa.me', 'whatsapp'],
  ['tiktok.com', 'tiktok'],
  ['strava.com', 'strava'],
];

/**
 * Rede do link, pelo endereço. `site` quando o endereço não é http(s), não
 * parseia, ou não casa com nenhum domínio conhecido. @pure
 */
export function inferirRede(url: string): RedeId {
  let host: string;
  try {
    const parsed = new URL(url);
    // `mailto:`, `javascript:` e afins não são rede — e nem chegam aqui pela
    // guarda do core, mas a função é pública e precisa se defender sozinha.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'site';
    host = parsed.hostname.toLowerCase();
  } catch {
    return 'site';
  }

  if (host.startsWith('www.')) host = host.slice(4);

  for (const [dominio, rede] of DOMINIO_PARA_REDE) {
    if (host === dominio || host.endsWith(`.${dominio}`)) return rede;
  }
  return 'site';
}

/**
 * Nome ACESSÍVEL do ícone (RN-444): é o rótulo que o organizador digitou. A
 * redução para ícone tira o rótulo da tela, não da página — ele vai para o
 * nome acessível e para a dica. Rótulo vazio (não deveria chegar: a projeção
 * do core já exige `label` não vazio) cai no hostname, nunca em nome mudo.
 */
export function nomeAcessivelDoLink(label: string, url: string): string {
  const rotulo = label.trim();
  if (rotulo.length > 0) return rotulo;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Link externo';
  }
}

// =============================================================================
// Máscara de PII para exibição no cliente (LGPD · S203-T3 · slide-in `[reg]`).
//
// ⚠️ Máscara é UX, NÃO controle de acesso: quem NÃO pode ver o dado nunca o
// recebe (as Security Rules de `inscritos` já barram — só o organizador lê).
// Estas funções reduzem exposição de ombro/screenshot no default; o valor
// real fica atrás de um toggle explícito na UI. NUNCA logar o valor cru.
//
// Puras e testáveis (sem React/DOM). Recebem o dado JÁ validado pelo core
// (cpfValido/telefoneValido no parse) — aqui só formatamos o que exibir.
// =============================================================================

/** Placeholder de dígito mascarado (bullet — não é o dígito real). */
const BULLET = '•';

/**
 * Mascara uma referência OPACA (inscritoId/membroId) para exibição em lista
 * densa: `••••{4 últimos}` (mesma gramática do telefone). O docId não é dado
 * pessoal DIRETO, mas é um identificador LINKÁVEL ao inscrito — na superfície
 * densa da aba Comunicação (E06-L3) ele nunca aparece por inteiro (LGPD; brief:
 * "PII nunca em claro em lista densa"). Serve só de âncora de desambiguação; o
 * valor cru mora na camada de dados, NUNCA no DOM/console. @pure
 */
export function mascararRef(ref: string): string {
  const limpo = ref.trim();
  if (limpo.length <= 4) return BULLET.repeat(4);
  return `${BULLET.repeat(4)}${limpo.slice(-4)}`;
}

/**
 * Mascara um CPF para `•••.•••.###-##` (brief S203-T3): os 6 primeiros
 * dígitos viram bullets, os 5 últimos (3º grupo + verificador) ficam
 * visíveis — o suficiente para o organizador CONFERIR sem expor o documento
 * inteiro. Aceita CPF com ou sem máscara na entrada. @pure
 */
export function mascararCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return `${BULLET.repeat(3)}.${BULLET.repeat(3)}.${BULLET.repeat(3)}-${BULLET.repeat(2)}`;
  const g3 = d.slice(6, 9);
  const dv = d.slice(9, 11);
  return `${BULLET.repeat(3)}.${BULLET.repeat(3)}.${g3}-${dv}`;
}

/** Formata um CPF cru (11 dígitos) para `###.###.###-##`. @pure */
export function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/**
 * Mascara um telefone preservando só os 4 últimos dígitos: `(••) •••••-1234`.
 * Aceita máscara livre na entrada (validação permissiva do core). Quando há
 * menos de 4 dígitos (não deveria após o parse), mascara tudo. @pure
 */
export function mascararTelefone(telefone: string): string {
  const d = telefone.replace(/\D/g, '');
  if (d.length < 4) return BULLET.repeat(Math.max(d.length, 4));
  const visiveis = d.slice(-4);
  return `(${BULLET.repeat(2)}) ${BULLET.repeat(5)}-${visiveis}`;
}

/**
 * Formata um telefone cru para exibição legível quando revelado.
 * 11 dígitos (móvel): `(48) 99999-0001`; 10 (fixo): `(48) 3333-0001`; 12/13
 * (com DDI): prefixa `+DDI `. Fora desses casos, devolve como veio. @pure
 */
export function formatarTelefone(telefone: string): string {
  const d = telefone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return telefone;
}

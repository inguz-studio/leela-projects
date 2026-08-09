// =============================================================================
// functions/src/platform/elegibilidadeOrganizador.ts
//
// A régua ÚNICA de "esta conta pode virar organizadora por autoatendimento?"
// (RN-414 · PONTE-ELEGIVEL-1).
//
// -----------------------------------------------------------------------------
// POR QUE ESTE ARQUIVO EXISTE
// -----------------------------------------------------------------------------
// O caminho do autoatendimento tem duas guardas e elas estavam recusando
// listas diferentes:
//
//   PORTA   `promoverParaProfissional` — recusava só a conta de plataforma;
//   PORTÃO  `resgatarConviteOrganizador` — recusa `platform_admin`,
//           `tenant_owner`, `tenant_staff`, `promoter` e o `athlete` com o
//           marcador de demoção deliberada.
//
// O divulgador e a ex-organizadora rebaixada passavam pela porta, esperavam o
// código e recebiam a recusa genérica da RN-414 no portão — indistinguível de
// "código inválido". Inconsistência de contrato entre duas guardas do MESMO
// caminho, e não escolha de produto (medição em `PONTE-REV`).
//
// A régua mora aqui, sozinha, porque a segunda cópia de uma lista de papéis é
// a divergência de amanhã: quem editasse uma esqueceria a outra, e o beco
// voltaria mudado de lugar. A porta e o portão IMPORTAM daqui; nenhum dos dois
// reescreve a lista.
//
// -----------------------------------------------------------------------------
// A RÉGUA, DITA EM UMA FRASE
// -----------------------------------------------------------------------------
// Passa quem não tem papel algum e o `athlete` LIMPO. Todo o resto não passa.
//
// `athlete` é o papel que o `onCreateUser` dá por default a TODA conta nova
// (RN-411) — recusá-lo barraria o caso legítimo mais comum do produto. Já o
// `athlete` COM `demotedFromRole` é outra coisa: o marcador só é gravado pelo
// `mergeTenantClaims` quando um admin rebaixa alguém de propósito, e re-elevar
// essa conta por autoatendimento desfaria uma decisão administrativa em
// silêncio. É a mesma leitura pinada em `provisionTenant.ts` (fix L2 #12).
//
// Nada aqui AUTORIZA: a autoridade continua sendo o `provisionTenantCore`.
// Este predicado só antecipa o "não" para que ele chegue com nome, e cedo.
// =============================================================================

/**
 * O crachá, do jeito que cada chamador consegue ler.
 *
 * O portão lê de `admin.auth().getUser()`, onde a claim ausente é `undefined`.
 * A porta lê do token do callable, onde a tradução já normaliza ausência para
 * `null` (`callerDaPromocao`). Os dois valores significam a mesma coisa e o
 * predicado trata os dois — assumir só um deles seria plantar a divergência
 * que este arquivo existe para impedir.
 */
export interface ClaimsDeElegibilidade {
  /** Papel LITERAL da claim. Ausente = conta sem papel algum. */
  role?: string | null;
  /**
   * Marcador de demoção deliberada. Gravado e apagado SOMENTE pelo
   * `mergeTenantClaims`, sempre com o papel anterior (string não vazia) —
   * `null` e `undefined` significam, os dois, "sem marcador".
   */
  demotedFromRole?: unknown;
}

/** Há marcador de demoção deliberada no crachá? */
function demovidaDePropositoConta(marcador: unknown): boolean {
  return marcador !== undefined && marcador !== null;
}

/**
 * A conta pode virar dona de um tenant pelo caminho de autoatendimento?
 *
 * Puro de propósito: sem I/O, sem SDK e sem exceção. Quem lê o crachá é o
 * chamador — o portão pelo Auth Admin, a porta pelo token —, e a decisão é
 * uma só.
 */
export function contaElegivelParaPapelDeOrganizador(
  claims: ClaimsDeElegibilidade
): boolean {
  const papel = claims.role ?? undefined;
  if (papel === undefined) return true;
  return papel === 'athlete' && !demovidaDePropositoConta(claims.demotedFromRole);
}

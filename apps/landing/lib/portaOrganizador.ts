// =============================================================================
// apps/landing/lib/portaOrganizador.ts — qual porta a conta enxerga (S1222-T5).
//
// PONTO ÚNICO DE DECISÃO, e puro de propósito: a regra que decide qual botão
// aparece é a RN-449 virando tela, e uma regra de autorização escrita dentro de
// um componente é uma regra que ninguém consegue falsificar sem montar o
// componente inteiro.
//
// AS TRÊS RESPOSTAS
//
//   `organizador` — a conta TAMBÉM é organizadora (tem tenant). Ganha o botão
//     para o painel do organizador. Premissa que sustenta o desenho: "botão
//     para entrar na área de administrador", na frase do dono, é a área do
//     ORGANIZADOR. Está no painel como ADMINSEP-2, aguardando ratificação; se
//     o dono ratificar a outra leitura, muda AQUI e em nenhum outro lugar.
//
//   `criar` — a conta é só cliente. Ganha "criar conta de organizador", que
//     leva à MESMA máquina do `/cadastrar` do painel: um doc
//     `profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'`
//     (RN-411) e o overlay bloqueante da ONBOARD-BUILD (RN-416). Uma máquina
//     só, dois botões — a landing não constrói um segundo caminho de cadastro,
//     porque dois caminhos divergem na primeira mudança de termo LGPD.
//
//   `null` — conta de ADMINISTRAÇÃO da plataforma. Nenhuma porta. A RN-449
//     proíbe o acúmulo entre administração e cliente, então nem o caminho para
//     o painel do organizador (que ela não é) nem o convite a criar um
//     (que seria exatamente o acúmulo proibido). E, sobretudo: NENHUM caminho
//     da área do cliente alcança `/plataforma` — é este o ponto em que a
//     RN-449 vira tela, e o caso de teste tem de existir com esse nome.
//
// O QUE NÃO ESTÁ AQUI, e é estrutural: o tipo `RotaPainel` (`lib/painel.ts`)
// só admite `/entrar` e `/cadastrar`. Não existe valor que produza uma URL de
// `/plataforma` a partir desta camada — a proibição é do compilador, não de
// uma checagem que alguém possa esquecer.
// =============================================================================

/** Qual porta desenhar na área do cliente. `null` = nenhuma. */
export type PortaDaConta = 'organizador' | 'criar' | null;

/** Papéis que fazem de uma conta também organizadora (ADR-008). */
const PAPEIS_DE_ORGANIZADOR = ['tenant_owner', 'tenant_staff'] as const;

/**
 * Decide a porta a partir das claims do token. `null` de entrada (claims ainda
 * não lidas) devolve `null` de saída: não desenhar botão é sempre reversível;
 * desenhar o errado, não. @pure
 */
export function portaDaConta(claims: Record<string, unknown> | null): PortaDaConta {
  if (claims === null) return null;

  const role = typeof claims['role'] === 'string' ? claims['role'] : '';
  // RN-449, primeiro e antes de tudo: administração da plataforma não acumula
  // com cliente nem com organizador, e a área do cliente não é porta para ela.
  //
  // ⚠️ AQUI O PAPEL LITERAL ESTÁ CERTO, e trocá-lo por `isPlatformAdmin` é uma
  // regressão — a varredura da FRONTEIRA-AUTH passou por esta linha e a deixou
  // de pé de propósito. O que se pergunta aqui não é "esta conta administra a
  // plataforma?", é "esta conta é SÓ administradora da plataforma?". Desde a
  // lane PAPEL-DUPLO a administração é CAPACIDADE e coexiste com o papel
  // operacional: o dono é `tenant_owner` da produtora dele E administra a
  // plataforma. Com `isPlatformAdmin` ele cairia neste `return null` e PERDERIA
  // a porta de organizador na própria área de cliente — a conta mais legítima
  // do sistema ficando sem o botão que ela é a mais qualificada para usar.
  //
  // Quem tem a capacidade e nenhum papel de organizador cai adiante em `criar`,
  // que é o correto: a área do cliente não tem, nem deve ter, porta para
  // `/plataforma` (o tipo `RotaPainel` torna isso impossível por construção).
  if (role === 'platform_admin') return null;

  if ((PAPEIS_DE_ORGANIZADOR as readonly string[]).includes(role)) return 'organizador';

  // Claim de papel ausente mas tenant carimbado: conta de organizador com
  // token velho (a âncora `equipe/{uid}` da RN-401 existe justamente porque o
  // token demora a refletir). Vale como organizadora — o painel decide o resto.
  const tenantId = claims['tenantId'];
  if (typeof tenantId === 'string' && tenantId.length > 0) return 'organizador';

  return 'criar';
}

// =============================================================================
// functions/src/platform/promoverParaProfissional.ts
//
// Cloud Function callable: virar profissional a partir da área do cliente
// (E12 · S1234-T1 · RN-512, com destino na RN-514).
//
// Contrato:
//   promoverParaProfissional({ aceiteTermo: true, intencao?, nomeProfissional? })
//     -> { statusOnboarding, jaExistia, intencaoRegistrada, nomeAplicado }
//
// -----------------------------------------------------------------------------
// A RESPOSTA ECOA O QUE ELA ACEITOU (PONTE-FIX · B1 da PONTE-REV)
// -----------------------------------------------------------------------------
// O retorno era `{ statusOnboarding, jaExistia }` e não dizia UMA palavra sobre
// os dois campos novos. Isso deixava um buraco caro: nem a tela nem uma sonda de
// fumaça conseguiam distinguir "o servidor gravou o meu nome" de "o servidor
// ignorou o meu nome em silêncio". E o segundo desfecho é alcançável de verdade
// — basta a landing nova falar com um servidor velho, ou com um `dist/` do
// api-client defasado, e o campo desconhecido atravessa sem uma linha de recusa
// (o `onCall` do `firebase-functions/v1` não valida shape).
//
// Então a resposta passa a ECOAR: `intencaoRegistrada` devolve o rótulo que o
// log carimbou e `nomeAplicado` diz se `organizacao` foi efetivada NESTA
// chamada. Os dois são ADITIVOS e o cliente velho os ignora — ninguém quebra.
// Com eles, "gravou" e "ignorou" viram dois valores diferentes, e a distinção
// deixa de depender de disciplina de deploy.
//
// -----------------------------------------------------------------------------
// A INTENÇÃO É CARIMBADA AQUI, E É POR ISSO QUE OS DOIS CTAs PODEM SUBIR
// (PONTE-CTA-1)
// -----------------------------------------------------------------------------
// O dono pediu dois CTAs por intenção — "Criar Club" e "Organizar eventos". A
// lane de 08/08 entregou um só, e a razão escrita foi honesta: a landing não
// tem uma linha de telemetria, então dois botões disparando a MESMA promoção
// não diriam qual converteu. A razão era de calendário, não de impossibilidade
// — a review de 08/08 mediu que esta callable já loga por conta própria, e um
// campo aqui mede o clique E a conversão, porque o resgate do código também
// loga e o `uid` junta os dois.
//
// `intencao` é TELEMETRIA, e telemetria não recusa ninguém: valor ausente vira
// `nao_declarada` (é o cliente velho, que não conhece o campo) e valor
// desconhecido vira `invalida` — nunca `nao_declarada`. Fundir o typo do
// cliente novo com o silêncio do cliente velho corromperia em silêncio a única
// medição que este campo existe para produzir; separados, um pico de
// `invalida` no Cloud Logging aparece.
//
// -----------------------------------------------------------------------------
// O NOME DA PRODUTORA É PERGUNTADO NA PORTA, PORQUE DEPOIS NÃO EXISTE
// (PONTE-NOME-1)
// -----------------------------------------------------------------------------
// `organizacao` nascia SEMPRE vazio aqui, e o resgate do código (`sementeDoSlug`)
// caía no nome da pessoa e, na falta dele, no local-part do e-mail. O slug é
// cunhado UMA vez e é definitivo: `profissionais/{uid}` só admite `create` pelo
// cliente (Rules), não existe callable que atualize o doc a pedido da dona, e
// renomear tenant é exclusivo de platform_admin. O comentário que dizia "a
// pessoa preenche o perfil dela no painel" descrevia algo que não existe.
//
// O conserto é na ORIGEM e cabe no contrato que já existe: a porta pergunta o
// nome, pré-preenchido com o nome da pessoa e editável, e o campo desce até
// `organizacao`. Nada de provisionamento de tenant muda — o resgate continua
// lendo o mesmo campo, do mesmo jeito. Só que agora ele foi ESCOLHIDO.
//
// Nome declarado e inválido é RECUSA nomeada, não descarte silencioso: quem
// digitou um nome e recebeu sucesso com o nome jogado fora está exatamente no
// defeito que este item existe para matar. Nome ausente segue o caminho de
// antes (`''`), e é o que mantém o cliente velho vivo.
//
// -----------------------------------------------------------------------------
// POR QUE ESTA FUNCTION EXISTE
// -----------------------------------------------------------------------------
// A área do cliente mandava a participante LOGADA para o `/cadastrar` do
// painel, que chama `criarContaComEmail`. O e-mail dela já existe no Auth, o
// Firebase devolve `auth/email-already-in-use` e a máscara anti-enumeração —
// que está certa e não muda — engole o erro. Ela ficava sem caminho.
//
// A RN-512 diz o que fazer no lugar: virar profissional é PROMOÇÃO da conta
// que já existe. Esta Function é o gesto de promoção, e ela é a única peça de
// servidor que a ponte precisa.
//
// -----------------------------------------------------------------------------
// O QUE ELA NÃO CONCEDE — e é isto que faz dela uma ponte, não um portão
// -----------------------------------------------------------------------------
// Nenhum custom claim é tocado aqui. Não há `setCustomUserClaims` neste
// arquivo, e não pode passar a haver: a promoção NÃO dá tenant, NÃO dá papel e
// NÃO dá capacidade de plataforma. O que ela concede é o documento
// `profissionais/{uid}` que a guarda de conta órfã do `destinoPosLogin`
// procura — e o destino, por construção da RN-510, é a VITRINE, que não faz
// consulta tenant-scoped nenhuma. O pior desfecho de um abuso é alguém ver a
// vitrine. A prova disso é teste em nome próprio (S1234-T3), não presunção.
//
// -----------------------------------------------------------------------------
// O TERMO NÃO NASCE AQUI (RN-466)
// -----------------------------------------------------------------------------
// O termo do profissional já existe: `TERMO_LGPD_VERSAO`/`TERMO_LGPD_FINALIDADE`
// do core, o MESMO que o `criarPerfilOrganizador` carimba em
// `profissionais/{uid}.consentimentoLgpd`. Criar constante nova aqui seria a
// segunda autoridade sobre o mesmo texto, e no dia em que ele mudasse uma das
// duas superfícies carimbaria a versão errada — a divergência que a RN-466
// existe para impedir.
//
// O INSTANTE É DO SERVIDOR (RN-446). Aceite datado pelo cliente é recusado, e
// não silenciosamente ignorado: um payload que traga data ou versão do termo é
// uma tela tentando carimbar consentimento, e ela não tem autoridade para isso.
//
// -----------------------------------------------------------------------------
// IDEMPOTÊNCIA NÃO É HIGIENE AQUI (RN-512, fluxo C)
// -----------------------------------------------------------------------------
// A área do cliente é uma tela de leitura. Um duplo clique não pode produzir
// dois estados de onboarding, nem recoletar consentimento já carimbado
// (RN-467). A decisão "existe ou não" acontece DENTRO de uma transação — duas
// chamadas simultâneas são serializadas pelo Firestore, uma escreve e a outra
// relê o doc pronto e devolve `jaExistia: true`. Um `get` seguido de `set`
// fora de transação deixaria a janela em que as duas leem "não existe".
//
// -----------------------------------------------------------------------------
// A LEITURA DA RN-449 QUE ELA HERDA
// -----------------------------------------------------------------------------
// A recusa da conta de administração usa o PAPEL LITERAL (`role ===
// 'platform_admin'`), e não `isPlatformAdmin`. É a mesma leitura pinada em
// `apps/landing/lib/portaOrganizador.ts`: a pergunta é "esta conta é SÓ da
// plataforma?", não "esta conta administra a plataforma?". Desde a PAPEL-DUPLO
// a administração é CAPACIDADE e coexiste com papel operacional — o dono é
// `tenant_owner` da produtora dele E administra a plataforma. Com
// `isPlatformAdmin` ele seria recusado aqui, e a ponte perderia exatamente a
// conta mais legítima do sistema.
//
// -----------------------------------------------------------------------------
// A PORTA RECUSA O QUE O PORTÃO RECUSA (PONTE-ELEGIVEL-1)
// -----------------------------------------------------------------------------
// A porta recusava só a conta de plataforma; o portão do código
// (`resgatarConviteOrganizador`) recusa cinco estados. O divulgador
// (`promoter`) e a ex-organizadora rebaixada de propósito (`athlete` com
// `demotedFromRole` — rebaixar APAGA o `tenantId`, então ela reaparece como
// participante) atravessavam esta porta, esperavam o convite e recebiam a
// recusa genérica da RN-414 lá adiante, indistinguível de "código inválido".
//
// Não era escolha de produto: era inconsistência de contrato entre duas
// guardas do mesmo caminho. A régua passou a morar em
// `elegibilidadeOrganizador.ts` e as duas a leem — aqui pelo TOKEN, lá pelo
// Auth Admin. Nenhuma cópia de lista de papéis nasce neste arquivo.
//
// O anti-enumeração não sofre: a recusa fala da conta que JÁ está logada, e
// não do estado de conta de terceiro. Não há endereço de e-mail de entrada.
//
// Zero PII em log: uid e flags.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  ORGANIZACAO_MAX,
  ORGANIZACAO_MIN,
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
  derivarSlugOrganizacao,
} from '@leela/core';
import { contaElegivelParaPapelDeOrganizador } from './elegibilidadeOrganizador';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/**
 * Qual dos dois CTAs por intenção foi apertado (PONTE-CTA-1).
 *
 * As duas intenções são SIMÉTRICAS no produto: `/clubes/novo` e a criação de
 * evento estão atrás do mesmo tenant, e o mesmo código Leela abre as duas.
 * Por isso os dois botões disparam a MESMA promoção e só se distinguem aqui.
 */
export type IntencaoDaTravessia = 'eventos' | 'clube';

/** O que o log carimba: as duas intenções, mais os dois estados de ausência. */
export type IntencaoRegistrada = IntencaoDaTravessia | 'nao_declarada' | 'invalida';

export interface PromoverParaProfissionalInput {
  /** Aceite do termo do profissional, colhido na tela (RN-466). */
  aceiteTermo: boolean;
  /** Qual CTA foi apertado (PONTE-CTA-1). Telemetria — nunca recusa. */
  intencao?: IntencaoDaTravessia;
  /**
   * O nome da produtora, escolhido na porta (PONTE-NOME-1). Ausente mantém o
   * comportamento anterior: `organizacao` nasce vazio e o resgate semeia o
   * slug com o nome da pessoa.
   */
  nomeProfissional?: string;
}

export interface PromoverParaProfissionalResult {
  /** Sempre `aguardando_convite` (RN-411) — a ponte não ativa ninguém. */
  statusOnboarding: 'aguardando_convite';
  /** true = a conta já alcançava o painel profissional; nada foi escrito. */
  jaExistia: boolean;
  /**
   * O ECO da intenção (PONTE-FIX · B1). É o rótulo que o log carimbou, e não o
   * que o cliente mandou: um typo volta como `invalida` e o cliente velho volta
   * como `nao_declarada`. Uma sonda de fumaça que receba `undefined` aqui está
   * falando com um servidor ANTERIOR a este contrato — que é exatamente o
   * desfecho que ninguém conseguia enxergar antes.
   */
  intencaoRegistrada: IntencaoRegistrada;
  /**
   * O ECO do nome (PONTE-FIX · B1/R1). `true` só quando `organizacao` foi
   * efetivada NESTA chamada. Declarar um nome e receber `false` é o descarte
   * silencioso ficando audível: acontece nos dois ramos idempotentes (conta com
   * tenant e doc pré-existente), onde o nome digitado não tem para onde ir.
   */
  nomeAplicado: boolean;
}

/**
 * As recusas, nomeadas. Viajam em `details.motivo` para que a tela escolha a
 * frase sem reconstruir a regra a partir do código HTTP — e para que nenhuma
 * delas precise sair como `internal`, que é a lição do DEF-B da ONBOARD-REV.
 */
export type MotivoRecusaPromocao =
  | 'sem_sessao'
  | 'sessao_anonima'
  | 'conta_de_plataforma'
  | 'conta_inelegivel'
  | 'aceite_ausente'
  | 'aceite_datado_pelo_cliente'
  | 'nome_profissional_invalido';

/** O chamador, já destrinchado do token. */
export interface CallerPromocao {
  uid: string;
  /** Provedor `anonymous` (ou ausente) — sessão do checkout, não da ponte. */
  ehAnonimo: boolean;
  email: string | null;
  /** `name` do token, quando existe. Nunca inventado a partir do e-mail. */
  nome: string | null;
  /** Papel LITERAL da claim. Ver a nota da RN-449 no topo. */
  role: string | null;
  /**
   * Marcador de demoção deliberada (`mergeTenantClaims`), como veio do TOKEN —
   * não do Auth Admin, que não entra neste módulo e cuja ausência aqui é
   * metade da prova de que a ponte não concede nada.
   *
   * `unknown` de propósito: só a PRESENÇA decide, e é exatamente assim que o
   * portão do código o lê. Estreitar para `string` aqui faria um marcador
   * malformado desaparecer no caminho — fail-open num campo que existe para
   * dizer "não".
   */
  demotedFromRole: unknown;
  /** Tenant carimbado na claim, quando existe. */
  tenantId: string | null;
}

type Db = admin.firestore.Firestore;

const COLECAO_PROFISSIONAIS = 'profissionais';

/** Recusa tipada, com motivo legível pela tela. Nunca `internal`. */
function recusa(
  code: 'unauthenticated' | 'permission-denied' | 'failed-precondition' | 'invalid-argument',
  motivo: MotivoRecusaPromocao,
  mensagem: string
): https.HttpsError {
  return new https.HttpsError(code, mensagem, { motivo });
}

/**
 * Campos que o cliente NÃO pode mandar junto do aceite (RN-446). A presença de
 * qualquer um deles é uma tela tentando datar ou versionar o consentimento —
 * quem data é o servidor, e aceite datado pelo titular não vale como prova.
 */
const CAMPOS_DE_CARIMBO = ['aceitoEm', 'aceitoem', 'versao', 'consentimentoLgpd', 'criadoEm'];

/** As duas intenções que a porta sabe carimbar. Fonte única do `includes`. */
const INTENCOES: readonly IntencaoDaTravessia[] = ['eventos', 'clube'];

/**
 * Lê a intenção do payload SEM nunca recusar (PONTE-CTA-1).
 *
 * Os dois estados de ausência são separados de propósito, e a separação é a
 * regra e não capricho: `nao_declarada` é o cliente que não conhece o campo (a
 * landing hoje no ar), e `invalida` é o cliente que conhece e mandou outra
 * coisa. Fundir os dois faria um typo de deploy novo desaparecer dentro do
 * volume do deploy velho, e a medição diria que ninguém clicou.
 */
export function normalizarIntencao(bruta: unknown): IntencaoRegistrada {
  if (bruta === undefined || bruta === null) return 'nao_declarada';
  if (typeof bruta === 'string' && (INTENCOES as readonly string[]).includes(bruta)) {
    return bruta as IntencaoDaTravessia;
  }
  return 'invalida';
}

/**
 * Lê o nome da produtora do payload (PONTE-NOME-1).
 *
 * Devolve `null` quando não foi declarado — o caminho de antes, e o que
 * mantém o cliente velho funcionando. Lança a recusa nomeada quando foi
 * declarado e não serve: descartar em silêncio um nome digitado é o defeito
 * que este item existe para matar, e é pior que a recusa porque a pessoa só
 * descobre no dia em que o slug já está cunhado.
 *
 * A régua tem TRÊS partes, e a terceira é a que quase escapa: o comprimento
 * (`ORGANIZACAO_MIN`/`MAX`, importados do core — a MESMA constante que o
 * `/cadastrar` lê, e não uma segunda cópia) e, além dele, o slug DERIVADO
 * precisa sobrar. `"!!"` tem dois caracteres e `derivarSlugOrganizacao` o
 * reduz a `''` — aceitá-lo devolveria à pessoa a semente do nome pessoal com
 * cara de escolha feita.
 *
 * ⚠️ AS DUAS PORTAS NÃO ACEITAM O MESMO CONJUNTO, e a frase antiga afirmava que
 * sim (PONTE-FIX · R2). O eixo do COMPRIMENTO é literalmente a mesma constante
 * nas duas, mas `validarCadastroOrganizador` não checa derivabilidade: o
 * `/cadastrar` ACEITA `"!!"` e esta porta o RECUSA. A divergência é fail-safe —
 * a porta é a mais estrita, e o que ela barra é justamente o que produziria
 * endereço vazio — então ela fica, declarada, em vez de virar promessa falsa de
 * paridade. Unificar a régua no core é card próprio (a recomendação R2.1 da
 * PONTE-REV), e mexe no `/cadastrar`, que não é território desta lane.
 *
 * A FRASE DA RECUSA DIZ A RÉGUA DE VERDADE (PONTE-FIX · B2). A anterior —
 * "pelo menos duas letras ou números" — mentia para quem escrevia em alfabeto
 * não latino: `Анна` tem quatro letras, `ゆき` tem duas, e as duas viram `''`
 * porque `derivarSlugOrganizacao` só preserva `[a-z0-9]` depois do NFD. A régua
 * real é "dois caracteres no total E pelo menos um caractere latino ou
 * numérico", e é isso que a pessoa precisa ler.
 */
export function nomeProfissionalDoPayload(bruto: unknown): string | null {
  if (bruto === undefined || bruto === null) return null;
  const recusaDoNome = (): never => {
    throw recusa(
      'invalid-argument',
      'nome_profissional_invalido',
      'Escolha um nome com dois caracteres ou mais e pelo menos uma letra de A a Z ou um número. O endereço da sua produtora é escrito só com esses caracteres.'
    );
  };
  if (typeof bruto !== 'string') return recusaDoNome();
  const nome = bruto.trim();
  // String vazia é o campo que a pessoa deixou em branco depois de apagar o
  // pré-preenchido. Não é erro dela: é a escolha de não escolher, e ela cai
  // no caminho de antes.
  if (nome.length === 0) return null;
  if (nome.length < ORGANIZACAO_MIN || nome.length > ORGANIZACAO_MAX) return recusaDoNome();
  if (derivarSlugOrganizacao(nome).length === 0) return recusaDoNome();
  return nome;
}

/**
 * Traduz o token de um callable para o contrato do chamador. Isolado do
 * `onCall` para que o core seja testável sem emulator — e porque a checagem de
 * anônimo é exatamente o tipo de linha que some numa segunda tradução.
 */
export function callerDaPromocao(auth: {
  uid: string;
  token: {
    email?: string;
    name?: string;
    role?: unknown;
    demotedFromRole?: unknown;
    tenantId?: unknown;
    firebase?: { sign_in_provider?: string };
  };
}): CallerPromocao {
  const provider = auth.token.firebase?.sign_in_provider;
  return {
    uid: auth.uid,
    // Provedor ausente é tratado como anônimo (fail-closed): token sem
    // procedência declarada não prova identidade nomeada.
    ehAnonimo: provider === undefined || provider === 'anonymous',
    email: typeof auth.token.email === 'string' ? auth.token.email : null,
    nome: typeof auth.token.name === 'string' ? auth.token.name : null,
    role: typeof auth.token.role === 'string' ? auth.token.role : null,
    // Sem estreitamento: o marcador atravessa cru, porque quem decide é a
    // presença dele e não o formato (ver `CallerPromocao.demotedFromRole`).
    demotedFromRole: auth.token.demotedFromRole,
    tenantId: typeof auth.token.tenantId === 'string' ? auth.token.tenantId : null,
  };
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * A promoção, sem o wrapper de transporte. Recebe o db e o chamador já lidos.
 */
export async function promoverParaProfissionalCore(
  db: Db,
  caller: CallerPromocao,
  rawInput: unknown
): Promise<PromoverParaProfissionalResult> {
  // ── 1. O aceite, antes de tudo (RN-446/RN-466) ─────────────────────────
  const input = (rawInput ?? {}) as Record<string, unknown>;
  for (const campo of CAMPOS_DE_CARIMBO) {
    if (input[campo] !== undefined) {
      throw recusa(
        'invalid-argument',
        'aceite_datado_pelo_cliente',
        'O aceite é registrado pelo servidor. Recarregue a página e tente de novo.'
      );
    }
  }
  if (input['aceiteTermo'] !== true) {
    throw recusa(
      'invalid-argument',
      'aceite_ausente',
      'Aceite o termo do profissional para continuar.'
    );
  }

  // ── 1b. O resto do payload (PONTE-CTA-1 · PONTE-NOME-1) ────────────────
  // Os dois entram AQUI, junto do aceite, porque são payload e não estado da
  // conta: a pessoa que digitou um nome impossível merece ouvir isso antes de
  // qualquer outra coisa, e a intenção precisa estar em mãos para carimbar o
  // log dos DOIS desfechos de sucesso — inclusive o `jaExistia` do passo 4,
  // que retorna cedo.
  const intencao = normalizarIntencao(input['intencao']);
  const nomeProfissional = nomeProfissionalDoPayload(input['nomeProfissional']);

  // ── 2. A sessão precisa ser NOMEADA ────────────────────────────────────
  // Sem e-mail cai aqui pelo mesmo motivo do anônimo: promover uma conta sem
  // endereço criaria um profissional que o time Leela não tem como alcançar.
  const email = caller.email?.trim().toLowerCase() ?? '';
  if (caller.ehAnonimo || email.length === 0) {
    throw recusa(
      'failed-precondition',
      'sessao_anonima',
      'Entre com o e-mail da sua conta para conhecer o painel profissional.'
    );
  }

  // ── 3. RN-449 — administração da plataforma não acumula ────────────────
  if (caller.role === 'platform_admin') {
    throw recusa(
      'permission-denied',
      'conta_de_plataforma',
      'Esta conta administra a plataforma e não vira conta de profissional.'
    );
  }

  // ── 4. Quem já tem tenant já é profissional: sucesso sem escrita ───────
  // A conta com tenant tem o doc desde o `provisionTenant`; escrever
  // `aguardando_convite` por cima rebaixaria quem já está ativo.
  if (caller.tenantId !== null && caller.tenantId.length > 0) {
    logger.info('promocao_profissional', {
      uid: caller.uid,
      jaExistia: true,
      viaTenant: true,
      intencao,
      nomeDeclarado: nomeProfissional !== null,
    });
    // `nomeAplicado: false` cravado, e não calculado: este ramo NÃO escreve. A
    // conta com tenant já tem `profissionais/{uid}` desde o `provisionTenant`, e
    // um nome digitado aqui não tem para onde ir — dizer isso na resposta é o
    // que permite à tela avisar em vez de fingir que a escolha valeu.
    return {
      statusOnboarding: 'aguardando_convite',
      jaExistia: true,
      intencaoRegistrada: intencao,
      nomeAplicado: false,
    };
  }

  // ── 5. PONTE-ELEGIVEL-1 — a porta recusa o que o portão recusaria ──────
  // A régua é a MESMA do resgate do código, importada e não recopiada. Cai
  // aqui o divulgador (`promoter`) e a ex-organizadora rebaixada de propósito
  // (`athlete` + `demotedFromRole`), que antes atravessavam para ouvir a
  // recusa genérica dias depois, no resgate.
  //
  // A ORDEM É PARTE DA REGRA, nos dois lados:
  //   - depois do passo 4, para que quem já tem tenant continue recebendo
  //     `jaExistia: true` em vez de uma recusa nova (ela JÁ atravessou);
  //   - antes da transação, porque a rebaixada pode ter `profissionais/{uid}`
  //     de quando organizava — deixá-la chegar ao doc devolveria sucesso e a
  //     mandaria de volta para o mesmo beco, agora em silêncio.
  if (!contaElegivelParaPapelDeOrganizador(caller)) {
    throw recusa(
      'failed-precondition',
      'conta_inelegivel',
      'Esta conta não pode virar conta de profissional. Fale com o time Leela para liberar o seu acesso.'
    );
  }

  // ── 6. A criação, dentro da transação que decide o duplo clique ────────
  const ref = db.collection(COLECAO_PROFISSIONAIS).doc(caller.uid);
  const jaExistia = await db.runTransaction<boolean>(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return true; // RN-467: consentimento carimbado não se recolhe.

    tx.set(ref, {
      id: caller.uid,
      nome: caller.nome?.trim() ?? '',
      email,
      // O telefone continua vazio de propósito: a porta não é formulário de
      // cadastro, e ninguém precisa dele para circular na vitrine. ⛔ A frase
      // que morava aqui — "a pessoa preenche o perfil dela no painel" — era
      // FALSA e a review de 08/08 mediu: `profissionais/{uid}` só admite
      // `create` pelo cliente, não existe callable de edição a pedido da dona
      // e renomear tenant é exclusivo de platform_admin. Não existe o depois.
      telefone: '',
      // PONTE-NOME-1 · o campo que era SEMPRE vazio. Quando a pessoa escolhe
      // o nome na porta, ele desce até aqui e o resgate do código o usa como
      // semente do slug — que é cunhado uma vez e não se renomeia. Vazio
      // continua sendo estado válido, e é o que o cliente velho produz.
      organizacao: nomeProfissional ?? '',
      statusOnboarding: 'aguardando_convite',
      consentimentoLgpd: {
        versao: TERMO_LGPD_VERSAO,
        finalidade: TERMO_LGPD_FINALIDADE,
        aceitoEm: FieldValue.serverTimestamp(),
      },
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return false;
  });

  // Zero PII: a intenção é um de quatro rótulos fechados e o nome entra como
  // BOOLEANO. O nome da produtora é dado de titular — ele vai para o
  // documento, nunca para o log.
  logger.info('promocao_profissional', {
    uid: caller.uid,
    jaExistia,
    viaTenant: false,
    intencao,
    nomeDeclarado: nomeProfissional !== null,
  });
  // O nome só foi APLICADO quando a transação escreveu. Se o doc já existia, o
  // `tx.set` nunca rodou e o nome digitado morreu ali — o segundo ramo do
  // descarte silencioso que a review nomeou (PONTE-FIX · R1).
  return {
    statusOnboarding: 'aguardando_convite',
    jaExistia,
    intencaoRegistrada: intencao,
    nomeAplicado: nomeProfissional !== null && !jaExistia,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** A ponte da área do cliente para o painel profissional (RN-512). */
export const promoverParaProfissional = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw recusa('unauthenticated', 'sem_sessao', 'Entre na sua conta para continuar.');
  }
  return promoverParaProfissionalCore(
    admin.firestore(),
    callerDaPromocao(context.auth as Parameters<typeof callerDaPromocao>[0]),
    data
  );
});

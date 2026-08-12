// =============================================================================
// Puros do DIRETÓRIO DE CONTAS do painel master (ADMIN-VISAO onda 5 · S1615-T2
// · RN-540 · vetáveis V-4 e V-5).
//
// O que mora aqui é a regra que a tela não pode inventar na hora de renderizar:
// qual modo está ativo, o que cada linha mostra, e — a parte que custa caro se
// errar — o que a tela diz quando não tem o dado.
//
// UMA ROTA, DOIS MODOS, E O PADRÃO É O MAIS FECHADO. Fila é o recorte de quem
// espera liberação (`statusOnboarding: 'aguardando_convite'` — RN-547) e traz a
// ação. Diretório é todas as contas, com o papel de cada uma, e é LEITURA: sem
// ação em massa. Duas telas duplicariam lista de pessoas no mesmo painel; uma
// tela sem modos transformaria diretório em painel de ação e exporia mais gente
// do que o trabalho exige.
//
// ⛔ SEM SAÍDA EM MASSA (RN-540). Não existe export, CSV, download nem envio por
// e-mail em lugar nenhum desta tela, e não há função aqui que produza um. A
// consulta serve o trabalho de olhar e agir sobre UMA conta; extração de base é
// outra conversa, e é do dono.
// =============================================================================

import type { ContaDoDiretorio, ContaProfissionalView } from '@leela/api-client';
import { formatarDocumento } from '@leela/core';

// ---------------------------------------------------------------------------
// Modos
// ---------------------------------------------------------------------------

/** `fila` é o padrão: o recorte mais fechado abre primeiro. */
export type ModoDeContas = 'fila' | 'diretorio';

export const MODO_PADRAO: ModoDeContas = 'fila';

export interface OpcaoDeModo {
  id: ModoDeContas;
  label: string;
}

export const MODOS_DE_CONTAS: readonly OpcaoDeModo[] = [
  { id: 'fila', label: 'Fila' },
  { id: 'diretorio', label: 'Diretório' },
];

// ---------------------------------------------------------------------------
// Linha do diretório
// ---------------------------------------------------------------------------

/**
 * O rótulo do papel na coluna do modo Diretório. Vem da COLEÇÃO de onde a conta
 * veio, não da claim: o diretório sabe de onde leu, e afirmar papel de claim
 * numa tela que nunca leu o token seria moldura mentindo sobre o crachá.
 * @pure
 */
export function rotuloDoPapel(conta: ContaDoDiretorio): string {
  return conta.papel === 'organizador' ? 'Organizador' : 'Atleta';
}

/**
 * O que a coluna mostra quando o campo não foi coletado. Traço, e não string
 * vazia: célula em branco parece falha de carregamento, e a RN-540 pede que a
 * tela declare o que não tem em vez de inventar.
 * @pure
 */
export function ouTraco(valor: string | undefined | null): string {
  return valor !== undefined && valor !== null && valor.trim() !== '' ? valor : '—';
}

/**
 * Telefone só-dígitos como o auto-cadastro grava → forma legível pt-BR.
 * Comprimento fora de 10/11 dígitos volta como veio: inventar máscara sobre
 * número estranho esconde o dado torto em vez de mostrá-lo.
 * @pure
 */
export function formatarTelefone(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '');
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return ouTraco(bruto);
}

// ---------------------------------------------------------------------------
// Identificação sob demanda (V-4)
// ---------------------------------------------------------------------------

/**
 * O estado da revelação de UMA linha. É por linha, e sob gesto explícito: uma
 * coluna de CPF faria o painel emitir uma consulta auditada por linha da página
 * só por alguém ter aberto a tela — e transformaria a lista em planilha de CPF,
 * que é exatamente o que a RN-540 recusa quando proíbe saída em massa.
 */
export type EstadoDaIdentificacao =
  | { situacao: 'oculto' }
  | { situacao: 'consultando' }
  | { situacao: 'revelado'; texto: string; ambiguo: boolean }
  | { situacao: 'ausente'; causa: string }
  | { situacao: 'erro'; mensagem: string };

/** O que o servidor devolve, na forma mínima que este módulo precisa ler. */
export interface RespostaDeIdentificacao {
  documento: { tipo: 'cpf'; numero: string } | null;
  motivoAusencia: 'sem_registro_de_identificacao' | 'registro_sem_documento' | null;
  haMaisDeUmRegistro: boolean;
}

/**
 * Traduz a resposta do callable no estado que a célula mostra.
 *
 * A causa da ausência é NOMEADA, e não genérica: "sem registro" e "registro
 * quebrado" mandam o operador para lugares diferentes — o primeiro é uma conta
 * que nunca comprou, o segundo é dado corrompido que alguém precisa consertar.
 * @pure
 */
export function estadoDaResposta(
  resposta: RespostaDeIdentificacao
): EstadoDaIdentificacao {
  if (resposta.documento !== null) {
    return {
      situacao: 'revelado',
      texto: formatarDocumento({ tipo: 'cpf', valor: resposta.documento.numero }),
      ambiguo: resposta.haMaisDeUmRegistro,
    };
  }
  return {
    situacao: 'ausente',
    causa:
      resposta.motivoAusencia === 'registro_sem_documento'
        ? 'O registro de identidade desta conta existe, mas o documento gravado nele está ilegível.'
        : 'Esta conta não tem registro de identidade na plataforma — o CPF só é guardado a partir de uma compra confirmada.',
  };
}

/**
 * O aviso que aparece ANTES do operador clicar, não depois. Quem vai revelar um
 * CPF precisa saber que a consulta fica registrada enquanto ainda pode desistir;
 * avisar depois é confissão, não transparência.
 */
export const AVISO_CONSULTA_REGISTRADA =
  'Cada consulta de documento fica registrada: quem consultou, quando e sobre qual conta.';

/**
 * A causa do que NÃO existe, exibida no lugar do que faltaria.
 *
 * O dono decidiu, na íntegra: *"sim, identificação via CPF ou documento
 * estrangeiro."* A metade do CPF está entregue. A metade do documento
 * estrangeiro NÃO TEM FONTE: medido, não há campo de documento estrangeiro em
 * `Pessoa`, em `DadosPessoaisInscrito` nem na cadeia de identidade do CRM, que é
 * CPF → e-mail → `atletaId`. Inventar um campo, ou guardar passaporte no campo
 * `cpf`, seria mentir no lugar mais caro; fazer a metade sumir em silêncio
 * esconderia metade de uma decisão do dono. Então ela fica na tela, com a causa
 * escrita.
 */
export const CAUSA_DOCUMENTO_ESTRANGEIRO =
  'Não existe campo de documento estrangeiro no modelo de dados: o registro de identidade guarda apenas CPF, e quem não tem CPF é identificado hoje por e-mail. Enquanto a fonte não existir, esta metade da identificação não é exibida.';

// ---------------------------------------------------------------------------
// Fila
// ---------------------------------------------------------------------------

/**
 * A conta pode receber a liberação direta por esta tela?
 *
 * A régua REAL é do servidor (`contaElegivelParaPapelDeOrganizador`, a mesma
 * das duas portas — RN-548), e esta função não a reconstrói: ela só evita
 * oferecer um botão que a linha não pode usar, porque a conta já saiu da fila.
 * Quem decide continua sendo a Function; aqui é ergonomia, não autorização.
 * @pure
 */
export function podeLiberar(conta: ContaProfissionalView): boolean {
  return conta.statusOnboarding === 'aguardando_convite';
}

/** Substantivos do contador, por modo (o rótulo vem de `rotuloContagem`). */
export const SUBSTANTIVO_CONTAS = { singular: 'conta', plural: 'contas' };

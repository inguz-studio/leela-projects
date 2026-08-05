// =============================================================================
// Alertas operacionais do Overview (S202-T2) — derivação pura do estado do
// evento (status + data + agregados). Não inventa dados: só o que já existe
// no doc `eventos/{slug}` (L1). Alertas mais ricos (estoque de kit por SKU)
// dependem de aprovisionamento (S210, fora da Onda 1) — ver SUMMARY.
// =============================================================================

import type { DiagnosticoVitrine, Evento } from '@leela/core';
import { diasParaEvento } from './format';

export type SeveridadeAlerta = 'critico' | 'aviso' | 'info';

/**
 * Destino do alerta — o alerta que NOMEIA um lugar do painel também leva até
 * ele (DIAG-PAINEL-LACUNAS). Sem isto, "Configure os lotes" era uma instrução
 * que o organizador tinha de traduzir sozinho em qual aba abrir; a rota já
 * existia e a tela não abria a porta. Ausente quando não há para onde mandar.
 */
export interface AcaoAlerta {
  label: string;
  href: string;
}

export interface AlertaOperacional {
  id: string;
  severidade: SeveridadeAlerta;
  mensagem: string;
  acao?: AcaoAlerta;
}

/** Janela (em dias) a partir da qual "evento se aproxima" vira aviso. */
export const JANELA_PROXIMIDADE_DIAS = 7;

/**
 * Frase do que falta cadastrar, sem despejar uma lista crua na cara de quem lê.
 * Até três modalidades por extenso; acima disso, a contagem.
 *
 * Lista VAZIA tem ramo próprio: `nomes[-1]` é `undefined` e a frase saía
 * literalmente "As modalidades  e undefined estão" na tela do organizador.
 * Não é caso hipotético — evento cujo doc não parseia cai em
 * `eventoDegradado` (api-client), que devolve `modalidades: []`, e o
 * diagnóstico da vitrine classifica isso como `sem_preco` (0 sem preço de 0
 * modalidades). Quem chama trata o vazio ANTES desta função; o retorno aqui é
 * a rede de segurança, nunca a frase que vai à tela.
 */
function listarModalidades(nomes: readonly string[]): string {
  if (nomes.length === 0) return 'Nenhuma modalidade está';
  if (nomes.length <= 3) {
    return nomes.length === 1
      ? `A modalidade ${nomes[0]} está`
      : `As modalidades ${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]} estão`;
  }
  return `${nomes.length} modalidades estão`;
}

/**
 * Deriva os alertas inline do Overview a partir do evento.
 * Ordena por severidade (crítico → aviso → info).
 *
 * `vitrine` (VITRINE-FIX) é o diagnóstico da página pública, calculado pela
 * MESMA régua que a landing usa (`diagnosticoVitrine` do core). Sem ele o
 * painel só sabia repetir o `status` do doc — e era possível publicar um
 * evento, ver "Publicado" em verde, e a página não vender, sem nada avisando.
 * Opcional de propósito: telas que ainda não carregam lotes passam `null` e
 * seguem com os alertas de sempre.
 *
 * `slug` entrou no recorte (DIAG-PAINEL-LACUNAS) porque o alerta agora carrega
 * o DESTINO junto da frase: quem lê "configure os lotes" clica e chega lá.
 */
export function derivaAlertas(
  evento: Pick<Evento, 'status' | 'data' | 'qtdInscritos' | 'slug'>,
  agora: Date = new Date(),
  vitrine: DiagnosticoVitrine | null = null,
): AlertaOperacional[] {
  const alertas: AlertaOperacional[] = [];
  const irParaLotes: AcaoAlerta = {
    label: 'Configurar lotes',
    href: `/eventos/${evento.slug}/lotes`,
  };

  // Publicado e a página não vende. É o alerta mais grave da tela: o
  // organizador acha que está vendendo. Só dispara com o evento ainda por
  // acontecer — depois da prova, não vender é o esperado.
  const publicado = evento.status === 'publicado' || evento.status === 'ao_vivo';
  const vitrineMuda =
    publicado && vitrine !== null && !vitrine.vende && vitrine.motivo !== 'evento_passou';

  if (vitrineMuda) {
    // Evento SEM modalidade nenhuma é outro problema, e mandá-lo para os lotes
    // seria mandá-lo para uma tela que não tem o que oferecer: o lote pertence
    // a uma modalidade (ADR-012) e a Rule exige que ela exista no doc do
    // evento. A frase diz o que falta de verdade e não promete um caminho.
    const semModalidadeNenhuma =
      vitrine.motivo === 'sem_preco' && vitrine.modalidadesSemPreco.length === 0;

    if (semModalidadeNenhuma) {
      alertas.push({
        id: 'vitrine-nao-vende',
        severidade: 'critico',
        mensagem:
          'A página pública está no ar mas NÃO vende: este evento não tem nenhuma modalidade ' +
          'cadastrada, e sem modalidade não há lote nem preço para vender.',
      });
    } else {
      alertas.push({
        id: 'vitrine-nao-vende',
        severidade: 'critico',
        mensagem:
          vitrine.motivo === 'sem_preco'
            ? `A página pública está no ar mas NÃO vende: ${listarModalidades(
                vitrine.modalidadesSemPreco,
              )} sem preço. Configure os lotes para abrir as inscrições.`
            : vitrine.motivo === 'esgotado'
              ? 'A página pública está no ar mas não vende: todas as vagas acabaram. Abra um lote novo para voltar a vender.'
              : 'A página pública está no ar mas não vende: as janelas dos lotes venceram. Abra um lote novo para voltar a vender.',
        acao: irParaLotes,
      });
    }
  } else if (publicado && vitrine !== null && vitrine.modalidadesSemPreco.length > 0) {
    // Vende, mas não tudo: uma modalidade sem preço some da página em silêncio.
    alertas.push({
      id: 'modalidade-sem-preco',
      severidade: 'aviso',
      mensagem: `${listarModalidades(
        vitrine.modalidadesSemPreco,
      )} sem preço e não aparecem à venda na página pública.`,
      acao: irParaLotes,
    });
  }

  if (evento.status === 'rascunho') {
    alertas.push({
      id: 'rascunho',
      severidade: 'aviso',
      mensagem: 'Evento em rascunho. Publique para gerar a página pública e o QR.',
    });
  }

  const dias = diasParaEvento(evento.data, agora);
  if (
    dias !== null &&
    dias >= 0 &&
    dias <= JANELA_PROXIMIDADE_DIAS &&
    (evento.status === 'publicado' || evento.status === 'ao_vivo')
  ) {
    alertas.push({
      id: 'proximidade',
      severidade: dias <= 2 ? 'critico' : 'aviso',
      mensagem:
        dias === 0
          ? 'O evento é hoje. Prepare o balcão de credenciamento.'
          : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'} para o evento.`,
    });
  }

  // "Divulgue a página" é conselho ERRADO quando a página não vende — mandava
  // o organizador promover uma tela que responde "Inscrições encerradas". Só
  // sai quando a vitrine está de fato vendendo (ou quando não sabemos).
  if (evento.status === 'publicado' && evento.qtdInscritos === 0 && !vitrineMuda) {
    alertas.push({
      id: 'sem-inscritos',
      severidade: 'info',
      mensagem: 'Ainda sem inscritos. Divulgue a página pública para começar a vender.',
    });
  }

  const ordem: Record<SeveridadeAlerta, number> = { critico: 0, aviso: 1, info: 2 };
  return alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
}

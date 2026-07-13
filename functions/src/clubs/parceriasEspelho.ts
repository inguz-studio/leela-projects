// =============================================================================
// functions/src/clubs/parceriasEspelho.ts
//
// Espelho do nome canônico do evento na parceria (LEELA-CONS-4-T2).
//
// A parceria evento_afiliado guardava só o `eventoId` (slug) — a UI exibia
// nome DERIVADO do slug, não o nome de marketing ("comunidade com rosto e
// nome"). `eventoNome` é campo 🔁 espelhado de `eventos/{eventoId}.nome`,
// escrito EXCLUSIVAMENTE por Admin SDK (Rules: camposProtegidosParceria) —
// mesma classe de linkMaster/termosEspelho: dado do lado do ORGANIZADOR
// atravessando a fronteira de tenant para dentro do doc do clube.
//
// Contratos:
//   - IDEMPOTENTE por comparação: só escreve quando o nome diverge; rerun
//     converge para zero updates (backfill re-executável).
//   - Evento inexistente (organizador externo/ainda não importado) → doc
//     INTOCADO: nunca apaga um eventoNome já estampado nem inventa nome.
//   - Sem collectionGroup: itera clubes (padrão membrosAggregates — dispensa
//     índice de grupo e mantém o custo previsível na escala V1).
//   - Cache de nomes por execução: N parcerias do mesmo evento = 1 get.
//
// Chamadores:
//   - Backfill/consolidação: sincronizarEventoNomeParcerias(db) — tudo.
//   - Pós-rename de evento: sincronizarEventoNomeParcerias(db, { eventoId })
//     (o gatilho onWrite de eventos chega com a trilha de convites E04/E12;
//     até lá esta rotina é o contrato testável — padrão triggers v1 do repo).
//   - A Function futura de convite (organizador → clube) DEVE estampar
//     eventoNome no create, como o seed já faz.
// =============================================================================

import type { firestore } from 'firebase-admin';

export interface SincronizacaoEventoNomeResultado {
  /** Parcerias evento_afiliado examinadas */
  examinadas: number;
  /** Parcerias cujo eventoNome foi estampado/corrigido */
  atualizadas: number;
  /** Parcerias puladas por evento inexistente (sem nome canônico) */
  semEvento: number;
}

/**
 * Estampa/corrige `eventoNome` nas parcerias evento_afiliado a partir de
 * `eventos/{eventoId}.nome`. Sem `eventoId` = backfill completo; com
 * `eventoId` = sincronização pós-rename daquele evento.
 */
export async function sincronizarEventoNomeParcerias(
  db: firestore.Firestore,
  opts: { eventoId?: string } = {}
): Promise<SincronizacaoEventoNomeResultado> {
  const resultado: SincronizacaoEventoNomeResultado = {
    examinadas: 0,
    atualizadas: 0,
    semEvento: 0,
  };

  // Cache eventoId → nome canônico (null = evento inexistente/sem nome)
  const nomes = new Map<string, string | null>();

  async function nomeCanonico(eventoId: string): Promise<string | null> {
    const cached = nomes.get(eventoId);
    if (cached !== undefined) return cached;

    const snap = await db.collection('eventos').doc(eventoId).get();
    const nome = snap.exists ? (snap.get('nome') as string | undefined) : undefined;
    const valor = typeof nome === 'string' && nome.trim().length > 0 ? nome : null;
    nomes.set(eventoId, valor);
    return valor;
  }

  // Itera clubes (evita collectionGroup — padrão membrosAggregates)
  const clubes = await db.collection('clubes').select().get();

  for (const clube of clubes.docs) {
    let query = clube.ref
      .collection('parcerias')
      .where('tipo', '==', 'evento_afiliado');
    if (opts.eventoId) {
      query = query.where('eventoId', '==', opts.eventoId);
    }

    const parcerias = await query.get();

    for (const parceria of parcerias.docs) {
      resultado.examinadas += 1;

      const eventoId = parceria.get('eventoId') as string | undefined;
      if (!eventoId) {
        resultado.semEvento += 1;
        continue;
      }

      const nome = await nomeCanonico(eventoId);
      if (nome === null) {
        // Evento não existe neste Firestore (ou sem nome) — intocado:
        // nunca apagar espelho já estampado nem escrever vazio.
        resultado.semEvento += 1;
        continue;
      }

      if (parceria.get('eventoNome') === nome) continue; // já convergido

      await parceria.ref.update({ eventoNome: nome });
      resultado.atualizadas += 1;
    }
  }

  return resultado;
}

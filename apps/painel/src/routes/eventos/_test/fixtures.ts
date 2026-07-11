// Fixtures de teste das telas de evento (não é arquivo .test → não é coletado).
import type { Evento, Inscrito, KitInscrito, StatusEvento, Timestamp } from '@leela/core';

/** Timestamp portátil fake com a superfície que o core expõe (toDate/toMillis). */
export function ts(date: Date): Timestamp {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

export function mkEvento(over: Partial<Evento> = {}): Evento {
  const data = over.data ?? ts(new Date('2026-04-27T09:00:00Z'));
  return {
    id: 'meia-floripa-2026',
    tenantId: 'castelo',
    organizadorId: 'marina',
    nome: 'Meia Maratona Floripa 2026',
    data,
    local: 'Florianópolis, SC',
    modalidades: ['5k', '10k', '21k'],
    slug: 'meia-floripa-2026',
    status: 'publicado' as StatusEvento,
    usaChip: true,
    criadoEm: ts(new Date('2026-01-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-01-01T00:00:00Z')),
    qtdInscritos: 453,
    receitaConfirmada: 85617,
    ...over,
  };
}

export function mkInscrito(over: Partial<Inscrito> = {}): Inscrito {
  return {
    id: over.id ?? 'ins-1',
    tenantId: 'castelo',
    atletaId: 'atl-1',
    atletaNome: over.atletaNome ?? 'Marina Silva',
    kit: (over.kit ?? 'kit_ouro') as KitInscrito,
    chipNumero: null,
    status: 'confirmado',
    modalidade: over.modalidade ?? '10k',
    criadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    pedidoRef: over.pedidoRef ?? null,
    ehResponsavel: over.ehResponsavel ?? false,
    tamanhos: over.tamanhos ?? {},
    ...over,
  };
}

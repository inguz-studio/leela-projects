// Fixtures de teste das telas de evento (não é arquivo .test → não é coletado).
import type {
  DadosPessoaisInscrito,
  Evento,
  Inscrito,
  Kit,
  KitInscrito,
  Pagamento,
  Pedido,
  StatusEvento,
  Timestamp,
} from '@leela/core';

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

/**
 * Bloco `[reg]` do inscrito. CPF em DÍGITOS por default — é a forma canônica
 * da escrita nova (`normalizarCpf` no checkout); quem testa doc legado passa a
 * versão mascarada de propósito.
 */
export function mkDadosPessoais(
  over: Partial<DadosPessoaisInscrito> = {},
): DadosPessoaisInscrito {
  return {
    cpf: '52998224725',
    telefone: '',
    nascimento: '1990-05-14',
    genero: 'nao_informado',
    cidade: '',
    uf: '',
    ...over,
  };
}

/** Pedido do balcão — o que importa aqui é `responsavel` (contato de compra). */
export function mkPedido(over: Partial<Pedido> = {}): Pedido {
  return {
    id: 'ped-1',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    responsavel: {
      atletaId: 'atl-1',
      nome: 'Marina Silva',
      email: 'marina@exemplo.com',
      telefone: '48999990001',
    },
    inscritoRefs: ['ins-1'],
    itens: [{ inscritoRef: 'ins-1', valorBase: 120, desconto: 0, valorFinal: 120 }],
    pagamentoRef: 'pag-1',
    valorTotal: 120,
    status: 'pago',
    criadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    ...over,
  };
}

/** Pagamento do balcão — o que importa aqui é `loteNome` (rótulo do lote). */
export function mkPagamento(over: Partial<Pagamento> = {}): Pagamento {
  return {
    id: 'pag-1',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    pedidoRef: 'ped-1',
    status: 'confirmado',
    forma: 'pix',
    valorBase: 120,
    loteNome: 'Lote 2 — Regular',
    desconto: 0,
    valorFinal: 120,
    criadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    ...over,
  };
}

/** Kit do evento — `itens` é "o que está incluso" em linguagem de produto. */
export function mkKit(over: Partial<Kit> = {}): Kit {
  return {
    id: 'kit_ouro',
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 40,
    capacidade: 500,
    modalidades: ['5k', '10k', '21k'],
    itens: ['Camiseta técnica', 'Medalha', 'Sacola'],
    criadoEm: ts(new Date('2026-01-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-01-01T00:00:00Z')),
    ...over,
  };
}

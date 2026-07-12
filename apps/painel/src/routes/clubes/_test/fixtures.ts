// Fixtures de teste das telas de clube (não é *.test → não é coletado).
import type {
  Clube,
  Comunicado,
  Desafio,
  Membro,
  PapelMembro,
  ParceriaEventoAfiliado,
  ParceriaPatrocinador,
  StatusMembro,
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

export function mkClube(over: Partial<Clube> = {}): Clube {
  return {
    id: 'corrida-perfeita-sul',
    tenantId: 'castelo',
    nome: 'Corrida Perfeita Sul',
    descricao: 'Comunidade de corrida de rua em Florianópolis.',
    slug: 'corrida-perfeita-sul',
    categoria: 'Assessoria esportiva',
    modalidade: 'Corrida de rua',
    localizacao: { cidade: 'Florianópolis', estado: 'SC', online: false },
    ownerId: 'felipe',
    codigoConvite: '8A3K9',
    visibilidade: 'indexavel',
    aprovacaoManual: false,
    modeloEntrada: 'gratuito',
    criadoEm: ts(new Date('2022-01-10T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-04-20T00:00:00Z')),
    qtdMembrosAtivos: 120,
    qtdDesafiosAtivos: 3,
    ...over,
  };
}

let dseq = 0;
export function mkDesafio(over: Partial<Desafio> = {}): Desafio {
  dseq += 1;
  return {
    id: over.id ?? `des-${dseq}`,
    tenantId: 'castelo',
    nome: over.nome ?? 'Desafio 21 dias',
    descricao: over.descricao ?? 'Constância nos 3 pilares.',
    modelo: over.modelo ?? 'B',
    dataInicio: over.dataInicio ?? ts(new Date('2026-04-01T00:00:00Z')),
    dataFim: over.dataFim ?? ts(new Date('2026-04-30T00:00:00Z')),
    status: over.status ?? 'ativo',
    recompensaTipo: over.recompensaTipo ?? 'medalha_digital',
    visibilidade: over.visibilidade ?? 'membros',
    criadoEm: over.criadoEm ?? ts(new Date('2026-03-20T00:00:00Z')),
    atualizadoEm: over.atualizadoEm ?? ts(new Date('2026-04-20T00:00:00Z')),
    qtdParticipantes: over.qtdParticipantes ?? 42,
    progressoPct: over.progressoPct ?? 60,
    ...over,
  };
}

let pseq = 0;
export function mkEventoAfiliado(
  over: Partial<ParceriaEventoAfiliado> = {},
): ParceriaEventoAfiliado {
  pseq += 1;
  return {
    id: over.id ?? `paf-${pseq}`,
    tenantId: 'castelo',
    tipo: 'evento_afiliado',
    status: over.status ?? 'ativa',
    eventoId: over.eventoId ?? 'meia-maratona-floripa-2026',
    organizadorId: over.organizadorId ?? 'org-1',
    programaAfiliacaoRef: over.programaAfiliacaoRef ?? 'eventos/meia-maratona-floripa-2026/programaAfiliacao/current',
    comissaoPct: over.comissaoPct ?? 15,
    cupom: over.cupom ?? 'CLUBE10',
    linkMaster: over.linkMaster ?? 'be-hero.com.br/e/meia-floripa?ref=cps',
    janelaAtribuicaoDias: over.janelaAtribuicaoDias ?? 30,
    termosEspelho: over.termosEspelho ?? {
      criterioLiberacao: 'Após 28 Abr 2026',
      prazoRepasseDiasUteis: 15,
      tetoMensal: null,
    },
    conversoes: over.conversoes ?? 8,
    valorAReceber: over.valorAReceber ?? 640,
    criadoEm: over.criadoEm ?? ts(new Date('2026-03-01T00:00:00Z')),
    atualizadoEm: over.atualizadoEm ?? ts(new Date('2026-04-20T00:00:00Z')),
    ...over,
  };
}

export function mkPatrocinador(
  over: Partial<ParceriaPatrocinador> = {},
): ParceriaPatrocinador {
  pseq += 1;
  return {
    id: over.id ?? `ppa-${pseq}`,
    tenantId: 'castelo',
    tipo: 'patrocinador',
    status: over.status ?? 'ativa',
    nome: over.nome ?? 'Loja do Corredor',
    modeloComercial: over.modeloComercial ?? 'financeiro',
    valorAnual: over.valorAnual ?? 12000,
    contrapartida: over.contrapartida ?? 'Logo na camiseta e posts mensais nas redes do clube.',
    criadoEm: over.criadoEm ?? ts(new Date('2026-02-01T00:00:00Z')),
    atualizadoEm: over.atualizadoEm ?? ts(new Date('2026-04-20T00:00:00Z')),
    ...over,
  };
}

let cseq = 0;
export function mkComunicado(over: Partial<Comunicado> = {}): Comunicado {
  cseq += 1;
  return {
    id: over.id ?? `com-${cseq}`,
    tenantId: 'castelo',
    titulo: over.titulo ?? 'Treino especial de sábado',
    conteudo: over.conteudo ?? 'Nos vemos às 7h na Lagoa para o longão.',
    canal: over.canal ?? ['push'],
    origem: over.origem ?? 'manual',
    status: over.status ?? 'enviado',
    segmento: over.segmento ?? { tipo: 'todos' },
    criadoEm: over.criadoEm ?? ts(new Date('2026-04-10T00:00:00Z')),
    atualizadoEm: over.atualizadoEm ?? ts(new Date('2026-04-12T00:00:00Z')),
    alcance: over.alcance ?? 118,
    ...over,
  };
}

let seq = 0;
export function mkMembro(over: Partial<Membro> = {}): Membro {
  seq += 1;
  const papel: PapelMembro = over.papel ?? 'membro';
  const status: StatusMembro = over.status ?? 'ativo';
  return {
    id: over.id ?? `mem-${seq}`,
    tenantId: 'castelo',
    atletaId: over.atletaId ?? `atl-${seq}`,
    atletaNome: over.atletaNome ?? 'Beatriz Loss',
    papel,
    entrouEm: over.entrouEm ?? ts(new Date('2022-09-01T00:00:00Z')),
    entrouVia: over.entrouVia ?? 'codigo',
    status,
    ...(over.ultimaAtividadeEm !== undefined
      ? { ultimaAtividadeEm: over.ultimaAtividadeEm }
      : { ultimaAtividadeEm: ts(new Date('2026-04-20T07:00:00Z')) }),
    ...over,
  };
}

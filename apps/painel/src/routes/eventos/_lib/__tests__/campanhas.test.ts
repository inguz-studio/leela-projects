// =============================================================================
// Testes puros dos helpers da lista de Campanhas (S401-T2 · E06-L3): rótulos
// FEMININOS na UI (item 9 — dado masculino), rótulo de segmento (reuso dos
// enums do Inscrito), filtro combinável, agrupamento por estado na ordem
// canônica, KPIs e ações contextuais por estado.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { Campanha, StatusCampanha, Timestamp } from '@leela/core';
import {
  acoesCampanha,
  agruparPorEstado,
  canalCampanhaLabel,
  filtrarCampanhas,
  kpisCampanhas,
  origemCampanhaLabel,
  segmentoCampanhaLabel,
  statusCampanhaBadge,
} from '../campanhas';

const ts = (ms: number): Timestamp =>
  ({ toDate: () => new Date(ms), toMillis: () => ms }) as unknown as Timestamp;

function mk(over: Partial<Campanha> = {}): Campanha {
  return {
    id: 'c1',
    tenantId: 't1',
    titulo: 'Kit pronto',
    conteudo: 'Seu kit já pode ser retirado no balcão.',
    canal: ['push'],
    origem: 'manual',
    status: 'rascunho',
    segmento: { tipo: 'todos_inscritos' },
    criadoEm: ts(1000),
    atualizadoEm: ts(1000),
    alcance: 0,
    ...over,
  };
}

describe('statusCampanhaBadge — rótulo feminino na UI, dado masculino', () => {
  it('rotula enviado/agendado no feminino; rascunho neutro', () => {
    expect(statusCampanhaBadge('enviado').label).toBe('Enviada');
    expect(statusCampanhaBadge('agendado').label).toBe('Agendada');
    expect(statusCampanhaBadge('rascunho').label).toBe('Rascunho');
  });
  it('borda por token (nunca hex)', () => {
    expect(statusCampanhaBadge('enviado').borderVar.startsWith('--')).toBe(true);
  });
});

describe('origemCampanhaLabel — etiqueta só para automatizada (RN-132)', () => {
  it('automatizada → "Automática"', () => {
    expect(origemCampanhaLabel('automatizada')).toBe('Automática');
  });
  it('manual → null (sem etiqueta, ruído zero no caso comum)', () => {
    expect(origemCampanhaLabel('manual')).toBeNull();
  });
});

describe('canalCampanhaLabel / segmentoCampanhaLabel', () => {
  it('canal', () => {
    expect(canalCampanhaLabel('push')).toBe('Push');
    expect(canalCampanhaLabel('email')).toBe('E-mail');
  });
  it('segmento reusa os enums do Inscrito', () => {
    expect(segmentoCampanhaLabel({ tipo: 'todos_inscritos' })).toBe('Todos os inscritos');
    expect(segmentoCampanhaLabel({ tipo: 'por_modalidade', referencia: '21k' })).toBe('Modalidade 21k');
    expect(segmentoCampanhaLabel({ tipo: 'por_kit', referencia: 'kit_ouro' })).toBe('Kit Ouro');
    expect(segmentoCampanhaLabel({ tipo: 'por_status', referencia: 'pendente' })).toBe('Inscritos pendente');
  });
});

describe('filtrarCampanhas — interseção busca × canal', () => {
  const base = [
    mk({ id: 'a', titulo: 'Kit Ouro pronto', canal: ['push'] }),
    mk({ id: 'b', titulo: 'Cupom para amigos', canal: ['email'] }),
    mk({ id: 'c', titulo: 'Boas-vindas', canal: ['push', 'email'] }),
  ];
  it('busca por título (substring, case-insensitive)', () => {
    expect(filtrarCampanhas(base, { busca: 'kit' }).map((c) => c.id)).toEqual(['a']);
  });
  it('canal intersecta', () => {
    expect(filtrarCampanhas(base, { canais: ['email'] }).map((c) => c.id)).toEqual(['b', 'c']);
  });
  it('sem filtro → tudo', () => {
    expect(filtrarCampanhas(base)).toHaveLength(3);
  });
});

describe('agruparPorEstado — ordem canônica, grupos vazios omitidos', () => {
  it('enviadas → agendadas → rascunhos; omite vazios', () => {
    const campanhas = [
      mk({ id: 'r', status: 'rascunho' }),
      mk({ id: 'e', status: 'enviado', alcance: 48, enviadoEm: ts(2000) }),
    ];
    const grupos = agruparPorEstado(campanhas);
    expect(grupos.map((g) => g.status)).toEqual<StatusCampanha[]>(['enviado', 'rascunho']);
    expect(grupos[0]?.campanhas.map((c) => c.id)).toEqual(['e']);
  });
  it('lista vazia → nenhum grupo', () => {
    expect(agruparPorEstado([])).toEqual([]);
  });
});

describe('kpisCampanhas', () => {
  it('conta enviadas/agendadas e soma alcance só das enviadas', () => {
    const campanhas = [
      mk({ status: 'enviado', alcance: 48, enviadoEm: ts(1) }),
      mk({ status: 'enviado', alcance: 12, enviadoEm: ts(2) }),
      mk({ status: 'agendado', agendadoPara: ts(9) }),
      mk({ status: 'rascunho' }),
    ];
    expect(kpisCampanhas(campanhas)).toEqual({
      total: 4,
      enviadas: 2,
      agendadas: 1,
      alcanceTotal: 60,
    });
  });
});

describe('acoesCampanha — ações contextuais por estado (RN-130)', () => {
  it('rascunho: editar/duplicar/excluir', () => {
    expect(acoesCampanha('rascunho').map((a) => a.id)).toEqual(['editar', 'duplicar', 'excluir']);
  });
  it('agendado: editar/cancelar/excluir', () => {
    expect(acoesCampanha('agendado').map((a) => a.id)).toEqual(['editar', 'cancelar-agendamento', 'excluir']);
  });
  it('enviado: relatório/duplicar (sem editar/excluir — trilha preservada)', () => {
    expect(acoesCampanha('enviado').map((a) => a.id)).toEqual(['relatorio', 'duplicar']);
  });
});

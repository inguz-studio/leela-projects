/**
 * parceriaCore.test.ts — LEELA-S107-T1
 *
 * Unit (puro, sem emulator): guards do union Parceria (evento_afiliado |
 * patrocinador — RN-123) e janela de atribuição de conversão (RN-125).
 */
import { describe, expect, it } from 'vitest';
import {
  CAMPOS_AGREGADOS_PARCERIA,
  CAMPOS_ESPELHO_PARCERIA,
  dentroDaJanelaAtribuicao,
  isModeloComercial,
  isParceriaEventoAfiliado,
  isParceriaPatrocinador,
  isStatusParceria,
  isTipoParceria,
  type Parceria,
  type Timestamp,
} from '@leela/core';

const ts = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0), toMillis: () => 0 } as Timestamp;

const eventoAfiliado: Parceria = {
  id: 'parceria-meia',
  tenantId: 'corrida-perfeita',
  tipo: 'evento_afiliado',
  status: 'ativa',
  eventoId: 'meia-floripa-2026',
  eventoNome: 'Meia Maratona Floripa 2026',
  organizadorId: 'uid-marina',
  programaAfiliacaoRef: 'eventos/meia-floripa-2026/programaAfiliacao/atual',
  comissaoPct: 10,
  cupom: 'CORRIDAPERFEITA10',
  linkMaster: 'beh.ro/mfl26?c=cps',
  janelaAtribuicaoDias: 7,
  termosEspelho: {
    criterioLiberacao: 'Após 28 Abr 2026',
    prazoRepasseDiasUteis: 10,
    tetoMensal: null,
  },
  conversoes: 28,
  valorAReceber: 528,
  criadoEm: ts,
  atualizadoEm: ts,
};

const patrocinador: Parceria = {
  id: 'parceria-cdl-wellness',
  tenantId: 'corrida-perfeita',
  tipo: 'patrocinador',
  status: 'ativa',
  nome: 'CDL Wellness',
  modeloComercial: 'financeiro',
  valorAnual: 12000,
  contrapartida: 'Logo em todos os desafios · 1 post mensal no app',
  criadoEm: ts,
  atualizadoEm: ts,
};

describe('guards do union Parceria', () => {
  it('discrimina evento_afiliado × patrocinador', () => {
    expect(isParceriaEventoAfiliado(eventoAfiliado)).toBe(true);
    expect(isParceriaPatrocinador(eventoAfiliado)).toBe(false);
    expect(isParceriaPatrocinador(patrocinador)).toBe(true);
    expect(isParceriaEventoAfiliado(patrocinador)).toBe(false);
  });

  it('narrowing dá acesso tipado aos campos do ramo', () => {
    if (isParceriaEventoAfiliado(eventoAfiliado)) {
      expect(eventoAfiliado.comissaoPct).toBe(10);
      expect(eventoAfiliado.linkMaster).toContain('c=cps');
    }
    if (isParceriaPatrocinador(patrocinador)) {
      expect(patrocinador.modeloComercial).toBe('financeiro');
      expect(patrocinador.valorAnual).toBe(12000);
    }
  });

  it('enums: tipo, status e modelo comercial (RN-123)', () => {
    expect(isTipoParceria('evento_afiliado')).toBe(true);
    expect(isTipoParceria('patrocinador')).toBe(true);
    expect(isTipoParceria('permuta')).toBe(false);

    expect(isStatusParceria('convite_pendente')).toBe(true);
    expect(isStatusParceria('ativa')).toBe(true);
    expect(isStatusParceria('inativa')).toBe(true);
    expect(isStatusParceria('pausada')).toBe(false);

    expect(isModeloComercial('financeiro')).toBe(true);
    expect(isModeloComercial('permuta')).toBe(true);
    expect(isModeloComercial('doacao')).toBe(false);
  });

  it('campos protegidos espelham as Rules (∑ + espelho do programa)', () => {
    expect(CAMPOS_AGREGADOS_PARCERIA).toEqual(['conversoes', 'valorAReceber']);
    expect(CAMPOS_ESPELHO_PARCERIA).toContain('comissaoPct');
    expect(CAMPOS_ESPELHO_PARCERIA).toContain('linkMaster');
    expect(CAMPOS_ESPELHO_PARCERIA).toContain('termosEspelho');
    // CONS-4-T2: nome canônico denormalizado é espelho — cliente nunca escreve
    expect(CAMPOS_ESPELHO_PARCERIA).toContain('eventoNome');
  });
});

describe('dentroDaJanelaAtribuicao (RN-125)', () => {
  const clique = new Date('2026-04-01T12:00:00Z');
  const DIA_MS = 24 * 60 * 60 * 1000;

  it('conversão dentro da janela de 7 dias atribui', () => {
    const conversao = new Date(clique.getTime() + 3 * DIA_MS);
    expect(dentroDaJanelaAtribuicao(clique, conversao, 7)).toBe(true);
  });

  it('limite é INCLUSIVO: converter exatamente no 7º dia atribui', () => {
    const conversao = new Date(clique.getTime() + 7 * DIA_MS);
    expect(dentroDaJanelaAtribuicao(clique, conversao, 7)).toBe(true);
  });

  it('1 ms além da janela NÃO atribui', () => {
    const conversao = new Date(clique.getTime() + 7 * DIA_MS + 1);
    expect(dentroDaJanelaAtribuicao(clique, conversao, 7)).toBe(false);
  });

  it('conversão ANTES do clique é dado inválido → não atribui', () => {
    const conversao = new Date(clique.getTime() - 1);
    expect(dentroDaJanelaAtribuicao(clique, conversao, 7)).toBe(false);
  });
});

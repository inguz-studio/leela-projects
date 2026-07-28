/**
 * toastDoResultado.test.ts — LEELA-ESTORNO-T3 (RN-372/375)
 *
 * A ficha do inscrito passou a entrar pela máquina COM política, e a máquina
 * tem três desfechos diferentes. O que estas provas prendem é a HONESTIDADE do
 * aviso: nenhum caminho pode anunciar "estornado" quando o dinheiro não voltou,
 * e o caminho do gateway pendente não pode convidar a tentar de novo (repetir
 * é o estorno duplo que a RN-371 existe para matar).
 */

import { describe, expect, it } from 'vitest';
import type { RequestRefundResult } from '@leela/api-client';
import { toastDoResultado } from '../InscritoSlideInConnected';

const base = { eventoId: 'ev', inscritoId: 'insc', replay: false };

describe('toastDoResultado — o aviso conta o que aconteceu de verdade', () => {
  it('gateway aceitou e não concluiu: não diz "estornado" nem pede retry', () => {
    const t = toastDoResultado({
      ...base,
      estado: 'aprovado_auto',
      aguardandoConfirmacao: true,
      refundId: 'ref_1',
    } as RequestRefundResult);
    expect(t.title).not.toMatch(/conclu|estornad/i);
    expect(t.title).toMatch(/solicitad/i);
    expect(t.description).toMatch(/aguarda a confirmação/i);
    expect(t.description).toMatch(/não é preciso repetir/i);
    expect(t.variant).toBe('info');
  });

  it('fora da janela: diz FILA DE ANÁLISE, não devolução', () => {
    const t = toastDoResultado({ ...base, estado: 'em_analise' } as RequestRefundResult);
    expect(t.title).toMatch(/em análise/i);
    expect(t.description).toMatch(/decisão é do organizador/i);
    expect(t.title).not.toMatch(/conclu/i);
    expect(t.variant).toBe('info');
  });

  it('estornado: anuncia o valor E avisa que a vaga não volta (RN-304)', () => {
    const t = toastDoResultado({
      ...base,
      estado: 'estornado',
      valorEstornado: 188.86,
      refundId: 'ref_1',
    } as RequestRefundResult);
    expect(t.variant).toBe('success');
    expect(t.title).toContain('188,86');
    expect(t.description).toMatch(/vaga não retorna/i);
  });

  it('replay: reconhece que já havia sido processado, sem duplicar promessa', () => {
    const t = toastDoResultado({
      ...base,
      estado: 'estornado',
      replay: true,
      valorEstornado: 100,
    } as RequestRefundResult);
    expect(t.title).toMatch(/já havia sido processado/i);
    expect(t.variant).toBe('success');
  });

  it('estornado sem valor no payload: não inventa número', () => {
    const t = toastDoResultado({ ...base, estado: 'estornado' } as RequestRefundResult);
    expect(t.title).not.toMatch(/R\$|undefined|NaN/);
  });

  it('estado executável sem desfecho: diz o estado e onde conferir', () => {
    const t = toastDoResultado({ ...base, estado: 'aprovado' } as RequestRefundResult);
    expect(t.variant).toBe('info');
    expect(t.description).toContain('aprovado');
    expect(t.description).toMatch(/fila de reembolsos/i);
  });
});

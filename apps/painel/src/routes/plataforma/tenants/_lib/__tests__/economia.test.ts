// =============================================================================
// Puros da economia do tenant (S1613-T2). Os casos são os do gate da onda:
// as duas cifras saem do CARIMBO, nunca de conta refeita; ausência de carimbo
// é null (e null vira rótulo na tela, nunca zero).
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  liquidoDoProdutor,
  rotuloEconomiaAusente,
  rotuloParcelas,
  servicoDaVenda,
} from '../economia';
import { mkPagamento } from '../../_test/fixtures';

describe('servicoDaVenda / liquidoDoProdutor · RN-537 lê o carimbo', () => {
  it('devolve os valores gravados em conciliacao, sem tocar em valorFinal', () => {
    const pagamento = mkPagamento({
      valorFinal: 200,
      conciliacao: {
        idTransacao: 'tx-1',
        gateway: 'asaas',
        taxaValor: 20,
        repasseOrganizador: 180,
      },
    });

    expect(servicoDaVenda(pagamento)).toBe(20);
    expect(liquidoDoProdutor(pagamento)).toBe(180);
  });

  it('modo repassada: o líquido é o FACE CHEIO, não face − taxa (RN-182)', () => {
    // O comprador pagou a taxa por fora; a confirmação gravou o face inteiro
    // como repasse. `face − taxa` daria 180 e estaria errado.
    const pagamento = mkPagamento({
      valorFinal: 200,
      taxaRepassada: 20,
      conciliacao: {
        idTransacao: 'tx-2',
        gateway: 'asaas',
        taxaValor: 20,
        repasseOrganizador: 200,
      },
    });

    expect(liquidoDoProdutor(pagamento)).toBe(200);
    expect(liquidoDoProdutor(pagamento)).not.toBe(
      pagamento.valorFinal - (servicoDaVenda(pagamento) ?? 0)
    );
  });

  it('sem conciliacao devolve null — e null NÃO é zero', () => {
    const pagamento = mkPagamento({ status: 'pendente' });
    delete (pagamento as { conciliacao?: unknown }).conciliacao;

    expect(servicoDaVenda(pagamento)).toBeNull();
    expect(liquidoDoProdutor(pagamento)).toBeNull();
    expect(servicoDaVenda(pagamento)).not.toBe(0);
  });

  it('taxa zero gravada continua sendo zero, não ausência', () => {
    const pagamento = mkPagamento({
      conciliacao: {
        idTransacao: 'tx-3',
        gateway: 'asaas',
        taxaValor: 0,
        repasseOrganizador: 200,
      },
    });

    expect(servicoDaVenda(pagamento)).toBe(0);
  });
});

describe('rotuloEconomiaAusente · a causa, não "—"', () => {
  it('nomeia a causa por status', () => {
    expect(rotuloEconomiaAusente('pendente')).toBe('Aguarda confirmação');
    expect(rotuloEconomiaAusente('falhou')).toBe('Não liquidou');
    expect(rotuloEconomiaAusente('cancelado')).toBe('Cancelada');
    expect(rotuloEconomiaAusente('confirmado')).toBe('Sem conciliação');
  });

  it('nenhum rótulo é um número', () => {
    for (const status of ['pendente', 'confirmado', 'falhou', 'estornado', 'cancelado'] as const) {
      expect(rotuloEconomiaAusente(status)).not.toMatch(/\d/);
    }
  });
});

describe('rotuloParcelas', () => {
  it('cartão parcelado mostra o número de parcelas', () => {
    const pagamento = mkPagamento({
      forma: 'cartao_credito',
      cartao: {
        bandeira: 'Visa',
        ultimos4: '4242',
        parcelas: 6,
        valorParcela: 35,
        valorTotalComJuros: 210,
      },
    });
    expect(rotuloParcelas(pagamento)).toBe('6x');
  });

  it('PIX é à vista de fato — não é dado faltando', () => {
    expect(rotuloParcelas(mkPagamento({ forma: 'pix' }))).toBe('À vista');
  });
});

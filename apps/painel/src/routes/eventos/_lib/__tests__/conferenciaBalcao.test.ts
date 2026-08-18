import { describe, it, expect } from 'vitest';
import {
  ausenciaDaCompra,
  conferenciaDoInscrito,
  estadoDaCompra,
  kitCobrado,
  tamanhosEscolhidos,
} from '../conferenciaBalcao';
import { mkInscrito, mkKit, mkPagamento, mkPedido } from '../../_test/fixtures';

describe('estadoDaCompra', () => {
  it('erro vence tudo — inclusive um loading que ainda não baixou', () => {
    expect(estadoDaCompra(true, new Error('permission-denied'), null)).toBe('negada');
  });

  it('carregando enquanto o join está em voo', () => {
    expect(estadoDaCompra(true, null, null)).toBe('carregando');
  });

  it('pedido null depois de carregar é AUSÊNCIA de compra, não negação', () => {
    expect(estadoDaCompra(false, null, null)).toBe('sem_pedido');
  });

  it('pedido lido', () => {
    expect(estadoDaCompra(false, null, mkPedido())).toBe('lida');
  });
});

describe('ausenciaDaCompra', () => {
  it('negação e ausência de compra dizem coisas DIFERENTES', () => {
    // Dizer "sem compra" para quem só não pode ler seria mentira sobre o dado
    // da pessoa — o operador concluiria que ela comprou sem e-mail.
    expect(ausenciaDaCompra('negada')).toBe('Sem permissão para ler a compra');
    expect(ausenciaDaCompra('sem_pedido')).toBe('Inscrição sem compra registrada');
    expect(ausenciaDaCompra('negada')).not.toBe(ausenciaDaCompra('sem_pedido'));
  });

  it('nenhum estado devolve traço mudo', () => {
    for (const estado of ['carregando', 'lida', 'negada', 'sem_pedido'] as const) {
      expect(ausenciaDaCompra(estado).trim().length).toBeGreaterThan(3);
    }
  });
});

describe('tamanhosEscolhidos', () => {
  it('traduz o sufixo de SKU para rótulo de gente', () => {
    expect(tamanhosEscolhidos({ camiseta: 'feminina__M' })).toBe('Feminina M');
  });

  it('sufixo unissex/legado sai como o tamanho puro', () => {
    expect(tamanhosEscolhidos({ camiseta: 'M' })).toBe('M');
  });

  it('repetição some — camiseta e regata no mesmo M lê "M", não "M · M"', () => {
    expect(tamanhosEscolhidos({ camiseta: 'M', regata: 'M' })).toBe('M');
  });

  it('tamanhos diferentes aparecem os dois', () => {
    expect(tamanhosEscolhidos({ camiseta: 'M', bone: 'G' })).toBe('M · G');
  });

  it('kit sem item tamanhado devolve vazio', () => {
    expect(tamanhosEscolhidos({})).toBe('');
  });
});

describe('kitCobrado', () => {
  const kits = [mkKit({ id: 'kit-ouro-2026' }), mkKit({ id: 'kit-custom-9', nome: 'Kit Trail' })];

  it('acha pelo id EXATO do kit cobrado', () => {
    expect(kitCobrado(kits, 'kit-custom-9')?.nome).toBe('Kit Trail');
  });

  it('kitId ausente (doc legado) ou null (sem kit) devolve null', () => {
    expect(kitCobrado(kits, undefined)).toBeNull();
    expect(kitCobrado(kits, null)).toBeNull();
    expect(kitCobrado(kits, '')).toBeNull();
  });

  it('id que não existe na lista devolve null, sem chutar o primeiro', () => {
    expect(kitCobrado(kits, 'kit-que-nao-existe')).toBeNull();
  });
});

describe('conferenciaDoInscrito', () => {
  const kits = [mkKit({ id: 'kit-ouro-2026', itens: ['Camiseta técnica', 'Medalha', 'Sacola'] })];

  const inscrito = mkInscrito({
    id: 'ins-1',
    atletaNome: 'Marina Silva',
    modalidade: '21k',
    kit: 'kit_ouro',
    kitId: 'kit-ouro-2026',
    tamanhos: { camiseta: 'feminina__M' },
  });

  it('com a compra legível, o card tem os seis campos do aceite', () => {
    const c = conferenciaDoInscrito({
      inscrito,
      kits,
      pedido: mkPedido(),
      pagamento: mkPagamento(),
    });

    expect(c.nome).toBe('Marina Silva');
    expect(c.modalidade).toBe('21k');
    expect(c.lote).toBe('Lote 2 — Regular');
    expect(c.incluso).toBe('Camiseta técnica · Medalha · Sacola');
    expect(c.tamanho).toBe('Feminina M');
    expect(c.emailCompra).toBe('marina@exemplo.com');
    expect(c.telefoneCompra).toBe('48999990001');
  });

  it('sem a compra, os quatro campos do inscrito/kit continuam de pé', () => {
    // É o card que o operador de EVENTO vê: as Rules negam pedidos/pagamentos
    // a papel de evento, e o resto não pode cair junto.
    const c = conferenciaDoInscrito({ inscrito, kits, pedido: null, pagamento: null });

    expect(c.nome).toBe('Marina Silva');
    expect(c.modalidade).toBe('21k');
    expect(c.kitLabel).toBe('Kit Ouro');
    expect(c.incluso).toBe('Camiseta técnica · Medalha · Sacola');
    expect(c.tamanho).toBe('Feminina M');
    // E só estes três se calam.
    expect(c.lote).toBe('');
    expect(c.emailCompra).toBe('');
    expect(c.telefoneCompra).toBe('');
  });

  it('catálogo de itens vazio NÃO leva o tamanho junto', () => {
    // A queixa do dono muito provavelmente nasceu aqui: o checklist antigo
    // depende de `itensKit` (coleção que papel de evento nem lê) e some
    // inteiro quando o catálogo está vazio, levando o tamanho embora.
    const c = conferenciaDoInscrito({ inscrito, kits: [], pedido: null, pagamento: null });
    expect(c.incluso).toBe('');
    expect(c.tamanho).toBe('Feminina M');
  });

  it('kit com `itens` vazio (legado) declara ausência, não lista falsa', () => {
    const c = conferenciaDoInscrito({
      inscrito,
      kits: [mkKit({ id: 'kit-ouro-2026', itens: [] })],
      pedido: null,
      pagamento: null,
    });
    expect(c.incluso).toBe('');
    expect(c.semKit).toBe(false);
  });

  it('inscrição sem kit não inventa incluso nem tamanho', () => {
    const c = conferenciaDoInscrito({
      inscrito: mkInscrito({ kit: 'sem_kit', kitId: null, tamanhos: { camiseta: 'M' } }),
      kits,
      pedido: mkPedido(),
      pagamento: mkPagamento(),
    });
    expect(c.semKit).toBe(true);
    expect(c.kitLabel).toBe('Sem kit');
    expect(c.incluso).toBe('');
    expect(c.tamanho).toBe('');
  });

  it('pedido pré-CKMOD sem telefone do responsável cala só o telefone', () => {
    const pedido = mkPedido();
    delete pedido.responsavel.telefone;
    const c = conferenciaDoInscrito({ inscrito, kits, pedido, pagamento: mkPagamento() });
    expect(c.emailCompra).toBe('marina@exemplo.com');
    expect(c.telefoneCompra).toBe('');
  });

  it('pagamento sem loteNome (pedido em grupo com lotes mistos) cala só o lote', () => {
    const pagamento = mkPagamento();
    delete pagamento.loteNome;
    const c = conferenciaDoInscrito({ inscrito, kits, pedido: mkPedido(), pagamento });
    expect(c.lote).toBe('');
    expect(c.emailCompra).toBe('marina@exemplo.com');
  });

  it('pedido lido mas cobrança ainda não criada — lote cala, contato não', () => {
    const c = conferenciaDoInscrito({ inscrito, kits, pedido: mkPedido(), pagamento: null });
    expect(c.lote).toBe('');
    expect(c.emailCompra).toBe('marina@exemplo.com');
    expect(c.telefoneCompra).toBe('48999990001');
  });

  it('CPF nunca sai no card — ele é chave de busca, não campo exibido', () => {
    const c = conferenciaDoInscrito({
      inscrito: mkInscrito({
        ...inscrito,
        dadosPessoais: {
          cpf: '52998224725',
          telefone: '48988887777',
          nascimento: '1990-05-14',
          genero: 'nao_informado',
          cidade: '',
          uf: '',
        },
      }),
      kits,
      pedido: mkPedido(),
      pagamento: mkPagamento(),
    });
    expect(JSON.stringify(c)).not.toContain('52998224725');
  });
});

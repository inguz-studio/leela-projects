// =============================================================================
// Ficha do cliente no drawer (ADMIN-VISAO onda 3 · S1612-T6). Os casos são as
// regras que custam caro se saírem errado:
//   (a) AUSÊNCIA É DECLARADA — ficha sem e-mail e sem endereço mostra a ausência
//       escrita, nunca string vazia, traço solto ou zero;
//   (b) `pedidosTruncados` faz a ficha DIZER que o histórico não é o completo;
//   (c) os dois números de dinheiro aparecem com rótulos que os separam;
//   (d) o conteúdo que o dono autorizou (CPF, contato, endereço, saúde) aparece,
//       formatado, quando a fonte o guarda.
//
// Presentational puro: a ficha entra por prop, nenhum Firebase envolvido.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FichaDoClienteDrawer } from '../FichaDoClienteDrawer';
import type { FichaDoClienteView } from '@leela/api-client';

function mkFicha(over: Partial<FichaDoClienteView> = {}): FichaDoClienteView {
  return {
    clienteKey: 'k-marina',
    nome: 'Marina Castelo',
    cpf: '52998224725',
    nascimento: '1990-04-17',
    genero: 'feminino',
    email: 'marina@exemplo.com',
    telefone: '48999990001',
    cidade: 'Florianópolis',
    uf: 'SC',
    endereco: {
      cep: '88010000',
      logradouro: 'Rua Felipe Schmidt',
      bairro: 'Centro',
      cidade: 'Florianópolis',
      uf: 'SC',
      numero: '210',
      complemento: 'Sala 4',
    },
    restricoesMedicas: 'Asma leve',
    contatoEmergencia: { nome: 'Pedro Castelo', telefone: '48988880002' },
    qtdEventos: 3,
    qtdInscricoes: 4,
    valorGasto: 862.5,
    ltv: 780,
    pedidos: [
      {
        pedidoId: 'ped-1',
        eventoId: 'meia-maratona-floripa-2026',
        eventoNome: 'Meia Maratona de Floripa 2026',
        statusNoCrm: 'confirmado',
        statusDoPedido: 'pago',
        valorPago: 200,
        atualizadoEmMs: Date.UTC(2026, 3, 10, 12, 5),
      },
    ],
    pedidosTruncados: false,
    ...over,
  };
}

function renderDrawer(props: Partial<Parameters<typeof FichaDoClienteDrawer>[0]> = {}): {
  onFechar: ReturnType<typeof vi.fn>;
} {
  const onFechar = vi.fn();
  render(
    <FichaDoClienteDrawer
      aberto
      nome="Marina Castelo"
      ficha={mkFicha()}
      loading={false}
      erro={null}
      onFechar={onFechar}
      {...props}
    />
  );
  return { onFechar };
}

describe('FichaDoClienteDrawer · ausência é declarada, nunca disfarçada', () => {
  it('ficha sem e-mail e sem endereço mostra a ausência ESCRITA', () => {
    renderDrawer({ ficha: mkFicha({ email: null, endereco: null }) });

    expect(screen.getByText(/Não coletado\. O e-mail vem do responsável do pedido/)).toBeInTheDocument();
    expect(screen.getByText(/Não coletado\. O endereço vem do checkout/)).toBeInTheDocument();
  });

  it('campo ausente não vira traço solto nem zero', () => {
    renderDrawer({
      ficha: mkFicha({
        cpf: null,
        email: null,
        telefone: null,
        cidade: null,
        uf: null,
        endereco: null,
        restricoesMedicas: null,
        contatoEmergencia: null,
      }),
    });

    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    // Sete campos nulos, sete frases de ausência (nenhum silêncio).
    expect(screen.getAllByText(/^Não coletado/)).toHaveLength(7);
  });

  it('CPF ausente nomeia a fonte que deveria tê-lo', () => {
    renderDrawer({ ficha: mkFicha({ cpf: null }) });

    expect(
      screen.getByText(/Não coletado\. O CPF vem dos dados pessoais da inscrição/)
    ).toBeInTheDocument();
  });

  it('restrição médica e contato de emergência ausentes dizem o que faltou', () => {
    renderDrawer({ ficha: mkFicha({ restricoesMedicas: null, contatoEmergencia: null }) });

    expect(screen.getByText(/nenhuma inscrição desta pessoa registrou restrição médica/i)).toBeInTheDocument();
    expect(
      screen.getByText(/nenhuma inscrição desta pessoa registrou contato de emergência/i)
    ).toBeInTheDocument();
  });

  it('pedido sem doc no banco declara a falta em vez de fingir status', () => {
    renderDrawer({
      ficha: mkFicha({
        pedidos: [
          {
            pedidoId: '',
            eventoId: 'e1',
            eventoNome: 'Corrida do Mar',
            statusNoCrm: 'confirmado',
            statusDoPedido: null,
            valorPago: 120,
            atualizadoEmMs: Date.UTC(2026, 2, 1, 9, 0),
          },
        ],
      }),
    });

    expect(screen.getByText(/O pedido desta inscrição não está mais no banco/)).toBeInTheDocument();
  });
});

describe('FichaDoClienteDrawer · o recorte se anuncia', () => {
  it('pedidosTruncados diz que o histórico mostrado não é o completo', () => {
    renderDrawer({ ficha: mkFicha({ pedidosTruncados: true }) });

    expect(screen.getByText(/Este histórico não é o completo/)).toBeInTheDocument();
    expect(screen.getByText(/mais inscrições no registro do que a ficha lê/)).toBeInTheDocument();
  });

  it('sem truncamento, a ficha não inventa um aviso de recorte', () => {
    renderDrawer();

    expect(screen.queryByText(/Este histórico não é o completo/)).not.toBeInTheDocument();
  });

  it('o histórico avisa que traz estornada e que ela fica fora dos números', () => {
    renderDrawer();

    expect(screen.getByText(/Estornada continua aqui e fica fora do valor gasto e do LTV/)).toBeInTheDocument();
  });

  it('a inscrição estornada é rotulada como tal na linha', () => {
    renderDrawer({
      ficha: mkFicha({
        pedidos: [
          {
            pedidoId: 'ped-2',
            eventoId: 'e2',
            eventoNome: 'Trail da Serra',
            statusNoCrm: 'estornado',
            statusDoPedido: 'cancelado',
            valorPago: 150,
            atualizadoEmMs: Date.UTC(2026, 1, 20, 15, 30),
          },
        ],
      }),
    });

    expect(screen.getByText('Estornada')).toBeInTheDocument();
    expect(screen.queryByText('Confirmada')).not.toBeInTheDocument();
  });
});

describe('FichaDoClienteDrawer · o conteúdo que o dono autorizou', () => {
  it('mostra CPF, telefone, cidade e endereço formatados', () => {
    renderDrawer();

    expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
    expect(screen.getByText('(48) 99999-0001')).toBeInTheDocument();
    expect(screen.getByText('Florianópolis · SC')).toBeInTheDocument();
    expect(screen.getByText(/Rua Felipe Schmidt, 210/)).toBeInTheDocument();
    expect(screen.getByText(/CEP 88010-000/)).toBeInTheDocument();
  });

  it('mostra restrição médica e contato de emergência', () => {
    renderDrawer();

    expect(screen.getByText('Asma leve')).toBeInTheDocument();
    expect(screen.getByText('Pedro Castelo · (48) 98888-0002')).toBeInTheDocument();
  });

  it('os dois números de dinheiro têm rótulos que os separam (R19)', () => {
    renderDrawer();

    expect(screen.getByText('Valor gasto')).toBeInTheDocument();
    expect(screen.getByText('LTV')).toBeInTheDocument();
    expect(screen.getByText('R$ 862,50')).toBeInTheDocument();
    expect(screen.getByText('R$ 780,00')).toBeInTheDocument();
    expect(screen.getByText('Inscrições confirmadas')).toBeInTheDocument();
  });

  it('o cabeçalho diz que a consulta ficou registrada', () => {
    renderDrawer();

    expect(screen.getByText(/Esta consulta ficou registrada/)).toBeInTheDocument();
  });
});

describe('FichaDoClienteDrawer · estados', () => {
  it('fechado não renderiza nada', () => {
    renderDrawer({ aberto: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('carregando mostra skeleton nomeado e nenhum campo de PII', () => {
    renderDrawer({ ficha: null, loading: true });

    expect(screen.getByRole('status', { name: 'Carregando a ficha do cliente' })).toBeInTheDocument();
    expect(screen.queryByText('529.982.247-25')).not.toBeInTheDocument();
  });

  it('erro mostra alerta com a frase do servidor', () => {
    renderDrawer({
      ficha: null,
      erro: 'Apenas platform_admin abre a ficha de um cliente — acesso registrado (RN-539).',
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Apenas platform_admin abre a ficha/)).toBeInTheDocument();
  });

  it('o botão fechar devolve o controle ao container', async () => {
    const { onFechar } = renderDrawer();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});

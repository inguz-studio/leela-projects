// =============================================================================
// PROVA da S1225-T2 (RN-470 · trace leela-pixreal-diag-20260804) — 2026-08-04.
//
// O QUE ESTES TESTES IMPEDEM DE VOLTAR: o comprador do primeiro PIX real pagou
// R$ 1,00 de verdade, o webhook entregou em dez segundos, e ele não soube de
// nada. A tela de pagamento prometia que *"a confirmação chega sozinha, em
// segundos — não é preciso avisar aqui"* (`StepPagamento.tsx`, T3 da
// PIXREAL-FIX) — e não havia canal nenhum em tela que cumprisse: nem
// `onSnapshot`, nem polling. Quem cumpriria era o e-mail, e ele quebrou na
// trava de IPs da Brevo no mesmo dia.
//
// A v1 do dono (verbatim, DEC-0804): mensagem "Estamos confirmando o seu
// pedido", CTA para os próprios pedidos e orientação de conferir o e-mail.
// O CTA CHEGOU na S1225-T4, depois que a área do cliente (S1222-T2) subiu
// — a dependência era dura. O que os casos provam agora é que ele existe E
// tem destino: um CTA apontando para rota inexistente trocaria tela feia por 404.
//
// Sem Firebase — os três componentes só importam TIPOS do api-client.
// =============================================================================

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import { StepConfirmacao } from '../app/(public)/[eventSlug]/inscricao/checkout/StepConfirmacao';
import { AvisoPedidoEmConfirmacao } from '../app/(public)/[eventSlug]/inscricao/checkout/AvisoPedidoEmConfirmacao';
import { ToastProvider } from '../app/_ds/ds';
import {
  AREA_CLIENTE_NO_AR,
  ROTA_AREA_CLIENTE,
  ctaMeusPedidos,
  destinoPosEntrada,
} from '../lib/areaDoCliente';

afterEach(cleanup);

const EMAIL = 'compradora@example.com';

function charge(over: Partial<CreateInscricaoChargeResult> = {}): CreateInscricaoChargeResult {
  return {
    pedidoId: 'ped-anon-ana-4f21c9-chk-a1b2c3d4',
    pagamentoId: 'pag-anon-ana-4f21c9-chk-a1b2c3d4',
    inscritoIds: ['ins_1'],
    chargeId: 'pay_6e37hktx4xld12qf',
    qrCode: '00020126...br.gov.bcb.pix...',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    valores: {
      valorBase: 1000,
      desconto: 0,
      valorFinal: 1000,
      taxaServico: 105,
      totalCobrado: 1105,
      parcelas: 1,
      valorParcela: 1105,
    },
    ...over,
  };
}

function renderConfirmacao(statusPedido: string, forma: 'pix' | 'cartao_credito'): void {
  render(
    <ToastProvider>
      <StepConfirmacao
        charge={charge()}
        confirmacao={{
          pedidoId: charge().pedidoId,
          pagamentoId: charge().pagamentoId,
          chargeId: charge().chargeId,
          statusGateway: statusPedido === 'pago' ? 'confirmed' : 'pending',
          duplicado: false,
          ignorado: false,
          statusPedido,
        }}
        eventoNome="Meia Maratona de Florianópolis"
        slug="meia-maratona-floripa-2026"
        responsavelEmail={EMAIL}
        linhas={[{ titulo: 'Ana Participante', modalidade: '21k', kitLabel: 'Kit Ouro' }]}
        forma={forma}
        taxaRepassada
      />
    </ToastProvider>,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A mensagem que o dono escreveu, no estado que ele descreveu
// ─────────────────────────────────────────────────────────────────────────
describe('S1225-T2 · o estado não-final responde ao comprador', () => {
  it('pedido não pago ⇒ "Estamos confirmando o seu pedido" + orientação de e-mail', () => {
    renderConfirmacao('pendente', 'pix');
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
    expect(screen.getByText(/confira a caixa de entrada/i)).toBeTruthy();
    expect(screen.getByText(/acesso do seu ingresso vai por lá/i)).toBeTruthy();
  });

  it('a orientação NOMEIA a caixa de entrada da compra', () => {
    renderConfirmacao('pendente', 'pix');
    expect(screen.getByText(EMAIL)).toBeTruthy();
  });

  it('sem e-mail conhecido a orientação continua de pé, só não inventa o endereço', () => {
    render(<AvisoPedidoEmConfirmacao />);
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
    expect(screen.getByText(/e-mail que você informou na compra/i)).toBeTruthy();
  });

  it('o rótulo mudo "Pagamento pendente" saiu da tela', () => {
    renderConfirmacao('pendente', 'pix');
    expect(screen.queryByText(/pagamento pendente/i)).toBeNull();
  });

  it('o aviso é `status` polite, não `alert` — espera não tem urgência de recusa', () => {
    render(<AvisoPedidoEmConfirmacao email={EMAIL} />);
    const bloco = screen.getByRole('status');
    expect(bloco.getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// O pedido PAGO não passa por "Estamos confirmando"
// ─────────────────────────────────────────────────────────────────────────
describe('S1225-T2 · resposta já conhecida não vira espera', () => {
  it('pedido pago ⇒ "Inscrição confirmada!" e NUNCA "Estamos confirmando"', () => {
    renderConfirmacao('pago', 'pix');
    expect(screen.getByText('Inscrição confirmada!')).toBeTruthy();
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('pago no cartão também confirma direto, sem passar pela espera', () => {
    renderConfirmacao('pago', 'cartao_credito');
    expect(screen.getByText('Inscrição confirmada!')).toBeTruthy();
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// O CTA é gated — e agora o gate está ABERTO (S1225-T4)
// ─────────────────────────────────────────────────────────────────────────
//
// Este bloco afirmava a AUSÊNCIA do CTA, e a afirmação era temporária por
// contrato: a fila (`04-fila-codigo.md` §Frente 2) escreve que "quando a B2
// subir, a S1225-T4 destrava". A B2 subiu. O que o bloco prova agora é a outra
// metade da mesma regra — o CTA existe E aponta para a rota que existe. A
// propriedade que NÃO mudou é a que importa: o botão nunca nasce sem destino, e
// quem decide isso continua sendo uma constante só (`AREA_CLIENTE_NO_AR`).
describe('S1225-T4 · o CTA "ver meus pedidos" fecha o trio que o dono pediu', () => {
  it('o CTA aparece no bloco de confirmação e leva à área do cliente', () => {
    renderConfirmacao('pendente', 'pix');
    const cta = screen.getByRole('link', { name: /ver meus ingressos/i });
    expect(cta.getAttribute('href')).toBe(ROTA_AREA_CLIENTE);
  });

  it('os três elementos do verbatim do dono estão no MESMO bloco', () => {
    renderConfirmacao('pendente', 'pix');
    const bloco = screen.getByRole('status');
    const dentro = within(bloco);
    expect(dentro.getByText(/estamos confirmando o seu pedido/i)).toBeTruthy();
    expect(dentro.getByRole('link', { name: /ver meus ingressos/i })).toBeTruthy();
    expect(dentro.getByText(/o acesso do seu ingresso vai por lá/i)).toBeTruthy();
  });

  it('o destino do CTA é a MESMA constante do fim do `/definir-senha`', () => {
    // Duas jornadas, um destino. Se algum dia elas divergirem, é porque
    // alguém cravou a rota numa tela em vez de consultar o módulo.
    expect(ctaMeusPedidos()?.href).toBe(destinoPosEntrada().href);
  });

  it('com a área FORA do ar, nenhum botão é desenhado — nunca um link quebrado', () => {
    // A falsificação da trava, sem mexer no estado global: o contrato de
    // `ctaMeusPedidos` é devolver `null`, e o componente só desenha quando não
    // é `null`. Provar o `null` prova a ausência do botão.
    expect(AREA_CLIENTE_NO_AR).toBe(true);
    const fonte = readFileSync(
      resolve(__dirname, '../app/(public)/[eventSlug]/inscricao/checkout/AvisoPedidoEmConfirmacao.tsx'),
      'utf8'
    );
    expect(fonte).toContain('ctaMeusPedidos()');
    expect(fonte).toContain('cta !== null');
    // E o destino NÃO está cravado na tela: ele vem do módulo.
    expect(fonte).not.toContain(`"${ROTA_AREA_CLIENTE}"`);
    expect(fonte).not.toContain(`'${ROTA_AREA_CLIENTE}'`);
  });

  it('o estado PAGO segue sem o CTA — o ingresso já está na tela', () => {
    renderConfirmacao('pago', 'pix');
    expect(screen.queryByRole('link', { name: /ver meus ingressos/i })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// A VARREDURA — o último critério da S1225 em forma executável
// ─────────────────────────────────────────────────────────────────────────
//
// "Dado a v1 no ar, quando varro a copy do checkout, então nenhuma frase
// promete confirmação automática em tela sem canal que a cumpra."
//
// O teste varre o TEXTO-FONTE de todo o diretório do checkout, com os
// comentários removidos — os comentários CITAM as frases banidas de propósito
// (é assim que a decisão fica auditável no arquivo onde ela vale), e é copy
// que o comprador lê, não comentário, que este critério governa.
describe('S1225-T2 · varredura: nenhuma superfície do checkout promete confirmação automática', () => {
  const DIR = resolve(__dirname, '../app/(public)/[eventSlug]/inscricao/checkout');

  /** Remove blocos `/* … *\/` e linhas `// …` antes de varrer a copy. */
  function semComentarios(fonte: string): string {
    return fonte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  }

  const PROMESSAS_BANIDAS: readonly { nome: string; re: RegExp }[] = [
    { nome: 'a confirmação chega sozinha', re: /chega sozinh/i },
    { nome: 'não é preciso avisar aqui', re: /não é preciso avisar/i },
    { nome: 'confirmação automática', re: /confirmaç(?:ão|ao) autom(?:á|a)tica/i },
    { nome: 'esta tela atualiza sozinha', re: /atualiza(?:rá|r)?\s+sozinh/i },
    { nome: 'em instantes/segundos esta tela confirma', re: /esta tela\s+(?:confirma|avisa)/i },
  ];

  const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.tsx'));

  it('o diretório do checkout foi realmente varrido (controle do próprio teste)', () => {
    expect(arquivos.length).toBeGreaterThan(10);
    expect(arquivos).toContain('StepPagamento.tsx');
    expect(arquivos).toContain('StepConfirmacao.tsx');
  });

  for (const arquivo of arquivos) {
    it(`${arquivo} não promete canal que não existe`, () => {
      const copy = semComentarios(readFileSync(resolve(DIR, arquivo), 'utf8'));
      for (const { nome, re } of PROMESSAS_BANIDAS) {
        expect(
          re.test(copy),
          `${arquivo} voltou a prometer "${nome}" — RN-470: nenhuma superfície do checkout afirma confirmação automática em tela sem canal que a cumpra`,
        ).toBe(false);
      }
    });
  }

  it('a varredura pega a frase do incidente se ela voltar (controle positivo)', () => {
    const reincidencia =
      'Pague dentro do prazo acima e a confirmação chega sozinha, em segundos.';
    expect(PROMESSAS_BANIDAS.some(({ re }) => re.test(reincidencia))).toBe(true);
  });
});

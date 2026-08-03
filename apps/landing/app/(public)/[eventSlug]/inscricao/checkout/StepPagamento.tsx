'use client';

import { Button } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import type { FormaUI } from './tipos';
import { PixCobranca, payloadPix } from './PixCobranca';
import { ProcessandoPagamento } from './ProcessandoPagamento';

export interface CartaoForm {
  nome: string;
  numero: string;
  validade: string;
  cvv: string;
}

/**
 * Etapa 4 — Pagamento (via MockPaymentProvider). Chama `createInscricaoCharge`
 * (produtor de escrita) e fecha contra o Mock: PIX mostra o QR/código simulado;
 * cartão coleta os campos. A confirmação dispara o webhook assinado (sandbox).
 *
 * Idempotência VISÍVEL: a chave de idempotência é gerada UMA vez por tentativa e
 * reusada — reenviar "pagar" devolve o MESMO pedido (o servidor não duplica).
 * Os campos de cartão são cosméticos no sandbox (o Mock não os processa) e NÃO
 * são enviados — sinalizado ao usuário.
 *
 * S1217-T1 · RN-438 (supersede a CKFORM §5.3 de 2026-07-18): os DOIS aceites
 * saíram desta etapa e passaram a fechar a etapa de INSCRIÇÃO, gateando o
 * "Continuar". Aqui fica o que é de pagamento. O que NÃO mudou: a cobrança é
 * criada já com os aceites no input, o servidor carimba versão + timestamp +
 * hash dentro da transação (flip F-4a · CKMOD), e o botão de pagar continua
 * desabilitado sem eles — a tela não oferece um ato que o servidor recusaria.
 */
export function StepPagamento({
  forma,
  total,
  charge,
  criandoCharge,
  erroCharge,
  onGerarCobranca,
  onPagarCartao,
  confirmando,
  erroConfirmar,
  onConfirmar,
  aceitesOk,
  pixExpirado = false,
  pixVivoPeloServidor = false,
  pixDesvioRelogioMs = 0,
  onPixExpirar,
  onNovaCobranca,
  gatewaySemResposta = false,
  totalDefasado = false,
}: {
  forma: FormaUI;
  total: number | null;
  charge: CreateInscricaoChargeResult | null;
  criandoCharge: boolean;
  erroCharge: string | null;
  onGerarCobranca: () => void;
  onPagarCartao: () => void;
  confirmando: boolean;
  erroConfirmar: string | null;
  onConfirmar: () => void;
  /**
   * S1217-T1 · RN-438: os DOIS aceites já foram colhidos na etapa de
   * inscrição, e esta etapa não os exibe mais. O booleano continua chegando
   * porque o gate do botão de pagar é defesa em profundidade — o servidor
   * recusa a cobrança sem aceite (flip F-4a) e a tela não oferece o ato.
   */
  aceitesOk: boolean;
  /** RN-157: cobrança PIX já expirada (timer zerou / servidor cancelou). */
  pixExpirado?: boolean;
  /** S1209-REV: o servidor RECUSOU a expiração — a cobrança segue viva. */
  pixVivoPeloServidor?: boolean;
  /**
   * S1209-PIXBE-T5: relógio do servidor − relógio do aparelho, medido na
   * resposta da cobrança. Ancora a contagem no relógio que carimbou a
   * expiração (achado #6 da review). 0 = comportamento vigente.
   */
  pixDesvioRelogioMs?: number;
  /** RN-157: o timer zerou — materializar a expiração no servidor. */
  onPixExpirar?: () => void;
  /** RN-157: recomeçar com uma cobrança NOVA (nunca reusa a expirada). */
  onNovaCobranca?: () => void;
  /**
   * DEC-0727 (item 28): o teto de 15s do adapter estourou — o provedor não
   * respondeu e o estado da cobrança é DESCONHECIDO. Não é erro: a face disso
   * é "processando pagamento", em cartão e em PIX.
   */
  gatewaySemResposta?: boolean;
  /**
   * CKUX-REV · uma cotação NOVA está no ar: o `total` desta renderização é o
   * da seleção ANTERIOR. O B1 pôs resumo, parcelas e botão de pagar na mesma
   * tela, então mexer no que move preço passou a acontecer a um clique do ato
   * de pagar — e a cotação nova custa o debounce mais o round-trip (1,7-9,8 s
   * medidos em produção). Enquanto isso durar, o botão não pode prometer um
   * valor que o servidor não vai cobrar.
   */
  totalDefasado?: boolean;
}): React.JSX.Element {
  const totalLabel = total !== null ? formatarPreco(total) : '';
  // DEC-0727 · a espera do gateway é UM estado com duas entradas: a chamada
  // ainda no ar (até 15s por chamada) e a chamada que estourou o teto. Os dois
  // falam a MESMA frase ao comprador — o que muda é o que vem depois dela.
  const emVoo = criandoCharge || confirmando;
  const processando = gatewaySemResposta || emVoo;
  // Erro e espera não coexistem: enquanto a plataforma não sabe o desfecho,
  // qualquer alerta vermelho seria uma afirmação que ela não pode fazer.
  const mostrarErroCharge = erroCharge !== null && !processando;
  const mostrarErroConfirmar = erroConfirmar !== null && !processando;

  return (
    <div className="flex flex-col gap-6">
      {forma === 'pix' ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Pagamento via PIX</h2>

          {charge === null ? (
            <>
              <p className="text-sm text-text-secondary">
                {aceitesOk ? (
                  <>
                    Estamos preparando o código PIX para pagar{' '}
                    {totalLabel ? <strong>{totalLabel}</strong> : null} à vista. Sua vaga fica
                    reservada como pendente até a confirmação.
                  </>
                ) : (
                  <>
                    Volte à etapa de inscrição e confirme os aceites para gerar o código PIX
                    {totalLabel ? (
                      <>
                        {' '}
                        de <strong>{totalLabel}</strong>
                      </>
                    ) : null}{' '}
                    à vista.
                  </>
                )}
              </p>
              {/* Auto-gerado quando os aceites confirmam (A-3 + §5.3); o botão
                  fica como fallback se a geração automática falhar. */}
              <div>
                <Button
                  onClick={onGerarCobranca}
                  disabled={criandoCharge || !aceitesOk || totalDefasado}
                >
                  {criandoCharge ? 'Preparando código PIX…' : 'Gerar código PIX'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* RN-157 · D-6: o MESMO bloco vivo da tela do pedido pendente —
                  QR + copia-e-cola + contagem de 30 min + copiar com toast. */}
              <PixCobranca
                codigo={payloadPix(charge)}
                expiraEmMillis={charge.pixExpiraEmMillis}
                expirado={pixExpirado}
                vivoPeloServidor={pixVivoPeloServidor}
                desvioRelogioMs={pixDesvioRelogioMs}
                onExpirar={onPixExpirar}
                onNovaCobranca={onNovaCobranca}
                nota={
                  <p className="text-xs text-text-tertiary">
                    Ambiente de simulação: nenhum PIX real é cobrado. Clique abaixo para simular a
                    confirmação do pagamento (o gateway dispara o webhook).
                  </p>
                }
              />
              {/* Cobrança expirada não tem o que confirmar: o caminho é uma
                  cobrança nova (o botão vive dentro do bloco do PIX). */}
              {pixExpirado ? null : (
                <div>
                  <Button onClick={onConfirmar} disabled={confirmando}>
                    {confirmando ? 'Confirmando…' : 'Já paguei — confirmar'}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Pagamento com cartão</h2>
          {/* D-0729-6: os campos do cartão são revelados dentro da própria
              opção "Cartão de crédito" (SeletorForma), no 1º clique — não
              existe mais uma segunda tela para digitá-los. S1217-T1: os
              aceites saíram daqui; o que resta é o ATO de pagar. */}
          <div>
            <Button
              onClick={onPagarCartao}
              disabled={criandoCharge || confirmando || !aceitesOk || totalDefasado}
            >
              {criandoCharge || confirmando
                ? 'Processando…'
                : totalDefasado
                  ? 'Atualizando o total…'
                  : `Pagar ${totalLabel}`.trim()}
            </Button>
          </div>
        </section>
      )}

      {/* DEC-0727 · "processando pagamento" vale para PIX e cartão — o bloco
          fica FORA do ramo por forma, de propósito: uma frase, um lugar. */}
      {processando ? (
        <ProcessandoPagamento
          estado={emVoo ? 'em-voo' : 'sem-resposta'}
          tentando={emVoo}
          {...(gatewaySemResposta && !emVoo
            ? {
                // A retomada é a MESMA ação que estourou, não uma ação nova:
                // sem cobrança, re-tenta a criação (que é replay pela chave);
                // com cobrança na mão, o que faltou foi a confirmação. Mandar
                // "criar" aqui devolveria a cobrança de cache e a tela ficaria
                // parada no mesmo aviso — um botão que não faz nada.
                onTentarNovamente:
                  charge === null
                    ? forma === 'pix'
                      ? onGerarCobranca
                      : onPagarCartao
                    : onConfirmar,
              }
            : {})}
        />
      ) : null}
      {mostrarErroCharge ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroCharge}
        </p>
      ) : null}
      {mostrarErroConfirmar ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroConfirmar}
        </p>
      ) : null}
    </div>
  );
}

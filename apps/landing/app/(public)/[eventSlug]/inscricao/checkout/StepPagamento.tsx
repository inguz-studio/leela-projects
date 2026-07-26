'use client';

import { Button, Field, Input } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import type { PoliticaVendasPublica } from '@/lib/tipos';
import type { FormaUI } from './tipos';
import { AceitesCompra } from './AceitesCompra';
import { PixCobranca, payloadPix } from './PixCobranca';

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
 * LEELA-CKFORM (spec §5.3): os DOIS aceites (termos da compra + termo de
 * saúde) gateiam o botão de pagar — sem os 2 checks, Gerar PIX/Pagar ficam
 * desabilitados (constraint, Norman princípio 3). A cobrança é criada JÁ com
 * os aceites no input (o servidor carimba versão+timestamp in-tx — CKMOD);
 * depois de criada, os checkboxes travam (prova registrada).
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
  cartao,
  onCartao,
  politica,
  termoSaudeVersao,
  eventoNome,
  organizadorNome,
  aceiteTermos,
  aceiteSaude,
  onAceiteTermos,
  onAceiteSaude,
  pixExpirado = false,
  pixVivoPeloServidor = false,
  pixDesvioRelogioMs = 0,
  onPixExpirar,
  onNovaCobranca,
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
  cartao: CartaoForm;
  onCartao: (patch: Partial<CartaoForm>) => void;
  politica: PoliticaVendasPublica;
  termoSaudeVersao: number;
  eventoNome: string;
  organizadorNome: string | null;
  aceiteTermos: boolean;
  aceiteSaude: boolean;
  onAceiteTermos: (v: boolean) => void;
  onAceiteSaude: (v: boolean) => void;
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
}): React.JSX.Element {
  const totalLabel = total !== null ? formatarPreco(total) : '';
  const aceitesOk = aceiteTermos && aceiteSaude;

  const blocoAceites = (
    <AceitesCompra
      politica={politica}
      termoSaudeVersao={termoSaudeVersao}
      eventoNome={eventoNome}
      organizadorNome={organizadorNome}
      aceiteTermos={aceiteTermos}
      aceiteSaude={aceiteSaude}
      onAceiteTermos={onAceiteTermos}
      onAceiteSaude={onAceiteSaude}
      // Cobrança criada = prova de aceite já carimbada no servidor.
      desabilitado={charge !== null}
    />
  );

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
                    Confirme os dois aceites abaixo para gerar o código PIX
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
              {/* §5.3: aceites ACIMA do botão de pagar. */}
              {blocoAceites}
              {/* Auto-gerado quando os aceites confirmam (A-3 + §5.3); o botão
                  fica como fallback se a geração automática falhar. */}
              <div>
                <Button onClick={onGerarCobranca} disabled={criandoCharge || !aceitesOk}>
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
              {/* Prova registrada com a cobrança — os checks ficam visíveis
                  (e travados) enquanto a pessoa paga. */}
              {blocoAceites}
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
          <div className="grid gap-4">
            <Field label="Nome no cartão">
              <Input
                value={cartao.nome}
                autoComplete="cc-name"
                onChange={(e) => onCartao({ nome: e.target.value })}
              />
            </Field>
            <Field label="Número do cartão">
              <Input
                value={cartao.numero}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                onChange={(e) => onCartao({ numero: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Validade">
                <Input
                  value={cartao.validade}
                  autoComplete="cc-exp"
                  placeholder="MM/AA"
                  onChange={(e) => onCartao({ validade: e.target.value })}
                />
              </Field>
              <Field label="CVV">
                <Input
                  value={cartao.cvv}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  onChange={(e) => onCartao({ cvv: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <p className="text-xs text-text-tertiary">
            Ambiente de simulação: os dados do cartão não são enviados nem cobrados. O
            MockPaymentProvider confirma a cobrança e dispara o webhook.
          </p>
          {/* §5.3: aceites ACIMA do botão de pagar. */}
          {blocoAceites}
          <div>
            <Button onClick={onPagarCartao} disabled={criandoCharge || confirmando || !aceitesOk}>
              {criandoCharge || confirmando
                ? 'Processando…'
                : `Pagar ${totalLabel}`.trim()}
            </Button>
          </div>
        </section>
      )}

      {erroCharge ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroCharge}
        </p>
      ) : null}
      {erroConfirmar ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroConfirmar}
        </p>
      ) : null}
    </div>
  );
}

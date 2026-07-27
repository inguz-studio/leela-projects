'use client';

import { Button } from '@/app/_ds/ds';

/**
 * Em que ponto da espera o comprador está.
 *
 * `em-voo`      — a requisição saiu e ainda não voltou. É a ESPERA LONGA: o
 *                 gateway pode levar até 15s por chamada (teto do adapter,
 *                 DEC-0727), e o botão desabilitado sozinho não conta isso a
 *                 ninguém.
 * `sem-resposta`— o teto estourou. A plataforma parou de esperar e NÃO SABE
 *                 se a cobrança nasceu no gateway.
 */
export type EstadoProcessando = 'em-voo' | 'sem-resposta';

/**
 * "Processando pagamento" — a face do teto de 15s para quem está comprando
 * (DEC-0727, item 28, verbatim do dono: *"confirmo a sugestao de falar
 * 'processando pagamento'. Isso pode se aplicar para cartao e pix."*).
 *
 * POR QUE ESTE COMPONENTE EXISTE, e não um `erroCharge` com outro texto: o
 * estouro do teto não é uma falha. A cobrança pode ter sido criada e a
 * resposta não ter voltado — o estado é DESCONHECIDO. Uma tela que diz
 * "não foi possível criar a cobrança" mente em uma direção; uma que diz
 * "pagamento confirmado" mente na outra. Sobra dizer a verdade: está
 * processando, e a plataforma ainda não sabe o desfecho.
 *
 * ACESSIBILIDADE — deliberadamente `role="status"` (`aria-live="polite"`), e
 * NÃO `role="alert"`:
 *   - `alert` é assertivo, interrompe o leitor de tela e é o canal de erro
 *     desta tela (os dois `<p role="alert">` do StepPagamento). Anunciar uma
 *     espera com a mesma urgência de uma recusa treina a pessoa a ignorar as
 *     duas;
 *   - `polite` conta a mudança de estado no primeiro intervalo livre, que é
 *     exatamente a semântica de "estamos aguardando o provedor".
 *
 * CONTRASTE: par `feedback-info-fg` × `feedback-info-surface` e borda
 * `feedback-info` — os três são tokens do DS e os dois pares (texto 4.5:1 e
 * não-texto 3:1) estão na matriz do gate de contraste do design system. Zero
 * cor literal aqui: no tema brasa a família `info` resolve para o rosa
 * heroico, e é o token que sabe disso, não este arquivo.
 */
export function ProcessandoPagamento({
  estado,
  onTentarNovamente,
  tentando = false,
}: {
  estado: EstadoProcessando;
  /**
   * Nova tentativa. SEGURA por construção: o fluxo reusa a MESMA
   * `idempotencyKey`, e o servidor faz lookup por `externalReference` antes
   * de qualquer POST — o replay encontra a cobrança que o timeout deixou
   * órfã em vez de criar a segunda (provado em
   * `functions/src/__tests__/asaasProvider.test.ts`, bloco de idempotência,
   * e no invariante de replay de `pixArbitragem.integration.test.ts`).
   */
  onTentarNovamente?: () => void;
  /** Uma tentativa já está no ar — o botão não pode disparar a segunda. */
  tentando?: boolean;
}): React.JSX.Element {
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2 rounded-lg border border-feedback-info bg-feedback-info-surface p-4"
    >
      <h3 className="text-sm font-semibold text-feedback-info-fg">
        Processando pagamento
      </h3>
      {estado === 'em-voo' ? (
        <p className="text-sm text-feedback-info-fg">
          Estamos confirmando o pagamento com o provedor. Isso pode levar
          alguns segundos — não feche esta página.
        </p>
      ) : (
        <>
          <p className="text-sm text-feedback-info-fg">
            O provedor de pagamento não respondeu no tempo esperado, então
            ainda não sabemos se a cobrança foi registrada. Não abra outra:
            tentar de novo reaproveita a mesma cobrança e nunca cobra duas
            vezes.
          </p>
          {onTentarNovamente !== undefined ? (
            <div className="pt-1">
              <Button
                variant="secondary"
                onClick={onTentarNovamente}
                disabled={tentando}
              >
                {tentando ? 'Processando pagamento…' : 'Tentar novamente'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

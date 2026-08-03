'use client';

import { CreditCard, QrCode } from 'lucide-react';
import { RadioCard, RadioGroup } from '@/app/_ds/ds';
import type { FormaUI } from './tipos';

// =============================================================================
// SeletorForma — escolha da forma de pagamento (S1209-T1 · decisão D-5).
//
// Verbatim do Vitor: "pix e cartao na etapa de pagamento, mas em botões, sem
// toggle." O controle é o `RadioCard` do DS (shadcn-first §8): cartão clicável
// de decisão — ícone, título e apoio — que LÊ como botão e é, por baixo, um
// `<input type="radio">` nativo. Isso entrega o que a decisão pede (botão, não
// toggle) sem inventar peça fora do DS e sem perder navegação por seta, foco
// de teclado e o role de fábrica (design-principles: escolha única exclusiva
// entre 2 opções que valem ser comparadas = radio/segmented, nunca switch).
//
// O TÍTULO é o rótulo vindo do consumidor (S1210 · RN-180: quando a taxa é
// repassada e os totais DIFEREM por meio, o total de cada opção entra no
// rótulo). O nome acessível de cada opção segue sendo exatamente esse rótulo —
// o ícone é aria-hidden e a descrição vai por aria-describedby.
// =============================================================================

export function SeletorForma({
  forma,
  onForma,
  labelPix,
  labelCartao,
  disabled = false,
  conteudoPix,
  conteudoCartao,
}: {
  /**
   * S1217-T2 · RN-440: `null` = nenhuma opção marcada. Não é estado de erro
   * nem de carregamento — é a ausência de escolha, e ela precisa existir para
   * que a escolha do PIX seja um ato deliberado.
   */
  forma: FormaUI | null;
  onForma: (f: FormaUI) => void;
  /** Rótulo do PIX (com o total da opção quando os totais diferem — S1210). */
  labelPix: string;
  /** Rótulo do cartão (idem). */
  labelCartao: string;
  disabled?: boolean;
  /**
   * D-0729-6 · conteúdo revelado DENTRO da opção quando ela é a escolhida.
   * O `RadioCard` do DS já tem esse contrato (`children` = painel condicional,
   * com `aria-expanded`/`aria-controls` de fábrica) — a alternativa seria
   * pendurar o formulário do cartão fora do grupo e reinventar a fiação de
   * a11y. Verbatim do dono: "quando clico em cartao de crédito já é para
   * aparecer imediatamente a opção de inputar o cartao, nao clicar novamente."
   */
  conteudoPix?: React.ReactNode;
  conteudoCartao?: React.ReactNode;
}): React.JSX.Element {
  return (
    <RadioGroup
      name="forma-pagamento"
      label="Forma de pagamento"
      // `exactOptionalPropertyTypes`: ausência de escolha é a PROP AUSENTE, não
      // `undefined` passado — o `RadioCard` compara `ctx.value === value` e
      // nenhum casa, que é exatamente o estado sem seleção.
      {...(forma !== null ? { value: forma } : {})}
      onValueChange={(v) => onForma(v as FormaUI)}
      // Com formulário revelado dentro da opção, lado a lado espremeria os
      // campos do cartão numa coluna estreita. Empilhado, cada opção tem a
      // largura inteira quando abre.
      orientation="vertical"
      disabled={disabled}
    >
      <RadioCard
        value="pix"
        title={labelPix}
        description="Aprovação na hora. O código vale por 30 minutos."
        icon={<QrCode size={20} strokeWidth={2} />}
      >
        {conteudoPix}
      </RadioCard>
      <RadioCard
        value="cartao_credito"
        title={labelCartao}
        description="À vista ou parcelado, com aprovação imediata."
        icon={<CreditCard size={20} strokeWidth={2} />}
      >
        {conteudoCartao}
      </RadioCard>
    </RadioGroup>
  );
}

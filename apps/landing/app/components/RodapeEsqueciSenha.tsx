// =============================================================================
// RodapeEsqueciSenha — a saída de quem não tem senha (REV-AREACLIENTE).
//
// POR QUE ELE EXISTE. A `S1221-T1` registrou, em decisão escrita, que o overlay
// subiria "sem 'esqueci minha senha' ainda" e que o link entraria com a `C1`,
// "que é onde o reenvio neutro é especificado". A `C1` aterrissou — o reenvio
// neutro está em `/definir-senha` — e o link não foi ligado em lugar nenhum. O
// resultado é o beco exato desta rodada: a conta do comprador nasce SEM SENHA
// (`contaSemFriccao` cria a conta e manda o link por e-mail), e quando o e-mail
// falha — que é literalmente o incidente de 04/08 — a pessoa chega na porta de
// entrada da área, não sabe senha nenhuma e a tela não oferece nada.
//
// A CONTA JÁ EXISTENTE É O CASO PIOR, não o raro: quem comprou uma segunda vez
// não recebe o e-mail de "conta criada" (o `contaSemFriccao` devolve
// `nao_aplicavel` de propósito, porque avisar "sua conta foi criada" para conta
// antiga seria phishing). Para essa pessoa o ÚNICO caminho até uma senha é
// pedir um link novo — e é este.
//
// O DESTINO É `/definir-senha`, e não uma tela nova: o reenvio neutro, a copy
// anti-enumeração e a origem `comprador` já vivem lá, provados. Duas telas de
// recuperação divergiriam na primeira revisão de copy.
// =============================================================================

const LINK =
  'rounded-ds-sm text-sm font-medium text-text-secondary underline underline-offset-4 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';

/**
 * O rodapé do overlay de entrada. É um `<a>` de rota, e não um botão que troca
 * o conteúdo do modal: quem não sabe a senha precisa de uma tela com foco
 * próprio, e trocar o miolo de um `aria-modal` embaixo do leitor de tela é a
 * mudança de contexto que a WCAG 3.2 desaconselha.
 */
export function RodapeEsqueciSenha(): React.JSX.Element {
  return (
    <p className="text-sm text-text-secondary">
      <a href="/definir-senha" className={LINK} data-slot="esqueci-minha-senha">
        Não sei minha senha
      </a>
    </p>
  );
}

RodapeEsqueciSenha.displayName = 'RodapeEsqueciSenha';

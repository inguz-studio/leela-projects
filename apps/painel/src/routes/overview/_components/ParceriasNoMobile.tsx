// =============================================================================
// ParceriasNoMobile — a casa do QUINTO item, e ela só existe onde o quinto item
// perdeu a casa (NAV-MOBILE · leva 20).
//
// A barra flutuante inferior tem quatro slots e o rail do produtor tem cinco
// itens desde a leva 15. Parcerias é o que sai, por USO e não por importância:
// é a área mais nova do painel (E10 · seed S811) e a única cujo trabalho não é
// diário. O default (a) da spec manda ela entrar na Visão geral "como bloco com
// caminho", e é isto — o caminho continua custando dois toques, o mesmo que
// custava pelo drawer, e nenhuma rota fica inalcançável no mobile (lição S113:
// área que abandona quem entra é defeito).
//
// `lg:hidden` é a metade que evita trocar um defeito por outro. Acima de `lg` o
// rail ainda carrega Parcerias, e um bloco repetindo o mesmo destino na mesma
// dobra seria redundância sem papel distinto declarado — exatamente a RN-573,
// escrita nesta mesma rodada. Abaixo de `lg` não é redundância: é o único
// caminho.
//
// O bloco NÃO carrega número. Contagem de parcerias não chega no round-trip da
// Visão geral, e inventar um agregado para decorar um atalho é a mentira que a
// medição desta rodada foi feita para achar. Ele diz o que é: a porta.
// =============================================================================

import { Megaphone } from 'lucide-react';
import { CartaoV3, EyebrowV3, LinkV3 } from '../../../components/CartaoV3';

export interface ParceriasNoMobileProps {
  /** Leva a `/parcerias` — a área que reúne Marcas, Assessorias e Afiliações. */
  onNavigate: (href: string) => void;
}

export function ParceriasNoMobile({ onNavigate }: ParceriasNoMobileProps): JSX.Element {
  return (
    <CartaoV3 aria="Parcerias" elev={1} className="lg:hidden">
      <EyebrowV3 icon={<Megaphone aria-hidden />}>Parcerias</EyebrowV3>
      <p className="mb-[var(--spacing-4)] text-[length:var(--font-size-sm-plus)] text-[var(--text-tertiary)]">
        Marcas, assessorias parceiras e afiliações — tudo o que traz gente de
        fora para os seus eventos.
      </p>
      <LinkV3 onClick={() => onNavigate('/parcerias')}>Abrir Parcerias</LinkV3>
    </CartaoV3>
  );
}

ParceriasNoMobile.displayName = 'ParceriasNoMobile';

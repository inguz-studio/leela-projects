// =============================================================================
// EmBreveV3 — seção do protótipo "Visao Geral v3" SEM fonte de dado real.
//
// Regra do contrato da lane (e diretriz literal do dono): "seção sem fonte de
// dado real = card 'em breve' ESTILIZADO COMO O PROTÓTIPO + impedimento
// nomeado no handoff. Nunca mock." O cartão tem a mesma moldura/eyebrow das
// seções vivas — primeiro o NOME da métrica (ela está prevista), depois a
// CAUSA em uma frase, e o "em breve" como promessa. Nenhuma forma de gráfico
// aparece: eixo vazio sugere que a medição aconteceu e deu zero, que é a
// leitura errada (mesma razão do CardEmBreve do Engajamento).
// =============================================================================

import type { ReactNode } from 'react';
import { EmptyState } from '@leela/design-system';
import { CartaoV3, EyebrowV3 } from '../../../components/CartaoV3';

export function EmBreveV3({
  titulo,
  causa,
  icon,
  className,
}: {
  titulo: string;
  causa: string;
  icon: ReactNode;
  className?: string | undefined;
}): JSX.Element {
  return (
    <CartaoV3 aria={titulo} elev={2} padding="lg" className={className}>
      <EyebrowV3>{titulo}</EyebrowV3>
      <EmptyState icon={icon} title="Em breve" description={causa} />
    </CartaoV3>
  );
}

EmBreveV3.displayName = 'EmBreveV3';

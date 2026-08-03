'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BadgePercent } from 'lucide-react';
import { cupomDaEntrada } from '@leela/core';
import { cn } from '@/lib/utils';
import { CONTAINER_GUTTER, CONTAINER_LARGURA } from '@/lib/containerPublico';
import { verificarCupomLinkAction } from './verificarCupomLink';
import type { CupomDoLinkPublico } from '@/lib/leitor';

// =============================================================================
// CupomLinkBanner — a faixa logo depois da Hero (S1215-T3 · RN-431 · D-KC-9).
//
// O QUE ELA DIZ: "Você tem desconto neste evento, CUPOM XXXXXX de Fulano
// aplicado". Sem nome resolvível, degrada para o código sozinho e continua
// útil — a informação que importa é que existe desconto esperando.
//
// O QUE ELA NÃO DIZ, E ISSO É A REGRA: quando o cupom não se aplica — por não
// existir, estar expirado, ter esgotado o teto, ser de outro evento ou de um
// escopo que este visitante não satisfaz —, a faixa simplesmente NÃO APARECE.
// Nenhum erro na landing. O aviso honesto continua no checkout, onde a pessoa
// efetivamente tenta usar o cupom e onde ele já existe hoje. Escancarar aqui um
// erro que o visitante não causou pune quem só clicou num link vencido de
// terceiro, e queima o tráfego do afiliado sem devolver nada.
//
// NENHUM NÚMERO. A faixa não exibe valor de desconto, nem percentual, nem
// preço com e sem cupom. O número é do servidor e aparece na cotação; anunciar
// aqui abriria uma segunda verdade sobre dinheiro numa página estática.
//
// Client component atrás de Suspense — o mesmo lugar do `RefTracker` e do
// `CtaInscricao`. A página do evento continua estática: o cupom vem da URL no
// cliente e a verificação é uma ação de servidor.
// =============================================================================

export function CupomLinkBanner({ slug }: { slug: string }): React.JSX.Element | null {
  const params = useSearchParams();
  const codigo = cupomDaEntrada((chave) => params.get(chave));
  const [resolvido, setResolvido] = useState<CupomDoLinkPublico | null>(null);

  useEffect(() => {
    if (codigo === null) {
      setResolvido(null);
      return;
    }
    let vivo = true;
    void verificarCupomLinkAction(slug, codigo)
      .then((r) => {
        if (vivo) setResolvido(r);
      })
      .catch(() => {
        // Falha de rede responde como cupom que não cola: silêncio. A faixa é
        // decoração; a jornada de compra não depende dela.
        if (vivo) setResolvido(null);
      });
    return () => {
      vivo = false;
    };
  }, [slug, codigo]);

  if (resolvido === null) return null;

  return (
    <div className={cn(CONTAINER_GUTTER, 'pt-6 sm:pt-8')}>
      <div className={CONTAINER_LARGURA}>
        <div
          // `status`, não `alert`: é informação boa e não urgente — leitor de
          // tela anuncia sem interromper o que a pessoa estava lendo.
          role="status"
          className="flex items-start gap-3 rounded-ds-lg border border-feedback-success bg-feedback-success-surface px-4 py-3 text-feedback-success-fg sm:items-center"
        >
          <BadgePercent aria-hidden className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
          <p className="text-sm font-medium">
            Você tem desconto neste evento, cupom{' '}
            <strong className="font-semibold">{resolvido.codigo}</strong>
            {resolvido.promotor !== null ? ` de ${resolvido.promotor}` : ''} aplicado.
          </p>
        </div>
      </div>
    </div>
  );
}

CupomLinkBanner.displayName = 'CupomLinkBanner';

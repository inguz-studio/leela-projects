'use client';

import { useState } from 'react';
import { Card, buttonVariants } from '@leela/design-system/server';
import { Input } from '@/app/_ds/ds';
import { cn } from '@/lib/utils';

/**
 * Bloco compartilhar/QR (S1201-T3 · RN-201). A URL amigável e o QR são
 * gerados no SERVIDOR (a partir da URL pública real) e passados como props;
 * aqui só o "copiar" é interativo. Feedback inline com aria-live (texto do
 * glossário HANDOFF-07: "Link da página pública copiado").
 *
 * S1253 (rodada 2026-08-12-copy-landing · achado G1) · o componente é reusado
 * na página do produtor (`_perfil/PerfilView.tsx`) e carregava dentro dele o
 * texto de UMA superfície: numa página de perfil, "este evento" não tem
 * referente. O reuso foi a decisão certa; o texto amarrado é que não era. Os
 * dois rótulos passam a entrar por prop OPCIONAL, com o texto do evento como
 * padrão — nenhum consumidor existente muda de comportamento sem passar prop.
 *
 * O apoio do evento também perdeu a presunção de treino ("grupo de treino"):
 * treino é o que se faz para uma prova, e este bloco é servido ao retiro de
 * respiração (D-0802-1).
 */
export function ShareBlock({
  shareUrl,
  qrSvg,
  nome,
  titulo = 'Compartilhe este evento',
  apoio = 'Mande o link para quem vai com você ou aponte a câmera no QR.',
}: {
  shareUrl: string;
  qrSvg: string;
  nome: string;
  titulo?: string;
  apoio?: string;
}): React.JSX.Element {
  const [copiado, setCopiado] = useState(false);

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // clipboard bloqueado — o link segue visível/selecionável no input.
    }
  }

  return (
    <Card className="flex flex-col gap-5 border-border-subtle p-6 sm:flex-row sm:items-center">
      <div
        className="mx-auto h-36 w-36 shrink-0 rounded-ds-md bg-surface-overlay p-2 [&>svg]:h-full [&>svg]:w-full"
        aria-label={`QR code para a página de ${nome}`}
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <div className="flex-1">
        <h3 className="font-display text-lg font-bold text-text-primary">
          {titulo}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{apoio}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {/* Onda 1 do cânone: o campo era `<input readOnly>` cru (inventário
              §3) e o botão replicava a variante `neutral` do `Button` à mão.
              O `Input` entra pelo boundary de cliente único da landing; o botão
              entra pela receita `buttonVariants` do subpath server-safe, que é
              a entrada Radix-free do ADR-017 para ação em superfície pública. */}
          {/* Mesma família do G1: o rótulo de leitor de tela também dizia
              "evento" na página de um produtor. Nomear o que está na tela
              custa uma interpolação e serve as duas superfícies. */}
          <Input
            readOnly
            value={shareUrl}
            aria-label={`Link público de ${nome}`}
            wrapperClassName="min-w-0 flex-1"
            className="text-text-secondary"
          />
          <button
            type="button"
            onClick={copiar}
            className={cn(buttonVariants({ variant: 'neutral' }), 'shrink-0')}
          >
            {copiado ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
        <p aria-live="polite" className="mt-2 h-4 text-xs font-medium text-feedback-success">
          {copiado ? 'Link da página pública copiado' : ''}
        </p>
      </div>
    </Card>
  );
}

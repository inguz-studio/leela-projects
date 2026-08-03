import React, { type ReactNode } from 'react';
import type { EventoPublico } from '@/lib/tipos';
import { SECTION_REGISTRY } from './sections';

/**
 * Renderizador de seções ORIENTADO POR CONFIGURAÇÃO (aceite S1201-T1).
 *
 * Itera `evento.secoes` — que o leitor já entregou FILTRADO por `ativa` e na
 * ORDEM publicada — e renderiza o componente registrado para cada `id`. Uma
 * seção desativada no painel nem chega aqui (o leitor a removeu). Um `id`
 * desconhecido é ignorado. Cada seção decide render vs `null` conforme haja
 * dado real (sem placeholder fabricado). Server Component.
 *
 * `aposHero` (S1215-T3 · RN-431): slot para o que precisa aparecer LOGO DEPOIS
 * da Hero. É um slot e não uma seção do registro porque não é configurável no
 * painel — a faixa do cupom aparece por causa da URL, não por causa da página
 * publicada. Evento sem a seção `hero` recebe o slot ANTES de tudo, que é o
 * mesmo lugar relativo: no topo.
 */
export function SectionRenderer({
  evento,
  aposHero,
}: {
  evento: EventoPublico;
  aposHero?: ReactNode;
}): React.JSX.Element {
  const temHero = evento.secoes.some((s) => s.id === 'hero');
  return (
    <>
      {!temHero ? aposHero : null}
      {evento.secoes.map((secao) => {
        const Section = SECTION_REGISTRY[secao.id];
        if (Section === undefined) return null;
        return (
          <React.Fragment key={secao.id}>
            <Section evento={evento} />
            {secao.id === 'hero' ? aposHero : null}
          </React.Fragment>
        );
      })}
    </>
  );
}

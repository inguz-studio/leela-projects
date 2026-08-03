'use client';

// =============================================================================
// KitDetalhe — a VISÃO do kit selecionado (LEELA-R13 · frente 7 → R9-C).
//
// Aparece sob o kit escolhido no Step de modalidade+kit: imagem 1:1, descrição
// e "o que está incluso" com hierarquia de H's/textos do DS. R9-C: o dado vem
// do MODELO REAL (`KitPublico.descricao/itens/imagemUrl`) via `detalheDoKit`,
// que aplica o fallback mock rico campo a campo quando o organizador ainda não
// preencheu. Sem preço aqui — o total vem do core (cotação).
//
// KIT-IMG-LANDING: a imagem 1:1 passa a ser o slot ÚNICO `KitImagem` (mesma
// resolução da seção de kits da LP): dado real → foto mock temática no preview
// → placeholder padrão Leela em produção; clicável p/ ampliar no lightbox do DS.
// O SVG inline por tokens (ArteKitMock) saiu — o placeholder Leela é o default.
// =============================================================================

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Thumb } from '@leela/design-system';
import type { KitPublico } from '@/lib/tipos';
import { galeriaDoKit, rotuloKit } from '@/lib/kitImagem';
import { ehPreview } from '@/lib/mockImagem';
import { KitImagem } from '@/app/components/KitImagem';
import { detalheDoKit } from './kitDetalheDados';

/**
 * Painel de detalhe do kit selecionado. `kit` é o KitPublico escolhido; a
 * visão (descrição/itens/imagem) vem de `detalheDoKit` — dado REAL do doc
 * (R9-C) com fallback mock rico campo a campo.
 */
export function KitDetalhe({ kit }: { kit: KitPublico }): React.JSX.Element {
  const detalhe = detalheDoKit(kit);
  // Mesma cascata da LP; `ehPreview()` no client lê NEXT_PUBLIC_USE_EMULATOR.
  // S212-T3: a galeria devolve a principal resolvida + as adicionais reais.
  const fotos = galeriaDoKit(
    {
      nome: kit.nome,
      modalidades: kit.modalidades,
      imagemUrl: detalhe.imagemUrl,
      fotosSecundarias: detalhe.fotosSecundarias,
    },
    ehPreview(),
  );
  // Índice da foto EM DESTAQUE. Clicar numa miniatura troca a foto grande; o
  // lightbox que já existe amplia a que estiver em foco, e não uma outra.
  const [ativo, setAtivo] = useState(0);
  const img = fotos[Math.min(ativo, fotos.length - 1)] ?? fotos[0]!;
  const rotulo = rotuloKit(kit.nome);

  return (
    // C3 (achado 13): margem própria removida — o único consumidor
    // (StepModalidadeKit, "seleção de kits") já stacka este painel num gap-4
    // com o picker/grade acima; um mt-4 aqui duplicava a distância.
    <div className="rounded-ds-md border border-border-subtle bg-surface-sunken p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-36">
          <KitImagem
            key={img.src}
            src={img.src}
            alt={fotos.length > 1 ? `${rotulo} — foto ${ativo + 1} de ${fotos.length}` : rotulo}
            ampliavel={img.ampliavel}
          />
          {/* Fita de miniaturas (RN-426) — só existe com mais de uma foto. O
              `Thumb` é o primitivo do DS para mídia de ENTIDADE; nenhum
              componente novo nasce por esta feature. A imagem do Thumb é
              decorativa (`alt=""` default) porque o rótulo acessível está no
              próprio botão, e repeti-lo faria o leitor de tela anunciar o kit
              duas vezes por miniatura. */}
          {fotos.length > 1 ? (
            <ul aria-label={`Fotos do ${rotulo}`} className="flex list-none gap-2">
              {fotos.map((foto, i) => (
                <li key={foto.src}>
                  <button
                    type="button"
                    onClick={() => setAtivo(i)}
                    aria-current={i === ativo}
                    aria-label={`Ver foto ${i + 1} de ${fotos.length} do ${rotulo}`}
                    className={`block rounded-ds-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                      i === ativo
                        ? 'ring-2 ring-border-focus'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Thumb src={foto.src} size="sm" ratio="square" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="font-display text-base font-bold tracking-tight text-text-primary">
            {kit.nome}
          </h4>
          <p className="mt-1 text-sm text-text-secondary">{detalhe.descricao}</p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            O que está incluso
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {detalhe.itens.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-primary">
                <Check
                  size={16}
                  strokeWidth={2.25}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-feedback-success-fg"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

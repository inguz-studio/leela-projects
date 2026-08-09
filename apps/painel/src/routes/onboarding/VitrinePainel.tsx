// =============================================================================
// VitrinePainel — o que a conta sem código Leela vê DENTRO do painel
// (ONBOARD-VITRINE · RN-510).
//
// Ordem do dono (06/08): "Acho que o componente deve apenas aparecer como
// overlay, após a pessoa entrar no sistema." Antes desta lane a rota nem
// montava: a conta autenticada sem tenant caía numa parede com um campo de
// código. Agora ela ENTRA, e esta é a tela por trás do aviso.
//
// A PROPRIEDADE QUE ESTA TELA EXISTE PARA PRESERVAR: zero query tenant-scoped.
// Ela não é a página real com os dados escondidos — é uma tela OUTRA, sem hook
// de dados nenhum, montada no lugar da árvore de rotas. Foi por isso que o
// `ContaTravadaGate` original não montava a rota: uma conta sem claim de tenant
// que dispara a query do Overview colhe `permission-denied` atrás do véu, gasta
// round-trip e anuncia ao servidor uma intenção que ela não tem. A vitrine
// mantém a propriedade sem manter a parede — e a prova é executável, em
// `__tests__/vitrine-sem-query.test.tsx`, que falha se QUALQUER leitura de
// tenant do api-client for chamada.
//
// Por que ela acompanha o endereço: o menu continua navegando (a sidebar é do
// `RootShell`, acima deste gate), então clicar em "Eventos" muda a URL. Uma
// tela fixa deixaria o menu marcando "Eventos" e o conteúdo dizendo outra
// coisa. `areaDaVitrine` é pura e resolve isso sem uma linha de dado.
// =============================================================================

import { forwardRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, EmptyState, PageHeader } from '@leela/design-system';
import { KeyRound } from 'lucide-react';
import { areaDaVitrine } from './_lib/areasDaVitrine';

export interface VitrinePainelProps {
  /** Sobe o aviso de boas-vindas. O CTA da tela não depende da captura. */
  onPedirCodigo: () => void;
}

/**
 * A raiz é encaminhada por `ref` (VITRINE-VEU-1) e não é enfeite: o gate precisa
 * de um ponto de partida DENTRO da árvore do app para achar o contêiner que vai
 * ficar inerte enquanto o aviso está na frente — e a sidebar, que carrega seis
 * dos oito controles do defeito, é desenhada acima deste gate. Encaminhar o
 * `ref` custa zero nó novo no DOM. Ver `_lib/fundoInerte.ts`.
 */
export const VitrinePainel = forwardRef<HTMLDivElement, VitrinePainelProps>(
  function VitrinePainel({ onPedirCodigo }, ref): JSX.Element {
    const location = useLocation();
    const area = areaDaVitrine(location.pathname);

    return (
      <div ref={ref} className="flex flex-col gap-[var(--spacing-6)]">
        <PageHeader title={area.titulo} subtitle={area.descricao} />

        <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
          <div className="rounded-[var(--card-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
            <EmptyState
              icon={<KeyRound size={32} aria-hidden />}
              title="Esta área abre com o código Leela"
              description="Você já está dentro e pode circular à vontade. Para trabalhar com seus dados aqui, fale com o nosso time e receba o código Leela."
              action={
                <Button variant="primary" onClick={onPedirCodigo}>
                  Como receber o código Leela
                </Button>
              }
            />
          </div>
        </div>
      </div>
    );
  },
);

VitrinePainel.displayName = 'VitrinePainel';

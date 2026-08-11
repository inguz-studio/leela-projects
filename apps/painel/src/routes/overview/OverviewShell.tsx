// =============================================================================
// OverviewShell — cabeçalho + contêiner da Visão Geral (S600-T1; saudação e
// moldura refeitas fiéis ao protótipo "Visao Geral v3" na lane HIFI-REC).
// A moldura (AppShell + SidebarRail) é do layout RAIZ (shell/RootShell) — aqui
// fica só o que é da tela: PageHeader com a saudação do protótipo ("Olá,
// NOME, aqui está o panorama do seu ecossistema." — nome em maiúsculas e na
// cor da marca) + date-badge (snapshot do momento do render, sem relógio
// vivo), e o padding do conteúdo.
//
// Padding do protótipo: header 32px 40px 0 · conteúdo 24px 40px 48px. Abaixo
// de `md` a moldura de 40px cai para 20px (README §4). Tudo em token.
// =============================================================================

import * as React from 'react';
import { DateBadge, PageHeader } from '@leela/design-system';
import { saudacaoPanorama } from './_lib/greeting';
import { formatAgoraExtenso } from './_lib/format';

export interface OverviewShellProps {
  nome: string | null;
  children: React.ReactNode;
  /** Injetável nos testes; default = momento do render. */
  agora?: Date;
}

export function OverviewShell({ nome, children, agora }: OverviewShellProps): JSX.Element {
  // Snapshot único por montagem (o mockup mostra o instante, não um relógio).
  const [momento] = React.useState<Date>(() => agora ?? new Date());
  const saudacao = saudacaoPanorama(nome);

  return (
    <>
      <PageHeader
        // Moldura horizontal do protótipo: 40px ≥ md (o padrão do PageHeader é
        // 24px); abaixo de md a moldura cai para 20px (README §4).
        className="px-[var(--spacing-5)] md:px-[var(--spacing-10)]"
        // MEL-19 (esticado, declarado): o item do menu virou "Visão geral" e a
        // vitrine já dizia isso; deixar o H1 em Title Case só mudava o lado da
        // divergência — menu × página, a um clique. Sentence case em heading é
        // o contrato de escrita da casa.
        title="Visão geral"
        subtitle={
          <>
            Olá,{' '}
            {saudacao.nome ? (
              <>
                <strong className="font-[var(--font-weight-bold)] text-[var(--text-brand)]">
                  {saudacao.nome}
                </strong>
                ,{' '}
              </>
            ) : null}
            {saudacao.frase}
          </>
        }
        actions={<DateBadge>{formatAgoraExtenso(momento)}</DateBadge>}
      />
      <div className="px-[var(--spacing-5)] pt-[var(--spacing-6)] pb-[var(--spacing-12)] md:px-[var(--spacing-10)]">
        {children}
      </div>
    </>
  );
}

OverviewShell.displayName = 'OverviewShell';

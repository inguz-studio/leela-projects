---
tags: [leela, handoff, modal-lote, leva21, design-system, e01]
atualizado: 2026-08-17
---

# Handoff · MODAL-LOTE (17/08)

- **Trace:** `leela-redesign-v2-20260810` · lane `MODAL-LOTE` · squad `software-forge`
- **Branch:** `modal-lote` — mergeada em `main` via `--no-ff`, hash `502cec39` (push confirmado)
- **Worktree:** `C:\dev\leela-wt-modallote` — removido ao final deste handoff (árvore limpa)
- **Retomada:** lane morreu em voo por volta das 16:10Z de 17/08, com diff parcial sem commit. Herança lida arquivo a arquivo contra o brief (`.nirvana/briefs/leela-modal-lote-20260817-enriched.md`); o trabalho estava tecnicamente sólido — mantido e completado, não refeito.

## Os 5 itens da leva 21, status

| # | Item | Status | Prova |
|---|---|---|---|
| 1 | Botões do LoteModal → padrão canônico | ✅ | `LoteModal.tsx` footer vira fragmento direto (o `<div className="flex justify-end gap-3">` duplicava o container que o `Modal` já aplica no footer). Zero mudança de DOM renderizado. |
| 2 | Glass da superfície do modal | ✅ intocado | Restrição ratificada pelo dono — nenhuma linha de `backdrop-blur`/glass da superfície foi tocada. Confirmado por leitura direta do `Modal.tsx` atual. |
| 3 | Overlay mais opaco | ✅ | `--modal-overlay-bg`: **rgba(0,0,0,0.6) → rgba(0,0,0,0.82)**, tier COMPARTILHADO (`component.json` + `rn-themes.ts` + `brasa.css`/`wine.css`/`dark-wine.css`/`index.css`, 3 temas). |
| 4 | Animação fade centralizado | ✅ já estava correta | O fade+zoom centrado (sem slide) já existia em `main` antes desta lane, herdado da BUILD-MOTION. Medido e confirmado nesta lane (comparação `git show 43ef9c7e:...Modal.tsx` vs atual) — **não é regressão desta lane**, é constatação. |
| 5 | Scrollbar diagnosticada | ✅ | Ver seção dedicada abaixo — duas causas, as duas provadas em teste. |

## Causa da scrollbar (duas causas distintas, provadas em teste)

**Causa principal — a moldura inteira rolava.** O `role="dialog"` (header + corpo + footer juntos) carregava `overflow-y-auto`. Um formulário mais alto que `max-h` fazia a barra nascer na moldura inteira: cortava o canto arredondado de cima (perto do X) e o rodapé (Cancelar/Salvar) rolava para fora da vista, abaixo da dobra — achado com o `LoteModal` em `:4602` (lote com venda, painel "Lotes já configurados" empurrando a altura). Conserto: a trava de rolagem migrou para o wrapper do **corpo** apenas; header e footer ficam `shrink-0`, sempre visíveis — paridade com o `Dialog` público, que já fazia isso.

Prova: `packages/design-system/src/utils/__tests__/scrollTrava.test.tsx` — "Modal: rola em y, fecha x — na wrapper do CORPO, não na moldura" (a moldura não carrega classe de overflow nenhuma).

**Causa secundária — o gutter da barra nativa não era compensado.** `overflow: hidden` no `body` faz a barra de rolagem nativa da página sumir, e a página ganha de volta a faixa de pixels que ela ocupava — um layout shift de alguns pixels a cada abertura/fechamento de overlay, que também lê como "coisa aparecendo/sumindo" mesmo sem barra nova nenhuma. `travarRolagem`/`destravarRolagem` (`useDialogBehavior.ts`) ganharam compensação de `padding-right` do tamanho exato da barra (`innerWidth - clientWidth`; 0 em overlay-scrollbar de macOS/mobile, nada a compensar).

Prova: `packages/design-system/src/components/Dialog/__tests__/Dialog.test.tsx` — novo describe "Dialog — compensação de gutter (MODAL-LOTE · 17/08)": barra clássica (~15px) compensa e restaura ao fechar; barra overlay (gutter 0) não mexe em nada. Esta prova **não existia** no diff herdado — foi escrita nesta retomada, porque o `scrollTrava.test.tsx` só provava a causa principal.

## Alcance da mudança de overlay/animação (declarado, não implícito)

O token `--modal-overlay-bg` e o comportamento de `useDialogBehavior` são COMPARTILHADOS — a mudança não fica restrita ao `LoteModal`:

- **Modal**: 18 telas do painel importam `Modal` diretamente de `@leela/design-system` (`LoteModal`, `CapacidadeModal`, `ItemKitModal`, `ProvisionTenantModal`, `RegistrarPagamentoModal`, `AplicarPlanoModal`, `PlanoFormModal`, `AddPatrocinadorModal`, `TermosModal`, `OverlayConvite`, `ConvidarMembroModal`, `SolicitarRepasseModal`, `ComprovanteModal`, `CupomModal`, `AfiliadoModal`, `ConviteModal`, `DeletarClubeModal`, `QrIngressoModal`).
- **`ConfirmModal`** (composição sobre `Modal`): mais 12 telas (`RepassesDoTenantSecao`, `TenantDetailRoute`, `RepassesAdminRoute`, `EstornosAdminRoute`, `ConvitesRoute`, `PaginaVendasPage`, `LotesPage`, `ReembolsosPage`, `EstadosBalcao`, `EquipePage`, `ComunicacaoPage`, `ParceriaDestrutivaModal`).
- **Drawer**: reusa **o mesmo token** `--modal-overlay-bg`/`--modal-overlay-blur` ("mesma cortina", comentário no próprio `Drawer.tsx`) — pelo menos `RootShell.tsx` (menu mobile), `InscritoSlideIn.tsx`, `FichaDoClienteDrawer.tsx` herdam a opacidade nova sem qualquer mudança de código.
- **Efeito colateral fora do painel de modais**: `apps/painel/.../onboarding/OverlayConvite.tsx` reusa o mesmo token para o véu de boas-vindas. O contraste do aviso contra esse véu (`contraste-aviso.test.ts`, WCAG 1.4.11) tinha dois números EXATOS pinados que quebraram com a opacidade nova — remedidos com o mesmo cálculo do arquivo (não chutados): borda vs velado 4,30→4,38 (brasa); falsificação do token antigo 1,31/1,13→1,34/1,15. Nenhum caso cruzou o piso de 3:1 na direção errada; o wine, aliás, folgou mais (5,90→13,74).

**Fila nomeada de outros modais com botão não canônico** (mesmo desvio que o `LoteModal` tinha, fora do escopo desta leva — o pedido do dono nomeou só o modal de lote):
- `apps/painel/src/routes/eventos/lotes/CapacidadeModal.tsx:118`
- `apps/painel/src/routes/eventos/kits/ItemKitModal.tsx:200`
- `apps/painel/src/routes/eventos/kits/DistribuicaoView.tsx:792`
- `apps/painel/src/routes/eventos/pagina-vendas/_components/CupomModal.tsx:143`

## Gates (números reais)

| Gate | Resultado |
|---|---|
| DS — suíte completa | **92 arquivos / 2115 testes**, verdes (era 2113 antes desta retomada; +2 = os testes novos de compensação de gutter) |
| DS — tsc | limpo |
| DS — eslint (`--max-warnings 0`) | limpo |
| Painel — tsc | limpo |
| Painel — eslint (`--max-warnings 0`) | limpo |
| Painel — fatia `eventos/lotes` | **97/97** verdes |
| Painel — fatia `onboarding` | **95/95** verdes (2 falhas de contraste pinado, remedidas nesta retomada — ver seção de alcance) |
| Painel — suíte completa (risco de moldura, `Modal` é peça de uso amplo) | **2883/2883** verdes |
| `gate-canon` | **PASS** — todas as 27 contagens na baseline, nenhuma subiu |

## Gate visual — para o maestro

Nenhum navegador foi usado nesta lane (restrição). Telas a conferir, 2 temas (brasa + wine, mais dark-wine se aplicável), desktop + 375:

1. **`LoteModal`** (evento → lotes → editar lote) — o pedido original: fundo mais opaco, fade centralizado (já estava certo), botões canônicos, sem scrollbar cortando o rodapé em lote com formulário alto.
2. **`CapacidadeModal`** (mesma rota) — herdou moldura/overlay/animação sem tocar no footer (footer segue com `<div>` próprio, fila nomeada acima) — confirmar que herdou sem quebrar.
3. **`InscritoSlideIn`** (`Drawer`, eventos → inscritos) — mesma cortina do overlay; confirmar que a opacidade nova não pesa demais no off-canvas.

## Automerge

`git status --porcelain` em `C:\dev\LEELA` estava com `leela-specs` modificado no início desta lane (SPEC-LEVA22 aterrissando) — aguardado, recheck ficou limpo. `git pull --ff-only origin main` (já estava em dia). `git merge origin/main` na branch `modal-lote` primeiro (sem conflito — main só avançou docs/specs) + smoke (tsc DS+painel limpo) + push. `git merge --no-ff origin/modal-lote` em `main` (sem conflito) + smoke (tsc DS+painel limpo, suíte Modal/Dialog/scrollTrava 67/67, `gate-canon` PASS) + push — aceito de primeira, sem rejeição.

**Hash do merge em `main`:** `502cec3912f8bcb242d756202eca362f577b730`

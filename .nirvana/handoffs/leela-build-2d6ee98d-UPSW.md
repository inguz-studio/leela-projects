# Checkpoint — UPLOAD-SWEEP (UPSW) · trace leela-build-2d6ee98d

Lane: UPSW · business software-forge · employee sf-frontend-lead · model OPUS
Paga: DEC-0719 item 19 (RN-168 ampliada) + RN-170. Território: telas conta/perfil
público/clube/evento (form de capa) + componentes de upload compartilhados (NÃO-DS).
Fora: kit (TAM), SubNav (SUBNAV), packages/design-system, .nirvana/HANDOFF.md,
produto/00-MOC-produto.md, storage.rules.

## Inventário reuso-primeiro (antes de codar)
REAPROVEITADO (não recriar):
- `FileInput` (DS) — seletor burro (Button + input file sr-only, limpa value, AA, erro role=alert).
- Seam de upload `@leela/api-client/storage.ts`: `uploadAvatarPerfilPublico`, `uploadCapaPerfilPublico`,
  `uploadCapaClube` (paths ADR-016), `problemaDoArquivoImagem` (tipo/tamanho ≤5MB), `IMAGEM_UPLOAD_MAX_BYTES`.
- Padrão upload-only de referência: `ContaPage.tsx` (RN-168, foto da conta já upload-only desde R9-A).
- Padrão "Trocar imagem" + preview: `KitEditor.tsx` (buttonLabel dinâmico) — FORA do território, só referência.

CRIADO (novo):
- `apps/painel/src/components/upload/ajustarProporcao.ts` — crop/fit "cover" client-side (RN-170).
  `calcularCropCover` (geometria pura, testável) + `ajustarProporcaoImagem` (canvas, degradação honesta).
- `apps/painel/src/components/upload/ImageUploadField.tsx` — componente compartilhado (não-DS):
  FileInput + preview + label "Trocar imagem" + valida + crop + onUpload. Consolida 3 near-duplicates.

## Premissa de proporção (RN-170 — inventário da UI atual, DOCUMENTADO)
- Avatar perfil público: **1:1** (contrato RN-170 + render público `rounded-full` em PerfilView).
- Capa de clube: **16/9** — render público autoritativo `PerfilView.tsx` L188 (`aspect-[16/9]`).
- Capa de perfil público: **16/9** — hero público é banner full-bleed de altura fixa (`h-40 sm:h-56`,
  sem aspect fixo); adotado 16/9 como premissa (banner largo, center-crop cover). Editor alinhado.
- Capa de evento: **1.9:1 / 1600×838 / ≤2MB** (RN-228) — BLOQUEADA (ver pendência backend abaixo).

## Escopo real por superfície
| Superfície | Storage path | Seam | Persistência UI | T1 kill URL | T2 trocar | T3 crop |
|---|---|---|---|---|---|---|
| Perfil público avatar | users/{uid}/perfil-avatar ✅ | ✅ | salvarPerfil ✅ | sim | sim | 1:1 |
| Perfil público capa | users/{uid}/perfil-capa ✅ | ✅ | salvarPerfil ✅ | sim | sim | 16/9 |
| Capa de clube | clubes/{clubeId}/capa ✅ | ✅ | atualizarClube ✅ | sim | sim | 16/9 |
| Capa de evento | eventos/{id}/capa ❌ AUSENTE | ❌ | não persiste (EventoForm preview-only) | parcial | — | — |

## Pendência backend registrada (lote backend — NÃO improvisar aqui)
Capa de evento upload-only exige, num lote da forge (backend):
1. `storage.rules`: novo match `eventos/{eventoId}/capa` (guarda cross-service `firestore.get` do evento,
   igual à capa de clube; contentType allowlist + ≤2MB por RN-228).
2. Seam: `uploadCapaEvento(eventoId, file)` em `api-client/storage.ts` (proporção 1.9:1 via crop).
3. Persistência: ligar `imagemUrl` no `atualizarConfiguracoesEvento` a partir de uma tela do evento
   (ConfigGerais não expõe capa hoje; EventoForm coleta mas NÃO envia `capa`).
Sem isso, a capa de evento não tem como subir arquivo real. EventoForm: input de URL REMOVIDO
(RN-168 "URL morre em todas") e nota de "em breve por upload" no lugar.

## Progresso
- [x] T0 checkpoint · T-CROP util (+ testes) · T-FIELD `ImageUploadField` (+Remover, testes).
- [x] T1/T2/T3 perfil público (avatar 1:1 + capa 16/9) + clube capa (16/9) — URL removida.
- [x] T2/T3 ContaPage (foto da conta já upload-only): +crop 1:1 +label "Trocar foto".
- [x] Evento capa: input URL removido + nota + pendência backend registrada.
- [x] Grep-proof: zero input type=url de imagem nas 4 superfícies (só link-in-bio restou, não-imagem).
- [x] tsc 0 · eslint 0 · suíte painel 1258/1258 (T1) → re-rodada após fixes.
- [x] Boards E17/E12 + BOARD-HISTORICO + V1-KANBAN (`b2d690c`).
- [x] Review antagonista contexto fresco: **APPROVE** (0 CRÍTICO/ALTO). 3 achados → fixes:
      - BAIXO-1 (PNG estoura teto pós-crop): fallback PNG→JPEG + devolve original se ainda estoura.
      - MÉDIO-2 (input de URL da imagem OG de SEO em PaginaVendasView): decisão de escopo — NÃO é
        superfície de imagem RN-168 (é campo meta/`og:image`, não identidade visual do produto;
        sem path de upload). EXCLUÍDO conscientemente (ver abaixo).
      - BAIXO-3 (nota do evento diz 1.9:1 e não 16/9): correto — capa de evento é 1.9:1 por RN-228
        (contrato próprio), distinto do 16/9 (premissa de perfil/clube). Mantido; comentário aponta RN-228.

## Fora de escopo (conscientemente, com razão)
- **Imagem OG/compartilhamento de SEO** (`eventos/pagina-vendas/PaginaVendasView.tsx` — "Imagem de
  compartilhamento (URL)"): campo meta `og:image`, não superfície de imagem do produto (RN-168). Fica
  URL até existir um upload de OG dedicado. Confirmado pela review.
- **Capa de email de campanha/comunicado** (`capaUrl`, RN-135): superfície distinta (email), fora do sweep.
- **Logo 1:1 de patrocinador/marca** (R9-E): já é upload, mas com validação de REJEIÇÃO (não crop);
  território fora deste lote — candidata a migrar para o crop COVER num próximo.
- **Imagem de KIT**: território TAM (fora por regra do brief).

## Reaproveitado vs criado
REAPROVEITADO: FileInput (DS), problemaDoArquivoImagem/IMAGEM_UPLOAD_MAX_BYTES + 3 seams de upload
(api-client), padrão ContaPage. CRIADO: `ajustarProporcao.ts` (crop COVER, auto-contido — sem dep de
api-client p/ não quebrar mocks), `ImageUploadField.tsx`. Consolidou 3 near-duplicates num só componente.

## Commits
- T0 `8b19dec` feat(upload): campo compartilhado + crop [LEELA-UPSW-T0]
- T1 `0e51045` feat(upload): upload-only+trocar+crop 3 superfícies; evento nota [LEELA-UPSW-T1]
- T2 `b2d690c` docs(e17,e12,boards): aterrissa UPLOAD-SWEEP [LEELA-UPSW-T2]
- T3 `<T3>` fix(upload): ContaPage crop 1:1+trocar; decoupla util; PNG→JPEG fallback [LEELA-UPSW-T3]

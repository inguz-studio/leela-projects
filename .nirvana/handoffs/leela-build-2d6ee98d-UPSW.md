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

## Progresso (atualizar a cada task)
- [x] T0 checkpoint criado.
- [ ] T-CROP util + testes
- [ ] T-FIELD componente + testes
- [ ] T1/T2/T3 perfil público (avatar+capa)
- [ ] T1/T2/T3 clube capa
- [ ] Evento capa (remove URL + pendência)
- [ ] Gates (tsc/eslint/suite/RTL/AA) + review antagonista fresca
- [ ] Boards E17/E12 + épicos

## Commits
(preencher com hashes)

# Checkpoint — CAPA-EVENTO-UPLOAD (CEV) · trace leela-build-2d6ee98d

Lane: CEV · business software-forge · employee sf-backend-engineer · model FABLE
Paga: pendência backend do UPSW (capa de evento = última superfície sem upload real).
Fecha DEC-0719 item 19 (upload-only em TUDO) + RN-228 (capa 1.9:1/1600×838/≤2MB).

Território MEU: storage.rules (NUNCA firestore.rules) · packages/api-client/src/storage.ts
(seams de storage) + configuracoesEvento.ts (persistência canônica) · functions/src/eventos
(se preciso) · apps/painel telas de evento (EventoForm/ConfigGerais) · testes.
FORA: packages/core, functions/src checkout/auth/email, firestore.rules, api-client de
checkout (lane CK2 ATIVA), packages/design-system, .nirvana/HANDOFF.md, produto/00-MOC.
Emulator: 8080/9199 (livres; 8180/9299 proibidas=preview, 8480/9598=CK2). JDK 21 ~/.jdks.

## Inventário reuso-primeiro (antes de codar)
REAPROVEITADO (não recriar):
- `storage.rules`: helpers `imagemValida()` (regex ancorada, 1B..5MB), `isTenantWriterRole()`,
  `eventoDoMeuTenant()` (já existe — criado no R9-C p/ kits). Só entra o MATCH novo.
- Suíte de ataques `functions/src/__tests__/storageRules.integration.test.ts` (33 testes R5/R9-C)
  — fixtures de tenants/evento prontas; casos novos entram no MESMO arquivo.
- Seam-núcleo `uploadImagem()` + `problemaDoArquivoImagem` (api-client/storage.ts).
- Persistência canônica: `atualizarConfiguracoesEvento` JÁ aceita `imagemUrl` (RN-153,
  validação 3 camadas: isUrlCapaValida no core + capaValida na Rule + UX no seam) — REUSO.
- `ImageUploadField` + `ajustarProporcaoImagem` (UPSW) — instanciar, não criar.
- Padrão de wiring: ConfiguracoesPage do clube (onUploadCapa injetada).

CRIADO (novo):
- match `eventos/{eventoId}/capa` nas storage.rules (allowlist RN-228 jpeg/png/gif no
  path — mais estrito que imagemValida; 5MB Rules / 2MB app-level).
- `uploadCapaEvento(eventoId, file)` + constantes RN-228 no api-client/storage.ts.
- `salvarCapaEvento(db, eventoId, url)` — merge cirúrgico de `imagemUrl` (padrão
  atualizarExigenciasRegulamento) p/ o pós-create do Novo evento.
- Instâncias do ImageUploadField em ConfigGeraisForm + EventoForm (deferred no novo:
  evento ainda não existe ⇒ Rules negariam upload; arquivo cropado fica em estado e
  sobe APÓS criarEvento).

## Premissas
- P1: RN-228 allowlist JPEG/PNG/GIF vale no PATH da capa de evento (Rules + app-level);
  webp/avif seguem válidos nas demais superfícies (imagemValida intacta).
- P2: Rules mantêm teto 5MB (padrão das entradas; brief: "≤2MB app-level/5MB Rules");
  o teto 2MB da RN-228 é imposto no seam + crop (maxBytes=2MB).
- P3: Novo evento: upload SÓ após criarEvento (doc precisa existir — fail-closed do
  firestore.get). Falha de capa pós-create NÃO desfaz o evento: toast honesto + capa
  fica pra Configurações.
- P4: ImageUploadField ganha suporte a preview `blob:` (1 linha em urlDeImagemValida)
  p/ o modo deferred — components/upload não pertence a lane ativa (UPSW fechou).

## Progresso
- [x] T0 checkpoint criado.
- [x] T1 storage.rules match `eventos/{eventoId}/capa` + 31 testes novos de
      ataque/fluxo — emulator 64/64 VERDE (8080/9199 livres, JDK 21).
- [x] T2 seam uploadCapaEvento (RN-228 app-level jpeg/png/gif ≤2MB) +
      salvarCapaEvento (merge cirúrgico) + exports; type-check+lint 0.
- [x] T3 telas: ConfigGerais (campo capa + payload imagemUrl no fluxo canônico,
      read-only = só prévia) + Novo evento (modo DEFERRED: valida→crop→arquivo em
      memória→sobe após criarEvento; falha de capa não desfaz o evento) + blob:
      preview no ImageUploadField (P4). RTL: +16 testes (EventoForm 6, ConfigGerais
      5, configForm 4, ImageUploadField 1). Suíte painel 1274/1274 VERDE.
- [x] Gates: tsc/eslint 0 · Rules 64/64 · suíte painel 1274/1274.
- [ ] Review antagonista em contexto fresco (vetores do brief) + fixes re-provados.
- [ ] Aterrissagem: épico E12/E04 + boards (pendência UPSW → paga) + audit.

## Commits
- T1 `259a8e5` feat(storage): match eventos/{id}/capa fail-closed + 31 testes [LEELA-CEV-T1]
- T2 `efa12de` feat(api-client): uploadCapaEvento + salvarCapaEvento (RN-228) [LEELA-CEV-T2]
- T3 `<T3>` feat(painel): capa de evento upload-only nas 2 telas [LEELA-CEV-T3]

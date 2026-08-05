# DIAG-STORAGE-CAPA · a capa do evento não sobe em produção

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** DIAG-STORAGE-CAPA
- **Employee:** sf-backend-lead (software-forge)
- **Defeito relatado pelo dono:** `Firebase Storage: User does not have permission to access 'eventos/teste-taxa-repassada/capa'. (storage/unauthorized)`
- **Território tocado:** `functions/src/__tests__/storageRules.integration.test.ts`, `firebase.diagcapa.json`. **Nada** em `apps/painel`, nada em `packages/api-client`, nada em `storage.rules`. Nenhuma escrita e nenhum deploy em produção.

## Veredito

**A Rule está certa. O defeito é de INFRAESTRUTURA de produção:** o service
agent do Cloud Storage não tem permissão para ler o Firestore, então o
`firestore.get()` cross-service das `storage.rules` **erra** — e errar, num
desenho fail-closed, é negar. A negação sai com a mesma frase de uma negação
legítima de permissão, e foi essa frase que o dono leu.

O papel que falta é `roles/firebaserules.firestoreServiceAgent`, e no projeto
`leela-hub` **nenhum membro o tem**.

## Veredito condição a condição — `allow create` de `eventos/{eventoId}/capa`

Reproduzido no emulator (Firestore + Storage juntos, que é onde o cross-service
resolve de verdade), com o **evento e o tenant reais do defeito**: doc
`eventos/teste-taxa-repassada` com `tenantId: castelo-producoes`, e a Marina com
as claims exatas que ela tem em produção.

| # | Condição | Veredito | Prova |
|---|---|---|---|
| C1 | `isTenantWriterRole()` | **PASSA** | claims de produção da Marina são `{"role":"tenant_owner","tenantId":"castelo-producoes"}` (lidas por REST no Identity Toolkit de produção). Teste `C1..C4 satisfeitas` sobe a capa. Os quatro falseamentos (sem `tenantId`, `promoter`, `platform_admin`, `athlete`) negam. |
| C2 | `eventoDoMeuTenant()` | **PASSA em lógica, FALHA em produção por falta de permissão** | o doc de produção tem `tenantId` igual ao claim (lido por REST no Firestore de produção). No emulator a condição é verdadeira e o upload passa. Em produção o `get()` não chega a ser respondido — ver a causa-raiz abaixo. |
| C3 | `imagemValida()` | **PASSA** | `.jpg` de 500 KB: payload > 0, ≤ 5 MB, contentType na allowlist. Falseamentos (vazio, > 5 MB) negam. |
| C4 | `capaEventoFormatoValido()` | **PASSA** | `image/jpeg` está na allowlist estrita e 500 KB ≤ 2 MB. Falseamentos (webp, avif, 2 MB + 1) negam. |

O caso feliz e os nove falseamentos rodam na suíte: **85 testes verdes**,
emulator em portas próprias (Firestore 8683, Storage 9683, hub 4483), IPv4
literal, JDK 21.

## Causa-raiz, com a prova

O `firestore.get()` dentro das `storage.rules` é uma chamada **cross-service**.
Quem a executa em produção não é o usuário: é o service agent do Cloud Storage
for Firebase, e ele precisa de um papel específico para ler o Firestore do
projeto. Quem concede esse papel é o próprio `firebase deploy`, e ele **só
pergunta em terminal interativo**. Do código do `firebase-tools` que publicou
estas Rules (`lib/rulesDeploy.js`):

```js
const CROSS_SERVICE_FUNCTIONS = /firestore\.(get|exists)/;
const CROSS_SERVICE_RULES_ROLE = "roles/firebaserules.firestoreServiceAgent";
...
if (this.options.nonInteractive) { return; }          // ← não concede nada
const saEmail = `service-${projectNumber}@gcp-sa-firebasestorage.iam.gserviceaccount.com`;
...
"Cloud Storage for Firebase needs an IAM Role to use cross-service rules. Grant the new role?"
...
logger.warn("[rules] Cross-service Storage rules may not function properly", e.message);
```

E no IAM de produção (`leela-hub`, project number `76126035891`), lido agora:

```
Papéis de serviceAccount:service-76126035891@gcp-sa-firebasestorage.iam.gserviceaccount.com
    roles/firebasestorage.serviceAgent

Tem roles/firebaserules.firestoreServiceAgent? NÃO
Algum membro com esse papel no projeto?        NENHUM
```

Um deploy não-interativo publica a Rule e não concede o papel. A Rule fica
publicada, correta e inútil.

**Corroboração independente:** o bucket `leela-hub.firebasestorage.app` está
**vazio — zero objetos, em todos os prefixos**. Nenhum upload cross-service
jamais teve sucesso em produção.

### O que mais está quebrado pela mesma causa

Todo path das `storage.rules` que chama `firestore.get()` está negando em
produção, não só a capa:

- `clubes/{clubeId}/capa` (RN-166)
- `clubes/{clubeId}/patrocinador-{parceriaId}` (S-R9-12)
- `eventos/{eventoId}/kits/{kitId}` (RN-227)
- `eventos/{eventoId}/kits/{kitId}/fotos/{2,3}` (RN-427) — **e este bloco nem
  está publicado**, ver o diff pendente
- `eventos/{eventoId}/capa` (RN-228) — o que o dono encontrou

Seguem funcionando `users/{uid}/{objeto}` e `marcas/{uid}/{marcaId}`, que não
consultam o Firestore. Ou seja: **foto de perfil sobe, capa de qualquer coisa
não.** Vale conferir isso na primeira passada depois do fix.

## Hipóteses testadas e DESCARTADAS, uma a uma

| Hipótese | Descartada por |
|---|---|
| formato real do arquivo (webp/avif renomeado) | o dono confirmou `.jpg`; e o seam `uploadCapaEvento` (`packages/api-client/src/storage.ts:326`) chama `problemaDoArquivoCapaEvento` **antes** do roundtrip, que recusa qualquer coisa fora de jpeg/png/gif com frase própria — nunca com `storage/unauthorized` |
| tamanho na faixa 2 MB..5 MB | mesmo seam: `problemaDoArquivoCapaEvento` (`storage.ts:304-315`) mede 2 MB e devolve "A capa deve ter no máximo 2MB". O crop (`apps/painel/src/components/upload/ajustarProporcao.ts:198`) devolve o arquivo ORIGINAL quando não consegue caber no teto, e é esse arquivo que o seam mede. Não existe caminho em que o excesso de peso chegue às Rules |
| token velho no navegador | `validSince` da Marina em produção é `2026-07-29T15:46:10Z` e o evento nasceu em `2026-08-03T22:39`. Qualquer token que ela consiga hoje já carrega `tenantId` |
| conta errada (platform_admin sem `tenantId`) | o campo de upload só renderiza sob `podeEditar` (`ConfigGeraisForm.tsx:186`), e `podeEditarConfiguracoes` deriva de `papelDoUsuarioNoEvento`, que exige `organizadorId === uid` ou claim de equipe. O `organizadorId` do doc de produção é `uid-marina-castelo`. Um `platform_admin` não vê o campo |
| bucket errado no cliente | `VITE_FIREBASE_STORAGE_BUCKET` = `leela-hub.firebasestorage.app`; é o único bucket linkado ao Firebase e é o mesmo do release de Rules |
| banco Firestore nomeado (a Rule aponta `(default)`) | o projeto tem **um** banco e ele é `(default)` |
| App Check bloqueando o Storage | enforcement **UNENFORCED** nos três serviços consultados |
| Rule ausente no ruleset publicado | o bloco da capa está publicado; o diff pendente é outro (abaixo) |

## O que foi consertado nesta lane

Nada de produção — a Rule não tinha defeito. O que entrou foi prova e guarda:

1. **Reprodução fiel** (`functions/src/__tests__/storageRules.integration.test.ts`):
   bloco `DIAG-STORAGE-CAPA` com o evento, o tenant e as claims REAIS de
   produção, e um veredito por condição (caso feliz + nove falseamentos).
2. **O teste que reproduz o sintoma:** com o doc do evento fora de alcance, o
   SDK devolve `storage/unauthorized` — assert no `code`, não na mensagem. É a
   prova de que a frase que o dono leu não distingue "você não pode" de "eu não
   consegui perguntar".
3. **Isolamento de emulator por lane:** `LEELA_ST_EMU_PORT` para a porta do
   Storage (o Firestore já tinha o seu), host IPv4 literal nos dois, e
   `firebase.diagcapa.json` com portas próprias — inclusive **hub**, que é o
   que faz duas lanes colidirem sem avisar.
4. **Guarda contra reincidência** (abaixo).

## Pendente de decisão do maestro — 1. o papel de IAM em produção

Não executei: é escrita em produção. Dois caminhos, mesmo efeito.

**Caminho Firebase (concede o papel E publica as Rules):** rodar o deploy de
Storage em terminal **interativo** e responder *yes* ao prompt.

```
firebase deploy --only storage --project leela-hub
```

⚠️ Este comando **também publica o bloco pendente** descrito abaixo. Se a
intenção for só o papel, use o caminho direto.

**Caminho direto (só o papel, sem tocar nas Rules):**

```
gcloud projects add-iam-policy-binding leela-hub \
  --member=serviceAccount:service-76126035891@gcp-sa-firebasestorage.iam.gserviceaccount.com \
  --role=roles/firebaserules.firestoreServiceAgent
```

Conferência depois, sem navegador: subir uma capa pelo painel como Marina e
listar o bucket — hoje ele tem zero objetos, então um objeto em
`eventos/teste-taxa-repassada/capa` é prova limpa.

## Pendente de decisão do maestro — 2. o diff de `storage.rules`

O arquivo do repo está **um bloco à frente** do ruleset publicado
(`fc6cad14-ede0-4f26-abff-834901df6afe`, de 2026-07-29). Publicar as Rules
arrasta este bloco junto. Ele é aditivo — abre as duas fotos secundárias do kit
(RN-427) e não altera nenhum grant existente:

```diff
+    function slotFotoKitValido(slot) {
+      return slot == '2' || slot == '3';
+    }
+
+    match /eventos/{eventoId}/kits/{kitId}/fotos/{slot} {
+      allow read: if kitObjetoValido(kitId) && slotFotoKitValido(slot);
+      allow create, update: if isTenantWriterRole()
+        && kitObjetoValido(kitId)
+        && slotFotoKitValido(slot)
+        && eventoDoMeuTenant(eventoId)
+        && imagemValida();
+      allow delete: if isTenantWriterRole()
+        && kitObjetoValido(kitId)
+        && slotFotoKitValido(slot)
+        && eventoDoMeuTenant(eventoId);
+    }
```

Não há mais nada de diferente entre o arquivo e o publicado. O bloco está
coberto por testes verdes na suíte.

## Devolvido para a lane DIAG-PAINEL-LACUNAS — honestidade da tela

Não editei `apps/painel`. O conserto é de uma linha de conceito e vale mesmo
depois do papel de IAM entrar, porque `storage/unauthorized` vai continuar
existindo (papel sem permissão, evento de outro tenant, sessão expirada).

**`apps/painel/src/components/upload/ImageUploadField.tsx:136-139`**

```tsx
} catch (err) {
  setErro(
    err instanceof Error && err.message ? err.message : 'Não foi possível enviar a imagem.'
  );
```

O `err.message` do SDK do Firebase é repassado cru. Quando o erro vem das
Rules, a pessoa lê `Firebase Storage: User does not have permission to access
'eventos/teste-taxa-repassada/capa'. (storage/unauthorized)` — que nomeia um
caminho interno, acusa a pessoa de não ter permissão e não diz o que fazer.

O que sugiro, e por quê: o `err` do Storage carrega `code`. Erros do seam
(formato/tamanho) são `Error` comum e **já têm frase boa** — esses devem
continuar passando direto. Só o `storage/*` precisa de tradução:

- `storage/unauthorized` → "Não foi possível enviar a imagem: sua conta não tem
  permissão para alterar este evento." (mais um caminho para o suporte, porque
  hoje esta frase pode significar defeito de infraestrutura e não do usuário)
- `storage/unauthenticated` / `storage/retry-limit-exceeded` → frases próprias
- demais `storage/*` → "Não foi possível enviar a imagem. Tente de novo."

O hint da capa já está honesto (`CAPA_EVENTO_HINT` em
`apps/painel/src/routes/eventos/_lib/capaEvento.ts:19`) e o seam já devolve as
frases certas de formato e peso — não há nada a fazer nesses dois.

## A guarda contra reincidência

A família de defeito é conhecida: **a mesma regra escrita em dois lugares, e os
dois separando-se em silêncio.** Aqui o teto e a allowlist da capa vivem na
Rule (`capaEventoFormatoValido`) e no seam (`problemaDoArquivoCapaEvento`).
Enquanto coincidem, todo arquivo recusado sai com frase específica e o
`storage/unauthorized` fica reservado a permissão de verdade. Se alguém
afrouxar um dos lados, abre-se uma faixa em que a tela deixa passar e o Storage
nega — e a pessoa recebe uma acusação de permissão por um problema de arquivo.

Entraram dois testes que leem os **dois arquivos-fonte** e comparam:

- `o teto de bytes da capa é o MESMO na Rule e no seam`
- `a allowlist de contentType da capa é a MESMA na Rule e no seam`

Rodam sem emulator e quebram no instante em que os números divergirem.

**A guarda que ainda falta, e que teria pego ESTE defeito:** nenhum teste de
Rules — nem o melhor deles — enxerga uma permissão de IAM que só existe em
produção. O emulator resolve o cross-service localmente e por isso é
estruturalmente cego a essa classe de falha, exatamente como foi cego ao índice
que o Firestore só cobra em produção. O que fecha é uma **conferência de
prontidão do projeto**, barata e sem navegador: um script que lê o IAM de
`leela-hub` e falha se alguma função cross-service aparecer nas
`storage.rules` sem o papel correspondente concedido. Roda antes de qualquer
`--apply` ou deploy e responde a pergunta certa — "a produção está montada para
executar a Rule que eu estou publicando?". Proponho como card; não abri porque
mexe em `functions/scripts/**`, que é território de outra lane hoje.

## O que este teste NÃO prova

- **Não prova que a produção passou a funcionar.** Ele prova que a Rule permite
  o upload quando o `firestore.get()` responde. Em produção ele não responde, e
  isso só muda quando o papel de IAM for concedido.
- **Não executa o cross-service como a produção executa.** O emulator resolve o
  `get()` no processo local, sem service agent e sem IAM. É por isso que a
  suíte estava verde o tempo todo com o defeito vivo.
- **Não prova conteúdo de imagem.** O `contentType` é declarado pelo cliente; as
  Rules não decodificam bytes. Um `.jpg` que na verdade é outra coisa passa —
  limitação já registrada na ADR-016.
- **Não prova a proporção 1.9:1.** É crop client-side, fora das Rules.
- **Não prova o caminho do navegador.** A suíte é o SDK client sem browser: não
  cobre o `File` que o `<input>` entrega, nem o `type` que o SO atribui à
  extensão.

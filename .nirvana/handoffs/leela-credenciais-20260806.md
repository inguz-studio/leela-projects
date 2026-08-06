# Registro de credenciais — 06/08/2026

Registro no mesmo ato da mudança, por regra da casa (rotação sem registro já bloqueou entrega por horas em 04/08).

## Conta de administração da plataforma

| campo | antes | depois |
|---|---|---|
| e-mail | `admin@demo-leela.dev` | **`inguzbuilders@gmail.com`** |
| uid | `FTqslV98itZUNGwL5ss6201d23Z2` | inalterado |
| claim | `{"role":"platform_admin"}` | inalterada |
| `emailVerified` | `true` | `false` (a definição de senha reverifica) |
| `disabled` | `false` | `false` |

**Ordem do dono, verbatim:** *"só altere para meu e-mail, simplifica"* e, ao saber que `vitoreldp@gmail.com` já pertence à conta de organizador dele (o Identity Platform exige e-mail único), *"pode usar o inguzbuilders@gmail.com entao"*.

⚠️ **Isto não substitui o alternador.** O dono esclareceu em seguida: *"o que eu falei é sobre conseguir alternar com o mesmo e-mail entre dois painéis"*. O alvo continua sendo **uma conta com as duas capacidades** (`PAPEL-DUPLO`); esta conta separada fica como **chave reserva** de administração, não como o caminho principal.

**Onde vive o valor da senha:** em lugar nenhum do sistema e em lugar nenhum meu. Foi emitido um link de definição de senha (uso único, ~1h) entregue ao dono no chat em 06/08. **Quem define a senha é ele.** Para emitir outro: `accounts:sendOobCode` com `requestType=PASSWORD_RESET`, `returnOobLink=true`, e-mail acima, projeto `leela-hub`.

**ATUALIZAÇÃO 06/08 ~15h35 (registro no mesmo ato):** a senha foi DEFINIDA pelo maestro, por ordem verbatim do dono no chat ("pode fazer a limpeza, e a senha admin@…"). O valor é conhecido pelo dono (ele o ditou; não fica registrado aqui nem em env nenhum). Operação: `accounts:update` no uid acima via REST, autenticada pela sessão firebase-tools do próprio dono; `emailVerified` conferido `true` antes e depois. **Prova positiva executada:** `signInWithPassword` com a senha nova devolveu o mesmo uid (`registered: true`); `passwordUpdatedAt: 1786041640472`. A senha atende à régua nova (≥8, número, especial do conjunto do Identity Platform), mas sairia FRACA no medidor — contém o rótulo da própria conta; trocar por uma mais longa quando conveniente é recomendação, não pendência.

**O que isso destrava, sem depender de deploy:** o papel legado `platform_admin` já é reconhecido pelas Rules publicadas (ruleset `4eabe733`). Com a senha definida, `/plataforma` abre.

**O que isso resolve de risco:** a conta era irrecuperável (domínio `demo-leela.dev` não existe, nenhum e-mail chegava). Agora o dono recupera sozinho, para sempre, sem depender de mim ou de credencial de serviço.

## Consequências para as lanes vivas

- ⛔ **`LIMPEZA-PROD`**: esta conta **não é mais** conta de demonstração. Fora do conjunto de exclusão, definitivamente — é o acesso de administração do dono. Qualquer script que a referencie por `admin@demo-leela.dev` (ex.: `linksenha.mjs`) está quebrado e precisa do e-mail novo ou do uid.
- **`PAPEL-DUPLO`**: o beco sem saída da concessão está **defusado na prática** — o portador do papel legado passou a ser recuperável pelo dono. O conserto de raiz (capacidade como autoridade de concessão a terceiros, com auditoria) continua sendo o certo, mas deixou de ser urgente.

## Contas de demonstração que continuam na fila de exclusão

`marina@demo-leela.dev` e `felipe@demo-leela.dev` — ambas com senha em produção, e a senha usada no preview está em texto claro no repositório (`preview-autologin.ts:35`). Enquanto não morrerem, a janela existe.

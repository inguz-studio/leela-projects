---
tags: [leela, decisoes, rns, rodada, onboarding, organizador, convite]
trace: leela-build-2d6ee98d
lote: SPEC-ONBOARD
data: 2026-07-28
---

# 02-rns-delta · RNs novas do onboarding do organizador

> **Prova de não colisão (2026-07-28).** A série da plataforma/multi-tenancy é a **4xx**
> (E16 introduziu `RN-400` a `RN-410`). Varredura por `RN-411` a `RN-499` em todo o repo
> fora de `node_modules`: único hit é a nota do handoff da SPECS-0728 declarando "próxima
> faixa realmente livre: RN-382, RN-383 e RN-411 em diante". `RN-382`/`RN-383` ficam como
> folga da série 3xx (dinheiro) — onboarding não é o domínio delas. **Esta lane consome
> RN-411 a RN-417.**

## Novas

| RN | Regra | Épico | Lote |
|---|---|---|---|
| **RN-411** | **Cadastro aberto, acesso travado.** Qualquer pessoa cria conta de organizador (Firebase Auth e-mail/senha) **sem** código de convite. A conta nasce **sem tenant e sem claim de tenant**: `profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'`. O código destrava o **uso**, não o cadastro. Este convite é de **organizador para a plataforma** — não confundir com o convite de atleta para clube (RN-101, `clubes.codigoConvite`) nem com o convite por e-mail de clube (S104): entidades, donos e Rules distintos. | E16 (dona) · E00 (cadastro) | SPEC-ONBOARD |
| **RN-412** | **Dados do cadastro e consentimento LGPD.** O formulário de cadastro coleta: nome, e-mail (único), senha, telefone/WhatsApp e nome da organização/produtora (semente do futuro tenant). Consentimento LGPD **explícito** (checkbox não pré-marcado) com finalidade declarada e versão do termo, carimbado em `profissionais/{uid}.consentimentoLgpd{ versao, aceitoEm, finalidade }`. Base legal dos dados cadastrais: procedimentos preliminares de contrato (LGPD art. 7º, V); comunicação de onboarding coberta pelo consentimento. PII vive **só** no doc `profissionais` (nunca em claims); nenhum dado sensível é coletado. CPF/CNPJ e KYC ficam fora (Won't do E16 preservado nesta parte). | E00 (dona) · E16 (consome no provisionamento) | SPEC-ONBOARD |
| **RN-413** | **Código de convite de organizador — formato e ciclo de vida.** Código de **uso único**, unicidade **global** (docId da coleção `convitesOrganizador`), 8 caracteres no alfabeto maiúsculo sem ambíguos (`0 O 1 I L` excluídos — mesmo padrão RN-101; tamanho e alfabeto em **constante única no core**, padrão RN-157). Normalização na entrada: trim, uppercase, remoção de espaços e hífens — o usuário pode digitar `ab12-cd34` e acertar. Estados: `ativo → usado | revogado | expirado`. Validade **opcional** (`expiraEm?`; sem validade por default), avaliada **no resgate** contra o relógio do servidor — não precisa de cron. Gerar e revogar: só `platform_admin`. Revogar **não** desfaz tenant já provisionado (o código já era `usado`; revogação só alcança código `ativo`). | E16 (dona) | SPEC-ONBOARD |
| **RN-414** | **Resgate server-side, atômico e anti-enumeração.** Validação e resgate **só** via Function (`resgatarConviteOrganizador`); o cliente **nunca** lê `convitesOrganizador` (Rules negam leitura a todo cliente que não seja `platform_admin`). Na **mesma transação**: o código é conferido (`ativo` e não expirado) e marcado `usado` (`usadoPor`, `usadoEm`, `tenantId`), e o tenant é provisionado **reusando RN-403** (`tenants/{id}` ativo + `profissionais/{uid}` owner com `statusOnboarding: 'ativo'` + claims `tenant_owner`/`tenantId`) — uma única máquina de provisionamento, compartilhada com o caminho manual do super-admin (S1601). Atomicidade nos dois sentidos: falha no provisionamento não queima o código; código queimado sem tenant não existe. Resgate concorrente do mesmo código: um vence, o outro recebe o erro genérico. O erro é **único e genérico** ("código inválido ou já utilizado") — nunca distingue inexistente × usado × revogado × expirado. | E16 (dona) | SPEC-ONBOARD |
| **RN-415** | **Taxa de tentativas do resgate.** O resgate exige usuário **autenticado** (o overlay só existe logado; não há chamada anônima). Teto server-side por conta: **5 tentativas por hora** (constante única no core); estourou ⇒ `resource-exhausted` com copy honesta ("Muitas tentativas. Aguarde um pouco ou fale com o time Leela."). O contador vive no servidor, nunca no cliente. | E16 (dona) | SPEC-ONBOARD |
| **RN-416** | **Escopo da conta travada.** Conta com `statusOnboarding: 'aguardando_convite'`: a home do painel renderiza overlay **bloqueante e não-descartável** (sem X, sem Esc, sem clique-fora) com o campo de código e o CTA de contato. A conta pode: informar código, acionar o CTA, acessar `/conta` (próprio perfil, S020-T4) e sair. Nenhuma rota ou ação de tenant é alcançável — e a garantia real é **server-side**: sem claim `tenantId`, as Rules já negam todo dado de tenant (RN-400/401). O overlay é experiência, não segurança. | E16 (dona) · E01 (componentes) | SPEC-ONBOARD |
| **RN-417** | **Canal do CTA "Falar com o time Leela".** O destino do CTA é **configurável pela plataforma** em `platform/config.contatoOnboarding` (`{ tipo: 'whatsapp' \| 'email', valor }`), editável pelo `platform_admin` sem deploy; fallback fail-closed = mailto do e-mail oficial da Leela. **Nunca hardcoded.** Premissa vetável P1 — o dono não especificou o canal. | E16 (dona) | SPEC-ONBOARD |

## Ampliadas / reconciliadas (sem número novo)

- **RN-403** — o provisionamento atômico ganha um **segundo chamador**: além do
  `platform_admin` (S1601), a Function de resgate (RN-414) invoca o mesmo caminho com a
  autorização derivada do código válido. "Criar `profissionais/{ownerUid}` se não existir"
  já cobria o doc pré-existente do cadastro — o resgate só o promove a
  `statusOnboarding: 'ativo'`.
- **RN-401** — inalterada: claim continua sendo a única fonte de papel. A conta recém-
  cadastrada não ganha claim nenhuma de tenant; o papel chega no resgate.
- **RN-402** — inalterada: o tenant provisionado por código nasce `ativo`, como no caminho
  manual.
- **RN-101 / S104** — inalteradas e **distintas**: convite de atleta para clube segue como
  está; a coincidência é só o alfabeto sem caracteres ambíguos, reusado como padrão.
- **S020-T3 (E00)** — o default "cadastro NÃO cria tenant" **permanece**; o que muda é o
  formulário (dados completos + LGPD, RN-412) e a aterrissagem (home com overlay, RN-416).
- **Won't do E16** ("onboarding self-service → futuro") — **superado na parte cadastro +
  código de convite** por decisão do dono (verbatim na rodada). KYC e aprovação com
  análise seguem fora.

## Fora desta rodada

- **E-mail transacional de boas-vindas / verificação** — o cadastro não dispara e-mail
  novo; verificação de e-mail e comunicação pós-cadastro entram com o EmailProvider nos
  moldes existentes (RN-137/155), em card próprio se o dono quiser.
- **Fila de pedidos de acesso no super-admin** (pessoas cadastradas aguardando convite,
  visíveis para o dono prospectar) — candidata natural, mas não foi pedida. Card próprio
  se o dono quiser.
- **KYC / validação de identidade do organizador** — segue no Won't do E16.

---
tags: [leela, decisoes, rodada, produto, onboarding, organizador, convite, landing]
aliases: ["Rodada onboarding-organizador 2026-07-28", "SPEC-ONBOARD", "DEC-ONB-0728"]
trace: leela-build-2d6ee98d
lote: SPEC-ONBOARD
data: 2026-07-28
fonte: demanda do dono em 2026-07-28, olhando o preview do go-live controlado
---

# Delta onboarding do organizador — entrada, cadastro e código de convite

## Verbatim do Vitor (2026-07-28)

> *"não temos a área de login. e nem aonde clicar na página inicial da Leela, para entrar
> no nosso painel do organizador. Também não elaboramos o fluxo de cadastro de um novo
> organizador. para se cadastrar quero que o usuário informe um código de convite, onde os
> códigos serão organizados por mim no painel admin. a pessoa ao se cadastrar recebe um CTA
> para entrar em contato comigo. A pessoa inputará todos os dados e cairá na tela inicial
> do sistema, com um overlay pedindo o código de convite ou para falar com o time leela."*

Interpretação confirmada com o dono: **cadastro aberto, acesso travado**. A conta nasce sem
código; o código destrava o uso. Gestão dos códigos é do super-admin (E16).

## Inventário antes de especificar

**Já existe e não se reescreve.** O painel tem as quatro jornadas de conta desde a S020
(E00): login `/entrar` com erro único sem enumeração, `/recuperar-senha` e
`/redefinir-senha`, `/cadastrar` que cria a conta Firebase **sem** criar tenant, e `/conta`
com troca de senha sob reauth. O E16 tem o provisionamento atômico de tenant
(`provisionTenant`, RN-403: `tenants/{id}` ativo + `profissionais/{owner}` + claims na
mesma operação), o lifecycle `pending → ativo → suspenso` (RN-402) e a área de plataforma
com navegação própria (`/plataforma/*`). A landing tem `PublicHeader`/`PublicFooter` na
fundação S1200-T1. As Security Rules já negam todo dado tenant-scoped a quem não tem claim
`tenantId` (RN-400/401) — a conta sem código já nasce trancada do lado do servidor.

**O que não existe.** Porta de entrada na landing (nenhum link para `/entrar` nem para
`/cadastrar`); o `/cadastrar` coleta o mínimo, não os dados completos de organizador nem o
consentimento LGPD; não há código de convite de organizador, nem tela de gestão no
super-admin, nem o overlay bloqueante da home.

**O que muda de decisão anterior.** O S020-T3 registrou como default defensável "cadastro
NÃO cria tenant; mudar = decisão de produto" — a decisão de produto chegou, e o default
**continua de pé**: o cadastro segue sem criar tenant; quem cria é o **resgate do código**.
O Won't do E16 ("onboarding self-service do produtor → futuro") é superado **na parte do
cadastro + código**; o KYC segue fora, como estava.

**O que NÃO é este convite.** Já existem dois convites no produto e nenhum serve aqui:
o `clubes.codigoConvite` (RN-101) convida **atleta para clube**, e o convite por e-mail de
clube (S104, `clubes/{id}/convites`) idem. O novo é convite de **organizador para a
plataforma** — entidade própria, coleção própria, dona E16.

## Decisões

### D-ONB-1 · Cadastro aberto, acesso travado ⇒ RN-411, RN-412

Qualquer pessoa cria a conta de organizador sem código, com dados completos e consentimento
LGPD, e aterrissa na home do painel. O que a segura ali é o overlay (UX) e a ausência de
claim de tenant (segurança). Recusar o cadastro sem código teria sido a alternativa — morre
porque o dono pediu exatamente o contrário: a pessoa entra, vê o sistema fechado e recebe o
caminho para falar com o time.

### D-ONB-2 · O código de organizador é entidade nova da plataforma ⇒ RN-413

Coleção própria (`convitesOrganizador`), docId = código, uso único, validade opcional,
alfabeto sem caractere ambíguo (mesmo padrão RN-101, tamanho maior por ser porta da
plataforma). Reusar `clubes.codigoConvite` misturaria dois domínios com donos, Rules e
ciclos de vida diferentes.

### D-ONB-3 · Resgatar o código É provisionar o tenant ⇒ RN-414, RN-415

A validação é server-side (Function), nunca no cliente — o candidato jamais lê a coleção de
códigos. Código válido dispara, na mesma operação, o `provisionTenant` que já existe
(RN-403) e o carimbo de uso no código. Não nasce uma segunda máquina de criação de tenant:
o caminho manual do super-admin (S1601) e o caminho por código convergem no mesmo
provisionamento. Tentativas erradas têm teto por conta (rate-limit) e erro genérico único.

### D-ONB-4 · O overlay é UX; a segurança é claim + Rules ⇒ RN-416

O overlay não-descartável da home é a experiência da conta travada, não a tranca. A tranca
já existe: sem claim `tenantId`, as Rules negam todo dado de tenant (RN-400/401). A conta
travada enxerga só o overlay, o próprio perfil (`/conta`) e a saída.

### D-ONB-5 · O canal do CTA é configurável ⇒ RN-417 (premissa vetável)

O dono não especificou o canal de "Falar com o time Leela". Default: destino em
`platform/config` (WhatsApp ou e-mail), editável sem deploy; fallback mailto. Hardcodar o
WhatsApp pessoal em string de código morre por LGPD e por custo de troca.

## Premissas vetáveis pelo dono

| # | Premissa | RN |
|---|---|---|
| P1 | Canal do CTA configurável em `platform/config` (WhatsApp ou mailto); fallback mailto do e-mail oficial | RN-417 |
| P2 | Código de **uso único**; convidar N organizadores = gerar N códigos (multiuso fica fora) | RN-413 |
| P3 | Validade **opcional** por código; sem validade por default | RN-413 |
| P4 | Formato: 8 caracteres, alfabeto RN-101 (maiúsculas alfanuméricas sem `0 O 1 I L`) | RN-413 |
| P5 | Rate-limit de resgate: 5 tentativas por hora por conta | RN-415 |
| P6 | Conta travada vê: overlay + `/conta` + sair. Nada mais | RN-416 |
| P7 | O tenant nasce no **resgate** com nome/slug derivados do "nome da organização" do cadastro (slug ajustável depois pelo super-admin); `tipo: produtor` | RN-414 |
| P8 | Cadastro obrigatório: nome, e-mail, senha, telefone/WhatsApp, nome da organização. **CPF/CNPJ não entra** (KYC segue futuro, como no Won't do E16) | RN-412 |
| P9 | Copy do overlay: título "Seu acesso ainda não foi liberado" + campo de código + botão "Falar com o time Leela" (verbatim do dono); texto final passa pelo gate de linguagem da casa | RN-416/417 |
| P10 | A landing aponta para o painel por env pública (`NEXT_PUBLIC_PAINEL_URL`), não por URL fixa | S1213 |

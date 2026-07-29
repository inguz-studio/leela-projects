---
id: LEELA-S030
type: story
epic: E00
epic_name: Fundação Técnica
onda: 4
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S030 · Cadastro completo do organizador (upgrade do `/cadastrar` da S020)
**Como** Organizador novo, **quero** me cadastrar informando todos os meus dados e aceitando os termos, **para** entrar no painel e pedir a liberação do meu acesso com o código de convite.

> Upgrade do `/cadastrar` entregue na S020-T3 — o default "cadastro NÃO cria tenant"
> PERMANECE: quem cria o tenant é o resgate do código (S1609). RNs: RN-411 (cadastro
> aberto, acesso travado) e RN-412 (dados + LGPD). Rodada
> `02-rodadas/2026-07-28-onboarding-organizador/`.

## Critérios de aceite
- Dado o formulário, quando cadastro, então informo nome, e-mail, senha, telefone/WhatsApp e nome da organização/produtora (obrigatórios — RN-412, premissa P8; CPF/CNPJ fora, KYC segue futuro).
- Dado o consentimento LGPD, quando o formulário renderiza, então o checkbox nasce desmarcado, com finalidade declarada, e o aceite é carimbado com versão e instante em `profissionais/{uid}.consentimentoLgpd` (RN-412).
- Dado o cadastro válido, quando concluo, então a conta Firebase Auth (e-mail/senha) é criada, `profissionais/{uid}` nasce com `statusOnboarding: 'aguardando_convite'` (RN-411) e aterrisso logado na home do painel — onde o overlay da S1609 me recebe.
- Dado que não informei código nenhum, quando aterrisso, então nenhuma claim de tenant existe e nenhum dado de tenant é alcançável (a tranca é RN-400/401, não a tela).
- Dado um e-mail já cadastrado, quando tento, então o erro não enumera contas (mesma disciplina da S020).

## Subtarefas
- [ ] LEELA-S030-T1 — Formulário completo + consentimento LGPD + criação Auth + aterrissagem logada na home
- [ ] LEELA-S030-T2 — Doc `profissionais/{uid}` no cadastro (`statusOnboarding`, consentimento carimbado) + Rule de create do próprio doc com shape validado

## Links
Épico: [[LEELA-E00-fundacao-tecnica]]

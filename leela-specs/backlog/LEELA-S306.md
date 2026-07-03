---
id: LEELA-S306
type: story
epic: E04
epic_name: Configuração e Vendas do Evento
onda: 2
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---
# LEELA-S306 · Configuração de exigências de saúde e versionamento de regulamento (organizador)
**Como** Organizador de Evento, **quero** ativar exigências de saúde por evento e versionar o regulamento, **para** cumprir requisitos regulatórios sem coletar dado sensível desnecessário nem invalidar aceites antigos.

## Critérios de aceite
- Dado o evento, quando abro a aba de exigências, então ativo/desativo `exigenciasSaude.atestado` e `exigenciasSaude.parq` por flag; ambos ficam desligados por padrão (minimização LGPD, RN-146).
- Dado uma exigência de saúde ativa, quando um inscrito preenche, então o dado vai para a subcoleção condicional `eventos/{id}/inscritos/{id}/saude/{unico}` (`atestadoUrl?`, `parqRespostas?`, `consentimentoSaudeEm`), isolada do doc do inscrito.
- Dado a natureza sensível do dado de saúde (LGPD Art. 11), quando modelado, então a base legal é consentimento específico e destacado ou tutela da saúde/proteção da vida, o acesso é restrito ao owner do evento + admin (nunca afiliado/patrocinador) e a retenção é limitada ao ciclo do evento + janela legal, com expurgo programado após (RN-147).
- Dado as Security Rules da subcoleção `saude`, quando um afiliado ou patrocinador tenta ler, então o acesso é negado.
- Dado o regulamento, quando publico uma nova versão, então inscritos futuros precisam de novo aceite e inscritos antigos mantêm o registro da versão que aceitaram (RN-149).
- Dado o upload de regulamento (estende E03-S201-T1), quando salvo, então grava `regulamentoVersao`, `regulamentoUrl` e `regulamentoAtualizadoEm` no evento.

## Subtarefas
- [ ] LEELA-S306-T1 — Modelo `eventos/{id}.exigenciasSaude{ atestado, parq }` + flags na aba de configuração
- [ ] LEELA-S306-T2 — Subcoleção sensível `eventos/{id}/inscritos/{id}/saude/{unico}` + Security Rules restritas (owner + admin) + nota LGPD Art. 11 (base legal, minimização, retenção)
- [ ] LEELA-S306-T3 — Versionamento de regulamento (`regulamentoVersao`, novo aceite em versão nova, registro da versão vigente à época)

## Links
Épico: [[LEELA-E04-config-vendas]]

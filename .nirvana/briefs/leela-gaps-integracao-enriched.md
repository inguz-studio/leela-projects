# Brief enriquecido — Integração das stories novas nos épicos (fase 2)

**Business:** software-forge · **Trace:** leela-gaps · **Modo:** zero_human
**Base:** `C:\Users\Vitor Eduardo\Desktop\Vaults\Projetos\LEELA`

## Objetivo
Costurar as 12 stories novas (já escritas como cards em `leela-specs/backlog/`) e o `ADR-pedido-em-grupo.md` (ADR-011) DENTRO dos arquivos de épico, no padrão executável do leela-specs, e atualizar o modelo de dados. Cada executor edita UM único arquivo (paralelismo seguro).

## Fontes de conteúdo (ler)
- Detalhe de cada story (RNs novas, critérios, impacto no modelo, tasks): `.nirvana/outputs/leela-gaps-20260702-194716/01-produto-gaps.md`
- Cards já escritos: `leela-specs/backlog/LEELA-{S208,S209,S210,S305,S306,S904,S1206,S1207,S1208,S1314,S1315,S1316}.md`
- ADR pedido em grupo: `leela-specs/adr/ADR-pedido-em-grupo.md`
- Template do padrão: `leela-specs/00-TEMPLATE-spec.md`

## Padrão de integração em cada épico
1. **Inserir o(s) bloco(s) de story** na seção `## User stories`, ANTES de `## Ordem sugerida`/`## Rastreabilidade`, no MESMO formato dos blocos `### LEELA-Sxxx` existentes no próprio arquivo: título · Como/quero/para · MoSCoW/Estimativa/Superfície · Tela(s) de referência · RNs · Critérios de aceite (Given/When/Then) · lista de Tasks · e os blocos `#### LEELA-Sxxx-T#` (Objetivo, Contexto & referências, Arquivos, Passos, Modelo de dados/contratos, Regras a respeitar, Critérios testáveis, Testes, DoD, Fora de escopo). Espelhe o nível de detalhe das stories vizinhas do mesmo épico.
2. **Atualizar `## Regras de negócio aplicáveis`**: adicionar as RNs novas da(s) story(ies), 1 linha cada.
3. **Atualizar `## Modelo de dados tocado`**: adicionar as coleções/campos novos (marcar ➕ as criadas).
4. **Atualizar `## Fora de escopo`** se algo que estava fora agora entrou (ex.: E04 "reembolso na UI"; E03 "ajuste manual de estoque" continua fora, mas aprovisionamento entra).
5. **Preservar tudo o que já existe** no arquivo — só inserir/estender, nunca remover conteúdo válido. Manter numeração de tasks coerente.

## Distribuição (um arquivo por executor)
- `epics/LEELA-E03-operacao-evento.md` ← S208, S209, S210
- `epics/LEELA-E04-config-vendas.md` ← S305, S306
- `epics/LEELA-E09-financeiro-profissional.md` ← S904 (inclui RN-346 clawback)
- `epics/LEELA-E12-landing.md` ← S1206, S1207, S1208
- `epics/LEELA-E13-app-atleta.md` ← S1314, S1315, S1316 + **corrigir S1306** conforme ADR-011 (pedido em grupo: responsável + N inscritos; não é auto-inscrição)
- `modelo-de-dados-firestore.md` ← todas as coleções/campos novos

## Decisões travadas (aplicar)
- **Pedido em grupo** (ADR-011): reembolso/titularidade/troca operam por inscrito dentro do pedido; e-mail ao responsável.
- **Saúde:** mínimo (contato de emergência obrigatório) + atestado/PAR-Q opcional por flag; dado sensível LGPD Art. 11 isolado em subcoleção `saude`.
- **Landing do organizador** (S1208): portal público (hub eventos/agenda/fotos/blog/patrocinadores/newsletter), NÃO domínio próprio.

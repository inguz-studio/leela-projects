---
tags: [leela, adr, arquitetura, vendas, lote, modalidade, e04]
---

# ADR-012 · Lote pertence à modalidade (percurso), não ao evento

**Contexto.** O E04 (S300) precisa modelar lotes e percursos/modalidades, mas a spec não fixou a cardinalidade entre eles. Duas leituras eram possíveis: (A) **lote global do evento** com preço por modalidade dentro dele — todas as modalidades viram de lote juntas, na mesma data (matriz lote×modalidade); (B) **lote por modalidade** — cada modalidade (ex.: "corrida masculina 5km") tem sua própria sequência Lote 1/2/3, com janelas de data/hora e vaga próprias, progredindo de forma independente das outras. Sem decisão, a Function de virada (RN-300), o financeiro (RN-301, breakdown por modalidade×lote em S207) e o checkout ficam ambíguos.

Dois fatos empurram para (B): a pesquisa de discovery do projeto (`RELATORIO-DISCOVERY.md`, `pilares/01-ticketing.md`) conclui que nas verticais de esporte "distâncias/modalidades são categorias com **preço, vaga e disponibilidade próprios**"; e a **virada por quantidade** (RN-300) só é fisicamente coerente por modalidade — se o Lote 1 da 5km esgota as vagas, a 5km vira sozinha para o Lote 2 enquanto a 10km, que vende mais devagar, segue no Lote 1.

**Decisão.** O **lote pertence à modalidade** (Modelo B, travado pelo usuário 2026-07-11). Cada modalidade/percurso do evento tem uma **lista ordenada de lotes**, e cada lote carrega **janela própria** (data/hora de início e fim), **quantidade limite** (vaga própria) e **preço**. A virada de lote (por data OU quantidade, o que ocorrer primeiro — RN-300) opera na granularidade de **(modalidade, lote)**. Preço independente por percurso (RN-301) é consequência natural: o preço mora no lote, e os lotes são da modalidade.

- **Modelo B é o superconjunto:** representa o caso "lote global" (basta as modalidades compartilharem as mesmas janelas); o inverso não vale. Por isso não se perde nada ao escolher o mais expressivo.
- **Conveniência de UI (não de modelo):** o editor de lotes deve oferecer "aplicar estas janelas a todas as modalidades" para o caso comum em que coincidem — a ergonomia do caso simples não exige um modelo mais pobre.

**Status.** ✅ Decidido (travado pelo usuário, 2026-07-11). Impacta E04/S300 (modelo `lotes`, Functions de virada, modais de lote/percurso), E03/S207 (breakdown por modalidade×lote), E12 (checkout escreve `loteId` no pagamento) e S305/RN-344 (troca de ingresso cobra "diferença pelo lote vigente" — vigente **da modalidade de destino**).

**Consequência.**
- **Modelo:** os lotes vivem sob a modalidade (ex.: `eventos/{id}/modalidades/{modId}/lotes/{loteId}` ou `lotes[]` embutido na modalidade — o lote de escopo E04 decide a fronteira Firestore; a **relação é modalidade 1—N lotes**). Cada lote: `ordem`, `nome`, `inicioEm`, `fimEm` (janela), `quantidadeLimite`, `preco`, mais os carimbos de estado de virada (escrita só por Function).
- **Virada (S300-T2):** a Function mantém contadores de venda **por (modalidade, lote)** e vira quando `agora ≥ fimEm` OU `vendidos ≥ quantidadeLimite`, o que vier primeiro. "Preço vigente" (RN-301) é o do lote ativo **daquela modalidade**.
- **Financeiro (S207/S302):** breakdown é uma matriz modalidade×lote — cada célula é um par real, não um produto cartesiano de dimensões independentes.
- **Compatível com o que já existe:** `pagamento.loteId` + `inscrito.modalidade` (Wave A) já acomodam a decisão — o `loteId` referencia um lote-de-modalidade e o `modalidade` do inscrito o contextualiza; nenhum campo da Wave A muda.
- **Troca de ingresso (RN-344):** upgrade cobra a diferença pelo **lote vigente da modalidade de destino** (não um "lote do evento").

---
Relacionado: [[LEELA-E04-config-vendas]] · [[LEELA-S300]] · [[LEELA-S207]] · [[ADR-pedido-em-grupo]] · [[modelo-de-dados-firestore]]

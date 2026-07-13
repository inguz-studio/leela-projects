// =============================================================================
// packages/api-client/src/eventos/configuracoesEvento.ts
//
// Configurações gerais do evento — escrita DIRETA do doc `eventos/{eventoId}`
// (LEELA-S304-T2 · E04-L5). Mesma natureza de `salvarConteudoPaginaVendas`/
// `salvarLote`/`salvarCupom`: campos descritivos do ORGANIZADOR, escrita de
// cliente guardada pelas Rules (`isTenantWriter` + tenant ativo).
//
// FRONTEIRA (firestore.rules `match /eventos/{eventoId}` update):
//   - NUNCA envia `qtdInscritos`/`receitaConfirmada` (∑ de Function) nem
//     `status` (transição de Function) nem `tenantId` (imutável) — a Rule nega
//     o update inteiro se algum for tocado.
//   - NÃO envia `percursos`/`modalidades`: além de travados após a 1ª venda
//     (RN-200), são editados no fluxo de criação/lotes. Só os campos gerais
//     não-travados entram aqui (`nome`, `local`, `usaChip`, `capacidade`).
//   - `usaChip` é a chave da RN-207: `false` faz o balcão (E03) suprimir o
//     passo de chip — `derivarPassosBalcao`/`passosStepper` já leem
//     `evento.usaChip`, esta escrita só o persiste.
// =============================================================================

import { doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

/**
 * Campos gerais editáveis do evento (LEELA-S304-T2). `capacidade` aceita `null`
 * (desconhecida — limpa o campo); `parseEvento` normaliza para `number > 0` ou
 * `null` na leitura (RN-210). Campos travados/agregados/de-Function ficam FORA
 * deste contrato de propósito (ver fronteira no cabeçalho).
 */
export interface AtualizarConfiguracoesEventoInput {
  nome: string;
  local: string;
  usaChip: boolean;
  capacidade: number | null;
}

/**
 * Persiste as configurações gerais do evento (merge). Só toca campos gerais —
 * a Rule congela ∑/status/tenantId/percursos e nega o update se algum for
 * incluído. `atualizadoEm` carimba a edição (trilha). Erro `permission-denied`
 * (não é writer do tenant / tenant inativo) sobe INTACTO para a UI (§2.12).
 */
export async function atualizarConfiguracoesEvento(
  db: Firestore,
  eventoId: string,
  input: AtualizarConfiguracoesEventoInput
): Promise<void> {
  await setDoc(
    doc(db, 'eventos', eventoId),
    {
      nome: input.nome,
      local: input.local,
      usaChip: input.usaChip,
      capacidade: input.capacidade,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  );
}

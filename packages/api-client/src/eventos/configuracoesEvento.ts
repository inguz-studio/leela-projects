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

import {
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  isExigenciasSaude,
  isUrlCapaValida,
  REGULAMENTO_MAX,
  type ExigenciasSaude,
  type ModoTaxa,
} from '@leela/core';

/**
 * Campos gerais editáveis do evento (LEELA-S304-T2 + EVENTO-CAMPOS).
 * `capacidade` aceita `null` (desconhecida — limpa o campo); `parseEvento`
 * normaliza para `number > 0` ou `null` na leitura (RN-210). Campos
 * travados/agregados/de-Function ficam FORA deste contrato de propósito
 * (ver fronteira no cabeçalho).
 *
 * EVENTO-CAMPOS (RN-153/RN-347) — os 3 campos novos são OPCIONAIS no input
 * (`undefined` = não toca; chamadas existentes do painel seguem compilando):
 *   - `imagemUrl`: URL http(s) da capa; `null` REMOVE a capa (deleteField).
 *     RN-200 não congela — editável mesmo com venda.
 *   - `regulamento`: texto (≤ REGULAMENTO_MAX); `null` REMOVE. Versionamento
 *     RN-149 (`regulamentoVersao` + novo aceite) é do S306/Onda 3.
 *   - `taxaModo`: modo da taxa POR EVENTO. Com venda feita a Rule NEGA a
 *     troca (congela junto dos campos comerciais — RN-347); o
 *     `permission-denied` sobe INTACTO para a UI (§2.12).
 */
export interface AtualizarConfiguracoesEventoInput {
  nome: string;
  local: string;
  usaChip: boolean;
  capacidade: number | null;
  imagemUrl?: string | null;
  regulamento?: string | null;
  taxaModo?: ModoTaxa;
  /**
   * Modo cupom-only do evento (RN-303 · S1804): `true` fecha o evento a vendas
   * sem cupom válido. TOCAR este campo é OWNER-ONLY (a Rule
   * `vendaSomentePorCupomProtegida` nega staff — `permission-denied` sobe
   * intacto). `undefined` = não toca (o caller staff NUNCA o envia, para não
   * derrubar o update inteiro). Boolean estrito na Rule.
   */
  vendaSomentePorCupom?: boolean;
}

/**
 * Persiste as configurações gerais do evento (merge). Só toca campos gerais —
 * a Rule congela ∑/status/tenantId/percursos (e `taxaModo` após a 1ª venda)
 * e nega o update se algum for tocado indevidamente. `atualizadoEm` carimba a
 * edição (trilha). Erro `permission-denied` (não é writer do tenant / tenant
 * inativo / taxaModo congelado) sobe INTACTO para a UI (§2.12).
 *
 * Validação local dos campos novos é UX/fail-fast com mensagem acionável —
 * a fronteira REAL é a Rule (capa http(s) ≤ 2048; regulamento ≤ 50k).
 */
export async function atualizarConfiguracoesEvento(
  db: Firestore,
  eventoId: string,
  input: AtualizarConfiguracoesEventoInput
): Promise<void> {
  const payload: Record<string, unknown> = {
    nome: input.nome,
    local: input.local,
    usaChip: input.usaChip,
    capacidade: input.capacidade,
    atualizadoEm: serverTimestamp(),
  };

  if (input.imagemUrl !== undefined) {
    if (input.imagemUrl === null) {
      payload['imagemUrl'] = deleteField(); // sem capa → hero volta ao gradiente
    } else {
      if (!isUrlCapaValida(input.imagemUrl)) {
        throw new Error(
          'Capa inválida: use uma URL http(s) de até 2048 caracteres (RN-153).'
        );
      }
      payload['imagemUrl'] = input.imagemUrl.trim();
    }
  }

  if (input.regulamento !== undefined) {
    if (input.regulamento === null || input.regulamento.trim().length === 0) {
      payload['regulamento'] = deleteField();
    } else {
      if (input.regulamento.length > REGULAMENTO_MAX) {
        throw new Error(
          `Regulamento excede ${REGULAMENTO_MAX} caracteres (RN-153).`
        );
      }
      payload['regulamento'] = input.regulamento;
    }
  }

  if (input.taxaModo !== undefined) {
    payload['taxaModo'] = input.taxaModo;
  }

  // RN-303: só entra no payload quando o caller (owner) explicitamente o define.
  // Omitir para staff evita que o campo caia no `affectedKeys` e a Rule
  // owner-only (`vendaSomentePorCupomProtegida`) derrube o update inteiro.
  if (input.vendaSomentePorCupom !== undefined) {
    payload['vendaSomentePorCupom'] = input.vendaSomentePorCupom;
  }

  await setDoc(doc(db, 'eventos', eventoId), payload, { merge: true });
}

/**
 * Persiste SÓ a capa do evento (merge cirúrgico — CEV · RN-228). Caminho do
 * "Novo evento": o upload da capa só acontece APÓS o criarEvento (as Rules do
 * Storage exigem o doc existir — fail-closed), e neste momento a tela não tem
 * o resto do payload de configurações (usaChip/capacidade nascem de default do
 * servidor — reenviá-los sobrescreveria). Mesmo padrão de merge cirúrgico de
 * `atualizarExigenciasRegulamento`; validação canônica RN-153 (isUrlCapaValida
 * — mesma cadeia de 3 camadas: core + Rule `capaValida` + esta UX). `null`
 * REMOVE (deleteField → hero volta ao gradiente). ConfigGerais NÃO usa isto:
 * lá a capa entra no payload do `atualizarConfiguracoesEvento` (Salvar único).
 */
export async function salvarCapaEvento(
  db: Firestore,
  eventoId: string,
  imagemUrl: string | null
): Promise<void> {
  const payload: Record<string, unknown> = { atualizadoEm: serverTimestamp() };
  if (imagemUrl === null) {
    payload['imagemUrl'] = deleteField();
  } else {
    if (!isUrlCapaValida(imagemUrl)) {
      throw new Error('Capa inválida: use uma URL http(s) de até 2048 caracteres (RN-153).');
    }
    payload['imagemUrl'] = imagemUrl.trim();
  }
  await setDoc(doc(db, 'eventos', eventoId), payload, { merge: true });
}

// ---------------------------------------------------------------------------
// Exigências de saúde + regulamento (LEELA-S306-T2 · E04 · RN-146/147/149)
// ---------------------------------------------------------------------------

/**
 * Payload da aba "Exigências e regulamento". `exigenciasSaude` são as 2 flags
 * (atestado/PAR-Q, default OFF — minimização LGPD RN-146); `regulamento` é o
 * texto (`null`/vazio REMOVE — deleteField). O DADO de saúde em si NUNCA trafega
 * por aqui: vive isolado em `inscritos/{id}/saude` (RN-147 · Art. 11), escrito
 * só no checkout do inscrito.
 */
export interface AtualizarExigenciasRegulamentoInput {
  exigenciasSaude: ExigenciasSaude;
  regulamento?: string | null;
}

/**
 * Grava SÓ as flags de saúde + o texto do regulamento (merge cirúrgico —
 * `nome`/`local`/∑/status ficam intocados; a Rule nega o update se qualquer
 * campo ∑/status/tenantId for tocado). O VERSIONAMENTO (RN-149) é derivado
 * server-side: o trigger `versionarRegulamento` bumpa `regulamentoVersao`
 * quando o TEXTO muda (Rules congelam a versão para o cliente) — a UI só lê a
 * versão vigente, nunca a escreve. `permission-denied` (não é writer do tenant)
 * sobe INTACTO para a UI (§2.12).
 */
export async function atualizarExigenciasRegulamento(
  db: Firestore,
  eventoId: string,
  input: AtualizarExigenciasRegulamentoInput
): Promise<void> {
  if (!isExigenciasSaude(input.exigenciasSaude)) {
    throw new Error(
      'Exigências de saúde inválidas: envie { atestado: bool, parq: bool } (RN-146).'
    );
  }

  const payload: Record<string, unknown> = {
    exigenciasSaude: input.exigenciasSaude,
    atualizadoEm: serverTimestamp(),
  };

  if (input.regulamento !== undefined) {
    if (input.regulamento === null || input.regulamento.trim().length === 0) {
      payload['regulamento'] = deleteField();
    } else {
      if (input.regulamento.length > REGULAMENTO_MAX) {
        throw new Error(`Regulamento excede ${REGULAMENTO_MAX} caracteres (RN-153).`);
      }
      payload['regulamento'] = input.regulamento;
    }
  }

  await setDoc(doc(db, 'eventos', eventoId), payload, { merge: true });
}

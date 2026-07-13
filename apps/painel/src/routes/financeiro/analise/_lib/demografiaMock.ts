// =============================================================================
// Perfil de compradores — IDADE e SEXO (RN-820). Dado de EXEMPLO, honesto e
// declarado.
//
// POR QUE MOCK (e não real): o dado-fonte existe por inscrito
// (`dadosPessoais.nascimento` → idade; `dadosPessoais.genero` → sexo — ver
// core/eventos/dadosPessoais.ts), mas NÃO há agregado ∑ de demografia (só há
// agregados de receita/inscritos/estoque). Derivar a distribuição exigiria
// VARRER todos os inscritos de todos os eventos no cliente (453/evento × N) —
// exatamente a "varredura cara" que RN-820/§2.12 proíbem. Até existir uma
// Function que mantenha o agregado (pendência registrada), a análise usa dados
// de EXEMPLO SÓ para visualização — a UI marca isso explicitamente (a nota
// abaixo é obrigatória onde estes dados aparecem). Zero número real é fabricado
// aqui: é amostra rotulada, não uma medição.
//
// As chaves de sexo seguem o enum canônico `GeneroInscrito` do core (autêntico
// ao dado real que um agregado futuro produziria).
// =============================================================================

import type { BarChartDatum, DonutChartDatum } from '@leela/design-system';

/** Marcador de proveniência — todo consumidor DEVE exibir a nota. */
export const DEMOGRAFIA_FONTE = 'exemplo' as const;

/** Nota honesta obrigatória onde a demografia aparece (§2.12 — nunca finge medição). */
export const NOTA_DADOS_EXEMPLO =
  'Análise sobre dados de exemplo — a distribuição real de idade e sexo depende de um agregado ainda não disponível.';

/**
 * Faixas etárias (exemplo) → barras do DS. Buckets padrão de corrida de rua;
 * valores ilustrativos, não medidos. @pure
 */
export function faixasEtariasExemplo(): BarChartDatum[] {
  return [
    { label: '18–24', value: 84 },
    { label: '25–34', value: 210 },
    { label: '35–44', value: 168 },
    { label: '45–54', value: 96 },
    { label: '55+', value: 42 },
  ];
}

/**
 * Distribuição por sexo (exemplo) → rosca do DS. Rótulos do enum canônico
 * `GeneroInscrito` (feminino/masculino/outro); valores ilustrativos. @pure
 */
export function distribuicaoSexoExemplo(): DonutChartDatum[] {
  return [
    { label: 'Feminino', value: 288 },
    { label: 'Masculino', value: 306 },
    { label: 'Outro', value: 6 },
  ];
}

// =============================================================================
// Validação pura do formulário "Novo evento" (S201-T1).
//
// A regra de DATA vem de `@leela/core` (`dataEventoNoFuturo` — dia civil no
// fuso do produto): é a MESMA função que a Function `criarEvento` aplica no
// servidor, então o que passa aqui nunca morre em invalid-argument lá (fix
// review Onda1 #01). Preço de percurso: numérico e ≥ 0 — o servidor
// (`isPercursoEvento`) rejeita negativo, então a UI também precisa rejeitar
// (fix review Onda1 #35); o preço negativo do "Sem kit" é dos KITS (RN-211,
// S205), não dos percursos.
// =============================================================================

import { dataEventoNoFuturo } from '@leela/core';

export interface PercursoInput {
  nome: string;
  /** Em reais. String vazia = ainda não preenchido. */
  preco: string;
}

export interface NovoEventoFormValues {
  nome: string;
  descricao: string;
  /** ISO `yyyy-mm-dd` (input date). */
  data: string;
  local: string;
  modalidades: string[];
  percursos: PercursoInput[];
}

export type CampoNovoEvento =
  | 'nome'
  | 'data'
  | 'local'
  | 'modalidades'
  | 'percursos';

export type ErrosNovoEvento = Partial<Record<CampoNovoEvento, string>>;

export interface ResultadoValidacao {
  valido: boolean;
  erros: ErrosNovoEvento;
}

/** Valida os valores do formulário. `hoje` injetável para testes determinísticos. */
export function validaNovoEvento(
  values: NovoEventoFormValues,
  hoje: Date = new Date(),
): ResultadoValidacao {
  const erros: ErrosNovoEvento = {};

  if (values.nome.trim().length === 0) {
    erros.nome = 'Informe o nome do evento.';
  }
  if (values.local.trim().length === 0) {
    erros.local = 'Informe o local do evento.';
  }
  if (values.data.trim().length === 0) {
    erros.data = 'Informe a data do evento.';
  } else if (!dataEventoNoFuturo(values.data, hoje)) {
    erros.data = 'A data do evento deve ser hoje ou no futuro.';
  }
  if (values.modalidades.length === 0) {
    erros.modalidades = 'Adicione ao menos uma modalidade.';
  }

  const percursoInvalido = values.percursos.some((p) => {
    if (p.nome.trim().length === 0) return true;
    const preco = Number(p.preco);
    // Espelha o servidor (isPercursoEvento): número finito e ≥ 0 — sem isso
    // o negativo passava aqui e morria no genérico do submit (review #35).
    return p.preco.trim().length === 0 || Number.isNaN(preco) || preco < 0;
  });
  if (values.percursos.length === 0) {
    erros.percursos = 'Adicione ao menos um percurso com preço.';
  } else if (percursoInvalido) {
    erros.percursos = 'Cada percurso precisa de nome e preço numérico (R$ 0 ou mais).';
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

// =============================================================================
// Validação pura do formulário "Novo evento" (S201-T1 · REVISÃO RN-153).
//
// A regra de DATA vem de `@leela/core` (`dataEventoNoFuturo` — dia civil no
// fuso do produto): é a MESMA função que a Function `criarEvento` aplica no
// servidor, então o que passa aqui nunca morre em invalid-argument lá (fix
// review Onda1 #01).
//
// REVISÃO RN-153 (Vitor 2026-07-13): o cadastro deixou de coletar PREÇO de
// percurso — preços/lotes ficam na aba Modalidades (não no cadastro inicial). Os
// `percursos` exigidos pelo servidor (min 1, RN-200) passam a ser DERIVADOS da
// lista estruturada de modalidades no submit (preço 0 = a definir nos lotes).
// Por isso a validação de percursos saiu daqui; sobra o núcleo de identidade:
// nome, data (+horário opcional), local/endereço e ≥1 modalidade.
// =============================================================================

import { dataEventoNoFuturo } from '@leela/core';

export interface NovoEventoFormValues {
  nome: string;
  descricao: string;
  /** ISO `yyyy-mm-dd` (input date). */
  data: string;
  /** `HH:mm` (input time) — OPCIONAL. Vazio = evento sem horário definido. */
  hora: string;
  /** Endereço/local completo. */
  local: string;
  modalidades: string[];
  /**
   * Prévia da capa — OPCIONAL (CEV · RN-228). Guarda a object URL (`blob:`)
   * da prévia local do modo DEFERRED: o arquivo cropado fica em memória na
   * tela e sobe APÓS o criarEvento devolver o eventoId (as storage.rules
   * negam upload p/ evento inexistente). '' = sem capa.
   */
  capa: string;
  /**
   * Regulamento (texto longo) — OPCIONAL. Sem campo no modelo do core hoje;
   * coletado p/ fidelidade, NÃO persiste. Ver lacuna no REPORT.
   */
  regulamento: string;
  /**
   * RN-347 — repassar a taxa da plataforma ao comprador? `false` (padrão) =
   * taxa INCORPORADA (o comprador paga o preço de face; a taxa sai do repasse);
   * `true` = REPASSADA (o comprador paga face + taxa). No submit vira
   * `taxaModo: 'incorporada' | 'repassada'` (o servidor persiste — RN-347).
   */
  repassarTaxa: boolean;
}

export type CampoNovoEvento = 'nome' | 'data' | 'local' | 'modalidades';

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
    erros.local = 'Informe o endereço ou local do evento.';
  }
  if (values.data.trim().length === 0) {
    erros.data = 'Informe a data do evento.';
  } else if (!dataEventoNoFuturo(values.data, hoje)) {
    erros.data = 'A data do evento deve ser hoje ou no futuro.';
  }
  if (values.modalidades.length === 0) {
    erros.modalidades = 'Adicione ao menos uma modalidade.';
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

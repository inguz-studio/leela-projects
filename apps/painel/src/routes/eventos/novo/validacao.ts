// =============================================================================
// Validação pura do formulário "Novo evento" (S201-T1).
//
// Fica no painel (não em packages/core) porque core é superfície dos lotes
// Fable (L1/L2). Se a validação for reusada pelo servidor, promover a
// `packages/core/src/eventos/validacao.ts` no lote de dados — ver SUMMARY.
//
// Aqui só o que o aceite exige: campo obrigatório vazio → erro inline, sem
// submit. Preço apenas "numérico" (o negativo do "Sem kit" é validado em S205).
// =============================================================================

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

function dataNoFuturo(iso: string, hoje: Date): boolean {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return d.getTime() >= inicioHoje.getTime();
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
  } else if (!dataNoFuturo(values.data, hoje)) {
    erros.data = 'A data do evento deve ser hoje ou no futuro.';
  }
  if (values.modalidades.length === 0) {
    erros.modalidades = 'Adicione ao menos uma modalidade.';
  }

  const percursoInvalido = values.percursos.some((p) => {
    if (p.nome.trim().length === 0) return true;
    const preco = Number(p.preco);
    return p.preco.trim().length === 0 || Number.isNaN(preco);
  });
  if (values.percursos.length === 0) {
    erros.percursos = 'Adicione ao menos um percurso com preço.';
  } else if (percursoInvalido) {
    erros.percursos = 'Cada percurso precisa de nome e preço numérico.';
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

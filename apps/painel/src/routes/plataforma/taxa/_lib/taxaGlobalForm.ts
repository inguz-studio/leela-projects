// =============================================================================
// taxaGlobalForm — lógica PURA do form da tabela global de taxa (TAXAFLEX ·
// RN-178 · S1606). Sem React/Firebase — testável isolada (padrão _lib).
//
// Review antagonista F1 (BLOQUEADOR pago aqui): `Number('') === 0` — campo
// VAZIO convertido às cegas viraria linha `{0, 0}` VÁLIDA na tabela e
// zeraria a taxa de TODOS os tenants em silêncio, congelada venda a venda
// (RN-179, irrecuperável). Regras:
//   1. as 3 linhas exigem os DOIS campos preenchidos — zero é EXPLÍCITO
//      (digitado), nunca implícito por omissão;
//   2. meio ATIVO no checkout (pix/cartao) com 0% + R$ 0 exige confirmação
//      marcada (a plataforma deixaria de cobrar nessas vendas).
// =============================================================================

import {
  MEIOS_TAXA,
  type MeioTaxa,
  type TabelaTaxaPlataforma,
} from '@leela/core';

export const ROTULO_MEIO: Record<MeioTaxa, string> = {
  pix: 'PIX',
  cartao: 'Cartão de crédito',
  boleto: 'Boleto (inativo no checkout)',
};

/** Par de campos de UMA linha (strings do form). */
export interface LinhaForm {
  percentual: string;
  fixoReais: string;
}
export type FormTabela = Record<MeioTaxa, LinhaForm>;

export const LINHA_VAZIA: LinhaForm = { percentual: '', fixoReais: '' };

/** Tabela persistida → form (fixo em R$ com 2 casas). @pure */
export function toForm(tabela: TabelaTaxaPlataforma | null): FormTabela {
  const linha = (meio: MeioTaxa): LinhaForm =>
    tabela
      ? {
          percentual: String(tabela[meio].percentual),
          fixoReais: (tabela[meio].fixoCentavos / 100).toFixed(2),
        }
      : LINHA_VAZIA;
  return { pix: linha('pix'), cartao: linha('cartao'), boleto: linha('boleto') };
}

/** Form → tabela (SÓ chamar depois de `errosDeFormularioGlobal` vazio). @pure */
export function toTabela(form: FormTabela): TabelaTaxaPlataforma {
  const linha = (meio: MeioTaxa) => ({
    percentual: Number(form[meio].percentual),
    fixoCentavos: Math.round(Number(form[meio].fixoReais) * 100),
  });
  return { pix: linha('pix'), cartao: linha('cartao'), boleto: linha('boleto') };
}

/** Algum meio ATIVO (pix/cartao) preenchido explicitamente com 0% + R$ 0? @pure */
export function temZeroAtivoExplicito(form: FormTabela): boolean {
  return (['pix', 'cartao'] as MeioTaxa[]).some(
    (m) =>
      form[m].percentual.trim() !== '' &&
      form[m].fixoReais.trim() !== '' &&
      Number(form[m].percentual) === 0 &&
      Number(form[m].fixoReais) === 0
  );
}

/**
 * Guardas de FORMULÁRIO antes da conversão numérica (F1). Vazia = válido
 * NUNCA: a global exige as 3 linhas explícitas. Zero em meio ativo exige
 * `confirmaZero`. Retorna lista de erros (vazia = pode converter/salvar).
 * @pure
 */
export function errosDeFormularioGlobal(
  form: FormTabela,
  confirmaZero: boolean
): string[] {
  const erros: string[] = [];
  for (const meio of MEIOS_TAXA) {
    const l = form[meio];
    if (l.percentual.trim() === '' || l.fixoReais.trim() === '') {
      erros.push(
        `${ROTULO_MEIO[meio]}: preencha percentual E fixo por venda — a tabela global exige as 3 linhas explícitas (digite 0 se a intenção for isentar).`
      );
    }
  }
  if (erros.length > 0) return erros;
  if (temZeroAtivoExplicito(form) && !confirmaZero) {
    const zerados = (['pix', 'cartao'] as MeioTaxa[]).filter(
      (m) => Number(form[m].percentual) === 0 && Number(form[m].fixoReais) === 0
    );
    erros.push(
      `Taxa ZERO em ${zerados.map((m) => ROTULO_MEIO[m]).join(' e ')}: a plataforma não cobrará NADA nessas vendas (e cada venda congela o zero). Marque a confirmação para salvar assim mesmo.`
    );
  }
  return erros;
}

// =============================================================================
// Exportação CSV da seleção de inscritos (barra de ação em massa · JTBD S203:
// "gerenciar a operação"). Puro e testável — a tela cuida do download (Blob).
//
// Campos = os visíveis na tabela densa + chip (operação de balcão). Sem `valor`
// nem `email`: não existem no modelo `Inscrito` (functions/src read-only) — não
// inventamos dado. Escapamos aspas/;/quebra por RFC 4180 (aspas duplas).
// =============================================================================

import type { Inscrito } from '@leela/core';
import { kitInscritoLabel } from './kitLabels';
import { statusInscritoBadge } from './statusInscrito';
import { formatDataCurta } from './format';

const CABECALHO = ['Nome', 'Modalidade', 'Kit', 'Status', 'Chip', 'Inscrito em'] as const;

// Neutralização de injeção de fórmula (CSV/DDE): nome e modalidade são texto
// livre de inscrição pública. Um valor iniciando por = + - @ (ou TAB/CR, que o
// Excel/Sheets tolera antes do gatilho) é avaliado como fórmula ao abrir o CSV.
// Prefixamos apóstrofo para forçar interpretação literal. OWASP CSV Injection.
const PERIGO_FORMULA = /^[=+\-@\t\r]/;

/** Prefixa apóstrofo em campos que o Excel/Sheets avaliaria como fórmula. */
function neutralizarFormula(campo: string): string {
  return PERIGO_FORMULA.test(campo) ? `'${campo}` : campo;
}

/** Escapa um campo CSV (RFC 4180): envolve em aspas e duplica aspas internas. */
function escapar(campo: string): string {
  if (/[";\n\r]/.test(campo)) return `"${campo.replace(/"/g, '""')}"`;
  return campo;
}

/** Sanitiza uma célula: neutraliza fórmula e então escapa por RFC 4180. */
function celula(valor: unknown): string {
  return escapar(neutralizarFormula(String(valor)));
}

/** Monta o CSV (separador `;`, padrão pt-BR/Excel) de uma lista de inscritos. @pure */
export function montarCsvInscritos(inscritos: readonly Inscrito[]): string {
  const linhas = [CABECALHO.join(';')];
  for (const i of inscritos) {
    linhas.push(
      [
        i.atletaNome,
        i.modalidade || '—',
        kitInscritoLabel(i.kit),
        statusInscritoBadge(i.status).label,
        i.chipNumero ?? '—',
        formatDataCurta(i.criadoEm),
      ]
        .map((c) => celula(c))
        .join(';'),
    );
  }
  return linhas.join('\r\n');
}

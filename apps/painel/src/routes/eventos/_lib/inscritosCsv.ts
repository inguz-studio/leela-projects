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

/** Escapa um campo CSV (RFC 4180): envolve em aspas e duplica aspas internas. */
function escapar(campo: string): string {
  if (/[";\n\r]/.test(campo)) return `"${campo.replace(/"/g, '""')}"`;
  return campo;
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
        .map((c) => escapar(String(c)))
        .join(';'),
    );
  }
  return linhas.join('\r\n');
}

// =============================================================================
// Exportação CSV da seleção de inscritos (barra de ação em massa · JTBD S203:
// "gerenciar a operação"). Puro e testável — a tela cuida do download (Blob).
//
// Campos = os visíveis na tabela densa + chip (operação de balcão). Sem `valor`
// nem `email`: não existem no modelo `Inscrito` (functions/src read-only) — não
// inventamos dado. Sanitização (RFC 4180 + anti-injeção) vem de `./csv` (fonte
// única, partilhada com o financeiro S207).
// =============================================================================

import type { Inscrito } from '@leela/core';
import { kitInscritoLabel } from './kitLabels';
import { statusInscritoBadge } from './statusInscrito';
import { formatDataCurta } from './format';
import { celulaCsv } from './csv';

const CABECALHO = ['Nome', 'Modalidade', 'Kit', 'Status', 'Chip', 'Inscrito em'] as const;

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
        .map((c) => celulaCsv(c))
        .join(';'),
    );
  }
  return linhas.join('\r\n');
}

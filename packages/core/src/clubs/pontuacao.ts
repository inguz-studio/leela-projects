// =============================================================================
// packages/core/src/clubs/pontuacao.ts
//
// Motor de pontuação de desafios (LEELA-E05 · S106-T1). Funções PURAS —
// sem I/O; consumidas pelo editor de desafio (resumo/preview ao vivo, C16)
// e pelas Functions de agregado de progresso (E13 — registros de ação).
//
// RN-115 — 2 bônus de pontuação, ACUMULÁVEIS:
//   +20% — dia com registro nos 3 pilares (aplicado aos pontos DO DIA);
//   +10% — semana com registro em 5+ dias distintos (aplicado ao total DA
//          SEMANA, depois do bônus diário).
//   Dia com 3 pilares dentro de semana 5+ dias: fator 1.2 × 1.1 = 1.32.
//
// Convenções de calendário (determinísticas, testáveis):
//   - "dia" = data-calendário UTC (YYYY-MM-DD do instante do registro);
//   - "semana" = semana ISO-8601 (segunda→domingo), em UTC.
// Registros vêm do app com o dia local já resolvido; o motor não aplica
// fuso — quem chama decide o instante canônico do registro.
// =============================================================================

import type { Pilar } from './catalogo-acoes';
import { PILARES } from './catalogo-acoes';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Registro de ação executada por um membro dentro de um desafio. */
export interface RegistroAcao {
  /** Id da ação no catálogo global (informativo para breakdown) */
  acaoId: string;
  pilar: Pilar;
  /** Pontos ganhos a cada `unidadeBase` unidades (do catálogo) */
  pontosBase: number;
  /** Quantidade de `unidade` que rende `pontosBase` pontos (do catálogo) */
  unidadeBase: number;
  /** Quantidade registrada, na unidade do catálogo */
  quantidade: number;
  /** Instante do registro (dia UTC define agrupamento de bônus) */
  data: Date;
}

/** Resultado detalhado do cálculo — alimenta resumo ao vivo e agregados. */
export interface ResultadoPontuacao {
  /** Total com bônus aplicados */
  total: number;
  /** Total sem nenhum bônus */
  base: number;
  /** Pontos por pilar (com bônus, proporcional ao dia/semana) */
  porPilar: Record<Pilar, number>;
  /** Dias (YYYY-MM-DD) que ganharam +20% (3 pilares no dia) */
  diasComBonus20: string[];
  /** Semanas ISO (YYYY-Www) que ganharam +10% (5+ dias na semana) */
  semanasComBonus10: string[];
}

/** Bônus diário: 3 pilares no mesmo dia (RN-115) */
export const BONUS_3_PILARES_DIA = 0.2;

/** Bônus semanal: 5+ dias com registro na semana (RN-115) */
export const BONUS_5_DIAS_SEMANA = 0.1;

/** Nº mínimo de dias distintos na semana para o bônus semanal */
export const DIAS_MINIMOS_BONUS_SEMANA = 5;

// ---------------------------------------------------------------------------
// Calendário (UTC, determinístico)
// ---------------------------------------------------------------------------

/** Chave de dia-calendário UTC: YYYY-MM-DD */
export function chaveDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * Chave de semana ISO-8601 (YYYY-Www) em UTC — segunda é o 1º dia.
 * Algoritmo clássico: a quinta-feira da semana define o ano ISO.
 */
export function chaveSemanaIso(data: Date): string {
  const d = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
  );
  // getUTCDay(): 0=domingo…6=sábado → ISO: 1=segunda…7=domingo
  const diaIso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  // Move para a quinta-feira da mesma semana ISO
  d.setUTCDate(d.getUTCDate() + 4 - diaIso);
  const anoIso = d.getUTCFullYear();
  const inicioAno = new Date(Date.UTC(anoIso, 0, 1));
  const semana = Math.ceil(
    ((d.getTime() - inicioAno.getTime()) / 86_400_000 + 1) / 7
  );
  return `${anoIso}-W${String(semana).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/** Pontos crus de um registro: pontosBase × (quantidade / unidadeBase). */
export function pontosDoRegistro(registro: RegistroAcao): number {
  if (registro.unidadeBase <= 0 || registro.pontosBase <= 0) return 0;
  if (registro.quantidade <= 0) return 0;
  return registro.pontosBase * (registro.quantidade / registro.unidadeBase);
}

interface AcumuladoDia {
  pontos: number;
  porPilar: Partial<Record<Pilar, number>>;
  pilares: Set<Pilar>;
  semana: string;
}

/**
 * Calcula o total de pontos de um conjunto de registros aplicando os 2
 * bônus da RN-115 (acumuláveis). Pura e determinística.
 */
export function calcularPontos(
  registros: readonly RegistroAcao[]
): ResultadoPontuacao {
  const porDia = new Map<string, AcumuladoDia>();
  let base = 0;

  for (const registro of registros) {
    const pontos = pontosDoRegistro(registro);
    if (pontos === 0) continue;
    base += pontos;

    const dia = chaveDia(registro.data);
    let acc = porDia.get(dia);
    if (!acc) {
      acc = {
        pontos: 0,
        porPilar: {},
        pilares: new Set<Pilar>(),
        semana: chaveSemanaIso(registro.data),
      };
      porDia.set(dia, acc);
    }
    acc.pontos += pontos;
    acc.porPilar[registro.pilar] =
      (acc.porPilar[registro.pilar] ?? 0) + pontos;
    acc.pilares.add(registro.pilar);
  }

  // Bônus diário (+20% se 3 pilares no dia) — aplicado aos pontos do dia
  const diasComBonus20: string[] = [];
  const diasPorSemana = new Map<string, number>();
  for (const [dia, acc] of porDia) {
    if (acc.pilares.size === PILARES.length) {
      diasComBonus20.push(dia);
      const fator = 1 + BONUS_3_PILARES_DIA;
      acc.pontos *= fator;
      for (const pilar of Object.keys(acc.porPilar) as Pilar[]) {
        acc.porPilar[pilar] = (acc.porPilar[pilar] ?? 0) * fator;
      }
    }
    diasPorSemana.set(acc.semana, (diasPorSemana.get(acc.semana) ?? 0) + 1);
  }

  // Bônus semanal (+10% se 5+ dias na semana) — sobre o total da semana,
  // DEPOIS do bônus diário (acumulável: 1.2 × 1.1)
  const semanasComBonus10 = [...diasPorSemana.entries()]
    .filter(([, dias]) => dias >= DIAS_MINIMOS_BONUS_SEMANA)
    .map(([semana]) => semana)
    .sort();
  const semanasBonus = new Set(semanasComBonus10);

  let total = 0;
  const porPilar: Record<Pilar, number> = {
    fisico: 0,
    mental: 0,
    espiritual: 0,
  };
  for (const acc of porDia.values()) {
    const fatorSemana = semanasBonus.has(acc.semana)
      ? 1 + BONUS_5_DIAS_SEMANA
      : 1;
    total += acc.pontos * fatorSemana;
    for (const pilar of Object.keys(acc.porPilar) as Pilar[]) {
      porPilar[pilar] += (acc.porPilar[pilar] ?? 0) * fatorSemana;
    }
  }

  return {
    total,
    base,
    porPilar,
    diasComBonus20: diasComBonus20.sort(),
    semanasComBonus10,
  };
}

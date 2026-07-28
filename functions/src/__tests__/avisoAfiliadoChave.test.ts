/**
 * avisoAfiliadoChave.test.ts — LEELA-E08-REV (review antagonista da E08-REPASSE)
 *
 * A CHAVE do aviso ao afiliado (RN-386). A spec pedia `repasse_{repasseId}` e
 * `marco_{faixa}`; nenhuma das duas é gravável, porque `CHAVE_LOG_COMUNICACAO_RE`
 * proíbe `_` (o separador do docId `{ref}_{chave}_{canal}`) e limita a 64
 * caracteres, enquanto `REPASSE_ID_RE` aceita `_` e até 64. Este arquivo é a
 * TRAVA que impede alguém de reintroduzir a chave impossível — e a prova de
 * que o digest que a substituiu não colapsa dois repasses distintos.
 *
 * (A spec foi corrigida na mesma review; ver RN-386 no épico E08.)
 */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  CHAVE_LOG_COMUNICACAO_RE,
  REPASSE_ID_RE,
  chaveAvisoMarco,
  faixaCruzada,
  logComunicacaoDocId,
} from '@leela/core';
import { chaveAvisoRepasse } from '../affiliation/avisoAfiliado';

describe('a chave da spec era mesmo impossível', () => {
  const idComUnderscore = 'a_b_c_12345678';

  it('o repasseId com "_" é LEGAL para o repasse', () => {
    expect(REPASSE_ID_RE.test(idComUnderscore)).toBe(true);
  });

  it('mas `repasse_{repasseId}` é REJEITADO pelo docId do log', () => {
    expect(() =>
      logComunicacaoDocId('AFIL1', `repasse_${idComUnderscore}`, 'email')
    ).toThrow(/inválida/);
  });

  it('e `repasse-{repasseId}` estoura o teto de 64 num repasseId longo', () => {
    const longo = 'x'.repeat(64);
    expect(REPASSE_ID_RE.test(longo)).toBe(true);
    expect(`repasse-${longo}`.length).toBeGreaterThan(64);
    expect(() => logComunicacaoDocId('AFIL1', `repasse-${longo}`, 'email')).toThrow();
  });

  it('sanear "_"→"-" COLAPSARIA dois repasses distintos na mesma chave', () => {
    const sanear = (s: string): string => `repasse-${s.replace(/_/g, '-')}`;
    expect(sanear('a_b12345')).toBe(sanear('a-b12345')); // colisão
    // O digest NÃO colapsa — é por isso que ele existe.
    expect(chaveAvisoRepasse('a_b12345')).not.toBe(chaveAvisoRepasse('a-b12345'));
  });
});

describe('chaveAvisoRepasse — determinística, sempre válida, injetiva na prática', () => {
  it('mesma entrada → mesma chave (o suporte deriva, não adivinha)', () => {
    const id = randomUUID();
    expect(chaveAvisoRepasse(id)).toBe(chaveAvisoRepasse(id));
  });

  it('toda chave gerada cabe no formato do log e no docId', () => {
    for (let i = 0; i < 200; i += 1) {
      const chave = chaveAvisoRepasse(randomUUID());
      expect(chave).toMatch(CHAVE_LOG_COMUNICACAO_RE);
      expect(chave.length).toBe(40);
      expect(() => logComunicacaoDocId('AFIL1', chave, 'email')).not.toThrow();
    }
  });

  it('5.000 repasseIds distintos → 5.000 chaves distintas (zero colisão)', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 5_000; i += 1) vistas.add(chaveAvisoRepasse(randomUUID()));
    expect(vistas.size).toBe(5_000);
  });

  it('ids vizinhos de um caractere geram chaves totalmente distintas', () => {
    expect(chaveAvisoRepasse('rep-000001')).not.toBe(chaveAvisoRepasse('rep-000002'));
  });

  it('repasseId vazio falha alto (nunca gera chave silenciosa)', () => {
    expect(() => chaveAvisoRepasse('')).toThrow(/vazio/);
  });
});

describe('chaveAvisoMarco — a mesma faixa devolve a MESMA chave em todo recruzamento', () => {
  it('subir, cair por estorno e subir de novo não muda a chave', () => {
    // 90→130 avisa 100; estorno leva a 80; volta a 110; cai a 70; volta a 105.
    const trilha: [number, number][] = [
      [90, 130],
      [80, 110],
      [70, 105],
      [0, 100],
    ];
    const chaves = trilha.map(([antes, depois]) => {
      const faixa = faixaCruzada(antes, depois);
      expect(faixa).toBe(100);
      return chaveAvisoMarco(faixa as number);
    });
    expect(new Set(chaves).size).toBe(1);
    expect(chaves[0]).toBe('marco-100');
  });

  it('faixas distintas geram chaves distintas — o marco NOVO ainda avisa', () => {
    expect(chaveAvisoMarco(faixaCruzada(80, 250) as number)).toBe('marco-200');
    expect(chaveAvisoMarco(faixaCruzada(0, 50) as number)).toBe('marco-primeira');
  });
});

import { describe, it, expect } from 'vitest';
import { montarCsvInscritos } from '../inscritosCsv';
import { mkInscrito } from '../../_test/fixtures';

describe('montarCsvInscritos', () => {
  it('gera cabeçalho + uma linha por inscrito', () => {
    const csv = montarCsvInscritos([
      mkInscrito({ id: '1', atletaNome: 'Marina Silva', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado' }),
    ]);
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('Nome;Modalidade;Kit;Status;Chip;Inscrito em');
    expect(linhas[1]).toContain('Marina Silva');
    expect(linhas[1]).toContain('Kit Ouro');
    expect(linhas[1]).toContain('21k');
    expect(linhas[1]).toContain('Confirmado');
  });

  it('escapa campos com separador/aspas (RFC 4180)', () => {
    const csv = montarCsvInscritos([
      mkInscrito({ id: '2', atletaNome: 'Silva; "Jr"', modalidade: '10k' }),
    ]);
    expect(csv).toContain('"Silva; ""Jr"""');
  });

  it('chip vazio vira travessão', () => {
    const csv = montarCsvInscritos([mkInscrito({ id: '3', atletaNome: 'Ana', chipNumero: null })]);
    expect(csv.split('\r\n')[1]).toContain(';—;');
  });

  describe('injeção de fórmula (CSV/DDE)', () => {
    /** Primeira célula (Nome) da linha de dados do CSV. */
    const primeiraCelula = (csv: string): string =>
      (csv.split('\r\n')[1] ?? '').split(';')[0] ?? '';

    // Cada nome inicia por gatilho de fórmula (= + - @ TAB) → deve sair com
    // apóstrofo à frente para o Excel/Sheets tratar como texto literal.
    it.each([
      ['=1+1', "'=1+1"],
      ['@SUM(A1)', "'@SUM(A1)"],
      ['-2+3', "'-2+3"],
      ['+cmd', "'+cmd"],
      ['\tinjetado', "'\tinjetado"],
    ])('neutraliza nome perigoso %j', (nome, esperado) => {
      const csv = montarCsvInscritos([mkInscrito({ id: 'x', atletaNome: nome })]);
      const nomeExportado = primeiraCelula(csv);
      // valor bruto (ou envolto por aspas RFC) mantém o apóstrofo de neutralização
      expect(nomeExportado.replace(/^"|"$/g, '')).toBe(esperado);
    });

    it('neutraliza também a modalidade (texto livre público)', () => {
      const csv = montarCsvInscritos([
        mkInscrito({ id: 'm', atletaNome: 'Ana', modalidade: '=HYPERLINK("http://evil","x")' }),
      ]);
      expect(csv.split('\r\n')[1]).toContain("'=HYPERLINK");
    });

    it('nome normal NÃO recebe apóstrofo', () => {
      const csv = montarCsvInscritos([mkInscrito({ id: 'n', atletaNome: 'Ana Lima' })]);
      expect(primeiraCelula(csv)).toBe('Ana Lima');
    });

    it('neutralização acontece ANTES do escaping RFC (aspas duplicadas)', () => {
      // Nome com gatilho + aspa: apóstrofo entra e a aspa é escapada por RFC.
      const csv = montarCsvInscritos([mkInscrito({ id: 'r', atletaNome: '=1;"x"' })]);
      expect(csv).toContain('"\'=1;""x"""');
    });
  });
});

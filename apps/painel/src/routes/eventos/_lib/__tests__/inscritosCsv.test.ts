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
});

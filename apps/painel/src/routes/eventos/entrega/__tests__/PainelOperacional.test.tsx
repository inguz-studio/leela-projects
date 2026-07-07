import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PainelOperacional } from '../PainelOperacional';
import { mkInscrito, ts } from '../../_test/fixtures';

const AGORA = new Date();
const h = (n: number) => ts(new Date(AGORA.getTime() - n * 3600_000));

describe('PainelOperacional', () => {
  it('mostra progressos de kit/chip e cards do painel', () => {
    const pool = [
      mkInscrito({ id: '1', kit: 'kit_ouro', chipNumero: 'C1', kitEntregueEm: h(0.5), checkinEm: h(0.5) }),
      mkInscrito({ id: '2', kit: 'kit_prata', chipNumero: null }),
    ];
    render(<PainelOperacional inscritos={pool} ultimosAtendidos={[]} usaChip />);
    expect(screen.getByText('Kits entregues')).toBeInTheDocument();
    expect(screen.getByText('Chips vinculados')).toBeInTheDocument();
    expect(screen.getByText('Ritmo')).toBeInTheDocument();
    expect(screen.getByText('Ações rápidas')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cadastrar atleta presencialmente' }),
    ).toBeInTheDocument();
  });

  it('alerta de chip órfão: retirou kit mas não vinculou chip (RN-207)', () => {
    const pool = [
      mkInscrito({ id: '1', kit: 'kit_ouro', chipNumero: null, kitEntregueEm: h(0.2), checkinEm: h(0.2) }),
    ];
    render(<PainelOperacional inscritos={pool} ultimosAtendidos={[]} usaChip />);
    const alertas = screen.getByLabelText('Alertas do balcão');
    expect(within(alertas).getByText('Chips')).toBeInTheDocument();
    expect(within(alertas).getByText('Marina Silva', { exact: false })).toBeInTheDocument();
  });

  it('sem pendências → mensagem honesta', () => {
    const pool = [
      mkInscrito({ id: '1', kit: 'kit_ouro', chipNumero: 'C1', kitEntregueEm: h(0.2), checkinEm: h(0.2) }),
    ];
    render(<PainelOperacional inscritos={pool} ultimosAtendidos={[]} usaChip />);
    expect(screen.getByText('Sem pendências no balcão.')).toBeInTheDocument();
  });
});

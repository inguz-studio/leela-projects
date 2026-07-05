import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TermsEditor } from '../TermsEditor';
import { mkTerms } from '../../../_test/fixtures';

const baseProps = {
  loading: false,
  error: null,
  readOnly: false,
  saving: false,
  saveError: null,
  onSave: () => {},
  onVoltar: () => {},
};

describe('TermsEditor', () => {
  it('skeleton no load', () => {
    render(<TermsEditor {...baseProps} terms={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando termos' })).toBeInTheDocument();
  });

  it('platform_admin salva platformFeePct=10.5 → onSave com o input', async () => {
    const onSave = vi.fn();
    render(<TermsEditor {...baseProps} terms={mkTerms({ platformFeePct: 10.5 })} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar termos' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ platformFeePct: 10.5 }));
  });

  it('tenant_owner (readOnly) → sem botão salvar + nota RN-404', () => {
    render(<TermsEditor {...baseProps} terms={mkTerms()} readOnly />);
    expect(screen.queryByRole('button', { name: /Salvar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Somente leitura/)).toBeInTheDocument();
  });

  it('readOnly (RN-404) → TODOS os inputs/controles do form ficam disabled', () => {
    render(<TermsEditor {...baseProps} terms={mkTerms()} readOnly />);
    const form = screen.getByRole('form', { name: 'Termos comerciais' });

    // Inputs numéricos da economia do tenant (taxa, SaaS, parcelamento):
    // nenhum editável quando o tenant_owner só visualiza (RN-404).
    const numeric = within(form).getAllByRole('spinbutton');
    expect(numeric).toHaveLength(5);
    numeric.forEach((el) => expect(el).toBeDisabled());

    // Checkboxes (mensalidade da comunidade + antecipação pós-V1) idem.
    const checkboxes = within(form).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((el) => expect(el).toBeDisabled());
  });

  it('saasMonthlyFee=0 → aviso de isenção (RN-405)', () => {
    render(<TermsEditor {...baseProps} terms={mkTerms({ saasMonthlyFee: 0 })} />);
    expect(screen.getByText('Produtor isento de mensalidade SaaS.')).toBeInTheDocument();
  });

  it('antecipação como campo com badge "disponível em breve" (RN-410)', () => {
    render(<TermsEditor {...baseProps} terms={mkTerms()} />);
    expect(screen.getByText('disponível em breve')).toBeInTheDocument();
    expect(screen.getByText('Antecipação de recebíveis')).toBeInTheDocument();
  });

  it('mostra a versão vigente no header', () => {
    render(<TermsEditor {...baseProps} terms={mkTerms({ versao: 3 })} />);
    expect(screen.getByText('Versão 3')).toBeInTheDocument();
  });

  it('input inválido → erros inline, sem onSave', async () => {
    const onSave = vi.fn();
    render(<TermsEditor {...baseProps} terms={mkTerms({ platformFeePct: 10.5 })} onSave={onSave} />);
    const fee = screen.getByLabelText('Taxa da plataforma (%)');
    await userEvent.clear(fee);
    await userEvent.type(fee, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar termos' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

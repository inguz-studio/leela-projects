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

    // Inputs numéricos da economia do tenant (taxa, SaaS, parcelamento +
    // 6 do override de taxa por meio — TAXAFLEX/RN-178): nenhum editável
    // quando o tenant_owner só visualiza (RN-404).
    const numeric = within(form).getAllByRole('spinbutton');
    expect(numeric).toHaveLength(11);
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
    const fee = screen.getByLabelText('Serviço (%)');
    await userEvent.clear(fee);
    await userEvent.type(fee, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar termos' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // ── TAXAFLEX (RN-178 · S1606) — override de taxa por meio no termo ───────
  it('override preenchido (PIX 5% + R$2,00) → onSave com taxaTabela em centavos', async () => {
    const onSave = vi.fn();
    render(<TermsEditor {...baseProps} terms={mkTerms()} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText('PIX — percentual (%)'), '5');
    await userEvent.type(screen.getByLabelText('PIX — fixo por venda (R$)'), '2.00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar termos' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        taxaTabela: { pix: { percentual: 5, fixoCentavos: 200 } },
      })
    );
  });

  it('linhas vazias → onSave SEM taxaTabela (herda a tabela global)', async () => {
    const onSave = vi.fn();
    render(<TermsEditor {...baseProps} terms={mkTerms()} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar termos' }));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0]?.[0]).not.toHaveProperty('taxaTabela');
  });

  it('linha MEIO-preenchida → erro explícito, sem onSave (par incompleto nunca grava)', async () => {
    const onSave = vi.fn();
    render(<TermsEditor {...baseProps} terms={mkTerms()} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText('Cartão — percentual (%)'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar termos' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/percentual E valor fixo/);
  });

  it('salvar PRESERVA opcionais que o form não edita (fix footgun: save apagava campos)', async () => {
    const onSave = vi.fn();
    render(
      <TermsEditor
        {...baseProps}
        terms={mkTerms({
          retencaoRepassePct: 20,
          modoTaxaDefault: 'repassada',
          taxaPorMetodo: { credit_card: 10, pix: 8 },
        })}
        onSave={onSave}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar termos' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        retencaoRepassePct: 20,
        modoTaxaDefault: 'repassada',
        taxaPorMetodo: { credit_card: 10, pix: 8 },
      })
    );
  });

  it('override existente no termo aparece pré-preenchido (fixo em R$)', () => {
    render(
      <TermsEditor
        {...baseProps}
        terms={mkTerms({ taxaTabela: { cartao: { percentual: 7, fixoCentavos: 150 } } })}
      />
    );
    expect(screen.getByLabelText('Cartão — percentual (%)')).toHaveValue(7);
    expect(screen.getByLabelText('Cartão — fixo por venda (R$)')).toHaveValue(1.5);
    expect(screen.getByLabelText('PIX — percentual (%)')).toHaveValue(null);
  });
});

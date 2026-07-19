// =============================================================================
// AfiliadoModal — testes de componente (R9-E · S-R9-11-T4 · RN-317).
// Form por tipo (clube × PF), gate de validade do submit e ramo do token
// (sem EmailProvider o organizador recebe o link de aceite).
// =============================================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AfiliadoModal } from '../AfiliadoModal';

function renderModal(over: Record<string, unknown> = {}) {
  return render(
    <AfiliadoModal
      open
      onOpenChange={() => {}}
      eventoId="meia-floripa"
      afiliado={null}
      onSalvar={vi.fn().mockResolvedValue({
        afiliadoId: 'DIONEY10',
        refCodigo: 'DIONEY10',
        status: 'ativo',
        jaExistia: false,
      })}
      {...over}
    />,
  );
}

describe('AfiliadoModal (RN-317)', () => {
  it('PF exige e-mail; campos trocam com o tipo', async () => {
    renderModal();
    // default = pessoa física: e-mail visível, clube não
    expect(screen.getByLabelText('E-mail do convite')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Clube vinculado/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clube' }));
    expect(screen.queryByLabelText('E-mail do convite')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Clube vinculado/)).toBeInTheDocument();
  });

  it('submit desabilitado até válido; salva PF com e-mail', async () => {
    const onSalvar = vi.fn().mockResolvedValue({
      afiliadoId: 'X', refCodigo: 'X', status: 'convite_pendente', jaExistia: false,
    });
    renderModal({ onSalvar });
    const enviar = screen.getByRole('button', { name: 'Criar afiliado' });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Nome'), 'Dioney Galharte');
    expect(enviar).toBeDisabled(); // PF ainda sem e-mail
    await userEvent.type(screen.getByLabelText('E-mail do convite'), 'dioney@exemplo.com');
    expect(enviar).toBeEnabled();
    await userEvent.click(enviar);
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'pessoa_fisica',
        nome: 'Dioney Galharte',
        responsavelEmail: 'dioney@exemplo.com',
        janelaAtribuicaoDias: 7,
        minimoInscricoes: null,
      }),
    );
  });

  it('tokenAceite devolvido (sem EmailProvider) vira link de aceite p/ o organizador', async () => {
    const onSalvar = vi.fn().mockResolvedValue({
      afiliadoId: 'DIONEY10',
      refCodigo: 'DIONEY10',
      status: 'convite_pendente',
      jaExistia: false,
      tokenAceite: 'a'.repeat(64),
    });
    renderModal({ onSalvar });
    await userEvent.type(screen.getByLabelText('Nome'), 'Dioney');
    await userEvent.type(
      screen.getByLabelText('Código do link (opcional — gerado se vazio)'),
      'DIONEY10',
    );
    await userEvent.type(screen.getByLabelText('E-mail do convite'), 'dioney@exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Criar afiliado' }));
    expect(await screen.findByText(/entrega o link de aceite/)).toBeInTheDocument();
    expect(screen.getByText(/convite\/afiliado\?e=meia-floripa&a=DIONEY10&t=a{10}/)).toBeInTheDocument();
  });

  it('mínimo de inscrições inválido (0) trava o submit (RN-315)', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Clube' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Floripa Run');
    const enviar = screen.getByRole('button', { name: 'Criar afiliado' });
    expect(enviar).toBeEnabled();
    await userEvent.type(screen.getByLabelText(/Mínimo p\/ desconto/), '0');
    expect(enviar).toBeDisabled();
  });

  it('comissão percentual: valor fora de 0,01..100 trava; válido entra no payload (FASE 2)', async () => {
    const onSalvar = vi.fn().mockResolvedValue({
      afiliadoId: 'X', refCodigo: 'X', status: 'convite_pendente', jaExistia: false,
    });
    renderModal({ onSalvar });
    await userEvent.type(screen.getByLabelText('Nome'), 'Dioney Galharte');
    await userEvent.type(screen.getByLabelText('E-mail do convite'), 'dioney@exemplo.com');
    const enviar = screen.getByRole('button', { name: 'Criar afiliado' });
    expect(enviar).toBeEnabled();
    // Aviso de não-retroatividade só aparece com comissão ativa.
    await userEvent.click(screen.getByRole('button', { name: 'Percentual sobre a face' }));
    expect(screen.getByText(/só para conversões futuras/)).toBeInTheDocument();
    // Sem valor → inválido.
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Percentual/), '150');
    expect(enviar).toBeDisabled(); // > 100
    await userEvent.clear(screen.getByLabelText(/Percentual/));
    await userEvent.type(screen.getByLabelText(/Percentual/), '10');
    expect(enviar).toBeEnabled();
    await userEvent.click(enviar);
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ comissao: { tipo: 'percentual', percentual: 10 } }),
    );
  });

  it('sem comissão selecionada envia comissao=null', async () => {
    const onSalvar = vi.fn().mockResolvedValue({
      afiliadoId: 'X', refCodigo: 'X', status: 'convite_pendente', jaExistia: false,
    });
    renderModal({ onSalvar });
    await userEvent.type(screen.getByLabelText('Nome'), 'Dioney');
    await userEvent.type(screen.getByLabelText('E-mail do convite'), 'd@e.com');
    await userEvent.click(screen.getByRole('button', { name: 'Criar afiliado' }));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ comissao: null }));
  });
});

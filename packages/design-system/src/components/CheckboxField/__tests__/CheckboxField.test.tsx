// =============================================================================
// CheckboxField — o par rótulo + caixinha.
//
// O que este arquivo trava, e cada bloco vem de um fato do inventário
// 2026-08-12 §7:
//
//   - o FIAMENTO. Dezessete montagens à mão, e o dialeto que não envolve o
//     controle depende do `htmlFor`/`id` casarem. Aqui eles casam por
//     construção, e o teste clica no RÓTULO para provar.
//   - o LINK NO RÓTULO. O aceite de compra da landing precisa disso e hoje
//     resolve tirando o gatilho de dentro do `<label>`. O teste prova que o
//     link é alcançável e que ele não é o controle.
//   - a COMPOSIÇÃO. A caixinha é o `Checkbox` do DS, provado por identidade de
//     assinatura. Reinlinar o `<input type="checkbox">` quebra o teste — foi
//     essa duplicata interna que a Onda 0 achou dentro do `ConfirmModal`.
// =============================================================================

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckboxField } from '../CheckboxField';
import { Checkbox } from '../../Checkbox';

describe('CheckboxField · o fiamento do rótulo', () => {
  it('o rótulo nomeia o controle sem a tela inventar id', () => {
    render(<CheckboxField label="Receber avisos por e-mail" />);
    expect(screen.getByRole('checkbox', { name: 'Receber avisos por e-mail' })).toBeInTheDocument();
  });

  it('clicar no RÓTULO marca a caixinha', async () => {
    const onChange = vi.fn();
    render(<CheckboxField label="Receber avisos" onChange={onChange} />);
    await userEvent.click(screen.getByText('Receber avisos'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('respeita o id do consumidor quando ele existe', () => {
    render(<CheckboxField id="aceite-termos" label="Aceito" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'aceite-termos');
    expect(screen.getByText('Aceito').closest('label')).toHaveAttribute('for', 'aceite-termos');
  });

  it('dois campos na mesma tela não colidem de id', () => {
    render(
      <>
        <CheckboxField label="Primeiro" />
        <CheckboxField label="Segundo" />
      </>,
    );
    const [a, b] = screen.getAllByRole('checkbox');
    expect(a?.id).not.toBe(b?.id);
    expect(a?.id).toBeTruthy();
  });
});

describe('CheckboxField · dica e erro chegam a quem não vê', () => {
  it('a descrição entra por aria-describedby', () => {
    render(<CheckboxField label="Avisos" description="Só o resumo semanal." />);
    const controle = screen.getByRole('checkbox');
    const descrito = controle.getAttribute('aria-describedby');
    expect(descrito).toBeTruthy();
    expect(document.getElementById(descrito!)).toHaveTextContent('Só o resumo semanal.');
  });

  it('o erro liga aria-invalid e anuncia por role=alert', () => {
    render(<CheckboxField label="Aceito" errorMessage="É preciso aceitar para continuar." />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('É preciso aceitar para continuar.');
  });

  it('dica e erro juntos entram os DOIS no describedby', () => {
    render(<CheckboxField label="Aceito" description="Cancele em 7 dias." errorMessage="Falta aceitar." />);
    const ids = screen.getByRole('checkbox').getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
  });

  it('sem dica e sem erro não sobra aria-describedby vazio', () => {
    render(<CheckboxField label="Avisos" />);
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-invalid');
  });
});

describe('CheckboxField · o rótulo com link', () => {
  it('o link dentro do rótulo é alcançável e não é o controle', () => {
    render(
      <CheckboxField
        label={
          <>
            Li e aceito os <a href="#termos">termos da compra</a>.
          </>
        }
      />,
    );
    const link = screen.getByRole('link', { name: 'termos da compra' });
    expect(link).toBeInTheDocument();
    expect(link.closest('label')).not.toBeNull();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
});

describe('CheckboxField · alinhamento e estados', () => {
  // O alinhamento ao topo é o único correto quando o rótulo quebra em duas
  // linhas — o dialeto de onze telas alinha ao centro e quebra ali.
  it('alinha ao topo, sempre', () => {
    const { container } = render(<CheckboxField label="Rótulo" />);
    expect(container.firstElementChild?.className).toContain('items-start');
    expect(container.firstElementChild?.className).not.toContain('items-center');
  });

  it('desabilitado esmaece o rótulo e tira o cursor de clique', () => {
    render(<CheckboxField label="Indisponível" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    const rotulo = screen.getByText('Indisponível');
    expect(rotulo.className).toContain('cursor-not-allowed');
    expect(rotulo.className).toContain('text-[var(--text-tertiary)]');
  });

  it('o rótulo habilitado tem cursor de clique — o dialeto que só 4 das 17 tinham', () => {
    render(<CheckboxField label="Disponível" />);
    expect(screen.getByText('Disponível').className).toContain('cursor-pointer');
  });

  it('repassa indeterminate ao controle', () => {
    render(<CheckboxField label="Todos" indeterminate />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(true);
  });

  it('className é do bloco, não da caixinha', () => {
    const { container } = render(<CheckboxField label="Rótulo" className="teste-bloco" />);
    expect(container.firstElementChild).toHaveClass('teste-bloco');
    expect(screen.getByRole('checkbox').className).not.toContain('teste-bloco');
  });
});

describe('CheckboxField · composição (zero motor próprio)', () => {
  it('a caixinha é o Checkbox do DS, com a assinatura idêntica', () => {
    const { unmount } = render(<Checkbox />);
    const assinatura = screen.getByRole('checkbox').className;
    unmount();

    render(<CheckboxField label="Rótulo" />);
    expect(screen.getByRole('checkbox').className).toBe(assinatura);
  });

  it('renderiza UM controle só — nada de input cru ao lado', () => {
    const { container } = render(<CheckboxField label="Rótulo" />);
    expect(container.querySelectorAll('input')).toHaveLength(1);
    expect(container.querySelectorAll('label')).toHaveLength(1);
  });

  it('encaminha o ref para o input, não para o bloco', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<CheckboxField label="Rótulo" ref={ref} />);
    expect(ref.current?.tagName).toBe('INPUT');
    expect(ref.current?.type).toBe('checkbox');
  });
});

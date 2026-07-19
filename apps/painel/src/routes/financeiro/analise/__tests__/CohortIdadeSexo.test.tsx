// =============================================================================
// CohortIdadeSexo (RN-822 · S-R9-02) — RTL da viz do cohort idade×sexo:
// vazio / dados / linhas suprimidas (k-anonimato). A prova central de
// privacidade: valor de célula suprimida NUNCA aparece no DOM (nem em
// title/tooltip) — só o total da faixa e a declaração de retenção.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CohortIdadeSexo } from '../CohortIdadeSexo';
import type { CohortLinha } from '../_lib/demografia';

const LINHAS: CohortLinha[] = [
  {
    faixa: '25–29',
    total: 20,
    segmentos: [
      { label: 'Feminino', value: 8, colorIndex: 0 },
      { label: 'Masculino', value: 12, colorIndex: 1 },
    ],
  },
  {
    faixa: '30–34',
    total: 15,
    segmentos: [
      { label: 'Feminino', value: 7, colorIndex: 0 },
      { label: 'Masculino', value: 8, colorIndex: 1 },
    ],
  },
];

describe('CohortIdadeSexo', () => {
  it('vazio → EmptyState honesto (nada fabricado)', () => {
    render(<CohortIdadeSexo cohort={[]} temSupressao={false} />);
    expect(screen.getByText('Sem dados para o cohort')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('dados → barras por faixa + legenda + tabela acessível com valores', () => {
    render(<CohortIdadeSexo cohort={LINHAS} temSupressao={false} />);
    expect(
      screen.getByRole('img', { name: /cohort de compradores por faixa etária e sexo/i }),
    ).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: /cohort de compradores/i });
    expect(tabela).toHaveTextContent('25–29');
    expect(tabela).toHaveTextContent('Feminino: 8; Masculino: 12');
    expect(tabela).toHaveTextContent('Feminino: 7; Masculino: 8');
    // Sem supressão → sem nota de privacidade.
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('linha suprimida → total visível, detalhe retido, valor da célula NÃO vaza no DOM', () => {
    const comSuprimida: CohortLinha[] = [
      LINHAS[0]!,
      { faixa: '55–59', total: 4, segmentos: null },
    ];
    const { container } = render(
      <CohortIdadeSexo cohort={comSuprimida} temSupressao={true} />,
    );
    // Nota declara a salvaguarda com o k documentado.
    expect(screen.getByRole('note')).toHaveTextContent(/mínimo 5 por grupo/i);
    // A faixa aparece com o total e o marcador de retenção.
    expect(screen.getByTestId('cohort-suprimido-55–59')).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: /cohort de compradores/i });
    expect(tabela).toHaveTextContent('55–59');
    expect(tabela).toHaveTextContent('Detalhamento retido para proteger a privacidade');
    // Prova de não-vazamento: nenhum "Feminino/Masculino" associado à faixa
    // suprimida em lugar NENHUM do DOM (nem title de tooltip).
    expect(container.innerHTML).not.toMatch(/55–59[^<]*(Feminino|Masculino)/);
  });

  it('legenda lista só os sexos presentes nas linhas expostas', () => {
    render(
      <CohortIdadeSexo
        cohort={[
          {
            faixa: '25–29',
            total: 9,
            segmentos: [{ label: 'Feminino', value: 9, colorIndex: 0 }],
          },
        ]}
        temSupressao={false}
      />,
    );
    // "Feminino" aparece (legenda); "Masculino" não existe no DOM.
    expect(screen.getAllByText('Feminino').length).toBeGreaterThan(0);
    expect(screen.queryByText('Masculino')).not.toBeInTheDocument();
  });
});

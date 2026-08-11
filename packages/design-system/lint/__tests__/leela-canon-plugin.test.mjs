/**
 * Testes do gate `leela-canon` (S005-T5).
 *
 * O padrão da casa é que **cada caso é um vetor de reincidência real**, não um
 * exemplo inventado. Os casos inválidos saem do inventário de 2026-08-11, com o
 * arquivo de origem no comentário; os válidos saem das composições legítimas que
 * a regra não pode barrar — porque regra que dispara falso positivo é desligada
 * em duas semanas, e gate desligado é pior que gate nenhum: ele mente sobre a
 * cobertura.
 */

import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import plugin, {
  canoneDoBarrel,
  componentesDeclarados,
  controlesCrus,
  SINONIMOS_PADRAO,
} from '../leela-canon-plugin.mjs';

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  },
});

const controleCru = plugin.rules['controle-cru-fora-do-ds'];
const padraoReimplementado = plugin.rules['padrao-reimplementado-fora-do-ds'];

// ===========================================================================
// Regra 1 — um caso inválido por linha da tabela da spec §3
// ===========================================================================

describe('controle-cru-fora-do-ds · a tabela inteira, linha por linha', () => {
  it('reprova todo controle nativo com canônico publicado', () => {
    expect(() =>
      tester.run('controle-cru-fora-do-ds', controleCru, {
        valid: [],
        invalid: [
          // ProvisionTenantModal.tsx:150-158 — a instância real do inventário §3.
          { code: 'const a = <select><option value="x">X</option></select>;', errors: 2 },
          { code: 'const a = <textarea rows={3} />;', errors: 1 },
          { code: 'const a = <input type="checkbox" />;', errors: 1 },
          { code: 'const a = <input type="radio" name="n" />;', errors: 1 },
          { code: 'const a = <input type="date" />;', errors: 1 },
          { code: 'const a = <input type="datetime-local" />;', errors: 1 },
          { code: 'const a = <input type="month" />;', errors: 1 },
          { code: 'const a = <input type="week" />;', errors: 1 },
          { code: 'const a = <input type="time" />;', errors: 1 },
          { code: 'const a = <input type="file" />;', errors: 1 },
          { code: 'const a = <input type="search" />;', errors: 1 },
          // ShareBlock.tsx:47 — `<input readOnly>` de link copiável, sem `type`.
          { code: 'const a = <input readOnly value={link} />;', errors: 1 },
          { code: 'const a = <input type="email" />;', errors: 1 },
          { code: 'const a = <dialog open>oi</dialog>;', errors: 1 },
          // A outra grafia que o JSX aceita — some do radar se a regra só ler Literal.
          { code: "const a = <input type={'checkbox'} />;", errors: 1 },
        ],
      }),
    ).not.toThrow();
  });

  it('a mensagem ensina o canônico e o critério de escolha, não só o nome', () => {
    const doSelect = achar('const a = <select><option/></select>;').find(
      (x) => x.elemento === '<select>',
    );
    expect(doSelect.canonico).toContain('Select');
    expect(doSelect.canonico).toContain('Combobox');
    // Filtro de lista não é nenhum dos dois — quem conserta precisa da régua,
    // senão troca um `<select>` cru por um `Select` no lugar errado.
    expect(doSelect.criterio).toContain('FilterMenu');
  });
});

/** Roda o detector puro sobre um trecho, sem passar pelo ESLint. */
function achar(codigo, opcoes) {
  const ast = tsParser.parse(codigo, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  });
  return controlesCrus(ast, opcoes);
}

describe('controle-cru-fora-do-ds · o que ela NÃO barra', () => {
  it('deixa passar `<input type="password">` — é a leela-auth/senha-fora-do-ds', () => {
    // Duas regras sobre o mesmo fato dão duas mensagens para o mesmo conserto,
    // e a segunda envelhece. A regra nova não duplica a que já existe.
    expect(achar('const a = <input type="password" />;')).toHaveLength(0);
  });

  it('deixa passar os tipos SEM canônico publicado', () => {
    for (const t of ['hidden', 'submit', 'button', 'range', 'color']) {
      expect(achar(`const a = <input type="${t}" />;`)).toHaveLength(0);
    }
  });

  it('deixa passar `type={expressao}` — desconhecido não é violação', () => {
    expect(achar('const a = <input type={tipo} />;')).toHaveLength(0);
  });

  it('deixa passar `<button>` — fora da regra dura de propósito (spec §4)', () => {
    // Ele aparece legitimamente em três lugares que a análise sintática local
    // não distingue de violação: trigger `asChild` do Radix, alvo de clique que
    // não é botão de ação, e botão-ícone em composição. A violação real é
    // reconhecível por assinatura de CLASSE, e é lá que falso positivo nasce —
    // por isso ele é contado pela catraca do gate-canon.mjs, não reprovado aqui.
    expect(achar('const a = <button className="h-10 rounded-ds-pill bg-action-primary" />;')).toHaveLength(0);
  });

  it('deixa passar `<details>`/`<summary>` — padrão SEM canônico é finding de processo', () => {
    // Spec §5/§6: enquanto a decisão CANONE-1 não voltar, a instância nova é
    // permitida e CONTADA. Reprovar aqui seria bloquear trabalho por um vazio
    // que só o dono pode fechar.
    expect(achar('const a = <details><summary>x</summary>y</details>;')).toHaveLength(0);
  });

  it('deixa passar o componente do DS — o cru é o elemento, não o import', () => {
    expect(achar('const a = <Select options={o} />;')).toHaveLength(0);
    expect(achar('const a = <Textarea rows={3} />;')).toHaveLength(0);
    expect(achar('const a = <Checkbox checked />;')).toHaveLength(0);
  });

  it('respeita `permitidos` — a liberação declarada no bloco de config', () => {
    expect(achar('const a = <textarea />;', { permitidos: ['textarea'] })).toHaveLength(0);
    expect(achar('const a = <input type="time" />;', { permitidos: ['input[type=time]'] })).toHaveLength(0);
  });

  it('respeita `arquivosDeExcecao` — a porta ÚNICA da governança §8', () => {
    expect(() =>
      tester.run('controle-cru-fora-do-ds', controleCru, {
        valid: [
          {
            code: 'const a = <input type="time" />;',
            filename: 'apps/painel/src/components/fields/DateTimeField.tsx',
            options: [{ arquivosDeExcecao: ['components/fields/DateTimeField.tsx'] }],
          },
        ],
        invalid: [
          // Fora do arquivo da exceção, o MESMO código continua reprovando.
          {
            code: 'const a = <input type="time" />;',
            filename: 'apps/painel/src/routes/eventos/novo/EventoForm.tsx',
            options: [{ arquivosDeExcecao: ['components/fields/DateTimeField.tsx'] }],
            errors: 1,
          },
        ],
      }),
    ).not.toThrow();
  });
});

// ===========================================================================
// Regra 2 — a re-implementação batizada
// ===========================================================================

const CANONE_FAKE = ['Card', 'Modal', 'Select', 'EmptyState', 'Table', 'Combobox'];

describe('padrao-reimplementado-fora-do-ds', () => {
  it('reprova a DECLARAÇÃO com nome de canônico e com sinônimo', () => {
    expect(() =>
      tester.run('padrao-reimplementado-fora-do-ds', padraoReimplementado, {
        valid: [],
        invalid: [
          {
            code: 'function Card({ children }) { return <div>{children}</div>; }',
            options: [{ canone: CANONE_FAKE }],
            errors: [{ messageId: 'mesmoNome' }],
          },
          {
            code: 'const Modal = ({ open }) => <div>{open}</div>;',
            options: [{ canone: CANONE_FAKE }],
            errors: [{ messageId: 'mesmoNome' }],
          },
          // EngajamentoView.tsx:119 — achado real do gate: `Painel` é `Card`.
          {
            code: 'function Painel({ children }) { return <div className="rounded">{children}</div>; }',
            options: [{ canone: CANONE_FAKE }],
            errors: [{ messageId: 'sinonimo' }],
          },
          // DistribuicaoView.tsx:110 — achado real: `Vazio` é `EmptyState`.
          {
            code: 'function Vazio() { return <p>Sem inscritos.</p>; }',
            options: [{ canone: CANONE_FAKE }],
            errors: [{ messageId: 'sinonimo' }],
          },
          {
            code: 'const Dropdown = () => <ul />;',
            options: [{ canone: CANONE_FAKE }],
            errors: [{ messageId: 'sinonimo' }],
          },
        ],
      }),
    ).not.toThrow();
  });

  it('o KitCard que COMPÕE o Card passa — o nome do arquivo não é evidência', () => {
    // Spec §5: `KitCard.tsx` que compõe `Card` é o comportamento DESEJADO. O que
    // a regra pega é o batismo, porque é ele que faz a duplicata parecer oficial.
    expect(() =>
      tester.run('padrao-reimplementado-fora-do-ds', padraoReimplementado, {
        valid: [
          {
            code: 'function KitCard({ kit }) { return <Card>{kit.nome}</Card>; }',
            filename: 'apps/painel/src/routes/eventos/kits/KitCard.tsx',
            options: [{ canone: CANONE_FAKE }],
          },
          // Função comum com nome colidente, SEM JSX: não é componente.
          { code: 'function Card(a, b) { return a + b; }', options: [{ canone: CANONE_FAKE }] },
          // Constante SCREAMING_SNAKE não é declaração de componente.
          { code: 'const CARD = 1;', options: [{ canone: CANONE_FAKE }] },
          // Nome que não está no cânone nem é sinônimo.
          { code: 'const ProgressoBarra = () => <div />;', options: [{ canone: CANONE_FAKE }] },
        ],
        invalid: [],
      }),
    ).not.toThrow();
  });

  it('sinônimo só acusa quando o canônico EXISTE no barrel', () => {
    // Senão a regra manda importar um componente que ninguém pode importar.
    expect(() =>
      tester.run('padrao-reimplementado-fora-do-ds', padraoReimplementado, {
        valid: [{ code: 'const Snackbar = () => <div />;', options: [{ canone: ['Card'] }] }],
        invalid: [
          {
            code: 'const Snackbar = () => <div />;',
            options: [{ canone: ['Card', 'Toast'] }],
            errors: [{ messageId: 'sinonimo' }],
          },
        ],
      }),
    ).not.toThrow();
  });

  it('reconhece as quatro formas de declarar componente', () => {
    const ast = tsParser.parse(
      [
        'function Alfa() { return <p/>; }',
        'const Beta = () => <p/>;',
        'const Gama = React.forwardRef((p, r) => <p ref={r}/>);',
        'const Delta = React.memo(function inner() { return <p/>; });',
        // Função sem JSX não é componente, mesmo com nome PascalCase.
        'function Epsilon() { return 1; }',
        // camelCase não é componente.
        'const zeta = () => <p/>;',
        // SCREAMING_SNAKE é constante, não componente — é o guarda que impede
        // `CARD_PADRAO` de virar achado.
        'const CARD = <p/>;',
      ].join('\n'),
      { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    );
    expect(componentesDeclarados(ast).map((c) => c.nome)).toEqual([
      'Alfa',
      'Beta',
      'Gama',
      'Delta',
    ]);
  });
});

// ===========================================================================
// A fonte do cânone — o que impede o mapa de envelhecer
// ===========================================================================

describe('canoneDoBarrel · a lista vem do barrel, nunca da mão', () => {
  it('pega export de valor em PascalCase e descarta o resto', () => {
    const fonte = [
      "export { Button, buttonVariants, type ButtonProps } from './components/Button';",
      "export { Card, CardHeader } from './components/Card';",
      "export { useToast, DEFAULT_TOAST_DURATION } from './components/Toast';",
      "export { cn } from './utils/cn';",
      "export { SCROLL_Y_ONLY } from './utils/scroll';",
      "export type { ModalProps } from './components/Modal';",
    ].join('\n');
    expect(canoneDoBarrel(fonte)).toEqual(['Button', 'Card', 'CardHeader']);
  });

  it('o barrel REAL do DS produz os componentes que o cânone protege', () => {
    // Se alguém publicar componente novo, ele entra aqui sozinho — e a camada A
    // do gate-canon.mjs cobra a linha no documento canônico no mesmo commit.
    const barrel = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf8');
    const nomes = canoneDoBarrel(barrel);
    expect(nomes).toContain('Card');
    expect(nomes).toContain('ConfirmModal');
    expect(nomes).toContain('EmptyState');
    // Helpers, hooks e constantes ficam de fora — não são padrão de UI.
    expect(nomes).not.toContain('buttonVariants');
    expect(nomes).not.toContain('cn');
    expect(nomes).not.toContain('SCROLL_Y_ONLY');
    expect(nomes).not.toContain('CHART_CATEGORY_COUNT');
  });

  it('todo sinônimo aponta para um nome que o barrel real publica', () => {
    // Sinônimo órfão manda importar componente inexistente — a mensagem vira
    // mentira e a regra perde a credibilidade na primeira vez que aparece.
    const barrel = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf8');
    const nomes = new Set(canoneDoBarrel(barrel));
    for (const canonico of Object.keys(SINONIMOS_PADRAO)) {
      expect(nomes.has(canonico), `sinônimos apontam para ${canonico}`).toBe(true);
    }
  });
});

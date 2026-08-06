// @ts-check
/**
 * eslint-plugin leela-auth — a trava da fronteira de autenticação (FRONTEIRA-AUTH).
 *
 * O requisito do dono, verbatim: "ninguém deve entrar no sistema sem estar
 * autenticado". No painel isso é verdade por CONSTRUÇÃO — `App.tsx` monta duas
 * subárvores irmãs debaixo do `<BrowserRouter>`:
 *
 *   <Route element={<AuthLayout/>}>      → as 4 telas públicas de conta
 *   <Route path="/*" element={<RequireSessao> … </RequireSessao>}>  → o app
 *
 * Toda rota autenticada do painel nasce DENTRO da segunda. A fragilidade é que
 * essa verdade mora na indentação: acrescentar um `<Route path="/novo" …/>`
 * como TERCEIRO irmão é uma linha, o `tsc` aceita, o `eslint` aceitava, a suíte
 * inteira segue verde — e a rota nasce aberta ao mundo. O defeito não aparece
 * em nenhum teste porque nenhum teste conhece a rota nova.
 *
 * Esta regra torna a fronteira verificável: no `<Routes>` raiz (o que fica
 * debaixo de um Router), cada `<Route>` filho direto precisa declarar de que
 * lado está. Ou o `element` monta um dos GUARDAS (`RequireSessao`), ou monta um
 * dos layouts PÚBLICOS declarados na config (`AuthLayout`). Qualquer terceira
 * coisa é erro de lint — e `pnpm lint` roda com `--max-warnings 0`, então quebra
 * o CI antes de virar deploy.
 *
 * Por que a lista de públicas vive no `eslint.config.mjs` da raiz e não num
 * comentário do App.tsx: abrir uma rota ao anônimo passa a exigir a edição de um
 * arquivo de configuração compartilhado, que aparece sozinho no diff da review.
 * O atrito é o produto — é a diferença entre "alguém decidiu abrir" e "alguém
 * abriu sem perceber".
 *
 * O que a regra NÃO faz, de propósito: não olha rota aninhada. Tudo que está
 * dentro do `<Route path="/*">` já está debaixo do guarda por construção — a
 * única forma de escapar é subir ao nível do irmão, e é exatamente esse nível
 * que ela vigia. Guardas de PAPEL (RequirePapel, PlatformGuard, ContaTravadaGate)
 * são outra camada e não são assunto desta regra: eles decidem o que um
 * autenticado vê, não se um anônimo entra.
 */

/** Componentes que abrem um contexto de roteamento (o `<Routes>` de dentro é o raiz). */
const ROUTERS = new Set(['BrowserRouter', 'HashRouter', 'MemoryRouter', 'Router']);

/** @param {any} node @returns {string | null} nome do elemento JSX, se simples. */
function nomeJsx(node) {
  if (node?.type !== 'JSXElement') return null;
  const nome = node.openingElement?.name;
  if (nome?.type === 'JSXIdentifier') return nome.name;
  // <Foo.Bar/> — devolvemos a última parte, suficiente para casar allowlists.
  if (nome?.type === 'JSXMemberExpression' && nome.property?.type === 'JSXIdentifier') {
    return nome.property.name;
  }
  return null;
}

/**
 * Percorre QUALQUER nó da AST chamando `visitar` em cada objeto com `type`.
 * Walker genérico de propósito: o parser TS emite JSX dentro de expressões,
 * arrays e chamadas (`{rotasLegadas()}`), e um walker só-de-JSX perderia esses
 * caminhos.
 * @param {any} no
 * @param {(n: any) => void} visitar
 */
function percorrer(no, visitar) {
  if (no === null || typeof no !== 'object') return;
  if (Array.isArray(no)) {
    for (const item of no) percorrer(item, visitar);
    return;
  }
  if (typeof no.type === 'string') visitar(no);
  for (const chave of Object.keys(no)) {
    if (chave === 'parent') continue;
    percorrer(no[chave], visitar);
  }
}

/** Filhos JSX diretos de um elemento, ignorando texto e expressões vazias. */
function filhosJsx(elemento) {
  return (elemento.children ?? []).filter((f) => f.type === 'JSXElement');
}

/**
 * Todos os nomes de componente que aparecem dentro do valor de uma prop
 * `element={…}` — incluindo os aninhados. `<RequireSessao><RootShell>…` casa
 * pelo primeiro; a busca é profunda porque a ordem do encadeamento pode mudar
 * (hoje `RequireSessao` é o de fora; se um provider passar a envolvê-lo, a
 * regra continua reconhecendo o guarda).
 * @param {any} rota
 * @returns {Set<string>}
 */
function componentesDoElement(rota) {
  /** @type {Set<string>} */
  const nomes = new Set();
  const attrs = rota.openingElement?.attributes ?? [];
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name?.name !== 'element') continue;
    percorrer(attr.value, (n) => {
      const nome = nomeJsx(n);
      if (nome !== null) nomes.add(nome);
    });
  }
  return nomes;
}

/** Valor literal da prop `path` (para a mensagem), ou null. */
function pathDaRota(rota) {
  const attrs = rota.openingElement?.attributes ?? [];
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name?.name === 'index') return 'index';
    if (attr.name?.name !== 'path') continue;
    if (attr.value?.type === 'Literal' && typeof attr.value.value === 'string') {
      return attr.value.value;
    }
    return '(dinâmico)';
  }
  return null;
}

/**
 * Encontra os `<Routes>` RAIZ do arquivo: os que estão debaixo de um Router e
 * não estão dentro de outro `<Routes>`. Um arquivo sem Router (todo subrouter
 * de domínio do painel) não tem raiz e sai vazio — nada a checar ali, porque
 * subrouter só é montado de dentro da fronteira.
 * @param {any} ast
 * @returns {any[]}
 */
export function acharRoutesRaiz(ast) {
  /** @type {any[]} */
  const raizes = [];
  percorrer(ast, (no) => {
    if (!ROUTERS.has(nomeJsx(no) ?? '')) return;
    // Dentro deste Router, o(s) `<Routes>` mais externo(s).
    const pilha = [...filhosJsx(no)];
    while (pilha.length > 0) {
      const atual = pilha.pop();
      if (nomeJsx(atual) === 'Routes') {
        raizes.push(atual);
        continue; // não desce: `<Routes>` aninhado não é raiz
      }
      pilha.push(...filhosJsx(atual));
    }
  });
  return raizes;
}

/**
 * O coração da regra, PURO e testável: quais `<Route>` do topo não declararam
 * de que lado da fronteira estão.
 *
 * @param {any} ast Program (ou qualquer nó) já parseado com JSX.
 * @param {{ guardas?: string[], publicas?: string[] }} [opcoes]
 * @returns {Array<{ no: any, path: string | null, motivo: 'sem-guarda' | 'sem-element' }>}
 */
export function rotasForaDaFronteira(ast, opcoes = {}) {
  const guardas = new Set(opcoes.guardas ?? ['RequireSessao']);
  const publicas = new Set(opcoes.publicas ?? ['AuthLayout']);
  /** @type {Array<{ no: any, path: string | null, motivo: 'sem-guarda' | 'sem-element' }>} */
  const fora = [];

  for (const routes of acharRoutesRaiz(ast)) {
    for (const rota of filhosJsx(routes)) {
      if (nomeJsx(rota) !== 'Route') continue;
      const nomes = componentesDoElement(rota);
      if (nomes.size === 0) {
        // `<Route path="x"/>` sem element renderiza o Outlet — no topo isso é
        // uma rota montada sem nada que decida sessão.
        fora.push({ no: rota, path: pathDaRota(rota), motivo: 'sem-element' });
        continue;
      }
      let classificada = false;
      for (const nome of nomes) {
        if (guardas.has(nome) || publicas.has(nome)) {
          classificada = true;
          break;
        }
      }
      if (!classificada) fora.push({ no: rota, path: pathDaRota(rota), motivo: 'sem-guarda' });
    }
  }
  return fora;
}

/** @type {import('eslint').Rule.RuleModule} */
const rotaForaDaFronteira = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Rota de topo tem de declarar de que lado da fronteira de autenticação está: guarda de sessão ou layout público declarado.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          guardas: { type: 'array', items: { type: 'string' } },
          publicas: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      semGuarda:
        'Rota `{{path}}` é irmã da fronteira de autenticação e não passa por guarda de sessão ({{guardas}}). Ou ela entra debaixo do guarda, ou o layout público dela entra em `publicas` no eslint.config.mjs — abrir rota ao anônimo é decisão explícita, não indentação.',
      semElement:
        'Rota `{{path}}` no topo do roteador não tem `element`, então nada decide sessão antes de renderizar. Monte-a debaixo do guarda ({{guardas}}).',
    },
  },
  create(context) {
    const opcoes = context.options[0] ?? {};
    const guardas = opcoes.guardas ?? ['RequireSessao'];
    return {
      'Program:exit'() {
        const ast = context.sourceCode?.ast ?? context.getSourceCode().ast;
        for (const achado of rotasForaDaFronteira(ast, opcoes)) {
          context.report({
            node: achado.no,
            messageId: achado.motivo === 'sem-element' ? 'semElement' : 'semGuarda',
            data: { path: achado.path ?? '(sem path)', guardas: guardas.join(', ') },
          });
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Regra 2 — campo de senha cru (FRONTEIRA-AUTH · pedido do dono)
// ---------------------------------------------------------------------------

/**
 * Todo `<input type="password">` de um app é o campo de senha da casa
 * (`InputSenha` do DS) ou é um campo que esqueceu alguma coisa.
 *
 * A lista do que se esquece não é hipotética — é o brief do dono: mostrar/
 * ocultar, `type="button"` no botão (senão ele submete o formulário), o
 * `autocomplete` certo para o gerenciador de senha não morrer, a regra de
 * composição e o medidor de força. Eram DEZESSETE campos em nove arquivos
 * quando esta lane começou; o décimo oitavo é o que esta regra existe para
 * pegar, porque ele será escrito por alguém que não leu nenhum dos outros.
 *
 * Pega as duas grafias que o JSX aceita: `type="password"` e
 * `type={'password'}`. Escopo (eslint.config.mjs) é só `apps/` — o DS precisa
 * do primitivo cru para construir o `InputSenha`.
 * @param {any} ast
 * @returns {any[]} nós JSXAttribute ofensores
 */
export function camposDeSenhaCrus(ast) {
  /** @type {any[]} */
  const achados = [];
  percorrer(ast, (no) => {
    if (no.type !== 'JSXAttribute') return;
    if (no.name?.name !== 'type') return;
    const v = no.value;
    const literal =
      v?.type === 'Literal'
        ? v.value
        : v?.type === 'JSXExpressionContainer' && v.expression?.type === 'Literal'
          ? v.expression.value
          : null;
    if (literal === 'password') achados.push(no);
  });
  return achados;
}

/** @type {import('eslint').Rule.RuleModule} */
const senhaForaDoDs = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Campo de senha nos apps é o InputSenha do design system, não um <input type="password"> cru.',
    },
    schema: [],
    messages: {
      cru: 'Campo de senha cru. Use `InputSenha` do @leela/design-system — ele traz mostrar/ocultar (com `type="button"`, senão o botão submete o formulário), preserva o `autocomplete` do gerenciador de senha e desenha o medidor de força. A régua vem de `avaliarSenha()` do @leela/core.',
    },
  },
  create(context) {
    return {
      'Program:exit'() {
        const ast = context.sourceCode?.ast ?? context.getSourceCode().ast;
        for (const no of camposDeSenhaCrus(ast)) {
          context.report({ node: no, messageId: 'cru' });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: 'leela-auth', version: '1.1.0' },
  rules: {
    'rota-fora-da-fronteira': rotaForaDaFronteira,
    'senha-fora-do-ds': senhaForaDoDs,
  },
};

export default plugin;

/**
 * Testes do lint da fronteira de autenticação (FRONTEIRA-AUTH).
 *
 * Cada caso é uma forma REAL de a fronteira abrir. O primeiro é o defeito que a
 * regra existe para impedir: a rota irmã do bloco `RequireSessao` em `App.tsx`.
 * Os últimos são o que a regra não pode barrar — o próprio `App.tsx` de hoje e
 * os subrouters de domínio, que não têm Router e por isso não têm topo.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import {
  rotasForaDaFronteira,
  acharRoutesRaiz,
  camposDeSenhaCrus,
} from '../leela-auth-plugin.mjs';

/** Parseia TSX e devolve o Program (mesma configuração que o eslint usa). */
function ast(codigo) {
  return parse(codigo, { ecmaFeatures: { jsx: true }, sourceType: 'module' });
}

/** Nomes de path das rotas reportadas — o que a mensagem mostra ao dev. */
function paths(codigo, opcoes) {
  return rotasForaDaFronteira(ast(codigo), opcoes).map((a) => a.path);
}

/** O App.tsx real, reduzido à forma que importa: dois irmãos e nada mais. */
const APP_REAL = `
  export function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/entrar" element={<EntrarPage />} />
              <Route path="/cadastrar" element={<CadastrarPage />} />
              <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
              <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            </Route>
            <Route
              path="/*"
              element={
                <RequireSessao>
                  <RootShell>
                    <ContaTravadaGate>
                      <Routes>
                        <Route path="/*" element={<OverviewRoutes />} />
                        <Route path="/plataforma/*" element={<PlataformaRoutes />} />
                      </Routes>
                    </ContaTravadaGate>
                  </RootShell>
                </RequireSessao>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  }
`;

describe('rotasForaDaFronteira — o defeito que a regra existe para impedir', () => {
  it('flagra a rota irmã do bloco guardado (a linha que abre o sistema ao mundo)', () => {
    const codigo = APP_REAL.replace(
      '<Route\n              path="/*"',
      '<Route path="/status" element={<StatusInterno />} />\n            <Route\n              path="/*"',
    );
    expect(paths(codigo)).toEqual(['/status']);
  });

  it('flagra mesmo quando a rota nova parece inofensiva (sem element, só Outlet)', () => {
    const codigo = `
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<RequireSessao><App /></RequireSessao>} />
          <Route path="/interno" />
        </Routes>
      </BrowserRouter>
    `;
    const achados = rotasForaDaFronteira(ast(codigo));
    expect(achados).toHaveLength(1);
    expect(achados[0].motivo).toBe('sem-element');
    expect(achados[0].path).toBe('/interno');
  });

  it('flagra rota de topo que monta um subrouter direto, sem passar pelo guarda', () => {
    const codigo = `
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}><Route path="/entrar" element={<EntrarPage />} /></Route>
          <Route path="/relatorios/*" element={<RelatoriosRoutes />} />
          <Route path="/*" element={<RequireSessao><App /></RequireSessao>} />
        </Routes>
      </BrowserRouter>
    `;
    expect(paths(codigo)).toEqual(['/relatorios/*']);
  });

  it('não aceita um guarda de PAPEL no lugar do guarda de SESSÃO', () => {
    // RequirePapel/PlatformGuard decidem o que um AUTENTICADO vê. Nenhum deles
    // manda o anônimo para o login — trocar um pelo outro no topo é o mesmo
    // buraco com aparência de conserto.
    const codigo = `
      <BrowserRouter>
        <Routes>
          <Route path="/plataforma/*" element={<RequirePapel area="financeiro"><Plataforma /></RequirePapel>} />
        </Routes>
      </BrowserRouter>
    `;
    expect(paths(codigo)).toEqual(['/plataforma/*']);
  });

  it('flagra a rota aberta mesmo com o bloco público presente ao lado', () => {
    const codigo = `
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}><Route path="/entrar" element={<EntrarPage />} /></Route>
          <Route index element={<Home />} />
          <Route path="/*" element={<RequireSessao><App /></RequireSessao>} />
        </Routes>
      </BrowserRouter>
    `;
    expect(paths(codigo)).toEqual(['index']);
  });
});

describe('rotasForaDaFronteira — o que é legítimo e não pode ser barrado', () => {
  it('o App.tsx real passa: os dois únicos irmãos são o guarda e o layout público', () => {
    expect(rotasForaDaFronteira(ast(APP_REAL))).toEqual([]);
  });

  it('reconhece o guarda mesmo que um provider passe a envolvê-lo (busca profunda)', () => {
    const codigo = `
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<ToastProvider><RequireSessao><App /></RequireSessao></ToastProvider>} />
        </Routes>
      </BrowserRouter>
    `;
    expect(rotasForaDaFronteira(ast(codigo))).toEqual([]);
  });

  it('subrouter de domínio não tem Router: nada é topo, nada é checado', () => {
    // EventosRoutes, CrmRoutes, PlataformaRoutes… — montados de DENTRO da
    // fronteira. Se a regra os tratasse como topo, cada `<Route>` de área do
    // painel viraria erro e a trava seria desligada no dia seguinte.
    const codigo = `
      export function EventosRoutes() {
        return (
          <Routes>
            <Route path="novo" element={<NovoEventoRoute />} />
            <Route path=":slug" element={<EventoLayout />}>
              <Route path="inscritos" element={<RequirePapel area="inscritos"><Inscritos /></RequirePapel>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        );
      }
    `;
    expect(acharRoutesRaiz(ast(codigo))).toEqual([]);
    expect(rotasForaDaFronteira(ast(codigo))).toEqual([]);
  });

  it('rota aninhada DENTRO do bloco guardado não é assunto da regra', () => {
    // O `<Routes>` de dentro do RequireSessao não é raiz — tudo ali já está
    // debaixo do guarda por construção.
    expect(acharRoutesRaiz(ast(APP_REAL))).toHaveLength(1);
  });

  it('a allowlist de públicas é configurável (abrir rota = editar a config)', () => {
    const codigo = `
      <BrowserRouter>
        <Routes>
          <Route path="/status" element={<StatusPublico />} />
          <Route path="/*" element={<RequireSessao><App /></RequireSessao>} />
        </Routes>
      </BrowserRouter>
    `;
    expect(paths(codigo)).toEqual(['/status']);
    expect(paths(codigo, { publicas: ['StatusPublico'] })).toEqual([]);
  });

  it('MemoryRouter/HashRouter contam como Router (o vetor não escapa trocando de router)', () => {
    for (const router of ['MemoryRouter', 'HashRouter']) {
      const codigo = `<${router}><Routes><Route path="/x" element={<Livre />} /></Routes></${router}>`;
      expect(paths(codigo)).toEqual(['/x']);
    }
  });
});

describe('camposDeSenhaCrus — o decimo oitavo campo de senha', () => {
  it('flagra `type="password"` cru num app', () => {
    const codigo = `<input type="password" autoComplete="new-password" />`;
    expect(camposDeSenhaCrus(ast(codigo))).toHaveLength(1);
  });

  it('flagra também a grafia por expressão, que escaparia de uma busca textual', () => {
    expect(camposDeSenhaCrus(ast(`<input type={'password'} />`))).toHaveLength(1);
  });

  it('não confunde com os outros tipos de campo', () => {
    const codigo = `
      <form>
        <input type="email" />
        <input type="text" />
        <input type="search" />
        <Input type="tel" />
      </form>
    `;
    expect(camposDeSenhaCrus(ast(codigo))).toEqual([]);
  });

  it('o InputSenha do DS não declara type — passa por construção', () => {
    const codigo = `<InputSenha label="Senha" autoComplete="new-password" avaliacao={avaliarSenha(senha)} />`;
    expect(camposDeSenhaCrus(ast(codigo))).toEqual([]);
  });

  it('acha todos, não só o primeiro (uma tela com senha + confirmação)', () => {
    const codigo = `
      <form>
        <input type="password" name="senha" />
        <input type="password" name="confirmar" />
      </form>
    `;
    expect(camposDeSenhaCrus(ast(codigo))).toHaveLength(2);
  });
});

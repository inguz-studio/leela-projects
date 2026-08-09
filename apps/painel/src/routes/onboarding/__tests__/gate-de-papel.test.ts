// =============================================================================
// A CAMADA DE PAPEL TAMBÉM É FRONTEIRA (RN-510) — prova estrutural.
//
// POR QUE ESTE ARQUIVO EXISTE. O painel tem duas fronteiras empilhadas em
// `App.tsx`, e até esta review só a de baixo era verificável:
//
//   RequireSessao      → AUTENTICAÇÃO.  Tem lint (`leela-auth/rota-fora-da-
//                        fronteira`) E contrato de 28 casos.
//   ContaTravadaGate   → PAPEL (RN-510). Não tinha nada.
//
// A regra de lint da fronteira de auth existe porque a verdade "toda rota
// autenticada nasce debaixo do guarda" morava na INDENTAÇÃO: acrescentar um
// `<Route>` como irmão é uma linha, o `tsc` aceita, o `eslint` aceitava e a
// suíte inteira segue verde. Este arquivo é a mesma regra, uma camada acima —
// porque o mesmo descuido, um degrau adiante, tem consequência de DADO.
//
// A FALSIFICAÇÃO QUE MOTIVOU O ARQUIVO (lane REV-VITRINE, contexto frio).
// Enxertada em `App.tsx` a rota irmã abaixo, que é a forma que alguém escreve
// sem pensar:
//
//   <Route path="/relatorios/*"
//     element={<RequireSessao><RootShell><CrmRoutes/></RootShell></RequireSessao>} />
//
// Ela tem `RequireSessao`. Não tem `ContaTravadaGate`. Resultado medido:
//
//   eslint apps/painel/src --max-warnings 0 ....... exit 0    (verde)
//   fronteira-auth.test.tsx (os 28 casos) ......... 28 passed (verde)
//   vitrine-sem-query.test.tsx (a allowlist) ...... 10 passed (verde)
//   a conta em vitrine abrindo /relatorios ........ getOverview VAZOU
//
// Três gates verdes e uma query tenant-scoped saindo pela porta. A allowlist
// não pega porque ela visita uma LISTA de sete URLs escrita à mão, e a URL nova
// não está nela — o cabeçalho daquele teste promete "qualquer tela", e essa
// promessa só vale para tela que monta ATRAVÉS do gate.
//
// COMO ESTE ARQUIVO MEDE. Ele lê a FONTE do `App.tsx` e faz uma pergunta
// fechada, que não envelhece com rota nova: de todo `<Route>` do `<Routes>`
// raiz, aquele cujo `element` monta o guarda de sessão tem de montar também o
// gate de papel. Rota nova que esqueça o gate aparece aqui pelo `path`, no dia
// em que nasce, sem que ninguém precise se lembrar de acrescentá-la a lista
// nenhuma.
//
// E A PROVA DE QUE A MEDIÇÃO MORDE: o último caso roda o mesmo predicado sobre
// a rota enxertada acima, em texto, e EXIGE que ela seja apontada. Gate que não
// falha no defeito que veio prevenir é decoração.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const APP = resolve(__dirname, '../../../App.tsx');

/** O guarda de SESSÃO — o mesmo nome que o `eslint.config.mjs` declara. */
const GUARDA_DE_SESSAO = 'RequireSessao';
/** O gate de PAPEL — quem decide o que um autenticado vê (RN-510). */
const GATE_DE_PAPEL = 'ContaTravadaGate';

function nomeJsx(no: ts.Node): string | null {
  if (!ts.isJsxElement(no) && !ts.isJsxSelfClosingElement(no)) return null;
  const tag = ts.isJsxElement(no) ? no.openingElement.tagName : no.tagName;
  if (ts.isIdentifier(tag)) return tag.text;
  if (ts.isPropertyAccessExpression(tag)) return tag.name.text;
  return null;
}

function percorrer(no: ts.Node, visitar: (n: ts.Node) => void): void {
  visitar(no);
  no.forEachChild((filho) => percorrer(filho, visitar));
}

/** Nomes de componente que aparecem em qualquer lugar dentro de `element={…}`. */
function componentesDoElement(rota: ts.JsxElement | ts.JsxSelfClosingElement): Set<string> {
  const nomes = new Set<string>();
  const abertura = ts.isJsxElement(rota) ? rota.openingElement : rota;
  for (const attr of abertura.attributes.properties) {
    if (!ts.isJsxAttribute(attr) || attr.name.getText() !== 'element') continue;
    if (attr.initializer === undefined) continue;
    percorrer(attr.initializer, (n) => {
      const nome = nomeJsx(n);
      if (nome !== null) nomes.add(nome);
    });
  }
  return nomes;
}

function pathDaRota(rota: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const abertura = ts.isJsxElement(rota) ? rota.openingElement : rota;
  for (const attr of abertura.attributes.properties) {
    if (!ts.isJsxAttribute(attr)) continue;
    if (attr.name.getText() === 'index') return 'index';
    if (attr.name.getText() !== 'path') continue;
    const init = attr.initializer;
    if (init !== undefined && ts.isStringLiteral(init)) return init.text;
    return '(dinâmico)';
  }
  return '(sem path)';
}

/**
 * Rotas que atravessam a fronteira de SESSÃO e NÃO atravessam a de PAPEL.
 * Vazio é o contrato.
 *
 * A busca é por todo `<Route>` do arquivo cujo `element` monta o guarda de
 * sessão — de propósito não se restringe ao `<Routes>` raiz: uma segunda
 * árvore de rotas montada em qualquer lugar do arquivo teria o mesmo poder de
 * escapar, e a pergunta é a mesma.
 * @pure
 */
export function rotasSemGateDePapel(codigo: string, nomeArquivo = 'App.tsx'): string[] {
  const fonte = ts.createSourceFile(nomeArquivo, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const faltando: string[] = [];
  percorrer(fonte, (no) => {
    if (nomeJsx(no) !== 'Route') return;
    const rota = no as ts.JsxElement | ts.JsxSelfClosingElement;
    const componentes = componentesDoElement(rota);
    if (!componentes.has(GUARDA_DE_SESSAO)) return;
    if (componentes.has(GATE_DE_PAPEL)) return;
    faltando.push(pathDaRota(rota));
  });
  return faltando;
}

describe('fronteira de PAPEL · toda rota autenticada passa pelo ContaTravadaGate (RN-510)', () => {
  it('o App.tsx de hoje não tem rota autenticada fora do gate de papel', () => {
    const fora = rotasSemGateDePapel(readFileSync(APP, 'utf8'));
    expect(
      fora,
      `rota(s) autenticada(s) sem ${GATE_DE_PAPEL}: ${fora.join(', ')}.\n` +
        `Toda rota debaixo de ${GUARDA_DE_SESSAO} monta a tela REAL para a conta em vitrine ` +
        `e dispara as queries dela — que é exatamente a propriedade que a RN-510 preserva. ` +
        `Se a rota nova PRECISA ficar fora, a decisão entra em DECISOES-ABERTAS.md antes do código.`,
    ).toEqual([]);
  });

  it('o gate de papel e o guarda de sessão continuam existindo com estes nomes', () => {
    // Renomear qualquer um dos dois cegaria o caso acima em silêncio: ele
    // passaria a não encontrar rota nenhuma e ficaria verde para sempre.
    const codigo = readFileSync(APP, 'utf8');
    expect(codigo).toContain(GUARDA_DE_SESSAO);
    expect(codigo).toContain(GATE_DE_PAPEL);
    const total = rotasSemGateDePapel(
      codigo.replace(`<${GATE_DE_PAPEL}>`, '<QualquerOutraCoisa>'),
    );
    expect(total.length, 'o predicado não está olhando rota nenhuma').toBeGreaterThan(0);
  });

  it('FALSIFICAÇÃO: a rota irmã sem gate de papel é apontada pelo path', () => {
    // A rota exata que passou por eslint + 28 casos + allowlist e vazou
    // `getOverview` na lane REV-VITRINE.
    const enxerto = `
      import { Route, Routes } from 'react-router-dom';
      export function App() {
        return (
          <BrowserRouter>
            <Routes>
              <Route element={<AuthLayout />}><Route path="/entrar" element={<EntrarPage />} /></Route>
              <Route
                path="/relatorios/*"
                element={<RequireSessao><RootShell><CrmRoutes /></RootShell></RequireSessao>}
              />
              <Route
                path="/*"
                element={
                  <RequireSessao>
                    <RootShell>
                      <ContaTravadaGate><Routes /></ContaTravadaGate>
                    </RootShell>
                  </RequireSessao>
                }
              />
            </Routes>
          </BrowserRouter>
        );
      }
    `;
    expect(rotasSemGateDePapel(enxerto, 'enxerto.tsx')).toEqual(['/relatorios/*']);
  });
});

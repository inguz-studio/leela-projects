#!/usr/bin/env node
// =============================================================================
// scripts/verificar-frescor-do-workspace.mjs
//
// O ENTRYPOINT do gate de frescor. Só o shebang, o argumento e a chamada.
//
// A lógica inteira mora em `./lib/frescor-do-workspace.mjs`, e a separação é
// deliberada: este arquivo carrega `#!/usr/bin/env node`, e um arquivo com
// shebang não pode ser importado por quem passa por bundler — o parser do
// `ssrTransform` do Vite aborta com `Error: Expected ident` na linha 1 e o
// teste que importa morre na COLETA, com zero casos. Foi o que a lane ONDA-0
// mediu em 11/08. Enquanto lógica e entrypoint dividiam arquivo, o gate do gate
// dependia da versão do parser instalada no dia. Agora não existe mais um
// arquivo que seja importável e executável ao mesmo tempo, e a classe morre.
//
// Uso:
//   node ../../scripts/verificar-frescor-do-workspace.mjs        (cwd = app)
//   node scripts/verificar-frescor-do-workspace.mjs apps/landing (cwd = raiz)
//
// A segunda forma existe para o `predeploy` do Firebase, que roda com o cwd na
// raiz do repo (onde está a config) e não no diretório do app.
// =============================================================================

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { executarCli } from './lib/frescor-do-workspace.mjs';

// Só roda como CLI quando é o módulo de entrada — importar não dispara nada.
// `pathToFileURL` e não template de string: no Windows o caminho vem com `\` e
// letra de unidade, e a comparação crua nunca casaria — o gate viraria um
// arquivo que não roda, que é o pior desfecho possível para um gate.
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  process.exit(executarCli(process.argv[2] ?? process.cwd()));
}

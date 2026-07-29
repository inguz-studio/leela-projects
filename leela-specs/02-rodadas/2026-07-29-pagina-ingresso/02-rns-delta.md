---
tags: [leela, rn, rodada, ingresso, qr, landing, privacidade, email]
aliases: ["RNs pagina-ingresso 2026-07-29", "RN-418..424"]
trace: leela-build-2d6ee98d
lote: SPEC-INGPAGE
data: 2026-07-29
---

# RNs da página do ingresso · RN-418 a RN-424

## Faixa e prova de não colisão

A série 4xx é a da plataforma. O E16 introduziu RN-400 a RN-410 e a SPEC-ONBOARD consumiu
RN-411 a RN-417. Varredura em 2026-07-29, fora de `node_modules` e do `dist` do painel:

```
grep -rnoE "RN-4(1[89]|[2-9][0-9])" --include=*.md --include=*.ts --include=*.tsx \
     --include=*.rules --include=*.json .
```

Único hit é `RN-499` dentro da própria frase da SPEC-ONBOARD que declarou a faixa livre
(`02-rodadas/2026-07-28-onboarding-organizador/02-rns-delta.md:11`). **Faixa consumida aqui:
RN-418 a RN-424.** `RN-383` segue livre como folga da série 3xx (dinheiro), e não é o
domínio desta rodada.

ID de story mintado: **`S1214`** no E12. Varredura de `S1214` a `S1229` em `leela-specs/`,
`apps/`, `functions/` e `packages/`: zero hits. O E12 estava usado até `S1213`
(mintado pela SPEC-ONBOARD).

| RN | Tema | Épico dono |
|---|---|---|
| RN-418 | Página pública do ingresso: superfície, leitura sem login e ausência de escrita | E12 |
| RN-419 | Token do link: formato `LLIP1`, derivação do keyring e onde a chave pode morar | E12 |
| RN-420 | Ciclo de vida do link: rotação, revogação por re-emissão e ausência de prazo | E12 |
| RN-421 | O que a página mostra em cada estado do inscrito | E12 |
| RN-422 | Dado mínimo exibido e cabeçalhos de privacidade | E12 |
| RN-423 | Base pública única por ambiente e o link do ingresso no e-mail | E12 |
| RN-424 | Versão imprimível como forma do PDF sob demanda (RN-220 ampliada) | E12 |

---

## RN-418 · A página do ingresso é pública, tokenizada e somente leitura

A rota `/ingresso/{token}` da superfície pública exibe o ingresso de **um** inscrito, sem
login, a quem apresentar um token válido.

- A leitura acontece no servidor. Nenhum dado de inscrito é lido pelo cliente e **nenhuma
  Security Rule é afrouxada** para esta funcionalidade: `eventos/{id}/inscritos` continua
  fechado a cliente anônimo, como a INGQR-REV provou no vetor 6. A fronteira de autorização
  é a verificação criptográfica do token no servidor, na mesma doutrina do leitor público de
  eventos (o gate mora no código, não nas Rules).
- **A página não escreve nada.** Abrir ingresso não credencia (RN-399, RN-221 e RN-222
  seguem intactas: quem registra presença é o balcão), não emite ingresso (quem cura ausência
  é a RN-382) e não muda estado nenhum.
- A resposta é sempre dinâmica, nunca pré-renderizada nem revalidada em cache: o estado
  exibido muda com cancelamento, estorno e credenciamento.
- `ingresso` entra na lista de slugs reservados de evento, junto das demais rotas estáticas
  já existentes na superfície pública. Sem a lista, um evento com esse nome sombreia a rota.

## RN-419 · O token do link é próprio, derivado do mesmo keyring, verificado no servidor de negócio

O link **nunca** carrega o `qrToken`. O `qrToken` é a credencial de presença e quem o lê
entra no evento; numa URL ele vaza por histórico, `Referer`, log de proxy e print de tela.

Formato, irmão do `LLQR1` e deliberadamente incompatível com ele:

```
LLIP1.<kid>.<payloadB64url>.<assinatura>
```

- Payload mínimo `{i,e,t}` (inscrito, evento, tenant), o mesmo shape do QR: **nenhum dado
  pessoal viaja no link**.
- Assinatura HMAC-SHA256 sobre `LLIP1.<kid>.<payloadB64url>` **concatenado ao `qrToken`
  vigente do inscrito** (ver RN-420), com o segredo do keyring já existente. Comparação em
  tempo constante.
- **Separação de domínio pela versão:** um token `LLQR1` nunca abre a página e um token
  `LLIP1` nunca passa no check-in. As duas constantes de versão jamais podem ser iguais, e
  isso é asserção de teste, não convenção.
- Kid inválido, assinatura inválida, inscrito inexistente e evento inexistente produzem **a
  mesma resposta**. Nenhuma delas revela qual falhou.
- **A chave de assinatura não mora no runtime da superfície pública.** A verificação e a
  projeção acontecem numa Function; a página consome o resultado. Motivo: com a chave no
  servidor de páginas, uma falha de dependência ali passa a permitir cunhar QR de check-in
  offline, para qualquer evento e qualquer tenant, sem tocar no banco. Ler o banco deixa
  rastro; cunhar token não.
- A projeção devolvida à página **não inclui o `qrToken` em texto**: o QR já vem renderizado
  como imagem, pelo mesmo gerador do e-mail. É higiene, não fronteira de segurança, e está
  escrito como higiene.

## RN-420 · Rotação não mata link emitido; re-emitir o ingresso mata

Três propriedades, e elas são diferentes entre si:

1. **Rotação de chave não invalida link já enviado.** O `kid` viaja dentro do token e o ring
   guarda os kids antigos, exatamente como já foi provado para o ingresso emitido (vetor 4
   da INGQR-REV). Trocar o kid ativo muda só o que passa a ser assinado dali em diante.
2. **Tirar o kid do ring revoga em massa** tudo que aquele kid assinou. É a alavanca de
   emergência, e é a única que age sobre muita gente de uma vez.
3. **Re-emitir o ingresso de um inscrito invalida o link antigo dele**, porque a assinatura
   cobre o `qrToken` vigente. Isso dá revogação individual sem campo novo, sem coleção nova e
   sem contador, e é a mesma semântica que o balcão já aplica quando o token apresentado não
   bate com o gravado.

**O link não tem prazo de validade.** O ingresso é comprovante de compra e é aberto na fila
da largada, meses depois da compra. Um prazo dentro do token criaria "ingresso vencido no dia
do evento" e exigiria uma máquina de reemissão que não existe. O que muda com o tempo é o
estado do inscrito, lido a cada abertura.

## RN-421 · O que a página mostra em cada estado

| Estado | Página |
|---|---|
| `confirmado`, com `qrToken`, sem `checkinEm` | QR, código e dados mínimos |
| `confirmado`, com `checkinEm` | O mesmo, com o estado de credenciamento em destaque e o carimbo; **o QR continua visível** |
| `confirmado`, sem `qrToken` | Aviso de emissão em andamento e o código quando houver; **nunca um QR quebrado** |
| `pendente` | Sem QR; pagamento ainda não confirmado |
| `cancelado` ou `estornado` | **Sem QR**; o que aconteceu, em texto; o código permanece só para atendimento |
| Evento encerrado | Abre como histórico, com aviso, sem QR |
| Token não verifica, inscrito ou evento não existe | Resposta única e genérica |

Ingresso estornado ou cancelado não mostra QR porque mostrar convida a pessoa a viajar até o
evento e ser barrada na fila. A tranca continua no servidor; a página só não mente. Ingresso
já credenciado mantém o QR porque escondê-lo não protege nada (o servidor já recusa o replay)
e tira da pessoa a conferência de que o ingresso é o dela.

A página degrada com honestidade quando a leitura falha: estado de erro legível, nunca uma
tela de erro genérica do framework.

## RN-422 · Dado mínimo e cabeçalhos de privacidade

**Exibe:** nome do titular, evento com data e local, modalidade, kit e tamanho quando houver,
código identificador, estado.

**Não exibe:** CPF, telefone, e-mail, data de nascimento, endereço, contato de emergência,
resposta de formulário, valor pago e qualquer dado de outro inscrito do mesmo pedido.

Cabeçalhos obrigatórios na rota, os três com motivo:

- `noindex, nofollow` — sem isso, buscador indexa ingresso de gente.
- `Referrer-Policy: no-referrer` — sem isso, o token sai no `Referer` de todo link de saída.
- `Cache-Control: no-store` — o token está na URL; CDN e proxy não guardam a resposta.

**Encaminhar o link é encaminhar o ingresso**, do mesmo jeito que encaminhar o e-mail já era.
Isso é propriedade declarada, não defeito. Transferência formal de titularidade tem casa
própria (E13-S1316) e não passa por aqui.

## RN-423 · Base pública única por ambiente, e o link do ingresso no e-mail

- A base pública das URLs do produto vem do ambiente, **uma só**, compartilhada pela
  superfície pública e pelas Functions. O domínio hardcoded sai do código. O valor do domínio
  continua sendo decisão do dono (item 12); o que a regra resolve é a máquina.
- O e-mail da compra (RN-398) ganha, **por inscrito**, o link do ingresso daquele inscrito.
  Um link por inscrito, não um por pedido: o token é por inscrito, e é isso que resolve o QR
  invisível para cada pessoa da compra.
- **O código em texto permanece sempre**, do jeito que a RN-398 já promete. O link é
  acréscimo, não substituição.
- **O QR embutido permanece** no corpo do e-mail. Quem tem cliente que renderiza continua
  vendo sem clicar; quem não tem, clica. A página é a degradação, não a troca.
- **Sem base configurada, o e-mail sai sem link.** Nunca um link quebrado, nunca um link para
  domínio que não é da Leela.

## RN-424 · O PDF do ingresso é a página em versão imprimível (amplia a RN-220)

A rota imprimível de `/ingresso/{token}` entrega o mesmo ingresso em folha A4, com CSS de
impressão e sem navegação. O PDF é gerado pelo navegador de quem imprime.

- Isso satisfaz o `S1206-T7` (código identificador no PDF): o código está na página, e a
  página é o PDF. A task sai do bloqueio por falta de superfície.
- Nenhuma dependência de geração de PDF entra no repo agora. Um Chromium dentro da Function
  custa memória na casa do gigabyte e cold start na casa dos dez segundos; uma biblioteca de
  desenho obriga a manter um segundo layout do ingresso, que diverge da página no primeiro
  ajuste de marca.
- PDF anexado ao e-mail, gerado no servidor, continua **fora de escopo** e vira lane própria
  se o dono pedir.

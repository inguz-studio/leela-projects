# Estratégia de testes · Leela

> Consolida `be-hero-documentacao/be-hero-docs/estrategia-testes.md` para a fase de código. Princípio: **testar comportamento e regras de negócio (RN), não implementação.** Os critérios de aceite (Given/When/Then) e `SPEC-02-comportamentos.md` são a especificação dos testes.

---

## Pirâmide

```
        e2e (poucos, fluxos críticos)
     integração (Firestore rules, Functions, pagamento)
  unit (base larga: domínio/core, RNs, componentes DS)
```

---

## Unit (base)

Foco no `packages/core` (domínio puro, sem I/O) e componentes isolados.

- Cálculo de pontos de desafio + bônus (RN-115: +20% se 3 pilares/dia, +10% se 5+ dias/semana).
- Validação de código de convite (5 chars maiúsculos, exclui 0/O/1/I/L — RN-101).
- Derivação de `status` de membro (novo <7d, inativo 30d+ — RN-102).
- Validações de formulário: título comunicado ≥5, push ≤160 (RN-134), min por pilar do Modelo C (RN-111).
- Segmentação (tamanho estimado por tipo de segmento).
- Componentes do design system (render + variantes/estados).

Ferramentas (a confirmar no E00): **Vitest** + **Testing Library**.

## Integração (meio)

Front ↔ backend, e regras que só existem na fronteira.

- **Firestore Security Rules** (emulator): profissional só acessa seus clubes/eventos; agregados só escrevíveis por Function; atleta lê só o próprio + público.
- **Cloud Functions** de agregado: idempotência (reprocessar não duplica conversão/contagem).
- **Pagamento (cobertura crítica — risco financeiro):** `PaymentProvider` mock/sandbox — criar cobrança, **split de afiliação**, webhook de confirmação idempotente, reembolso.
- **Auth:** custom claims dirigem autorização; login social.
- **Persistência dos N:N** (Desafio↔Ação, Kit↔Item).

Ferramentas: **Firebase Emulator Suite** + Vitest.

## E2E (topo — 5 fluxos críticos)

Rodam contra emulador + build.

1. Criar e publicar desafio (Modelo C, min por pilar).
2. Aceitar parceria → link master rastreável → conversão registrada na janela de atribuição.
3. Comunicado segmentado (push trunca 160; respeita limite 4/semana — RN-133/134).
4. **Inscrição → pagamento → confirmação** (fluxo transacional; split para afiliado).
5. Balcão de entrega → vincular chip → check-in (retirar kit = presença — RN-205; conflito de chip — RN-206).

Ferramentas: **Playwright** (web painel + landing), **Detox** ou **Maestro** (mobile Expo).

---

## Casos de teste prioritários (das RNs)

- Modelo C exige mínimo por pilar antes de publicar (RN-111).
- Bônus de pontuação corretos (RN-115).
- Vínculo de evento adiciona copy "(Preparação para [evento])" (RN-113).
- Comissão é read-only para o clube (RN-120/122) — clube só aceita/recusa.
- Link master atribui conversão dentro da janela (RN-125/311).
- Push trunca em 160 e bloqueia 5º push na semana (RN-133/134).
- Ações destrutivas exigem confirmação com preview; export de dados por 90 dias (RN-144).
- Preço de evento bloqueado após 1ª venda (RN-200).
- "Sem kit" é kit válido com preço **zero ou positivo** (RN-506; a RN-211, que aceitava negativo, foi revogada em 05/08). Dois casos que não podem faltar: a Rule recusa `preco < 0` e `preco` fora de centavo exato; e uma cotação sobre documento **legado** negativo continua fechando, porque `precoKitValido` é predicado de leitura e não pode apertar. O valor `sem_kit` do enum do inscrito é rótulo e continua vivo (RN-507) — removê-lo tem de deixar vermelha a suíte do credenciamento. Passo do chip suprimido quando `usaChip=false` (RN-207).

---

## Cobertura

- **Alta** em `core` (RNs) e no design system.
- **Máxima** na camada de pagamento (split, webhooks, reembolso).
- Não se exige 100% — exige-se que todo critério de aceite tenha teste correspondente.

---

*Cada task declara, no seu bloco "Testes a escrever", quais níveis toca.*

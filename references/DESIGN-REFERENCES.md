# Referências de design — Leela (carregar no reinício de sessão)

> Pasta de referências externas (Figma, protótipos, logos, benchmarks) para o maestro/agentes acessarem entre sessões. Apontada pelo `.nirvana/HANDOFF.md`. Adicione novos links aqui.

## Figma — arquivo "V1 - DS" (`pP90MWzw03NNlRpXicFt6Q`)

Arquivo único que contém a **fonte de verdade de design** da V1: ícones v1, fundação de componentes (que originou o design no "claude design" / o design system `@leela/design-system`), wireframes e logos.

| Referência | Link | node-id |
|---|---|---|
| **Logos** da Leela | https://www.figma.com/design/pP90MWzw03NNlRpXicFt6Q/V1---DS?node-id=112-51 | `112-51` |
| **Wireframes — Eventos e Clubs** (feitos pelo Vitor) | https://www.figma.com/design/pP90MWzw03NNlRpXicFt6Q/V1---DS?node-id=39-872 | `39-872` |
| **Wireframes — SÓ Eventos e Desafios** (mais focado/barato) | https://www.figma.com/design/pP90MWzw03NNlRpXicFt6Q/V1---DS?node-id=112-4622 | `112-4622` |

**Snapshots salvos** (PNG em `references/figma-snapshots/`): `wireframes-eventos-desafios-112-4622.png` (jornada de compra completa) + `wireframes-eventos-clubes-39-872.png`. Logos em `brand/leela-logos-variantes.png` (5 variantes de cor; SVG individual por variante = exportar os nós `112:5/13/21/29/37` quando aplicar).

**Mapa das telas do wireframe `112-4622` (mobile, DARK, vermelho/marrom da marca):**
1. **Página do evento** ("Corrida do Campeche") — hero com imagem, info (data/local/chip), "Eventos em alta", CTA **"Realizar inscrição"** fixo no rodapé.
2. **Seleção de modalidade** — steppers +/- por modalidade + código de inscrição.
3. **Formulário de inscrição** — dados do atleta (CPF, nome, nascimento, telefone, LGPD); múltiplas inscrições.
4. **Resumo do pedido** → **Pagamento** (PIX / Cartão) → **Confirmação com QR** ("Identificador do Pedido", Pix copia-e-cola).
5. **Social/Clube** — perfil de clube (tabs Feed/Eventos), **desafios + ranking**, telas de pagamento de clube/desafio.
6. **Bottom-nav do app:** Feed · Eventos · Clubs · Perfil (base do modelo de rede social + link-in-bio).

**Notas do Vitor (2026-07-12):**
- Nesta página do Figma ele organizou a **v1 de ícones** + o **embasamento de componentes** que originou o DS ("claude design").
- **Prioridade de refino:** a **página do evento + checkout + jornada de compra** deve ser refinada à fidelidade destes wireframes (a base é o app mobile).
- **Identidade = DARK** (tema `brasa` do DS). A landing pública foi alinhada a isso.

## Benchmarks (já no repo)

- `leela-specs/discovery/benchmark-cheers.md` — marketplace + página de ingresso + (referência p/ o link-in-bio / perfil social).
- `leela-specs/discovery/benchmark-shotgun.md`, `benchmark-ticketing-br.md`, `benchmark-stayf.md`, `benchmark-wellable.md`.

## Visão de produto anexa (a planejar — não implementada)

- **Perfil social / link-in-bio:** Feed · Eventos · Clubs, personalizável na identidade de cada organizador (tematização dinâmica por usuário = "mockup de cores"). Clubes e eventos têm **capa**. Benchmark: Cheers. Épico novo a planejar.

## Como usar (Figma MCP)

Com o link acima, usar `mcp__claude_ai_Figma__get_design_context` / `get_screenshot` / `get_metadata` / `download_assets` sobre o `node-id`. Ex.: screenshot do node `39-872` (wireframes) para refinar a página do evento.

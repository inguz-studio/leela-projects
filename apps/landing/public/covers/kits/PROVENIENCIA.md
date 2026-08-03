# Acervo local de fotos de kit — origem, licença e data

Assets servidos pela cascata de `apps/landing/lib/kitImagem.ts` **só em preview**
(degraus 2 e 4). Em produção, kit sem foto real recebe o placeholder padrão Leela.

**Sem hotlink.** Todo arquivo é baixado uma vez, versionado aqui e servido pelo próprio
domínio. Nenhuma superfície do produto aponta para o CDN de terceiro em tempo de execução.

## Licença

Todas as fotos abaixo estão sob a **Unsplash License** (uso livre, inclusive comercial,
sem exigência de atribuição). O crédito abaixo é registro interno de proveniência, não
obrigação da licença. Fotos do **Unsplash+** (licença paga, `plus.unsplash.com`) foram
descartadas na curadoria e **não entram** neste acervo.

## Critérios de curadoria

1. A foto tem de ler como **o kit** — o objeto que o participante recebe. Foto de pessoa
   praticando ilustra a experiência, não o kit, e foi descartada.
2. **Sem marca de terceiro legível.** Candidatas com logotipo ou nome de marca em destaque
   foram descartadas (uma camiseta com estampa "connect" e etiqueta de marca; um tapete com
   logotipo grande).
3. Recorte 1:1 em 800×800, qualidade 62 — o mesmo perfil do acervo que já existia.

## Lote S1218-T4 (B9 · 2026-08-03)

Pedido do dono, verbatim: *"na visualização do kit, seria interessante você colocar imagens
reais, de camisetas ou kits fitness com de yoga, por exemplo, para ilustrar melhor para o
usuário tester."*

| Arquivo | Tema | Origem (canônica) | Fotógrafo | Bytes |
|---|---|---|---|---|
| `leela-kit-camiseta-evento.jpg` | camiseta | `https://images.unsplash.com/photo-1562157873-818bc0726f68` | Md Salman (@mohammadsalman) | 50.365 |
| `leela-kit-fitness.jpg` | fitness | `https://images.unsplash.com/photo-1697129392091-d08875930fec` | Stavros Papadimitriou | 107.816 |
| `leela-kit-ioga.jpg` | ioga | `https://images.unsplash.com/photo-1592432678016-e910b452f9a2` | não identificado (a página é renderizada por JS e não expõe o nome em HTML estático) | 45.541 |

Baixadas em **2026-08-03**.

## Lote KIT-IMG-LANDING (2026-07-19)

Registro migrado de `outputs/leela-build-2d6ee98d/KIT-IMG-LANDING-REPORT.md`, que continua
sendo o relatório daquele lote. A tabela vive aqui porque proveniência tem de morar ao lado
do arquivo — relatório de lote é histórico, acervo é permanente.

| Arquivo | Tema | Origem (canônica) | Bytes |
|---|---|---|---|
| `leela-kit-apparel-bundle.jpg` | corrida (ouro/prata) | `https://unsplash.com/photos/photo-1620799140408-edc6dcb6d633` | 58.135 |
| `leela-kit-tee.jpg` | corrida (básico/genérico) | `https://unsplash.com/photos/photo-1521572163474-6864f9cf17ab` | 49.857 |
| `leela-kit-ciclismo.jpg` | ciclismo | `https://unsplash.com/photos/photo-1541625810516-44f1ce894bcd` | 145.231 |
| `leela-kit-trail.jpg` | trail | `https://unsplash.com/photos/photo-1551632811-561732d1e306` | 177.528 |
| `leela-kit-wellness.jpg` | wellness/bem-estar | `https://unsplash.com/photos/photo-1584735935682-2f2b69dff9d2` | 141.303 |

## Não é foto

`leela-kit-placeholder.svg` é o placeholder padrão Leela (wordmark verde-limão sobre fundo
brasa), desenhado no projeto. É o default de **produção** — nunca uma foto que o organizador
não tirou.

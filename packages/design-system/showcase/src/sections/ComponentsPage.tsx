/**
 * Componentes — galeria por categoria, com exemplos vivos e interativos.
 * Toda demo usa o componente REAL do DS com as props reais do fonte.
 */

import * as React from 'react';
import {
  Alert,
  Avatar,
  Badge,
  BarChart,
  Breadcrumb,
  Button,
  CardDesafio,
  CardDominio,
  CardEvento,
  Checkbox,
  CheckboxField,
  Chip,
  Combobox,
  DEFAULT_SIDEBAR_SECTIONS,
  DatePicker,
  DateRangePicker,
  DefinitionItem,
  DonutChart,
  ConfirmModal,
  Dialog,
  Divider,
  Drawer,
  DropdownMenu,
  EmptyState,
  Field,
  FieldGroup,
  FileInput,
  FilterBar,
  FilterChips,
  FilterMenu,
  FormGrid,
  IconButton,
  Input,
  KpiCard,
  MetricGrid,
  Modal,
  PageHeader,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Radio,
  RadioCard,
  RadioGroup,
  ResultCount,
  SearchInput,
  Select,
  Sidebar,
  SectionHeader,
  Skeleton,
  SplitPanel,
  Stack,
  Stepper,
  SubNav,
  Switch,
  Table,
  Tabs,
  Textarea,
  Thumb,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useToast,
  type BadgeProps,
  type DateRange,
  type TableColumn,
} from '@leela/design-system';
import { Bell, CalendarDays, Flame, MapPin, MoreVertical, SearchX, Users } from 'lucide-react';
import { DemoCard, Section } from '../ui';

// ---------------------------------------------------------------------------
// Helpers locais
// ---------------------------------------------------------------------------

function dsIcon(Icon: typeof Flame, className?: string): JSX.Element {
  return (
    <Icon
      aria-hidden
      className={cn(
        'w-[var(--icon-size)] h-[var(--icon-size)] [stroke-width:var(--icon-stroke)]',
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Dados da Table
// ---------------------------------------------------------------------------

interface EventoRow {
  id: string;
  nome: string;
  data: string;
  status: 'aberto' | 'lotado' | 'encerrado';
  inscritos: number;
}

const EVENTOS: EventoRow[] = [
  { id: 'e1', nome: 'Corrida da Brasa 5K', data: '12 ago 2026', status: 'aberto', inscritos: 342 },
  { id: 'e2', nome: 'Desafio Vulcão Trail', data: '23 ago 2026', status: 'lotado', inscritos: 500 },
  { id: 'e3', nome: 'Pedal Noturno Leela', data: '30 ago 2026', status: 'aberto', inscritos: 128 },
  { id: 'e4', nome: 'Meia do Cerrado', data: '06 set 2026', status: 'encerrado', inscritos: 897 },
];

const STATUS_BADGE: Record<EventoRow['status'], { variant: BadgeProps['variant']; label: string }> = {
  aberto: { variant: 'vitoria', label: 'Aberto' },
  lotado: { variant: 'alerta', label: 'Lotado' },
  encerrado: { variant: 'neutro', label: 'Encerrado' },
};

const EVENTO_COLUMNS: TableColumn<EventoRow>[] = [
  { key: 'nome', header: 'Evento' },
  { key: 'data', header: 'Data' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge variant={STATUS_BADGE[row.status].variant}>{STATUS_BADGE[row.status].label}</Badge>
    ),
  },
  { key: 'inscritos', header: 'Inscritos', align: 'right' },
];

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function ComponentsPage(): JSX.Element {
  const { toast } = useToast();

  // Estados das demos interativas
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [rowMenuOpen, setRowMenuOpen] = React.useState<string | null>(null);
  const [filtros, setFiltros] = React.useState<string[]>(['5k']);
  const [filtroStatus, setFiltroStatus] = React.useState<string[]>([]);
  const [chipRemovido, setChipRemovido] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [subnavAtiva, setSubnavAtiva] = React.useState('inscritos');
  const [etapa, setEtapa] = React.useState(2);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [confirmAberto, setConfirmAberto] = React.useState(false);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const dialogTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [drawerAberto, setDrawerAberto] = React.useState(false);
  const [busca, setBusca] = React.useState('');
  const [kitSel, setKitSel] = React.useState('');
  const [check1, setCheck1] = React.useState(false);
  const [check2, setCheck2] = React.useState(true);
  const [descricao, setDescricao] = React.useState('');
  const [origem, setOrigem] = React.useState('organizador');
  const [modeloDemo, setModeloDemo] = React.useState('C');
  const [inscricoesAbertas, setInscricoesAbertas] = React.useState(true);
  const [eventoPublico, setEventoPublico] = React.useState(false);
  const [fieldNome, setFieldNome] = React.useState('');
  const [comboModalidade, setComboModalidade] = React.useState<string | string[]>('');
  const [comboKits, setComboKits] = React.useState<string | string[]>([]);
  const [dataEvento, setDataEvento] = React.useState<Date | undefined>(undefined);
  const [periodoVendas, setPeriodoVendas] = React.useState<DateRange | undefined>(undefined);
  const [buscaGlobal, setBuscaGlobal] = React.useState('');
  const [flatKit, setFlatKit] = React.useState<string | string[]>('');
  // Onda C0 (CANONE-1) — as cinco peças de controle e montagem.
  const [facetaStatus, setFacetaStatus] = React.useState<string[]>([]);
  const [facetaCanais, setFacetaCanais] = React.useState<string[]>(['email']);
  const [buscaBarra, setBuscaBarra] = React.useState('');
  const [aceiteTermos, setAceiteTermos] = React.useState(false);
  const [avisoInscricao, setAvisoInscricao] = React.useState(true);
  const [avisoResumo, setAvisoResumo] = React.useState(false);

  function toggleFiltro(id: string): void {
    setFiltros((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  return (
    <>
      {/* ── Moldura ───────────────────────────────────────────────────── */}
      <Section
        title="Moldura"
        description="Stack, FormGrid, MetricGrid, SplitPanel e SectionHeader — as peças que nasceram na Onda 0 Parte B (CANONE-1). O DS publicava 50 componentes e nenhum era layout: 106 lugares do painel montavam moldura à mão em 23 receitas para três famílias. Cada peça abaixo fecha a escala de uma delas."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Stack"
            description="Empilhamento vertical com ritmo. Sete degraus fechados; --spacing-5 ficou de fora de propósito (é o único sem papel declarado na moldura)."
          >
            <Stack gap="md">
              {(['xs', 'sm', 'md', 'lg'] as const).map((gap) => (
                <Stack key={gap} gap="xs">
                  <span className="text-[length:var(--font-size-sm)] uppercase tracking-[var(--section-eyebrow-spacing)] text-[var(--text-tertiary)]">
                    gap={gap}
                  </span>
                  <Stack gap={gap}>
                    <div className="rounded-ds-sm bg-[var(--surface-overlay)] px-[var(--spacing-3)] py-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                      um
                    </div>
                    <div className="rounded-ds-sm bg-[var(--surface-overlay)] px-[var(--spacing-3)] py-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                      dois
                    </div>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </DemoCard>

          <DemoCard
            title="FormGrid"
            description="A grade de formulário: uma coluna no estreito, duas ou três a partir de um degrau. Aposentou oito receitas. Campo de linha inteira entra por col-span-full no filho."
          >
            <FormGrid>
              <Input label="Nome do evento" placeholder="Meia Floripa" />
              <Input label="Cidade" placeholder="Florianópolis" />
              <div className="col-span-full">
                <Input label="Observações" placeholder="col-span-full" />
              </div>
            </FormGrid>
          </DemoCard>

          <DemoCard
            title="MetricGrid"
            description="A grade de indicadores, na escada fixa do preset: 1 coluna abaixo de 480px, 2 a partir de xs, N a partir de lg. Executa a decisão do REDESIGN-V2 item 6 — abaixo de 480 o rótulo do KPI corta."
          >
            <MetricGrid>
              <KpiCard label="Inscritos" value="1.284" hint="vs. 7 dias" />
              <KpiCard label="Pagos" value="1.102" />
              <KpiCard label="Pendentes" value="182" tone="danger" />
              <KpiCard label="Receita" value="R$ 42.180,00" />
            </MetricGrid>
          </DemoCard>

          <DemoCard
            title="SplitPanel"
            description="O bento assimétrico de dois painéis. As três proporções medidas são token (--layout-split-3-2 / -7-3 / -1-3), não classe arbitrária: foi a classe arbitrária que produziu cinco receitas."
          >
            <Stack gap="md">
              {(['3:2', '7:3', '1:3'] as const).map((ratio) => (
                <Stack key={ratio} gap="xs">
                  <span className="text-[length:var(--font-size-sm)] uppercase tracking-[var(--section-eyebrow-spacing)] text-[var(--text-tertiary)]">
                    ratio={ratio}
                  </span>
                  <SplitPanel ratio={ratio} gap="sm">
                    <div className="rounded-ds-sm bg-[var(--surface-overlay)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                      principal
                    </div>
                    <div className="rounded-ds-sm bg-[var(--surface-overlay)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                      apoio
                    </div>
                  </SplitPanel>
                </Stack>
              ))}
            </Stack>
          </DemoCard>

          <DemoCard
            title="SectionHeader"
            description="O cabeçalho de BLOCO interno — o PageHeader é de página. A anatomia é do design system; o que é interativo entra por slot (help, control, action), e é isso que mantém a peça pura e utilizável em Server Component."
          >
            <Stack gap="lg">
              <SectionHeader title="Situação dos membros" />
              <SectionHeader
                title="Inscrições por dia"
                titleAs="h3"
                description="Últimos 30 dias, por data de confirmação."
                help={
                  <IconButton aria-label='O que "Inscrições por dia" mostra'>
                    {dsIcon(Bell)}
                  </IconButton>
                }
                control={<Chip active>30 dias</Chip>}
                action={
                  <span className="text-[length:var(--section-link-size)] text-[var(--text-tertiary)]">
                    Ver tudo
                  </span>
                }
              />
            </Stack>
          </DemoCard>

          <DemoCard
            title="DefinitionItem"
            description="O par rótulo + valor em pé, para ficha e resumo. ResponsavelCard e FichaDoClienteDrawer montavam cada um a própria versão — decisão da Onda C0 fechada na Onda C6: a ausência (null, undefined ou string vazia) cai sempre no mesmo emptyLabel, prop por campo quando a ausência tem causa que vale nomear."
          >
            <FormGrid as="dl" columns={2}>
              <DefinitionItem label="Nome" value="Marina Castelo" />
              <DefinitionItem label="E-mail" value="marina@demo.dev" />
              <DefinitionItem label="Telefone" value={undefined} />
              <DefinitionItem
                label="CPF"
                value={null}
                emptyLabel="Não coletado. O CPF vem dos dados pessoais da inscrição."
                size="sm"
              />
            </FormGrid>
          </DemoCard>

          <DemoCard
            title="CardDominio"
            description="O cartão de entidade em lista: clube, comunicado, campanha, parceria e afiliação. UMA peça para as cinco famílias — elas têm a mesma anatomia, e cinco corpos iguais seriam cinco motores para manter em sincronia (a lição do ConfirmModal). A superfície vem do Card, composta, nunca reescrita."
          >
            <Stack gap="md">
              <CardDominio
                title="Clube Vento Sul"
                leading={<Avatar name="Clube Vento Sul" size="lg" />}
                badges={<Badge variant="brand">Corrida</Badge>}
                meta={<span>312 membros · 4 desafios</span>}
                actions={
                  <IconButton aria-label="Ações de Clube Vento Sul">
                    {dsIcon(MoreVertical)}
                  </IconButton>
                }
              />
              <CardDominio
                title="Retirada de kit começa quinta"
                accent="vitoria"
                badges={<Badge variant="vitoria">Enviado</Badge>}
                description="A retirada acontece na loja parceira, das 10h às 20h, mediante documento com foto. Quem não retirar até sábado pega no dia da prova."
                meta={<span>WhatsApp + e-mail · 1.102 alcançados</span>}
              />
              <CardDominio
                title="Meia Floripa 2026"
                description="Comissão 12% · cupom VENTO12 · janela de 30 dias"
                actions={<Badge variant="heroico">Convite pendente</Badge>}
                footer={
                  <>
                    <Button variant="ghost">Recusar</Button>
                    <Button variant="primary">Aceitar</Button>
                  </>
                }
              />
            </Stack>
          </DemoCard>
        </div>
      </Section>

      {/* ── Filtro e montagem de controle ──────────────────────────────── */}
      <Section
        title="Filtro e montagem de controle"
        description="FilterBar, FilterChips, ResultCount, CheckboxField e FieldGroup — as cinco peças da Onda C0 (CANONE-1). A medição de 12/08 encontrou 134 ocorrências nas seis famílias de controle: a procedência do CONTROLE está certa (zero campo cru, zero checkbox nativo, zero combobox artesanal), e o que foi recriado 59 vezes é o que fica EM VOLTA dele."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="FilterChips"
            description="A faceta de um filtro. A peça conta as opções e escolhe o desenho: fileira de Chip abaixo de quatro valores, FilterMenu (empilhável) ou Combobox (exclusiva) a partir de quatro. Doze telas montaram isso à mão, e as doze escolheram diferente."
          >
            <Stack gap="md">
              <FilterChips
                label="Filtrar por status"
                options={[
                  { id: 'rascunho', label: 'Rascunho', count: 3 },
                  { id: 'agendado', label: 'Agendado', count: 7 },
                  { id: 'enviado', label: 'Enviado', count: 41 },
                ]}
                allCount={51}
                selected={facetaStatus}
                onChange={setFacetaStatus}
              />
              <FilterChips
                label="Canal"
                multiple
                options={[
                  { id: 'email', label: 'E-mail' },
                  { id: 'push', label: 'Push' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'sms', label: 'SMS' },
                ]}
                selected={facetaCanais}
                onChange={setFacetaCanais}
              />
            </Stack>
          </DemoCard>

          <DemoCard
            title="FilterBar"
            description="A barra que hospeda busca, facetas, contador e ação. Compõe o Toolbar — dele vêm a linha de dois lados, o refluxo abaixo de lg e a hairline. O role=search fica no SearchInput: dois landmarks de busca aninhados anunciariam duas buscas onde há uma."
          >
            <FilterBar
              label="comunicados"
              search={
                <SearchInput
                  aria-label="Buscar comunicado por título"
                  placeholder="Buscar por título"
                  value={buscaBarra}
                  onChange={(e) => setBuscaBarra(e.target.value)}
                  shortcutLabel={null}
                />
              }
              facets={
                <FilterChips
                  label="Filtrar por status"
                  options={[
                    { id: 'rascunho', label: 'Rascunho' },
                    { id: 'enviado', label: 'Enviado' },
                  ]}
                  selected={facetaStatus}
                  onChange={setFacetaStatus}
                />
              }
              count={
                <ResultCount
                  visiveis={12}
                  total={40}
                  substantivo={{ singular: 'comunicado', plural: 'comunicados' }}
                />
              }
              actions={<Button variant="primary">Novo comunicado</Button>}
            />
          </DemoCard>

          <DemoCard
            title="ResultCount"
            description="O contador da lista recortada. Doze escritas da mesma frase produziram três dialetos de ARIA e duas grafias, duas delas sem canal nenhum. Com temMais o total é IGNORADO: a paginação por cursor nunca computou total, e apresentá-lo seria invenção."
          >
            <Stack gap="xs">
              <ResultCount
                visiveis={12}
                total={40}
                substantivo={{ singular: 'comunicado', plural: 'comunicados' }}
              />
              <ResultCount
                visiveis={20}
                total={999}
                temMais
                substantivo={{ singular: 'venda', plural: 'vendas' }}
              />
              <ResultCount
                visiveis={37}
                substantivo={{ singular: 'inscrito', plural: 'inscritos' }}
              />
            </Stack>
          </DemoCard>

          <DemoCard
            title="CheckboxField e FieldGroup"
            description="O par rótulo + caixinha (dezessete montagens à mão, em três dialetos) e o grupo de campos (onze fieldset, cada um reconsertando os defaults do navegador). O rótulo é um label htmlFor IRMÃO, o que deixa um link viver dentro dele; o alinhamento é ao topo sempre, porque é o único correto quando o rótulo quebra em duas linhas."
          >
            <Stack gap="md">
              <CheckboxField
                label={
                  <>
                    Li e aceito os <strong>termos da compra</strong> e a política de cancelamento.
                  </>
                }
                description="Você pode cancelar em até 7 dias."
                checked={aceiteTermos}
                onChange={(e) => setAceiteTermos(e.target.checked)}
              />
              <FieldGroup
                legend="Notificações"
                description="Valem para este evento. As da conta ficam no seu perfil."
                gap="sm"
              >
                <CheckboxField
                  label="Avisar quando alguém se inscrever"
                  checked={avisoInscricao}
                  onChange={(e) => setAvisoInscricao(e.target.checked)}
                />
                <CheckboxField
                  label="Resumo semanal do evento"
                  checked={avisoResumo}
                  onChange={(e) => setAvisoResumo(e.target.checked)}
                />
              </FieldGroup>
            </Stack>
          </DemoCard>
        </div>
      </Section>

      {/* ── Ações ─────────────────────────────────────────────────────── */}
      <Section title="Ações" description="Button, IconButton e DropdownMenu.">
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Button"
            description="Variantes primary, secondary, ghost e destructive; tamanhos sm, md, lg; estado disabled."
          >
            <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
              <Button size="sm">Pequeno</Button>
              <Button size="md">Médio</Button>
              <Button size="lg">Grande</Button>
              <Button disabled>Desabilitado</Button>
            </div>
          </DemoCard>

          <DemoCard
            title="DropdownMenu"
            description="Menu controlado com item destrutivo e item desabilitado. Teclado: setas, Home, End, Esc."
          >
            <div>
              <DropdownMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                trigger={<Button variant="secondary">Ações do evento</Button>}
                actions={[
                  {
                    id: 'editar',
                    label: 'Editar evento',
                    onClick: () => toast({ title: 'Editar evento', variant: 'info' }),
                  },
                  {
                    id: 'duplicar',
                    label: 'Duplicar',
                    onClick: () => toast({ title: 'Evento duplicado', variant: 'success' }),
                  },
                  { id: 'arquivar', label: 'Arquivar', onClick: () => undefined, disabled: true },
                  {
                    id: 'excluir',
                    label: 'Excluir',
                    destructive: true,
                    onClick: () => toast({ title: 'Exclusão solicitada', variant: 'danger' }),
                  },
                ]}
              />
            </div>
          </DemoCard>

          <DemoCard
            title="IconButton"
            description="Botão só-ícone com aria-label obrigatório e pip de notificação. É o trigger canônico do menu kebab (⋮) nas linhas de tabela/card — não recrie <button> cru com glifo de texto."
          >
            <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
              <IconButton aria-label="Ações da linha (demo)">{dsIcon(MoreVertical)}</IconButton>
              <IconButton aria-label="Notificações — 1 nova" pip>
                {dsIcon(Bell)}
              </IconButton>
              <IconButton aria-label="Ação desabilitada" disabled>
                {dsIcon(MoreVertical)}
              </IconButton>
            </div>
          </DemoCard>
        </div>
      </Section>

      {/* ── Formulários ───────────────────────────────────────────────── */}
      <Section
        title="Formulários"
        description="Input, Textarea, Select, Checkbox, Radio, Switch, Field e Chip. Todos com elemento nativo por baixo (a11y de teclado/foco/leitor de tela de fábrica), tokenizados e born-responsive."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Select"
            description="Formulário simples de BAIXA cardinalidade (governança §8): select nativo restilizado — o painel de opções é do SO, não do DS. Para filtros e seleções ricas, use o Combobox (seção Seleção rica e datas)."
          >
            <Select
              id="demo-kit"
              label="Kit"
              value={kitSel}
              onChange={(e) => setKitSel(e.target.value)}
              options={[
                { value: '', label: 'Todos os kits' },
                { value: 'kit_ouro', label: 'Kit Ouro' },
                { value: 'kit_prata', label: 'Kit Prata' },
                { value: 'kit_basico', label: 'Kit Básico' },
                { value: 'sem_kit', label: 'Sem kit' },
              ]}
            />
            <Select aria-label="Desabilitado" disabled options={[{ value: '', label: 'Indisponível' }]} />
          </DemoCard>

          <DemoCard
            title="Checkbox"
            description="Seleção por linha e 'selecionar todos' (estado indeterminate) na tabela densa. Input nativo com marca restilizada."
          >
            <div className="flex flex-col gap-[var(--spacing-3)]">
              <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
                <Checkbox checked={check1} onChange={(e) => setCheck1(e.target.checked)} />
                Selecionar inscrito
              </label>
              <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
                <Checkbox checked={check2} onChange={(e) => setCheck2(e.target.checked)} />
                Marcado
              </label>
              <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                <Checkbox aria-label="Selecionar todos" indeterminate checked={false} readOnly />
                Selecionar todos (indeterminado)
              </label>
              <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                <Checkbox disabled />
                Desabilitado
              </label>
            </div>
          </DemoCard>

          <DemoCard
            title="Input"
            description="Com label, com erro (aria-invalid + mensagem) e desabilitado."
          >
            <Input
              id="demo-busca"
              label="Buscar evento"
              placeholder="Digite o nome do evento"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Input
              id="demo-email"
              label="E-mail"
              placeholder="voce@exemplo.com"
              defaultValue="sem-arroba"
              errorMessage="Informe um e-mail válido."
            />
            <Input id="demo-bloqueado" label="Campo desabilitado" placeholder="Indisponível" disabled />
          </DemoCard>

          <DemoCard
            title="FileInput"
            description="Seleção de arquivo local (upload de imagem de perfil/capa). Input file real sr-only com nome acessível + gatilho Button; estados busy ('Enviando…') e erro inline. Burro de propósito: entrega o File — validação e upload vivem no api-client + storage.rules (LEELA-R5)."
          >
            <FileInput
              id="demo-file"
              label="Enviar foto"
              hint="JPG, PNG, WebP, GIF ou AVIF até 5MB."
              onFileSelected={() => {}}
            />
            <FileInput id="demo-file-busy" label="Durante o upload" busy onFileSelected={() => {}} />
            <FileInput
              id="demo-file-erro"
              label="Com erro"
              errorMessage="A imagem deve ter no máximo 5MB."
              onFileSelected={() => {}}
            />
          </DemoCard>

          <DemoCard
            title="Chip"
            description="Filtros com aria-pressed, chip removível (Delete/Backspace no teclado) e desabilitado."
          >
            <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
              {[
                { id: '5k', label: '5K' },
                { id: '10k', label: '10K' },
                { id: 'trail', label: 'Trail' },
                { id: 'pedal', label: 'Pedal' },
              ].map((filtro) => (
                <Chip
                  key={filtro.id}
                  active={filtros.includes(filtro.id)}
                  onClick={() => toggleFiltro(filtro.id)}
                >
                  {filtro.label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
              {!chipRemovido && (
                <Chip active onRemove={() => setChipRemovido(true)}>
                  Removível
                </Chip>
              )}
              <Chip disabled>Desabilitado</Chip>
              {chipRemovido && (
                <Button variant="ghost" size="sm" onClick={() => setChipRemovido(false)}>
                  Restaurar chip
                </Button>
              )}
            </div>
          </DemoCard>

          <DemoCard
            title="FilterMenu"
            description="Par do Chip para o outro lado do limiar Polaris: faceta com menos de 4 valores segue como fileira de Chips; com 4+ vira este dropdown de checkboxes MULTI-seleção. Compõe o DropdownMenu (motor WAI-APG) com itens menuitemcheckbox e reusa a linguagem visual do Checkbox. Vazio = 'Todos'; o gatilho resume a seleção ('Status: 2') e cada opção mostra a contagem."
          >
            <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
              <FilterMenu
                label="Status"
                options={[
                  { id: 'ativos', label: 'Ativos', count: 4 },
                  { id: 'encerrados', label: 'Encerrados', count: 2 },
                  { id: 'rascunhos', label: 'Rascunhos', count: 1 },
                ]}
                selected={filtroStatus}
                onChange={setFiltroStatus}
              />
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {filtroStatus.length === 0
                  ? 'Nenhum filtro (mostra tudo)'
                  : `Marcados: ${filtroStatus.join(', ')}`}
              </span>
            </div>
          </DemoCard>

          <DemoCard
            title="Textarea"
            description="Texto longo multi-linha (descrição, comunicado, regulamento). Mesma casca do Input — label, erro com aria-invalid e desabilitado. Textarea nativo; cresce só na vertical (resize-y) p/ não estourar no mobile."
          >
            <Textarea
              id="demo-descricao"
              label="Descrição do evento"
              placeholder="Conte o que torna esta prova especial…"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
            <Textarea
              id="demo-regulamento"
              label="Regulamento"
              defaultValue="x"
              errorMessage="O regulamento precisa de ao menos 20 caracteres."
              rows={2}
            />
          </DemoCard>

          <DemoCard
            title="Campos flat — default global (LEELA-FLAT-DEFAULT)"
            description="Decisão do Vitor (2026-07-17): campos SEM linha de borda em repouso viram o DEFAULT de todo primitivo de form (Input, Select, Textarea). O identificador visual não é mais a borda e sim o fill inset (surface-sunken); o foco segue por glow ring e o erro reacende a borda-danger (a11y do erro nunca depende só da cor). A aparência antiga com borda (§2.16) vira opt-out explícito por `variant='bordered'`. Comparação lado a lado abaixo."
          >
            <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
              <div className="flex flex-col gap-[var(--spacing-3)]">
                <span className="text-[length:var(--font-size-xs)] uppercase tracking-wide text-[var(--text-tertiary)]">
                  Default (flat — sem borda em repouso)
                </span>
                <Input id="flat-cmp-nome-flat" label="Nome do evento" placeholder="Meia Maratona Floripa" />
                {/* GATE-DS-W1: no flat, campo que abre LISTA é o Combobox (§8) —
                    abre painel do DS (Popover+Command), nunca o listbox do SO. */}
                <Combobox
                  id="flat-cmp-kit-flat"
                  aria-label="Kit"
                  placeholder="Kit"
                  searchPlaceholder="Buscar kit…"
                  emptyText="Nenhum kit encontrado."
                  value={flatKit}
                  onValueChange={setFlatKit}
                  options={[
                    { value: 'ouro', label: 'Kit Ouro' },
                    { value: 'prata', label: 'Kit Prata' },
                  ]}
                />
                <Textarea id="flat-cmp-desc-flat" label="Descrição" rows={2} placeholder="Sobre a prova…" />
                <Input
                  id="flat-cmp-erro-flat"
                  label="Com erro (borda-danger reacende)"
                  defaultValue="x"
                  errorMessage="Campo obrigatório."
                />
              </div>
              <div className="flex flex-col gap-[var(--spacing-3)]">
                <span className="text-[length:var(--font-size-xs)] uppercase tracking-wide text-[var(--text-tertiary)]">
                  Bordered (opt-out §2.16 — com borda)
                </span>
                <Input
                  id="flat-cmp-nome-bordered"
                  variant="bordered"
                  label="Nome do evento"
                  placeholder="Meia Maratona Floripa"
                />
                <Select
                  id="flat-cmp-kit-bordered"
                  variant="bordered"
                  label="Kit"
                  options={[
                    { value: 'ouro', label: 'Kit Ouro' },
                    { value: 'prata', label: 'Kit Prata' },
                  ]}
                />
                <Textarea
                  id="flat-cmp-desc-bordered"
                  variant="bordered"
                  label="Descrição"
                  rows={2}
                  placeholder="Sobre a prova…"
                />
              </div>
            </div>
          </DemoCard>

          <DemoCard
            title="Radio / RadioGroup"
            description="Seleção única exclusiva (2 a ~5 opções visíveis p/ comparar). Radio nativo — navegação por seta e role de fábrica. O grupo é fieldset+legend; injeta name/checked/onChange por contexto."
          >
            <RadioGroup
              name="demo-origem"
              label="Origem do item do kit"
              value={origem}
              onValueChange={setOrigem}
            >
              <Radio value="organizador" label="Organizador" description="Custo entra no seu resultado." />
              <Radio value="patrocinador" label="Patrocinador" description="Custeado pela marca parceira." />
            </RadioGroup>
            <RadioGroup name="demo-invalido" label="Com erro" value="" errorMessage="Escolha uma origem.">
              <Radio value="a" label="Opção A" />
              <Radio value="b" label="Opção B" />
            </RadioGroup>
          </DemoCard>

          <DemoCard
            title="RadioCard"
            description="Radio de conteúdo rico (título + descrição + selo) para ESCOLHA DE DECISÃO — quando cada opção precisa de contexto p/ decidir. Mesmo motor do Radio (input nativo, seta/foco/role de fábrica); a moldura marcada = --action-primary. É o padrão certo p/ modelo de desafio e segmentação, no lugar de chip/pill."
          >
            <RadioGroup
              name="demo-modelo"
              label="Modelo de conclusão"
              value={modeloDemo}
              onValueChange={setModeloDemo}
            >
              <RadioCard
                value="A"
                title="Meta por ação"
                description="Cada ação tem sua meta. Concluir = bater todas as obrigatórias."
                badge={<Badge variant="neutro">Mais simples</Badge>}
              />
              <RadioCard
                value="B"
                title="Meta de pontos"
                description="Ações somam pontos; o membro mistura o mix que quiser até a meta total."
                badge={<Badge variant="vitoria">Flexível</Badge>}
              />
              <RadioCard
                value="C"
                title="Equilíbrio mínimo"
                description="Meta total + mínimo em cada pilar. Único que opera os 3 pilares da Be Hero."
                badge={<Badge variant="heroico">Be Hero signature</Badge>}
              >
                <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                  Sub-conteúdo revelado quando este card está marcado.
                </p>
              </RadioCard>
            </RadioGroup>
          </DemoCard>

          <DemoCard
            title="Switch"
            description="Liga/desliga de efeito imediato, sem Salvar (settings). Checkbox nativo com role=switch — o leitor de tela anuncia 'ligado/desligado'. Para on/off que só vale no Submit, use Checkbox."
          >
            <Switch
              id="demo-inscricoes"
              label="Inscrições abertas"
              description="Fecha ou reabre as vendas na hora."
              checked={inscricoesAbertas}
              onCheckedChange={setInscricoesAbertas}
            />
            <Switch
              id="demo-publico"
              label="Evento público"
              description="Aparece na busca e na vitrine."
              checked={eventoPublico}
              onCheckedChange={setEventoPublico}
            />
            <Switch aria-label="Desabilitado" disabled />
          </DemoCard>

          <DemoCard
            title="Field"
            description="Casca reusável p/ QUALQUER controle cru: label + descrição + erro + required/invalid/disabled com aria ligado automaticamente (id, aria-describedby, aria-invalid injetados no filho). Input/Select/Textarea já trazem a própria casca."
          >
            <Field
              label="Nome do club"
              htmlFor="demo-field-nome"
              description="Vira o endereço público, não muda depois."
              required
              {...(fieldNome.trim().length === 0 ? { errorMessage: 'Informe o nome.' } : {})}
            >
              {/* GATE-DS-W1: controle cru do demo segue o FLAT default (fill sunken,
                  sem linha de borda) — antes estava bordered, contradizendo a
                  própria decisão documentada no card ao lado. */}
              <input
                value={fieldNome}
                onChange={(e) => setFieldNome(e.target.value)}
                className="h-[var(--input-height)] w-full rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[color:var(--input-border-flat)] bg-[var(--surface-sunken)] px-[var(--input-px)] text-[length:var(--input-font-size)] text-[var(--text-primary)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </DemoCard>

          <DemoCard
            title="SearchInput"
            description="Campo de busca canônico do DS (ícone + kbd de atalho + Enter submete). É o padrão para busca em listas/tabelas do painel — não recrie <input type='search'> na tela."
          >
            <SearchInput
              aria-label="Buscar evento (demo)"
              placeholder="Buscar evento, inscrito, kit…"
              value={buscaGlobal}
              onChange={(e) => setBuscaGlobal(e.target.value)}
              onSubmit={() => undefined}
            />
            <SearchInput aria-label="Busca desabilitada" placeholder="Indisponível" disabled shortcutLabel={null} />
          </DemoCard>
        </div>
      </Section>

      {/* ── Seleção rica e datas (§8 shadcn) ──────────────────────────── */}
      <Section
        title="Seleção rica e datas (§8 shadcn)"
        description="Popover (âncora) + Command (lista filtrável WAI-APG) + Combobox + DatePicker/DateRangePicker (react-day-picker). Governança §8: filtros, seleções ricas e calendários abrem painel do DS — nunca o listbox/calendário do SO."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Combobox — seleção única"
            description="Popover + Command: lista filtrável com teclado completo. Substitui o <select> nativo em filtros e seleções ricas (§8)."
          >
            <Combobox
              aria-label="Modalidade"
              placeholder="Modalidade"
              searchPlaceholder="Buscar modalidade…"
              emptyText="Nenhuma modalidade encontrada."
              value={comboModalidade}
              onValueChange={setComboModalidade}
              options={[
                { value: '5k', label: 'Corrida 5K' },
                { value: '10k', label: 'Corrida 10K' },
                { value: '21k', label: 'Meia maratona' },
                { value: 'mtb', label: 'MTB 40km' },
                { value: 'kids', label: 'Kids' },
              ]}
            />
          </DemoCard>

          <DemoCard
            title="Combobox — multi-seleção"
            description="Mesma anatomia com marcação múltipla; o trigger resume a seleção."
          >
            <Combobox
              aria-label="Kits"
              placeholder="Kits"
              searchPlaceholder="Buscar kit…"
              emptyText="Nenhum kit encontrado."
              multiple
              value={comboKits}
              onValueChange={setComboKits}
              options={[
                { value: 'kit_ouro', label: 'Kit Ouro' },
                { value: 'kit_prata', label: 'Kit Prata' },
                { value: 'kit_basico', label: 'Kit Básico' },
                { value: 'sem_kit', label: 'Sem kit' },
              ]}
            />
          </DemoCard>

          <DemoCard
            title="DatePicker"
            description="Calendário react-day-picker ancorado em Popover (§8) — nunca <input type='date'> do SO."
          >
            <DatePicker
              aria-label="Data do evento"
              placeholder="Data do evento"
              value={dataEvento}
              onValueChange={setDataEvento}
            />
          </DemoCard>

          <DemoCard
            title="DateRangePicker"
            description="Intervalo (de–até) para janelas de venda, lotes e análise financeira."
          >
            <DateRangePicker
              aria-label="Período de vendas"
              placeholder="Período de vendas"
              value={periodoVendas}
              onValueChange={setPeriodoVendas}
            />
          </DemoCard>

          <DemoCard
            title="Popover (primitivo de âncora)"
            description="Âncora shadcn/Radix crua — base do Combobox e dos date pickers; use para conteúdo flutuante rico ancorado num trigger."
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary">Abrir popover</Button>
              </PopoverTrigger>
              <PopoverContent align="start">
                <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                  Conteúdo do DS num painel flutuante — tokens, foco e Esc corretos.
                </p>
              </PopoverContent>
            </Popover>
          </DemoCard>
        </div>
      </Section>

      {/* ── Data display ──────────────────────────────────────────────── */}
      <Section
        title="Data display"
        description="Table, Badge, Avatar, Thumb, Card, CardEvento, CardDesafio, EmptyState e Pagination."
      >
        <DemoCard
          title="Table"
          description="Tabela densa com células renderizadas (Badge) e menu de ações por linha."
        >
          <Table<EventoRow>
            columns={EVENTO_COLUMNS}
            data={EVENTOS}
            keyExtractor={(row) => row.id}
            caption="Lista de eventos de exemplo"
            renderActions={(row) => (
              <DropdownMenu
                open={rowMenuOpen === row.id}
                onOpenChange={(o) => setRowMenuOpen(o ? row.id : null)}
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Ações de ${row.nome}`}>
                    {dsIcon(MoreVertical)}
                  </Button>
                }
                actions={[
                  {
                    id: 'ver',
                    label: 'Ver detalhes',
                    onClick: () => toast({ title: row.nome, description: 'Abrindo detalhes…' }),
                  },
                  {
                    id: 'cancelar',
                    label: 'Cancelar evento',
                    destructive: true,
                    onClick: () => toast({ title: `${row.nome} cancelado`, variant: 'danger' }),
                  },
                ]}
              />
            )}
          />
        </DemoCard>

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Badge"
            description="As seis variantes semânticas, mais a `outline` devolvida na Onda 0 Parte B — a esteira shadcn→brasa a tinha dropado, e a landing pagou com cinco pílulas escritas à mão. O eixo `size` separa o SELO (sm: 10px uppercase, radius xs) da PÍLULA (md/lg: caixa normal, radius pill): a mesma peça em outro papel."
          >
            <Stack gap="md">
              <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
                <Badge variant="brand">brand</Badge>
                <Badge variant="heroico">heroico</Badge>
                <Badge variant="vulcao">vulcao</Badge>
                <Badge variant="vitoria">vitoria</Badge>
                <Badge variant="alerta">alerta</Badge>
                <Badge variant="neutro">neutro</Badge>
                <Badge variant="outline">outline</Badge>
              </div>
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <div key={size} className="flex flex-wrap items-center gap-[var(--spacing-2)]">
                  <span className="w-[var(--spacing-12)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                    {size}
                  </span>
                  <Badge variant="outline" size={size}>
                    21K
                  </Badge>
                  <Badge variant="outline" size={size}>
                    Camiseta
                  </Badge>
                  <Badge variant="vitoria" size={size}>
                    Publicado
                  </Badge>
                </div>
              ))}
            </Stack>
          </DemoCard>

          <DemoCard
            title="Avatar"
            description="Tamanhos sm, md e lg; fallback de iniciais com gradiente determinístico; estado VIP com ring."
          >
            <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
              <Avatar size="sm" name="Ana Beatriz" />
              <Avatar size="md" name="Carlos Drummond" />
              <Avatar size="lg" name="Marina Silva" />
              <Avatar size="lg" name="Vip Runner" vip />
            </div>
          </DemoCard>

          <DemoCard
            title="Thumb"
            description="Miniatura de mídia de ENTIDADE (kit, logo de marca, capa de evento) — reconhecer de vista antes de clicar. Largura por token, altura pela razão do dado (1:1 · 1.9:1); object-cover, lazy em lista e fallback digno sem imagem ou com URL quebrada. Para PESSOA use o Avatar."
          >
            <div className="flex flex-wrap items-end gap-[var(--spacing-4)]">
              <Thumb size="sm" fallback="K" />
              <Thumb size="md" fallback="CDL" />
              <Thumb size="lg" fallback="Sem capa" ratio="wide" lazy={false} />
            </div>
          </DemoCard>

          <DemoCard
            title="CardEvento"
            description="Media 16/10 com gradiente fallback, badge de modalidade e hover com elevação. Clique dispara ação."
          >
            <CardEvento
              title="Corrida da Brasa 5K"
              modality={<Badge variant="brand">5K</Badge>}
              meta={
                <>
                  <span className="inline-flex items-center gap-[var(--spacing-1)]">
                    {dsIcon(CalendarDays, 'w-[var(--spacing-4)] h-[var(--spacing-4)]')}
                    12 ago 2026
                  </span>
                  <span className="inline-flex items-center gap-[var(--spacing-1)]">
                    {dsIcon(MapPin, 'w-[var(--spacing-4)] h-[var(--spacing-4)]')}
                    Parque da Cidade
                  </span>
                </>
              }
              footer={<Badge variant="vitoria">Inscrições abertas</Badge>}
              onClick={() => toast({ title: 'CardEvento clicado', description: 'Corrida da Brasa 5K' })}
            />
          </DemoCard>

          <DemoCard
            title="CardDesafio"
            description="Barra de progresso acessível (role progressbar); 100% acende o glow de marca."
          >
            <CardDesafio
              title="Desafio 100 km no mês"
              progress={62}
              icon={dsIcon(Flame)}
              meta={
                <span className="inline-flex items-center gap-[var(--spacing-1)]">
                  {dsIcon(Users, 'w-[var(--spacing-4)] h-[var(--spacing-4)]')}
                  1.204 participantes
                </span>
              }
            />
            <CardDesafio
              title="Sequência de 30 dias"
              progress={100}
              icon={dsIcon(Flame)}
              meta={<span>Concluído em 28 jun 2026</span>}
            />
          </DemoCard>

          <DemoCard
            title="EmptyState"
            description="Estado vazio obrigatório em listas filtráveis, com slot de ação."
          >
            <EmptyState
              title="Nenhum evento encontrado"
              description="Nenhum resultado com os filtros aplicados."
              icon={<SearchX aria-hidden className="w-[var(--spacing-12)] h-[var(--spacing-12)] [stroke-width:var(--icon-stroke)]" />}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast({ title: 'Filtros limpos', variant: 'success' })}
                >
                  Limpar filtros
                </Button>
              }
            />
          </DemoCard>

          <DemoCard
            title="Pagination"
            description="Contador, página atual e controles anterior/próximo funcionais."
          >
            <Pagination total={96} page={page} pageSize={8} onPageChange={setPage} />
          </DemoCard>

          <DemoCard
            title="KpiCard"
            description="Card flat (§2.16) de indicador — label + valor + hint. Fonte única que substituiu as 4 cópias do painel (eventos/clubes/plataforma/EstoqueView). tone='danger' pinta o valor; emphasis='critico' acende a borda Vulcão. Fluido: o consumidor monta o grid responsivo."
            className="xl:col-span-2"
          >
            <section
              aria-label="Indicadores consolidados"
              className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard label="Inscritos" value="1.284" hint="vs. 7 dias" />
              <KpiCard label="Receita confirmada" value="R$ 42.180" hint="vs. 7 dias" />
              <KpiCard label="Vagas restantes" value="—" hint="capacidade desconhecida" />
              <KpiCard label="Em risco" value="3" hint="kit(s) esgotado(s)" tone="danger" />
            </section>
          </DemoCard>
        </div>
      </Section>

      {/* ── Navegação ─────────────────────────────────────────────────── */}
      <Section
        title="Navegação"
        description="Breadcrumb, PageHeader, SubNav, Tabs, Stepper e Sidebar."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard title="Breadcrumb" description="Trilha hierárquica com aria-current no item final.">
            <Breadcrumb
              items={[
                { label: 'Eventos', href: '#/componentes' },
                { label: 'Corrida da Brasa 5K', href: '#/componentes' },
                { label: 'Inscritos' },
              ]}
            />
          </DemoCard>

          <DemoCard
            title="Sidebar"
            description="Nota: a Sidebar já é o shell desta página — a navegação à esquerda é o componente real, com seções e footer próprios do showroom."
          >
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Largura fixa de 240px (--sidebar-width), item ativo com aria-current="page",
              badges opcionais por item e SidebarFooter componível.
            </p>
          </DemoCard>

          <DemoCard
            title="PageHeader"
            description="Cabeçalho de contexto de 96px com avatar, badges, metadados e ações (também é o topo desta página)."
            className="xl:col-span-2"
          >
            <PageHeader
              className="rounded-[var(--radius-md)]"
              title="Corrida da Brasa 5K"
              subtitle="12 ago 2026 · Parque da Cidade"
              avatar={<Avatar name="Corrida Brasa" size="lg" />}
              badges={<Badge variant="vitoria">Aberto</Badge>}
              metadata={<span>342 inscritos</span>}
              actions={
                <Button size="sm" onClick={() => toast({ title: 'Nova inscrição', variant: 'success' })}>
                  Inscrever
                </Button>
              }
            />
          </DemoCard>

          <DemoCard
            title="SubNav"
            description="Navegação de seções com underline de marca, contadores e setas como atalho."
          >
            <SubNav
              className="rounded-[var(--radius-md)]"
              tabs={[
                {
                  id: 'inscritos',
                  label: 'Inscritos',
                  count: 342,
                  active: subnavAtiva === 'inscritos',
                  onClick: () => setSubnavAtiva('inscritos'),
                },
                {
                  id: 'kits',
                  label: 'Kits',
                  count: 12,
                  active: subnavAtiva === 'kits',
                  onClick: () => setSubnavAtiva('kits'),
                },
                {
                  id: 'resultados',
                  label: 'Resultados',
                  active: subnavAtiva === 'resultados',
                  onClick: () => setSubnavAtiva('resultados'),
                },
              ]}
            />
          </DemoCard>

          <DemoCard title="Tabs" description="Troca de conteúdo in-page (Radix); painéis permanecem no DOM.">
            <Tabs
              aria-label="Exemplo de abas"
              tabs={[
                {
                  id: 'detalhes',
                  label: 'Detalhes',
                  content: (
                    <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                      Percurso plano de 5 km com largada às 7h.
                    </p>
                  ),
                },
                {
                  id: 'regulamento',
                  label: 'Regulamento',
                  count: 8,
                  content: (
                    <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                      Oito cláusulas de participação e política de reembolso.
                    </p>
                  ),
                },
                {
                  id: 'faq',
                  label: 'FAQ',
                  count: 23,
                  content: (
                    <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                      Perguntas frequentes sobre kits, chip de cronometragem e hidratação.
                    </p>
                  ),
                },
              ]}
            />
          </DemoCard>

          <DemoCard
            title="Stepper"
            description="Cinco etapas com estado concluída, atual (aria-current) e futura."
            className="xl:col-span-2"
          >
            <Stepper
              current={etapa}
              steps={[
                { id: 'dados', label: 'Dados' },
                { id: 'kit', label: 'Kit' },
                { id: 'pagamento', label: 'Pagamento' },
                { id: 'revisao', label: 'Revisão' },
                { id: 'confirmacao', label: 'Confirmação' },
              ]}
            />
            <div className="flex items-center gap-[var(--spacing-3)]">
              <Button variant="secondary" size="sm" disabled={etapa === 0} onClick={() => setEtapa(etapa - 1)}>
                Voltar
              </Button>
              <Button size="sm" disabled={etapa === 4} onClick={() => setEtapa(etapa + 1)}>
                Avançar
              </Button>
            </div>
          </DemoCard>
        </div>
      </Section>

      {/* ── Feedback ──────────────────────────────────────────────────── */}
      <Section title="Feedback" description="Alert, Toast, Skeleton e Tooltip.">
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Alert"
            description="O aviso em BLOCO — Toast flutua e some, Alert fica no fluxo. Identidade de severidade via ícone + fundo suave; sem borda lateral (V2708-21). O canal de ARIA é prop (`live`) porque os três avisos originais escolheram canais diferentes, cada um com a razão escrita, e estavam certos; o default é `none`, porque aviso que já estava na tela não é live region."
          >
            <Stack gap="md">
              <Alert tone="info" live="status" title="Estamos confirmando o seu pedido">
                Confira a caixa de entrada do e-mail que você informou na compra — o acesso do
                seu ingresso vai por lá.
              </Alert>
              <Alert tone="vitoria" title="Inscrição confirmada">
                O acesso do seu ingresso já está na sua área.
              </Alert>
              <Alert tone="alerta" live="alert" title="Este pedido não foi concluído">
                A cobrança não foi confirmada e este pedido não vale mais.
              </Alert>
              <Alert
                tone="vulcao"
                live="alert"
                title="Cartão recusado"
                actions={<Button variant="secondary">Revisar dados</Button>}
              >
                Revise os dados do cartão e tente de novo.
              </Alert>
            </Stack>
          </DemoCard>

          <DemoCard
            title="Toast"
            description="Fila com auto-dismiss em 4s; a variante danger persiste até o fechamento manual."
          >
            <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast({ title: 'Alterações salvas', variant: 'success' })}
              >
                Success
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast({ title: 'Sincronizando dados', description: 'Isso leva alguns segundos.', variant: 'info' })}
              >
                Info
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast({ title: 'Vagas quase esgotadas', variant: 'warning' })}
              >
                Warning
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast({ title: 'Falha no pagamento', description: 'Este toast persiste até você fechar.', variant: 'danger' })}
              >
                Danger
              </Button>
            </div>
          </DemoCard>

          <DemoCard
            title="Skeleton"
            description="Placeholders text, rect e circle com shimmer que respeita prefers-reduced-motion."
          >
            <div className="flex items-center gap-[var(--spacing-3)]">
              <Skeleton variant="circle" className="h-[var(--avatar-size-md)] w-[var(--avatar-size-md)]" />
              <div className="flex flex-1 flex-col gap-[var(--spacing-2)]">
                <Skeleton variant="text" />
                <Skeleton variant="text" className="w-2/3" />
              </div>
            </div>
            <Skeleton variant="rect" className="h-[var(--spacing-20)] w-full" />
          </DemoCard>

          <DemoCard
            title="Tooltip"
            description="Abre em hover e em foco de teclado; fecha com Esc (WAI-APG)."
          >
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost">Passe o mouse ou foque aqui</Button>
                </TooltipTrigger>
                <TooltipContent>Dica tokenizada: bg-popover, motion por var(--motion-*)</TooltipContent>
              </Tooltip>
            </div>
          </DemoCard>

          <DemoCard title="Divider" description="Separador horizontal nas três intensidades.">
            <div className="flex flex-col">
              <Divider variant="subtle" />
              <Divider variant="default" />
              <Divider variant="strong" />
            </div>
          </DemoCard>
        </div>
      </Section>

      {/* ── Overlays ──────────────────────────────────────────────────── */}
      <Section
        title="Overlays"
        description="Modal, ConfirmModal, Dialog e Drawer — todos Radix-free (ADR-017): comportamento de diálogo (focus trap, Esc, scroll-lock, retorno de foco) é fonte única no useDialogBehavior. O DropdownMenu está em Ações."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Modal"
            description="Diálogo centrado do painel (Radix-free) com quatro vias de fechamento: X, Esc, overlay e botão do rodapé."
          >
            <div>
              <Button variant="secondary" onClick={() => setModalAberto(true)}>
                Abrir modal
              </Button>
            </div>
            <Modal
              open={modalAberto}
              onOpenChange={setModalAberto}
              title="Editar evento"
              description="Os campos abaixo usam os componentes reais do DS."
              size="md"
              footer={
                <>
                  <Button variant="secondary" onClick={() => setModalAberto(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      setModalAberto(false);
                      toast({ title: 'Evento atualizado', variant: 'success' });
                    }}
                  >
                    Salvar
                  </Button>
                </>
              }
            >
              <Input id="modal-nome" label="Nome do evento" defaultValue="Corrida da Brasa 5K" />
            </Modal>
          </DemoCard>

          <DemoCard
            title="ConfirmModal"
            description="Confirmação destrutiva com alvo, consequências, motivo e notificação."
          >
            <div>
              <Button variant="destructive" onClick={() => setConfirmAberto(true)}>
                Cancelar evento
              </Button>
            </div>
            <ConfirmModal
              open={confirmAberto}
              onOpenChange={setConfirmAberto}
              title="Cancelar Corrida da Brasa 5K?"
              description="Esta ação não pode ser desfeita."
              target={
                <p className="text-[length:var(--font-size-base)] text-[var(--text-primary)]">
                  Corrida da Brasa 5K · 342 inscritos
                </p>
              }
              loses={['Inscrições ativas serão canceladas', 'A página pública sai do ar']}
              keeps={['Histórico financeiro', 'Relatórios já exportados']}
              confirmLabel="Cancelar evento"
              reasonLabel="Motivo (opcional)"
              notifyLabel="Notificar inscritos por e-mail"
              onConfirm={({ notify }) => {
                setConfirmAberto(false);
                toast({
                  title: 'Evento cancelado',
                  description: notify ? 'Inscritos serão notificados.' : undefined,
                  variant: 'danger',
                });
              }}
            />
          </DemoCard>

          <DemoCard
            title="Dialog"
            description="Primitivo Radix-free da superfície PÚBLICA (ADR-017): entrada centralizada em todos os breakpoints — fade + zoom curto a partir do centro (V2708-22). Título com ícone, descrição, footer e retorno de foco ao gatilho (returnFocusRef). É a fonte do comportamento que Modal e Drawer reusam."
          >
            <div>
              <Button
                ref={dialogTriggerRef}
                variant="secondary"
                onClick={() => setDialogAberto(true)}
              >
                Abrir dialog
              </Button>
            </div>
            <Dialog
              open={dialogAberto}
              onOpenChange={setDialogAberto}
              title="Regulamento do evento"
              titleIcon={dsIcon(Flame)}
              description="Leia antes de confirmar a inscrição."
              returnFocusRef={dialogTriggerRef}
              footer={
                <Button variant="secondary" onClick={() => setDialogAberto(false)}>
                  Fechar
                </Button>
              }
            >
              <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
                O mesmo dialog acessível que a landing usa no RegulamentoModal —
                agora servido pelo DS. Tab cicla dentro do painel; Esc, X e o
                clique no overlay fecham; o foco volta para o botão que abriu.
              </p>
            </Dialog>
          </DemoCard>

          <DemoCard
            title="Drawer"
            description="Painel off-canvas Radix-free (RESP-M1): a MESMA Sidebar vira menu mobile abaixo de lg. Fecha por Esc, overlay e ao navegar. Slide gated por motion-safe (reduce = sem animação)."
          >
            <div>
              <Button variant="secondary" onClick={() => setDrawerAberto(true)}>
                Abrir drawer
              </Button>
            </div>
            <Drawer open={drawerAberto} onOpenChange={setDrawerAberto} title="Menu de navegação">
              <div onClick={() => setDrawerAberto(false)} className="contents">
                <Sidebar sections={DEFAULT_SIDEBAR_SECTIONS} />
              </div>
            </Drawer>
          </DemoCard>
        </div>
      </Section>

      {/* ── Gráficos ──────────────────────────────────────────────────── */}
      <Section
        title="Gráficos"
        description="BarChart e DonutChart (Recharts · ADR-010), tokenizados e acessíveis. Paleta categórica em ordem fixa (skill dataviz): validada para CVD e contraste nos temas brasa e wine; rótulo direto + legenda + tabela equivalente garantem que a identidade nunca é só-cor."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="BarChart"
            description="Barras categóricas horizontais. Magnitude por categoria com trilho recessivo, ponta arredondada 4px, rótulo direto e tooltip no hover. Aceita total por barra (x / total · %)."
          >
            <BarChart
              aria-label="Inscrições por modalidade (exemplo)"
              height={180}
              data={[
                { label: '21km', value: 148, total: 200 },
                { label: '10km', value: 186, total: 250 },
                { label: '5km', value: 119, total: 150 },
              ]}
            />
          </DemoCard>

          <DemoCard
            title="DonutChart"
            description="Rosca de composição (parte-de-um-todo). Valor-âncora no centro, legenda com valor e %, gap de 2px entre fatias e anel na surface. Tooltip por fatia no hover."
          >
            <DonutChart
              aria-label="Receita por modalidade (exemplo)"
              size={180}
              centerValue="R$ 85,6k"
              centerLabel="Receita total"
              formatValue={(v) =>
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  maximumFractionDigits: 0,
                }).format(v)
              }
              data={[
                { label: '21km', value: 41096 },
                { label: '10km', value: 27397 },
                { label: '5km', value: 17124 },
              ]}
            />
          </DemoCard>
        </div>
      </Section>
    </>
  );
}

/**
 * Componentes — galeria por categoria, com exemplos vivos e interativos.
 * Toda demo usa o componente REAL do DS com as props reais do fonte.
 */

import * as React from 'react';
import {
  Avatar,
  Badge,
  BarChart,
  Breadcrumb,
  Button,
  CardDesafio,
  CardEvento,
  Checkbox,
  Chip,
  DonutChart,
  ConfirmModal,
  Divider,
  DropdownMenu,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Stepper,
  SubNav,
  Table,
  Tabs,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useToast,
  type BadgeProps,
  type TableColumn,
} from '@leela/design-system';
import { CalendarDays, Flame, MapPin, MoreVertical, SearchX, Users } from 'lucide-react';
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
  const [chipRemovido, setChipRemovido] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [subnavAtiva, setSubnavAtiva] = React.useState('inscritos');
  const [etapa, setEtapa] = React.useState(2);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [confirmAberto, setConfirmAberto] = React.useState(false);
  const [busca, setBusca] = React.useState('');
  const [kitSel, setKitSel] = React.useState('');
  const [check1, setCheck1] = React.useState(false);
  const [check2, setCheck2] = React.useState(true);

  function toggleFiltro(id: string): void {
    setFiltros((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  return (
    <>
      {/* ── Ações ─────────────────────────────────────────────────────── */}
      <Section title="Ações" description="Button e DropdownMenu.">
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
        </div>
      </Section>

      {/* ── Formulários ───────────────────────────────────────────────── */}
      <Section title="Formulários" description="Input, Select, Checkbox e Chip.">
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Select"
            description="Filtro compacto de faceta (4-15 valores). Select nativo restilizado — a11y de teclado/leitor de tela de fábrica. Colapsa uma fileira de chips num controle."
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
        </div>
      </Section>

      {/* ── Data display ──────────────────────────────────────────────── */}
      <Section
        title="Data display"
        description="Table, Badge, Avatar, Card, CardEvento, CardDesafio, EmptyState e Pagination."
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
          <DemoCard title="Badge" description="As seis variantes semânticas.">
            <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
              <Badge variant="brand">brand</Badge>
              <Badge variant="heroico">heroico</Badge>
              <Badge variant="vulcao">vulcao</Badge>
              <Badge variant="vitoria">vitoria</Badge>
              <Badge variant="alerta">alerta</Badge>
              <Badge variant="neutro">neutro</Badge>
            </div>
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
      <Section title="Feedback" description="Toast, Skeleton e Tooltip.">
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
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
      <Section title="Overlays" description="Modal e ConfirmModal (o DropdownMenu está em Ações).">
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] xl:grid-cols-2">
          <DemoCard
            title="Modal"
            description="Diálogo Radix com quatro vias de fechamento: X, Esc, overlay e botão do rodapé."
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
        </div>
      </Section>

      {/* ── Gráficos ──────────────────────────────────────────────────── */}
      <Section
        title="Gráficos"
        description="BarChart e DonutChart (Recharts · ADR-010), tokenizados e acessíveis. Paleta categórica em ordem fixa (skill dataviz): validada para CVD e contraste nos temas brasa e leela; rótulo direto + legenda + tabela equivalente garantem que a identidade nunca é só-cor."
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

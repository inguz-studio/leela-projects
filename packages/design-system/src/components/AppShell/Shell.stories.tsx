import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from './AppShell';
import { Sidebar, DEFAULT_SIDEBAR_SECTIONS, type SidebarSection } from '../Sidebar';
import { Breadcrumb } from '../Breadcrumb';
import { PageHeader } from '../PageHeader';
import { SubNav } from '../SubNav';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { Button } from '../Button';

const SECTIONS: SidebarSection[] = DEFAULT_SIDEBAR_SECTIONS.map((section) => ({
  ...section,
  items: section.items.map((item) =>
    item.id === 'eventos' ? { ...item, badge: 3, active: true } : item,
  ),
}));

const meta: Meta<typeof AppShell> = {
  title: 'Organismos/Shell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

/** Shell completo: Sidebar 8 itens + Breadcrumb + Header 96px (§2.1) + SubNav (§2.14). */
export const Completo: Story = {
  render: () => (
    <AppShell sidebar={<Sidebar sections={SECTIONS} />}>
      <div className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)] overflow-y-auto">
        <Breadcrumb
          items={[
            { label: 'Eventos', href: '#' },
            { label: 'Meia Maratona de Floripa' },
          ]}
        />
        <PageHeader
          title="Meia Maratona de Floripa"
          subtitle="12 out 2026 · Florianópolis, SC"
          avatar={<Avatar name="Meia Maratona de Floripa" size="lg" />}
          badges={
            <>
              <Badge variant="vitoria">Publicado</Badge>
              <Badge variant="neutro">21K</Badge>
            </>
          }
          metadata={<span>1.284 inscritos · 3 kits</span>}
          actions={<Button variant="primary">Editar evento</Button>}
        />
        <SubNav
          tabs={[
            { id: 'visao', label: 'Visão geral', active: true },
            { id: 'inscritos', label: 'Inscritos', count: 1284 },
            { id: 'kits', label: 'Kits', count: 3 },
            { id: 'resultados', label: 'Resultados' },
          ]}
        />
        <p className="text-[var(--text-secondary)]">Conteúdo da rota…</p>
      </div>
    </AppShell>
  ),
};

/**
 * Ícones — os da navegação default (fonte: Sidebar.tsx do DS) e uma amostra
 * da biblioteca Lucide no padrão do DS: 24px (--icon-size), traço 1.75
 * (--icon-stroke), currentColor.
 *
 * REDESIGN-V2 · item 3: a lista da nav era escrita à mão aqui e tinha derivado
 * — anunciava 8 itens e citava "Financeiro" e "Analytics", removidos pela
 * rodada IA-MENU. Agora ela é IMPORTADA de `DEFAULT_SIDEBAR_NAV_ICONS`. Não há
 * mais lista para dessincronizar: o catálogo tem um dono só.
 */

import { cn, DEFAULT_SIDEBAR_NAV_ICONS } from '@leela/design-system';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  Flame,
  Heart,
  Lock,
  Mail,
  MapPin,
  Medal,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Share2,
  Star,
  Ticket,
  Trash2,
  Trophy,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '../ui';

// Ícones da nav default — DERIVADOS do catálogo do DS, nunca reescritos aqui.

const LIBRARY_ICONS: Array<{ icon: LucideIcon; name: string }> = [
  { icon: Search, name: 'Search' },
  { icon: Plus, name: 'Plus' },
  { icon: Pencil, name: 'Pencil' },
  { icon: Trash2, name: 'Trash2' },
  { icon: Check, name: 'Check' },
  { icon: X, name: 'X' },
  { icon: ChevronDown, name: 'ChevronDown' },
  { icon: ChevronRight, name: 'ChevronRight' },
  { icon: ArrowRight, name: 'ArrowRight' },
  { icon: Calendar, name: 'Calendar' },
  { icon: Clock, name: 'Clock' },
  { icon: MapPin, name: 'MapPin' },
  { icon: Users, name: 'Users' },
  { icon: User, name: 'User' },
  { icon: Heart, name: 'Heart' },
  { icon: Star, name: 'Star' },
  { icon: Flame, name: 'Flame' },
  { icon: Trophy, name: 'Trophy' },
  { icon: Medal, name: 'Medal' },
  { icon: Ticket, name: 'Ticket' },
  { icon: Filter, name: 'Filter' },
  { icon: Download, name: 'Download' },
  { icon: Eye, name: 'Eye' },
  { icon: Lock, name: 'Lock' },
  { icon: Mail, name: 'Mail' },
  { icon: Share2, name: 'Share2' },
  { icon: MoreVertical, name: 'MoreVertical' },
];

function IconTile({ icon: Icon, name, caption }: { icon: LucideIcon; name: string; caption?: string }): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-[var(--spacing-2)]',
        'rounded-[var(--radius-md)] bg-[var(--surface-raised)]',
        'p-[var(--spacing-4)]',
        'text-[var(--text-secondary)]',
      )}
    >
      <Icon
        aria-hidden
        className="w-[var(--icon-size)] h-[var(--icon-size)] [stroke-width:var(--icon-stroke)]"
      />
      <span className="font-mono text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
        {name}
      </span>
      {caption && (
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-secondary)]">
          {caption}
        </span>
      )}
    </div>
  );
}

export function IconsPage(): JSX.Element {
  return (
    <>
      <Section
        title="Navegação default"
        description={`Os ${DEFAULT_SIDEBAR_NAV_ICONS.length} ícones de DEFAULT_SIDEBAR_NAV_ICONS, na ordem da Sidebar do painel Be Hero.`}
      >
        <div className="grid grid-cols-2 gap-[var(--spacing-3)] md:grid-cols-4 xl:grid-cols-6">
          {DEFAULT_SIDEBAR_NAV_ICONS.map((entry) => (
            <IconTile key={entry.id} icon={entry.Icon} name={entry.iconName} caption={entry.label} />
          ))}
        </div>
      </Section>

      <Section
        title="Amostra da biblioteca"
        description="Ícones Lucide comuns no DS — sempre 24px, traço 1.75, cor herdada via currentColor."
      >
        <div className="grid grid-cols-3 gap-[var(--spacing-3)] md:grid-cols-6 xl:grid-cols-9">
          {LIBRARY_ICONS.map((entry) => (
            <IconTile key={entry.name} icon={entry.icon} name={entry.name} />
          ))}
        </div>
      </Section>
    </>
  );
}

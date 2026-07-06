/**
 * Ícones — os 8 da navegação default (fonte: Sidebar.tsx do DS) e uma amostra
 * da biblioteca Lucide no padrão do DS: 24px (--icon-size), traço 1.75
 * (--icon-stroke), currentColor.
 */

import { cn } from '@leela/design-system';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  Flame,
  Heart,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  Medal,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  Ticket,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '../ui';

// 8 ícones da nav default — nomes extraídos de DEFAULT_SIDEBAR_SECTIONS
const NAV_ICONS: Array<{ icon: LucideIcon; name: string; item: string }> = [
  { icon: LayoutDashboard, name: 'LayoutDashboard', item: 'Visão Geral' },
  { icon: CalendarDays, name: 'CalendarDays', item: 'Eventos' },
  { icon: UsersRound, name: 'UsersRound', item: 'Clubs' },
  { icon: BarChart3, name: 'BarChart3', item: 'Financeiro' },
  { icon: Bell, name: 'Bell', item: 'Comunicação' },
  { icon: Briefcase, name: 'Briefcase', item: 'Marcas' },
  { icon: TrendingUp, name: 'TrendingUp', item: 'Analytics' },
  { icon: Settings, name: 'Settings', item: 'Configurações' },
];

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
        description="Os 8 ícones de DEFAULT_SIDEBAR_SECTIONS, na ordem da Sidebar do painel Be Hero."
      >
        <div className="grid grid-cols-2 gap-[var(--spacing-3)] md:grid-cols-4 xl:grid-cols-8">
          {NAV_ICONS.map((entry) => (
            <IconTile key={entry.name} icon={entry.icon} name={entry.name} caption={entry.item} />
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

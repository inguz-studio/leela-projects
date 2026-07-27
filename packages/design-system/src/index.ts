// =============================================================================
// @leela/design-system — public API
// =============================================================================

// ── Theme ──────────────────────────────────────────────────────────────────
export {
  ThemeProvider,
  useTheme,
  getThemeInitScript,
  type Theme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './theme/ThemeProvider';

export {
  ThemeProviderRN,
  useTheme as useThemeRN,
  type ThemeProviderRNProps,
  type StorageAdapter,
  type RNThemeContextValue,
} from './theme/ThemeProviderRN';

export {
  generateCSS,
  generateRNTheme,
  collectRefs,
  resolvePath,
  flattenTokens,
  type TokenRecord,
  type FlatTokens,
} from './theme/generate';

export { brasaTheme, wineTheme } from './theme/rn-themes';

// ── Atoms ──────────────────────────────────────────────────────────────────
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export { FileInput, type FileInputProps } from './components/FileInput';
export { Select, type SelectProps, type SelectOption } from './components/Select';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { Textarea, type TextareaProps } from './components/Textarea';
export {
  Radio,
  RadioCard,
  RadioGroup,
  type RadioProps,
  type RadioCardProps,
  type RadioGroupProps,
} from './components/Radio';
export { Switch, type SwitchProps } from './components/Switch';
export { Field, type FieldProps } from './components/Field';
export { Badge, badgeVariants, type BadgeProps } from './components/Badge';
export { Chip, type ChipProps } from './components/Chip';
export { Avatar, type AvatarProps } from './components/Avatar';
// Thumb — miniatura de mídia de ENTIDADE (kit, logo, capa). Não é o Avatar
// (pessoa, circular, iniciais por nome): a razão aqui vem do dado.
export { Thumb, type ThumbProps } from './components/Thumb';
export { Divider, type DividerProps } from './components/Divider';
export { IconButton, type IconButtonProps } from './components/IconButton';
export { Sparkline, type SparklineProps } from './components/Sparkline';
export { DateBadge, type DateBadgeProps } from './components/DateBadge';
// KpiCard canônico (CONS-1) — substitui as 4 cópias do painel.
export { KpiCard, type KpiCardProps } from './components/KpiCard';

// ── Toolbar global (Lote FIDELIDADE T3) ─────────────────────────────────────
export { Toolbar, type ToolbarProps } from './components/Toolbar';
export { SearchInput, type SearchInputProps } from './components/SearchInput';

// ── Shell (S001-3-T1) ───────────────────────────────────────────────────────
export { Sidebar, DEFAULT_SIDEBAR_SECTIONS, sidebarNavIcon, SidebarBrand, SidebarFooter } from './components/Sidebar';
export type { SidebarProps, SidebarSection, SidebarItem, SidebarBadgeVariant, SidebarBrandProps, SidebarFooterProps } from './components/Sidebar';
export { Breadcrumb } from './components/Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './components/Breadcrumb';
export { PageHeader } from './components/PageHeader';
export type { PageHeaderProps } from './components/PageHeader';
export { SubNav } from './components/SubNav';
export type { SubNavProps, SubNavTab } from './components/SubNav';
export { AppShell } from './components/AppShell';
export type { AppShellProps } from './components/AppShell';

// ── Table densa & apoio (S001-3-T2) ─────────────────────────────────────────
export { Table } from './components/Table';
export type { TableProps, TableColumn } from './components/Table';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
// Estados de sistema (404/403/500/offline/manutenção) — LEELA-E07 · S500-T1.
export { SystemStateScreen } from './components/SystemStateScreen';
export type {
  SystemStateScreenProps,
  SystemStateAction,
  SystemStateVariant,
} from './components/SystemStateScreen';
export { Pagination, type PaginationProps } from './components/Pagination';
// Popover — primitivo de ÂNCORA shadcn/Radix (S-R9-05). O antigo Popover do E01
// (menu de ações) virou DropdownMenu; consumidores migrados no mesmo lote.
export {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
} from './components/Popover';
export type { PopoverContentProps } from './components/Popover';
// Command (cmdk) — lista filtrável do DS; base do Combobox (S-R9-05).
export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './components/Command';
export { Combobox } from './components/Combobox';
export type { ComboboxProps, ComboboxOption } from './components/Combobox';
// Calendar / DatePicker / DateRangePicker (react-day-picker v9, shadcn) — S-R9-05.
export { Calendar, DatePicker, DateRangePicker } from './components/Calendar';
export type {
  CalendarProps,
  DatePickerProps,
  DateRangePickerProps,
  DateRange,
} from './components/Calendar';
export { DropdownMenu } from './components/DropdownMenu';
export type { DropdownMenuProps, DropdownMenuAction } from './components/DropdownMenu';
export { FilterMenu } from './components/FilterMenu';
export type { FilterMenuProps, FilterMenuOption } from './components/FilterMenu';

// ── Modais (S001-3-T3) ──────────────────────────────────────────────────────
export { Modal, ConfirmModal } from './components/Modal';
export type { ModalProps, ModalSize, ConfirmModalProps, ConfirmModalDetails } from './components/Modal';
// Dialog Radix-free da superfície pública (ADR-017) — também disponível pelo
// subpath `@leela/design-system/dialog` (grafo sem @radix-ui p/ a landing).
export { Dialog } from './components/Dialog';
export type { DialogProps } from './components/Dialog';

// ── Drawer off-canvas (LEELA-RESP-M1-T2) ────────────────────────────────────
export { Drawer } from './components/Drawer';
export type { DrawerProps, DrawerSide } from './components/Drawer';

// ── Feedback, cards & fluxo (S001-3-T4) ─────────────────────────────────────
export { Toast, toastVariants, ToastProvider, useToast, DEFAULT_TOAST_DURATION } from './components/Toast';
export type { ToastProps, ToastVariant, ToastProviderProps, ToastOptions, ToastContextValue } from './components/Toast';
export { CardEvento } from './components/CardEvento';
export type { CardEventoProps } from './components/CardEvento';
export { EventRow } from './components/EventRow';
export type {
  EventRowProps,
  EventRowCount,
  EventRowMetric,
  EventRowThumbImage,
  EventThumbVariant,
} from './components/EventRow';
export { CardDesafio } from './components/CardDesafio';
export type { CardDesafioProps } from './components/CardDesafio';
export { Stepper } from './components/Stepper';
export type { StepperProps, StepperStep } from './components/Stepper';
export { Skeleton } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';
export { Tabs } from './components/Tabs';
export type { TabsProps, TabItem } from './components/Tabs';

// ── shadcn+brasa (PoC Lote A · brief ds-consolidacao) ──────────────────────
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/Tooltip';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card';
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './components/Card';

// ── Gráficos (Recharts · ADR-010 · lote FID-EVT-T2) ─────────────────────────
export { BarChart, DonutChart, chartCategoryVar, formatChartInt, pctOf, CHART_CATEGORY_COUNT } from './components/charts';
export type { BarChartProps, BarChartDatum, DonutChartProps, DonutChartDatum } from './components/charts';

// ── Utilities ──────────────────────────────────────────────────────────────
export { cn } from './utils/cn';

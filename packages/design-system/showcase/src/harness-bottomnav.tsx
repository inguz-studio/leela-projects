/**
 * Ponto de entrada do harness-bottomnav.html — ver o comentário lá para o
 * porquê deste arquivo existir. Renderiza SÓ o BottomNav (sem AppShell, sem
 * roteamento), com o item ativo escolhido por `?active=<id>` na URL.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BottomNav, bottomNavIcon } from '@leela/design-system';
import { Heart, LayoutDashboard, Ticket, User } from 'lucide-react';
import './showcase.css';

const QUATRO = [
  { id: 'visao-geral', label: 'Visão geral', icon: bottomNavIcon(LayoutDashboard), href: '/' },
  { id: 'eventos', label: 'Eventos', icon: bottomNavIcon(Ticket), href: '/eventos' },
  { id: 'clubs', label: 'Clubs', icon: bottomNavIcon(Heart), href: '/clubes' },
  { id: 'crm', label: 'CRM', icon: bottomNavIcon(User), href: '/crm' },
];

const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento #root não encontrado no harness-bottomnav.html.');
}

const params = new URLSearchParams(window.location.search);
const ativo = params.get('active') ?? 'eventos';
const items = QUATRO.map((i) => ({ ...i, active: i.id === ativo }));

createRoot(container).render(
  <React.StrictMode>
    <BottomNav items={items} />
  </React.StrictMode>,
);

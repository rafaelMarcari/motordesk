/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bell, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { SystemNotification, User } from '../types';

interface NotificationToastPopupProps {
  notifications: SystemNotification[];
  currentUser: User;
  onMarkAsRead: (notificationId: string) => void;
  onNavigateToView: (viewId: string) => void;
}

export default function NotificationToastPopup({
  notifications,
  currentUser,
  onMarkAsRead,
  onNavigateToView
}: NotificationToastPopupProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Only show if user has accessNotifications permission
  if (!currentUser.permissions?.accessNotifications) {
    return null;
  }

  // Get active unread notifications that haven't been dismissed in UI
  const userCompanyId = currentUser.companyId || 'comp-1';
  const activeToastList = notifications.filter(
    n => !n.read && !dismissedIds.includes(n.id) && (n.companyId || 'comp-1') === userCompanyId
  ).slice(0, 3); // Max 3 popups stacked at bottom right

  if (activeToastList.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const handleAction = (n: SystemNotification) => {
    onMarkAsRead(n.id);
    handleDismiss(n.id);

    if (n.type === 'receivable_due' || n.type === 'credit_limit_exceeded') {
      onNavigateToView('accountsReceivable');
    } else if (n.type === 'payable_due') {
      onNavigateToView('accountsPayable');
    } else if (n.type === 'sale_created' || n.type === 'budget_converted_to_sale') {
      onNavigateToView('sales');
    } else if (n.type === 'stock_low' || n.type === 'stock_expired') {
      onNavigateToView('parts');
    } else if (n.type === 'service_order_created' || n.type === 'os_closed_by_mechanic') {
      onNavigateToView('serviceOrders');
    } else if (n.type === 'budget_created' || n.type === 'budget_converted') {
      onNavigateToView('budgets');
    } else {
      onNavigateToView('dashboard');
    }
  };

  return (
    <div 
      id="notification-toast-container"
      className="fixed bottom-5 right-5 z-50 space-y-3 max-w-sm w-full pointer-events-none"
    >
      {activeToastList.map(n => {
        const isCreditAlert = n.type === 'credit_limit_exceeded';

        return (
          <div
            key={n.id}
            id={`toast-popup-${n.id}`}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 flex items-start gap-3 backdrop-blur-md animate-slide-up ${
              isCreditAlert 
                ? 'bg-rose-900/95 text-white border-rose-700 shadow-rose-900/40' 
                : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-900/40'
            }`}
          >
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              isCreditAlert ? 'bg-rose-800 text-rose-200 animate-pulse' : 'bg-indigo-800 text-indigo-200'
            }`}>
              {isCreditAlert ? <ShieldAlert className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold font-display tracking-tight text-white truncate">
                  {n.title}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(n.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-xs text-slate-200 mt-1 leading-snug line-clamp-3">
                {n.message}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  id={`btn-toast-action-${n.id}`}
                  onClick={() => handleAction(n)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                    isCreditAlert 
                      ? 'bg-rose-700 hover:bg-rose-600 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isCreditAlert ? 'Analisar e Liberar' : 'Ver Detalhes'} <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  id={`btn-toast-mark-read-${n.id}`}
                  onClick={() => { onMarkAsRead(n.id); handleDismiss(n.id); }}
                  className="text-[11px] text-slate-300 hover:text-white px-2 py-1 transition"
                >
                  Marcar Lida
                </button>
              </div>
            </div>

            <button
              id={`btn-toast-close-${n.id}`}
              onClick={() => handleDismiss(n.id)}
              className="text-slate-400 hover:text-white p-1 transition"
              title="Fechar Pop-up"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

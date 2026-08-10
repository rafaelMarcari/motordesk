/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Part, Budget, ServiceOrder, SystemNotification, AlertSettings, HistoryEntry, Client, Vehicle } from '../types';
import { AppDatabase } from '../data/mockData';

export interface PartStockDetails {
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  isLowStock: boolean;
  minStock: number;
}

/**
 * Calculates total, reserved, and available stock for a specific part.
 * Reserved stock comes from active non-expired budgets that have not yet been converted into Service Orders.
 */
export function getPartStockDetails(
  part: Part,
  budgets: Budget[] = [],
  serviceOrders: ServiceOrder[] = []
): PartStockDetails {
  const now = Date.now();
  let reservedStock = 0;

  budgets.forEach(b => {
    // Check if budget is active (not rejected, expired, or converted to OS)
    if (b.status === 'rejected' || b.status === 'expired') return;

    // Check if budget has expired based on validityDays
    const createdAtMs = new Date(b.createdAt).getTime();
    const validityMs = (b.validityDays || 10) * 86400000;
    const isExpired = (createdAtMs + validityMs) < now;
    if (isExpired) return;

    // Check if Service Order already exists for this budget
    const hasOS = serviceOrders.some(os => os.budgetId === b.id);
    if (hasOS) return;

    // Sum quantities for this part
    if (b.items && Array.isArray(b.items)) {
      b.items.forEach(item => {
        if (
          item.type === 'part' &&
          item.itemId === part.id &&
          (item.status === 'pending' || item.status === 'approved')
        ) {
          reservedStock += item.quantity;
        }
      });
    }
  });

  const availableStock = Math.max(0, part.stock - reservedStock);
  const minStock = part.minStock ?? 5;
  const isLowStock = availableStock <= minStock;

  return {
    totalStock: part.stock,
    reservedStock,
    availableStock,
    isLowStock,
    minStock
  };
}

/**
 * Sweeps the database for expired budgets whose validity window has passed without turning into an OS.
 * Marks them as expired, releases reserved items, and generates a notification.
 */
export function sweepExpiredBudgets(db: AppDatabase): {
  updatedBudgets: Budget[];
  newNotifications: SystemNotification[];
  newHistoryLogs: HistoryEntry[];
  expiredCount: number;
} {
  const now = Date.now();
  const alertSettings = db.alertSettings || {
    enableLowStockAlerts: true,
    enableBudgetCreatedAlerts: true,
    enableServiceOrderCreatedAlerts: true,
    enableBudgetConvertedAlerts: true,
    enableStockReservedExpirationAlerts: true,
    defaultBudgetValidityDays: 10
  };

  let expiredCount = 0;
  const newNotifications: SystemNotification[] = [];
  const newHistoryLogs: HistoryEntry[] = [];

  const updatedBudgets = db.budgets.map(budget => {
    // Skip if already expired, rejected, or converted
    if (budget.status === 'expired' || budget.status === 'rejected') return budget;

    const hasOS = db.serviceOrders.some(os => os.budgetId === budget.id);
    if (hasOS) return budget;

    const createdAtMs = new Date(budget.createdAt).getTime();
    const validityMs = (budget.validityDays || alertSettings.defaultBudgetValidityDays || 10) * 86400000;
    const isExpired = (createdAtMs + validityMs) < now;

    if (isExpired) {
      expiredCount++;
      const expiredBudget: Budget = {
        ...budget,
        status: 'expired'
      };

      // Count reserved part items released back
      const releasedPartItems = budget.items.filter(i => i.type === 'part' && (i.status === 'pending' || i.status === 'approved'));
      const releasedQty = releasedPartItems.reduce((sum, i) => sum + i.quantity, 0);

      // Notification
      if (alertSettings.enableStockReservedExpirationAlerts) {
        newNotifications.push({
          id: `notif-exp-${budget.id}-${Date.now()}`,
          companyId: budget.companyId || 'comp-1',
          type: 'stock_expired',
          title: 'Prazo do Orçamento Expirado - Reserva Liberada',
          message: `O orçamento #${budget.id} venceu o prazo de validade de ${budget.validityDays || 10} dias. ${releasedQty} item(ns) de peças foram desvinculados da reserva e retornaram 100% disponíveis ao estoque.`,
          date: new Date().toISOString(),
          read: false,
          metadata: {
            budgetId: budget.id,
            releasedItemsCount: releasedQty
          }
        });
      }

      // History
      newHistoryLogs.push({
        id: `hst-exp-${budget.id}-${Date.now()}`,
        vehicleId: budget.vehicleId,
        clientId: budget.clientId,
        companyId: budget.companyId || 'comp-1',
        type: 'budget',
        title: 'Orçamento Expirado - Estoque Liberado',
        description: `O prazo de validade do Orçamento #${budget.id} (${budget.validityDays} dias) expirou sem conversão em OS. A reserva de ${releasedQty} peças foi liberada e está disponível no estoque.`,
        date: new Date().toISOString(),
        userId: 'system',
        userName: 'Sistema MotorDesk (Automação de Validade)'
      });

      return expiredBudget;
    }

    return budget;
  });

  return {
    updatedBudgets,
    newNotifications,
    newHistoryLogs,
    expiredCount
  };
}

/**
 * Checks all parts in inventory and generates low stock notifications if enabled.
 */
export function checkLowStockAlerts(db: AppDatabase): SystemNotification[] {
  const alertSettings = db.alertSettings;
  if (alertSettings && !alertSettings.enableLowStockAlerts) return [];

  const notifications: SystemNotification[] = [];
  const existingNotifications = db.notifications || [];

  db.parts.forEach(part => {
    const details = getPartStockDetails(part, db.budgets, db.serviceOrders);
    if (details.isLowStock) {
      // Check if we already alerted about this part today
      const todayStr = new Date().toISOString().slice(0, 10);
      const alreadyAlertedToday = existingNotifications.some(
        n => n.type === 'stock_low' && n.metadata?.partId === part.id && n.date.slice(0, 10) === todayStr
      );

      if (!alreadyAlertedToday) {
        notifications.push({
          id: `notif-low-${part.id}-${Date.now()}`,
          companyId: part.companyId || 'comp-1',
          type: 'stock_low',
          title: 'Alerta de Estoque Baixo',
          message: `A peça "${part.name}" (${part.code}) possui apenas ${details.availableStock} unidade(s) disponível(is) para venda/uso (Estoque Mínimo: ${details.minStock}).`,
          date: new Date().toISOString(),
          read: false,
          metadata: {
            partId: part.id,
            partName: part.name,
            availableStock: details.availableStock,
            minStock: details.minStock
          }
        });
      }
    }
  });

  return notifications;
}

export interface ReservingBudgetInfo {
  budgetId: string;
  clientName: string;
  vehicleInfo: string;
  quantity: number;
  createdAt: string;
  validityDays: number;
  expirationDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  status: string;
}

/**
 * Finds all active non-expired budgets holding stock reservations for a specific part.
 */
export function getReservingBudgetsForPart(
  partId: string,
  budgets: Budget[] = [],
  serviceOrders: ServiceOrder[] = [],
  clients: Client[] = [],
  vehicles: Vehicle[] = [],
  excludeBudgetId?: string
): ReservingBudgetInfo[] {
  const now = Date.now();
  const results: ReservingBudgetInfo[] = [];

  budgets.forEach(b => {
    if (excludeBudgetId && b.id === excludeBudgetId) return;
    if (b.status === 'rejected' || b.status === 'expired') return;

    // Check if Service Order already created
    const hasOS = serviceOrders.some(os => os.budgetId === b.id);
    if (hasOS) return;

    const createdAtMs = new Date(b.createdAt).getTime();
    const validityDays = b.validityDays || 10;
    const expirationMs = createdAtMs + validityDays * 86400000;
    if (expirationMs < now) return; // Expired

    // Find quantity reserved for partId in this budget
    let reservedQty = 0;
    if (b.items && Array.isArray(b.items)) {
      b.items.forEach(item => {
        if (
          item.type === 'part' &&
          item.itemId === partId &&
          (item.status === 'pending' || item.status === 'approved')
        ) {
          reservedQty += item.quantity;
        }
      });
    }

    if (reservedQty > 0) {
      const client = clients.find(c => c.id === b.clientId);
      const vehicle = vehicles.find(v => v.id === b.vehicleId);
      const diffMs = expirationMs - now;
      const daysRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const hoursRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

      const expDate = new Date(expirationMs);
      const expDateStr = `${expDate.getDate().toString().padStart(2, '0')}/${(expDate.getMonth() + 1).toString().padStart(2, '0')}/${expDate.getFullYear()}`;

      results.push({
        budgetId: b.id,
        clientName: client?.name || 'Cliente não identificado',
        vehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'Veículo não informado',
        quantity: reservedQty,
        createdAt: b.createdAt,
        validityDays,
        expirationDate: expDateStr,
        daysRemaining,
        hoursRemaining,
        isExpired: false,
        status: b.status === 'approved' ? 'Aprovado' : b.status === 'partially_approved' ? 'Parcialmente Aprovado' : 'Pendente'
      });
    }
  });

  return results;
}

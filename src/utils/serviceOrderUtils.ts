/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceOrder, Budget, OSItem } from '../types';

/**
 * Synchronizes Service Orders with their corresponding Budgets.
 * Ensures that if a Budget was approved, updated, or edited (e.g., items added or prices changed),
 * the corresponding Service Order contains all approved/active budget items.
 */
export function syncServiceOrdersWithBudgets(
  serviceOrders: ServiceOrder[],
  budgets: Budget[]
): { updatedOrders: ServiceOrder[]; hasChanges: boolean } {
  let hasChanges = false;

  const updatedOrders = serviceOrders.map(os => {
    if (!os.budgetId) return os;
    const budget = budgets.find(b => b.id === os.budgetId);
    if (!budget) return os;

    // Filter items from budget that should be in the OS:
    // If budget is approved or partially_approved, include approved items or pending items (if budget is approved)
    const validBudgetItems = budget.items.filter(item => {
      if (item.status === 'approved') return true;
      if (budget.status === 'approved' && item.status !== 'rejected' && item.status !== 'postponed') return true;
      if (item.status === 'pending' && budget.status === 'approved') return true;
      return false;
    });

    let osItemsChanged = false;
    const currentOSItems = [...os.items];

    validBudgetItems.forEach(bItem => {
      const existingIdx = currentOSItems.findIndex(i =>
        (i.itemId === bItem.itemId && i.type === bItem.type) ||
        (i.name && bItem.name && i.name.trim().toLowerCase() === bItem.name.trim().toLowerCase())
      );

      if (existingIdx >= 0) {
        const existing = currentOSItems[existingIdx];
        if (
          existing.quantity !== bItem.quantity ||
          existing.unitPrice !== bItem.unitPrice ||
          existing.totalPrice !== (bItem.quantity * bItem.unitPrice) ||
          existing.name !== bItem.name
        ) {
          currentOSItems[existingIdx] = {
            ...existing,
            name: bItem.name,
            quantity: bItem.quantity,
            unitPrice: bItem.unitPrice,
            totalPrice: bItem.quantity * bItem.unitPrice
          };
          osItemsChanged = true;
        }
      } else {
        // Missing item from budget!
        currentOSItems.push({
          id: `os-it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: bItem.type,
          itemId: bItem.itemId,
          name: bItem.name,
          quantity: bItem.quantity,
          unitPrice: bItem.unitPrice,
          totalPrice: bItem.quantity * bItem.unitPrice,
          status: 'pending',
          source: 'budget'
        });
        osItemsChanged = true;
      }
    });

    if (osItemsChanged) {
      hasChanges = true;
      return {
        ...os,
        items: currentOSItems
      };
    }

    return os;
  });

  return { updatedOrders, hasChanges };
}

export interface ActiveWarrantyInfo {
  os: ServiceOrder;
  completedAtDate: Date;
  warrantyEndDate: Date;
  daysRemaining: number;
  warrantyDaysTotal: number;
  itemsSummary: string[];
  notes: string;
  customerComplaint: string;
  technicalRecommendations: string;
}

export interface VehicleWarrantyCheckResult {
  hasActiveWarranty: boolean;
  activeWarranties: ActiveWarrantyInfo[];
}

/**
 * Checks if a vehicle has any active warranty from previously completed Service Orders.
 * Standard automotive warranty is 90 days or custom os.warrantyDays.
 */
export function checkVehicleWarrantyStatus(
  vehicleId: string,
  serviceOrders: ServiceOrder[],
  defaultWarrantyDays = 90
): VehicleWarrantyCheckResult {
  if (!vehicleId || !serviceOrders || serviceOrders.length === 0) {
    return { hasActiveWarranty: false, activeWarranties: [] };
  }

  const now = new Date();
  const activeWarranties: ActiveWarrantyInfo[] = [];

  serviceOrders.forEach(os => {
    if (os.vehicleId === vehicleId && (os.status === 'completed' || os.completedAt || os.serviceDate)) {
      const completionStr = os.completedAt || os.serviceDate || os.createdAt;
      const completedDate = new Date(completionStr);
      if (isNaN(completedDate.getTime())) return;

      const warrantyDays = os.warrantyDays || defaultWarrantyDays;
      const warrantyEndDate = new Date(completedDate.getTime() + warrantyDays * 24 * 60 * 60 * 1000);

      if (now <= warrantyEndDate) {
        const diffMs = warrantyEndDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        const itemsSummary = (os.items || []).map(i => `${i.name} (${i.quantity}x)`);

        activeWarranties.push({
          os,
          completedAtDate: completedDate,
          warrantyEndDate,
          daysRemaining,
          warrantyDaysTotal: warrantyDays,
          itemsSummary,
          notes: os.notes || '',
          customerComplaint: os.customerComplaint || '',
          technicalRecommendations: os.technicalRecommendations || ''
        });
      }
    }
  });

  return {
    hasActiveWarranty: activeWarranties.length > 0,
    activeWarranties
  };
}

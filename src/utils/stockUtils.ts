/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Part, 
  Budget, 
  ServiceOrder, 
  SystemNotification, 
  AlertSettings, 
  HistoryEntry, 
  Client, 
  Vehicle, 
  CompanyInfo, 
  CommercialSale, 
  GoodsWithdrawalOrder 
} from '../types';
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
 * Reserved stock comes from:
 * 1. Active non-expired budgets (only if company has budgetStockReservationMode === 'reserve_while_valid')
 *    that have NOT yet been converted to Service Order or Commercial Sale.
 * 2. Active GoodsWithdrawalOrders / CommercialSales awaiting separation, pickup, or delivery.
 * 
 * Guarantees zero duplication when budgets are converted to Sales or Service Orders.
 */
export function getPartStockDetails(
  part: Part,
  budgets: Budget[] = [],
  serviceOrders: ServiceOrder[] = [],
  companyInfo?: CompanyInfo | null,
  sales: CommercialSale[] = [],
  goodsWithdrawals: GoodsWithdrawalOrder[] = []
): PartStockDetails {
  const now = Date.now();
  let reservedStock = 0;

  const partCompanyId = part.companyId;

  // 1. Orçamentos: Somente reservam se o modo da empresa for 'reserve_while_valid' (padrão quando não 'none')
  const shouldReserveBudgets = companyInfo?.budgetStockReservationMode !== 'none';

  if (shouldReserveBudgets && Array.isArray(budgets)) {
    budgets.forEach(b => {
      // Isolamento por companyId se ambos existirem
      if (partCompanyId && b.companyId && b.companyId !== partCompanyId) return;

      // Status inativo não reserva
      if (b.status === 'rejected' || b.status === 'expired') return;
      if (b.stockReservationStatus === 'RELEASED' || b.stockReservationStatus === 'EXPIRED') return;

      // Se já foi convertido para OS ou Venda, a reserva foi assumida pelo documento de destino
      const hasOS = serviceOrders.some(os => os.budgetId === b.id || os.id === b.serviceOrderId);
      if (hasOS) return;

      const hasSale = sales.some(s => s.budgetId === b.id || s.id === b.saleId);
      if (hasSale) return;

      // Validação de prazo de expiração
      const createdAtMs = new Date(b.createdAt).getTime();
      const validityDays = b.validityDays || companyInfo?.budgetStockReservationValidityDays || 10;
      const validityMs = validityDays * 86400000;
      const isExpired = (createdAtMs + validityMs) < now;
      if (isExpired) return;

      // Soma quantidades deste item de peça no orçamento
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
  }

  // 2. Pedidos de Retirada / Vendas Comerciais aguardando expedição física
  if (Array.isArray(goodsWithdrawals) && goodsWithdrawals.length > 0) {
    goodsWithdrawals.forEach(gw => {
      if (partCompanyId && gw.companyId && gw.companyId !== partCompanyId) return;
      // Reservas ativas: AGUARDANDO_SEPARACAO, EM_SEPARACAO, PARCIALMENTE_SEPARADO, PRONTO_RETIRADA, PRONTO_ENTREGA
      // Não conta se já RETIRADO, ENTREGUE ou CANCELADO (pois ou já baixou fisicamente ou foi cancelado)
      if (['AGUARDANDO_SEPARACAO', 'EM_SEPARACAO', 'PARCIALMENTE_SEPARADO', 'PRONTO_RETIRADA', 'PRONTO_ENTREGA'].includes(gw.status)) {
        if (gw.items && Array.isArray(gw.items)) {
          gw.items.forEach(item => {
            if (item.partId === part.id) {
              const pendingQty = item.quantityReserved !== undefined 
                ? item.quantityReserved 
                : Math.max(0, (item.quantitySold || 0) - (item.quantityReleased || 0));
              reservedStock += pendingQty;
            }
          });
        }
      }
    });
  }

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
 * Sweeps the database for expired budgets whose validity window has passed without turning into an OS or Sale.
 * Marks them as expired, releases reserved items idempotently, and generates a notification.
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
    // Idempotência: Pular se já expirado, rejeitado, cancelado ou com reserva já liberada
    if (budget.status === 'expired' || budget.status === 'rejected') return budget;
    if (budget.stockReservationStatus === 'EXPIRED') return budget;

    // Pular se já convertido em OS ou Venda Comercial
    const hasOS = db.serviceOrders?.some(os => os.budgetId === budget.id || os.id === budget.serviceOrderId);
    if (hasOS) return budget;

    const hasSale = db.sales?.some(s => s.budgetId === budget.id || s.id === budget.saleId);
    if (hasSale) return budget;

    const createdAtMs = new Date(budget.createdAt).getTime();
    const validityDays = budget.validityDays || alertSettings.defaultBudgetValidityDays || 10;
    const validityMs = validityDays * 86400000;
    const isExpired = (createdAtMs + validityMs) < now;

    if (isExpired) {
      expiredCount++;
      const expiredBudget: Budget = {
        ...budget,
        status: 'expired',
        stockReservationStatus: 'EXPIRED'
      };

      // Contabiliza peças liberadas
      const releasedPartItems = (budget.items || []).filter(i => i.type === 'part' && (i.status === 'pending' || i.status === 'approved'));
      const releasedQty = releasedPartItems.reduce((sum, i) => sum + i.quantity, 0);

      // Notificação
      if (alertSettings.enableStockReservedExpirationAlerts) {
        newNotifications.push({
          id: `notif-exp-${budget.id}-${Date.now()}`,
          companyId: budget.companyId || 'comp-1',
          type: 'stock_expired',
          title: 'Prazo do Orçamento Expirado - Reserva Liberada',
          message: `O orçamento #${budget.id} venceu o prazo de validade de ${validityDays} dias. ${releasedQty > 0 ? `${releasedQty} item(ns) de peças foram desvinculados da reserva e retornaram ao estoque disponível.` : 'Orçamento expirado automaticamente.'}`,
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
        vehicleId: budget.vehicleId || '',
        clientId: budget.clientId,
        companyId: budget.companyId || 'comp-1',
        type: 'budget',
        title: 'Orçamento Expirado - Estoque Liberado',
        description: `O prazo de validade do Orçamento #${budget.id} (${validityDays} dias) expirou sem conversão em OS/Venda. A reserva de ${releasedQty} peças foi liberada e está disponível no estoque.`,
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
    const details = getPartStockDetails(part, db.budgets, db.serviceOrders, db.companyInfo, db.sales, db.goodsWithdrawals);
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
 * Checks pending receivables and payables and generates due date notifications based on user configured notice days.
 */
export function checkFinancialDueAlerts(db: AppDatabase): SystemNotification[] {
  const alertSettings = db.alertSettings;
  const notifications: SystemNotification[] = [];
  const existingNotifications = db.notifications || [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMs = new Date(`${todayStr}T00:00:00`).getTime();

  // 1. Contas a Receber (Faturas de Clientes / Vendas / OS)
  const enableReceivables = alertSettings ? alertSettings.enableReceivableDueAlerts !== false : true;
  const recNoticeDays = alertSettings?.receivableDueNoticeDays ?? 3;

  if (enableReceivables && db.accountsReceivable && Array.isArray(db.accountsReceivable)) {
    db.accountsReceivable.forEach(rec => {
      if (rec.status === 'paid') return;

      const dueMs = new Date(`${rec.dueDate}T00:00:00`).getTime();
      const diffMs = dueMs - todayMs;
      const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysDiff <= recNoticeDays) {
        const client = (db.clients || []).find(c => c.id === rec.clientId);
        const clientName = client?.name || rec.clientName || 'Cliente';
        const amount = rec.remainingAmount ?? rec.totalAmount ?? 0;
        const amountFormatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Deduplicação diária
        const alreadyAlerted = existingNotifications.some(
          n => n.type === 'receivable_due' && n.metadata?.receivableId === rec.id && n.date.slice(0, 10) === todayStr
        );

        if (!alreadyAlerted) {
          let title = `Fatura a Vencer em ${daysDiff} dia(s)`;
          let msg = `A fatura #${rec.code || rec.id} de ${clientName} no valor de ${amountFormatted} vence em ${daysDiff} dia(s) (${rec.dueDate}).`;

          if (daysDiff === 0) {
            title = 'Fatura Vence HOJE';
            msg = `A fatura #${rec.code || rec.id} de ${clientName} no valor de ${amountFormatted} vence HOJE (${rec.dueDate}).`;
          } else if (daysDiff < 0) {
            title = 'Fatura Vencida (Cobrança Pendente)';
            msg = `A fatura #${rec.code || rec.id} de ${clientName} no valor de ${amountFormatted} está vencida há ${Math.abs(daysDiff)} dia(s) (Vencimento: ${rec.dueDate}).`;
          }

          notifications.push({
            id: `notif-rec-${rec.id}-${Date.now()}`,
            companyId: rec.companyId || 'comp-1',
            type: 'receivable_due',
            title,
            message: msg,
            date: new Date().toISOString(),
            read: false,
            metadata: {
              receivableId: rec.id,
              clientId: rec.clientId,
              clientName,
              amount,
              dueDate: rec.dueDate,
              daysDiff
            }
          });
        }
      }
    });
  }

  // 2. Contas a Pagar (Duplicatas / Fornecedores / Despesas)
  const enablePayables = alertSettings ? alertSettings.enablePayableDueAlerts !== false : true;
  const payNoticeDays = alertSettings?.payableDueNoticeDays ?? 5;

  if (enablePayables && db.accountsPayable && Array.isArray(db.accountsPayable)) {
    db.accountsPayable.forEach(pay => {
      if (pay.status === 'paid') return;

      const dueMs = new Date(`${pay.dueDate}T00:00:00`).getTime();
      const diffMs = dueMs - todayMs;
      const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysDiff <= payNoticeDays) {
        const supplier = (db.suppliers || []).find(s => s.id === pay.supplierId);
        const supplierName = supplier?.tradeName || supplier?.name || pay.supplierName || 'Fornecedor';
        const amount = pay.remainingAmount ?? pay.totalAmount ?? 0;
        const amountFormatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Deduplicação diária
        const alreadyAlerted = existingNotifications.some(
          n => n.type === 'payable_due' && n.metadata?.payableId === pay.id && n.date.slice(0, 10) === todayStr
        );

        if (!alreadyAlerted) {
          let title = `Conta a Pagar a Vencer em ${daysDiff} dia(s)`;
          let msg = `A despesa/duplicata #${pay.code || pay.id} (${supplierName}) no valor de ${amountFormatted} vence em ${daysDiff} dia(s) (${pay.dueDate}).`;

          if (daysDiff === 0) {
            title = 'Conta a Pagar Vence HOJE';
            msg = `A despesa/duplicata #${pay.code || pay.id} (${supplierName}) no valor de ${amountFormatted} vence HOJE (${pay.dueDate}).`;
          } else if (daysDiff < 0) {
            title = 'Conta a Pagar Vencida';
            msg = `A despesa/duplicata #${pay.code || pay.id} (${supplierName}) no valor de ${amountFormatted} está vencida há ${Math.abs(daysDiff)} dia(s) (Vencimento: ${pay.dueDate}).`;
          }

          notifications.push({
            id: `notif-pay-${pay.id}-${Date.now()}`,
            companyId: pay.companyId || 'comp-1',
            type: 'payable_due',
            title,
            message: msg,
            date: new Date().toISOString(),
            read: false,
            metadata: {
              payableId: pay.id,
              supplierId: pay.supplierId,
              supplierName,
              amount,
              dueDate: pay.dueDate,
              daysDiff
            }
          });
        }
      }
    });
  }

  return notifications;
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
  excludeBudgetId?: string,
  companyInfo?: CompanyInfo | null,
  sales: CommercialSale[] = []
): ReservingBudgetInfo[] {
  // Se a empresa configurou 'none', orçamentos não geram reservas
  if (companyInfo?.budgetStockReservationMode === 'none') {
    return [];
  }

  const now = Date.now();
  const results: ReservingBudgetInfo[] = [];

  budgets.forEach(b => {
    if (excludeBudgetId && b.id === excludeBudgetId) return;
    if (b.status === 'rejected' || b.status === 'expired') return;
    if (b.stockReservationStatus === 'RELEASED' || b.stockReservationStatus === 'EXPIRED') return;

    // Check if Service Order already created
    const hasOS = serviceOrders.some(os => os.budgetId === b.id || os.id === b.serviceOrderId);
    if (hasOS) return;

    // Check if Commercial Sale already created
    const hasSale = sales.some(s => s.budgetId === b.id || s.id === b.saleId);
    if (hasSale) return;

    const createdAtMs = new Date(b.createdAt).getTime();
    const validityDays = b.validityDays || companyInfo?.budgetStockReservationValidityDays || 10;
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
        clientName: client?.name || 'Cliente Balcão / Não identificado',
        vehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'Balcão / Sem veículo',
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

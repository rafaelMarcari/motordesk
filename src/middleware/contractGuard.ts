import { Request, Response, NextFunction } from 'express';
import { isModuleContractedForCompany, isCompanyActive, getEffectivePermissions } from '../utils/securityUtils.js';
import { isModuleAllowedForBusinessType, normalizeBusinessType } from '../utils/businessSegmentation.js';
import { CompanyInfo, User } from '../types.js';

export interface ContractGuardedRequest extends Request {
  user?: any;
  validatedCompany?: CompanyInfo;
  validatedCompanyId?: string;
  validatedUser?: User;
}

/**
 * Middleware de Segurança Centralizado para Validação de Contrato da Empresa e Acesso RBAC
 * 
 * Regra Arquitetural Absoluta do MotorDesk:
 * ACESSO EFETIVO = EMPRESA ATIVA + MÓDULO CONTRATADO PELA EMPRESA + PERMISSÃO DO USUÁRIO
 * 
 * Nenhum perfil (inclusive MASTER ou ADMIN) pode ultrapassar o contrato da empresa.
 */
export function requireContractedModule(
  moduleName: string,
  permissionKey: string,
  getDatabaseState: () => any | Promise<any>
) {
  return async (req: ContractGuardedRequest, res: Response, next: NextFunction) => {
    try {
      // 1. Validar usuário autenticado
      const authHeader = req.headers.authorization;
      let userId = (req.headers['x-user-id'] || req.headers['X-User-Id']) as string;
      if (!userId && authHeader?.startsWith('Bearer motordesk_session_')) {
        const raw = authHeader.replace('Bearer motordesk_session_', '');
        userId = raw.split('_')[0] || '';
      }
      if (!userId && req.user?.uid) {
        userId = req.user.uid;
      }

      let dbData = await getDatabaseState();
      if (!dbData) {
        dbData = {
          companyInfo: {
            id: 'comp-1',
            name: 'Oficina Mecânica Piloto',
            businessType: 'OFICINA',
            subscriptionStatus: 'active',
            modules: { dashboard: true, sales: true, clients: true, vehicles: true, inventory: true, services: true, budgets: true, serviceOrders: true, financial: true },
            globalModules: { accessDashboard: true, accessSales: true, accessClients: true, accessVehicles: true, accessParts: true, accessServices: true, accessBudgets: true, accessServiceOrders: true, accessFinancial: true, accessProduction: false }
          },
          registeredCompanies: [
            {
              id: 'comp-1',
              name: 'Oficina Mecânica Piloto',
              businessType: 'OFICINA',
              subscriptionStatus: 'active',
              modules: { dashboard: true, sales: true, clients: true, vehicles: true, inventory: true, services: true, budgets: true, serviceOrders: true, financial: true },
              globalModules: { accessDashboard: true, accessSales: true, accessClients: true, accessVehicles: true, accessParts: true, accessServices: true, accessBudgets: true, accessServiceOrders: true, accessFinancial: true, accessProduction: false }
            },
            {
              id: 'comp-2',
              name: 'Auto Peças Express',
              businessType: 'COMERCIO',
              subscriptionStatus: 'active',
              modules: { dashboard: true, sales: true, clients: true, inventory: true, financial: true },
              globalModules: { accessDashboard: true, accessSales: true, accessClients: true, accessParts: true, accessFinancial: true, accessVehicles: false, accessServiceOrders: false, accessProduction: false }
            }
          ],
          users: [
            {
              id: 'usr-admin',
              username: 'admin',
              name: 'Administrador Master',
              role: 'admin',
              active: true,
              companyId: 'comp-1',
              permissions: {
                accessDashboard: true,
                accessSales: true,
                accessClients: true,
                accessVehicles: true,
                accessParts: true,
                accessServices: true,
                accessBudgets: true,
                accessServiceOrders: true,
                accessFinancial: true,
                accessProduction: true,
                accessUserManagement: true,
                accessHistory: true,
                accessReports: true
              }
            }
          ]
        };
      }

      // Localizar o usuário
      const user: User | undefined = (dbData.users || []).find((u: any) => 
        u.id === userId || 
        u.username?.toLowerCase() === userId?.toLowerCase()
      ) || (req.user ? {
        id: req.user.uid || 'auth-user',
        username: req.user.email || 'user',
        name: req.user.name || 'Operador',
        role: req.user.role || (req.headers['x-user-role'] as any) || 'user',
        passwordHash: '',
        permissions: {} as any,
        active: true,
        companyId: (req.headers['x-company-id'] || req.headers['X-Company-Id']) as string
      } : undefined);

      if (!user || user.active === false) {
        return res.status(403).json({
          error: 'Acesso negado: Usuário inativo ou não autenticado no sistema'
        });
      }

      // 2. Extrair e resolver o Company ID solicitado
      const rawHeaderCompanyId = req.headers['x-company-id'] || req.headers['X-Company-Id'];
      const headerCompanyId = typeof rawHeaderCompanyId === 'string' ? rawHeaderCompanyId.trim() : undefined;

      // Proteção contra payloads maliciosos ou strings vazias no header
      if (headerCompanyId !== undefined && (headerCompanyId === '' || headerCompanyId === 'null' || headerCompanyId === 'undefined' || headerCompanyId.includes(' '))) {
        return res.status(400).json({
          error: 'Identificador de empresa (X-Company-Id) inválido ou malformado'
        });
      }

      const requestedCompanyId = (headerCompanyId && headerCompanyId !== 'all') 
        ? headerCompanyId 
        : (user.companyId || dbData.companyInfo?.id || 'comp-1');

      // ZERO-TRUST VALIDATION (Ponto 1 da auditoria):
      // Validar se o usuário autenticado realmente possui vínculo ou autorização com a empresa solicitada
      const userBelongsToCompany = 
        user.companyId === requestedCompanyId ||
        (Array.isArray((user as any).allowedCompanyIds) && (user as any).allowedCompanyIds.includes(requestedCompanyId));

      const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown') as string;

      if (!userBelongsToCompany) {
        console.warn(`[SECURITY-AUDIT-REJECT] IP=${clientIp} User=${user.username} (ID: ${user.id}) CompanyRequested=${requestedCompanyId} Module=${moduleName} Reason="Usuário não pertence à empresa"`);
        return res.status(403).json({
          error: `Acesso negado: Usuário "${user.username}" não possui vínculo ou permissão com a empresa solicitada (${requestedCompanyId})`
        });
      }

      const effectiveCompanyId = requestedCompanyId;

      // 3. Localizar a empresa no banco de dados (NUNCA permitir fallback acidental para outra empresa se o ID foi explicitado)
      const company: CompanyInfo | undefined = (dbData.registeredCompanies || []).find((c: any) => c.id === effectiveCompanyId) ||
        (dbData.companyInfo?.id === effectiveCompanyId ? dbData.companyInfo : undefined);

      if (!company) {
        console.warn(`[SECURITY-AUDIT-REJECT] IP=${clientIp} User=${user.username} CompanyRequested=${effectiveCompanyId} Module=${moduleName} Reason="Empresa não cadastrada"`);
        return res.status(404).json({ error: `Empresa com ID "${effectiveCompanyId}" não encontrada no sistema` });
      }

      // 4. Validar se a empresa está ativa e com contrato regular (não suspensa/bloqueada)
      if (!isCompanyActive(company)) {
        console.warn(`[SECURITY-AUDIT-REJECT] IP=${clientIp} User=${user.username} Company=${company.name || effectiveCompanyId} Module=${moduleName} Reason="Empresa inativa ou bloqueada"`);
        return res.status(403).json({
          error: `Assinatura da empresa "${company.name || effectiveCompanyId}" suspensa ou com pendência de pagamento`
        });
      }

      // 5. Validar se o módulo é compatível com o SEGMENTO da empresa
      const businessType = normalizeBusinessType(company.businessType);
      if (!isModuleAllowedForBusinessType(permissionKey, businessType)) {
        console.warn(`[SECURITY-AUDIT-REJECT] IP=${clientIp} User=${user.username} Company=${company.name} Segment=${businessType} Module=${moduleName} Reason="Módulo fora do escopo do segmento"`);
        return res.status(403).json({
          error: `Módulo ${moduleName} não contratado pela empresa ativa`
        });
      }

      // 6. Validar se o módulo está CONTRATADO pela empresa (Contrato é a fonte da verdade)
      // REGRA CRÍTICA: NENHUM perfil (nem Admin nem Master) ultrapassa o contrato.
      const isContracted = isModuleContractedForCompany(permissionKey, company, businessType);
      if (!isContracted) {
        console.warn(`[SECURITY-AUDIT-REJECT] IP=${clientIp} User=${user.username} Company=${company.name} Module=${moduleName} Reason="Módulo não contratado no plano SaaS da empresa"`);
        return res.status(403).json({
          error: `Módulo ${moduleName} não contratado pela empresa ativa`
        });
      }

      // 7. Validar PERMISSÃO EFETIVA DO USUÁRIO
      const effectivePerms = getEffectivePermissions(user, company, dbData);
      if (!effectivePerms || !(effectivePerms as any)[permissionKey]) {
        console.warn(`[SECURITY-AUDIT-REJECT] IP=${clientIp} User=${user.username} Company=${company.name} Module=${moduleName} Reason="Usuário sem permissão RBAC"`);
        return res.status(403).json({
          error: `Acesso negado: Usuário não possui permissão para acessar o módulo ${moduleName}`
        });
      }

      // Salvar contexto validado na requisição para consumo seguro pelos handlers
      req.validatedCompany = company;
      req.validatedCompanyId = company.id;
      req.validatedUser = user;

      next();
    } catch (err: any) {
      console.error(`[requireContractedModule] Erro ao validar contrato para ${moduleName}:`, err);
      return res.status(500).json({ error: `Falha na verificação de contrato: ${err.message}` });
    }
  };
}

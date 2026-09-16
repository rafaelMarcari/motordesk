
const Cv = [];
function Id(e,a){const s=String(e||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""),r=String(a||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return s==="INDUSTRIA"||s==="INDUSTRIAL"||s==="FABRICA"||s==="MANUFATURA"||s==="METALURGICA"||s==="PRODUCAO"||r.includes("INDUSTRIA")||r.includes("METALURGICA")||r.includes("FABRICACAO")||r.includes("MANUFATURA")||r.includes("USINAGEM")?"INDUSTRIA":s==="COMERCIO"||s==="COMERCIO / AUTOPECAS"||s==="LOJA"||s==="BALCAO"||s==="DISTRIBUIDORA"||r.includes("DISTRIBUIDORA")||r.includes("AUTO PECAS")||r.includes("AUTOPECAS")?"COMERCIO":s==="OFICINA_COMERCIO"||s==="OFICINA + COMERCIO"||s==="HIBRIDO"||s==="OFICINA_E_COMERCIO"||r.includes("OFICINA")&&(r.includes("COMERCIO")||r.includes("LOJA"))?"OFICINA_COMERCIO":s==="SERVICOS"||s==="SERVICO"?"SERVICOS":s==="OUTROS"||s==="OUTRO"?"OUTROS":"OFICINA"}
function gI(e){if(!e||e.subscriptionStatus==="blocked"||e.subscriptionStatus==="overdue")return!1;if(e.paymentStatus==="overdue"&&e.expirationDate){const a=new Date().toISOString().slice(0,10);if(e.expirationDate<a)return!1}return!0}
function rv(e){switch(Id(e)){case"COMERCIO":return{accessDashboard:!0,accessSales:!0,accessWithdrawals:!0,accessCarriers:!0,accessUnitsOfMeasure:!0,accessClients:!0,accessVehicles:!1,accessServices:!1,accessBudgets:!1,accessServiceOrders:!1,accessProduction:!1,accessIndustrialDashboard:!1,accessBillOfMaterials:!1,accessProductionOrders:!1,accessLots:!1,accessParts:!0,accessQuotations:!0,accessAccountsReceivable:!0,accessAccountsPayable:!0,accessFinancial:!0,accessFiscal:!0,accessBoletos:!0,accessReports:!0,accessHistory:!0,accessRepresentativeCommerce:!0,accessRepresentativeOrders:!0,accessNotificationEngine:!0,accessUserManagement:!0,accessQAPanel:!0};case"INDUSTRIA":return{accessDashboard:!0,accessSales:!1,accessWithdrawals:!1,accessCarriers:!0,accessUnitsOfMeasure:!0,accessClients:!0,accessVehicles:!1,accessServices:!1,accessBudgets:!1,accessServiceOrders:!1,accessProduction:!0,accessIndustrialDashboard:!0,accessManufacturing:!0,accessBillOfMaterials:!0,accessProductStructure:!0,accessProductionOrders:!0,accessLots:!0,accessIndustrialStock:!0,accessIndustrialPurchasing:!0,accessIndustrialCosts:!0,accessProductionReports:!0,accessIndustrialReports:!0,accessCommercialReports:!0,accessMaintenance:!0,accessEquipment:!0,accessIndustrialAudit:!0,accessParts:!0,accessQuotations:!0,accessAccountsReceivable:!0,accessAccountsPayable:!0,accessFinancial:!0,accessFiscal:!0,accessBoletos:!0,accessReports:!0,accessHistory:!0,accessRepresentativeCommerce:!1,accessRepresentativeOrders:!1,accessNotificationEngine:!0,accessUserManagement:!0,accessQAPanel:!0};case"OFICINA_COMERCIO":return{accessDashboard:!0,accessSales:!0,accessWithdrawals:!0,accessCarriers:!0,accessUnitsOfMeasure:!0,accessClients:!0,accessVehicles:!0,accessServices:!0,accessBudgets:!0,accessServiceOrders:!0,accessProduction:!0,accessIndustrialDashboard:!0,accessManufacturing:!0,accessBillOfMaterials:!0,accessProductStructure:!0,accessProductionOrders:!0,accessLots:!0,accessIndustrialStock:!0,accessIndustrialPurchasing:!0,accessIndustrialCosts:!0,accessProductionReports:!0,accessIndustrialReports:!0,accessCommercialReports:!0,accessMaintenance:!0,accessEquipment:!0,accessIndustrialAudit:!0,accessParts:!0,accessQuotations:!0,accessAccountsReceivable:!0,accessAccountsPayable:!0,accessFinancial:!0,accessFiscal:!0,accessBoletos:!0,accessReports:!0,accessHistory:!0,accessRepresentativeCommerce:!0,accessRepresentativeOrders:!0,accessNotificationEngine:!0,accessUserManagement:!0,accessQAPanel:!0};case"OFICINA":default:return{accessDashboard:!0,accessSales:!1,accessWithdrawals:!1,accessCarriers:!1,accessUnitsOfMeasure:!1,accessClients:!0,accessVehicles:!0,accessServices:!0,accessBudgets:!0,accessServiceOrders:!0,accessProduction:!1,accessIndustrialDashboard:!1,accessBillOfMaterials:!1,accessProductionOrders:!1,accessLots:!1,accessParts:!0,accessQuotations:!0,accessAccountsReceivable:!0,accessAccountsPayable:!0,accessFinancial:!0,accessFiscal:!0,accessBoletos:!0,accessReports:!0,accessHistory:!0,accessRepresentativeCommerce:!1,accessNotificationEngine:!0,accessUserManagement:!0,accessQAPanel:!0}}}
function sv(e="OFICINA"){switch(e){case"COMERCIO":return{sales:!0,serviceOrders:!1,vehicles:!1,inventory:!0,financial:!0,fiscal:!0,billing:!0,industry:!1,production:!1};case"INDUSTRIA":return{sales:!1,serviceOrders:!1,vehicles:!1,inventory:!0,financial:!0,fiscal:!0,billing:!0,industry:!0,production:!0};case"OFICINA":case"OFICINA_COMERCIO":default:return{sales:!0,serviceOrders:!0,vehicles:!0,inventory:!0,financial:!0,fiscal:!0,billing:!0,industry:e==="OFICINA_COMERCIO",production:e==="OFICINA_COMERCIO"}}}
const xD=["vehicles","services","serviceOrders","budgets"],SV=["sales","withdrawals","representative_commerce","representative_orders","representative_reconciliation"],Gre=["carriers","units_of_measure"],Kre=[...SV,...Gre],pD=["industry"],fD=["accessVehicles","accessServices","accessServiceOrders","accessBudgets","canEditBudgets"],EV=["accessSales","accessWithdrawals","accessRepresentativeCommerce","accessRepresentativeOrders","representativeOrdersCreate","representativeOrdersEdit","representativeOrdersCancel","representativeOrdersExport","representativeReconcile","representativeCommissionsManage","restrictToOwnSales","canSellOtherStoresStock"],Wre=["accessCarriers","accessUnitsOfMeasure"],Xre=[...EV,...Wre],hD=["accessIndustrialDashboard","accessProduction","accessManufacturing","accessProductionOrders","accessBillOfMaterials","accessProductStructure","createProductStructure","editProductStructure","approveProductStructure","accessIndustrialStock","accessIndustrialPurchasing","accessIndustrialCosts","accessLots","accessProductionReports","accessIndustrialReports","accessCommercialReports","accessMaintenance","createMaintenance","editMaintenance","approveMaintenance","accessEquipment","accessIndustrialAudit","productionOrderCreate","productionOrderEdit","productionOrderApprove","productionOrderCancel","productionOrderComplete","bomCreate","bomEdit"];function KA(e,a){const s=(a||"atendente").toLowerCase();let r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!1,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!1;switch(s){case"admin":r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!0,f=!0,h=!0,A=!0,v=!0,N=!0,w=!0,C=!0,y=!0;break;case"qa":r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!0,f=!0,h=!0,A=!0,v=!0,N=!0,w=!0,C=!0,y=!0;break;case"gerente":r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!0,f=!1,h=!0,A=!0,v=!0,N=!0,w=!0,C=!0,y=!0;break;case"almoxarife":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"operador":r=!1,n=!1,i=!1,o=!1,l=!1,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!1;break;case"engenheiro":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"qualidade":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"pcp":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"estoquista":r=!0,n=!0,i=!1,o=!1,l=!0,c=!1,d=!0,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"financeiro":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!0,A=!1,v=!0,N=!0,w=!0,C=!0,y=!1;break;case"atendente":case"vendedor":r=!0,n=!0,i=!0,o=!1,l=!0,c=!0,d=!1,m=!1,p=!0,f=!1,h=!0,A=!1,v=!1,N=!1,w=!1,C=!1,y=!1;break;case"mecanico":r=!1,n=!1,i=!1,o=!0,l=!0,c=!0,d=!0,m=!0,p=!1,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;default:r=!0,n=!0;break}return{...e||{},accessDashboard:(e==null?void 0:e.accessDashboard)!==void 0?!!e.accessDashboard:s!=="mecanico"&&s!=="estoquista",accessSales:(e==null?void 0:e.accessSales)!==void 0?!!e.accessSales:r,accessWithdrawals:(e==null?void 0:e.accessWithdrawals)!==void 0?!!e.accessWithdrawals:r,accessCarriers:(e==null?void 0:e.accessCarriers)!==void 0?!!e.accessCarriers:n,accessClients:(e==null?void 0:e.accessClients)!==void 0?!!e.accessClients:l,accessVehicles:(e==null?void 0:e.accessVehicles)!==void 0?!!e.accessVehicles:c,accessParts:(e==null?void 0:e.accessParts)!==void 0?!!e.accessParts:d,accessServices:(e==null?void 0:e.accessServices)!==void 0?!!e.accessServices:m,accessBudgets:(e==null?void 0:e.accessBudgets)!==void 0?!!e.accessBudgets:i,accessServiceOrders:(e==null?void 0:e.accessServiceOrders)!==void 0?!!e.accessServiceOrders:o,accessHistory:(e==null?void 0:e.accessHistory)!==void 0?!!e.accessHistory:!0,accessReports:(e==null?void 0:e.accessReports)!==void 0?!!e.accessReports:p,accessUserManagement:(e==null?void 0:e.accessUserManagement)!==void 0?!!e.accessUserManagement:f,accessQAPanel:(e==null?void 0:e.accessQAPanel)!==void 0?!!e.accessQAPanel:s==="admin"||s==="qa",accessQuotations:(e==null?void 0:e.accessQuotations)!==void 0?!!e.accessQuotations:A,accessNotifications:(e==null?void 0:e.accessNotifications)!==void 0?!!e.accessNotifications:!0,accessAccountsReceivable:(e==null?void 0:e.accessAccountsReceivable)!==void 0?!!e.accessAccountsReceivable:v,accessAccountsPayable:(e==null?void 0:e.accessAccountsPayable)!==void 0?!!e.accessAccountsPayable:N,accessFinancial:(e==null?void 0:e.accessFinancial)!==void 0?!!e.accessFinancial:w,accessFiscal:(e==null?void 0:e.accessFiscal)!==void 0?!!e.accessFiscal:C,accessUnitsOfMeasure:(e==null?void 0:e.accessUnitsOfMeasure)!==void 0?!!e.accessUnitsOfMeasure:s==="admin"||s==="qa",unitsOfMeasureCreate:(e==null?void 0:e.unitsOfMeasureCreate)!==void 0?!!e.unitsOfMeasureCreate:s==="admin"||s==="qa",unitsOfMeasureEdit:(e==null?void 0:e.unitsOfMeasureEdit)!==void 0?!!e.unitsOfMeasureEdit:s==="admin"||s==="qa",unitsOfMeasureToggleActive:(e==null?void 0:e.unitsOfMeasureToggleActive)!==void 0?!!e.unitsOfMeasureToggleActive:s==="admin"||s==="qa",accessNotificationEngine:(e==null?void 0:e.accessNotificationEngine)!==void 0?!!e.accessNotificationEngine:s==="admin"||s==="gerente"||s==="financeiro"||s==="qa",notificationTemplatesEdit:(e==null?void 0:e.notificationTemplatesEdit)!==void 0?!!e.notificationTemplatesEdit:s==="admin"||s==="qa",notificationRulesEdit:(e==null?void 0:e.notificationRulesEdit)!==void 0?!!e.notificationRulesEdit:s==="admin"||s==="qa",notificationSendManual:(e==null?void 0:e.notificationSendManual)!==void 0?!!e.notificationSendManual:s!=="mecanico",accessRepresentativeCommerce:(e==null?void 0:e.accessRepresentativeCommerce)!==void 0?!!e.accessRepresentativeCommerce:s==="admin"||s==="gerente"||s==="atendente"||s==="qa",accessRepresentativeOrders:(e==null?void 0:e.accessRepresentativeOrders)!==void 0?!!e.accessRepresentativeOrders:s==="admin"||s==="gerente"||s==="atendente"||s==="qa",representativeOrdersCreate:(e==null?void 0:e.representativeOrdersCreate)!==void 0?!!e.representativeOrdersCreate:s!=="mecanico",representativeOrdersEdit:(e==null?void 0:e.representativeOrdersEdit)!==void 0?!!e.representativeOrdersEdit:s!=="mecanico",representativeOrdersCancel:(e==null?void 0:e.representativeOrdersCancel)!==void 0?!!e.representativeOrdersCancel:s==="admin"||s==="gerente"||s==="qa",representativeOrdersExport:(e==null?void 0:e.representativeOrdersExport)!==void 0?!!e.representativeOrdersExport:!0,representativeReconcile:(e==null?void 0:e.representativeReconcile)!==void 0?!!e.representativeReconcile:s==="admin"||s==="gerente"||s==="financeiro"||s==="qa",representativeCommissionsManage:(e==null?void 0:e.representativeCommissionsManage)!==void 0?!!e.representativeCommissionsManage:s==="admin"||s==="gerente"||s==="financeiro"||s==="qa",accessIndustrialDashboard:(e==null?void 0:e.accessIndustrialDashboard)!==void 0?!!e.accessIndustrialDashboard:y,accessProduction:(e==null?void 0:e.accessProduction)!==void 0?!!e.accessProduction:y,accessManufacturing:(e==null?void 0:e.accessManufacturing)!==void 0?!!e.accessManufacturing:y,accessProductionOrders:(e==null?void 0:e.accessProductionOrders)!==void 0?!!e.accessProductionOrders:y,accessBillOfMaterials:(e==null?void 0:e.accessBillOfMaterials)!==void 0?!!e.accessBillOfMaterials:y,accessProductStructure:(e==null?void 0:e.accessProductStructure)!==void 0?!!e.accessProductStructure:y,createProductStructure:(e==null?void 0:e.createProductStructure)!==void 0?!!e.createProductStructure:s==="admin"||s==="qa",editProductStructure:(e==null?void 0:e.editProductStructure)!==void 0?!!e.editProductStructure:s==="admin"||s==="qa",approveProductStructure:(e==null?void 0:e.approveProductStructure)!==void 0?!!e.approveProductStructure:s==="admin"||s==="qa",accessIndustrialStock:(e==null?void 0:e.accessIndustrialStock)!==void 0?!!e.accessIndustrialStock:y,accessIndustrialPurchasing:(e==null?void 0:e.accessIndustrialPurchasing)!==void 0?!!e.accessIndustrialPurchasing:y,accessIndustrialCosts:(e==null?void 0:e.accessIndustrialCosts)!==void 0?!!e.accessIndustrialCosts:y,accessLots:(e==null?void 0:e.accessLots)!==void 0?!!e.accessLots:y,accessProductionReports:(e==null?void 0:e.accessProductionReports)!==void 0?!!e.accessProductionReports:y,accessIndustrialReports:(e==null?void 0:e.accessIndustrialReports)!==void 0?!!e.accessIndustrialReports:y,accessCommercialReports:(e==null?void 0:e.accessCommercialReports)!==void 0?!!e.accessCommercialReports:y,accessMaintenance:(e==null?void 0:e.accessMaintenance)!==void 0?!!e.accessMaintenance:y,createMaintenance:(e==null?void 0:e.createMaintenance)!==void 0?!!e.createMaintenance:s==="admin"||s==="qa"||s==="mecanico",editMaintenance:(e==null?void 0:e.editMaintenance)!==void 0?!!e.editMaintenance:s==="admin"||s==="qa"||s==="mecanico",approveMaintenance:(e==null?void 0:e.approveMaintenance)!==void 0?!!e.approveMaintenance:s==="admin"||s==="qa",accessEquipment:(e==null?void 0:e.accessEquipment)!==void 0?!!e.accessEquipment:y,accessIndustrialAudit:(e==null?void 0:e.accessIndustrialAudit)!==void 0?!!e.accessIndustrialAudit:s==="admin"||s==="qa",productionOrderCreate:(e==null?void 0:e.productionOrderCreate)!==void 0?!!e.productionOrderCreate:s==="admin"||s==="qa",productionOrderEdit:(e==null?void 0:e.productionOrderEdit)!==void 0?!!e.productionOrderEdit:s==="admin"||s==="qa",productionOrderApprove:(e==null?void 0:e.productionOrderApprove)!==void 0?!!e.productionOrderApprove:s==="admin"||s==="qa",productionOrderCancel:(e==null?void 0:e.productionOrderCancel)!==void 0?!!e.productionOrderCancel:s==="admin"||s==="qa",productionOrderComplete:(e==null?void 0:e.productionOrderComplete)!==void 0?!!e.productionOrderComplete:s==="admin"||s==="qa"||s==="mecanico",bomCreate:(e==null?void 0:e.bomCreate)!==void 0?!!e.bomCreate:s==="admin"||s==="qa",bomEdit:(e==null?void 0:e.bomEdit)!==void 0?!!e.bomEdit:s==="admin"||s==="qa",canEditBudgets:(e==null?void 0:e.canEditBudgets)!==void 0?!!e.canEditBudgets:s!=="mecanico",canCustomizePdf:(e==null?void 0:e.canCustomizePdf)!==void 0?!!e.canCustomizePdf:h,canViewOtherStoresStock:(e==null?void 0:e.canViewOtherStoresStock)!==void 0?!!e.canViewOtherStoresStock:!0,canSellOtherStoresStock:(e==null?void 0:e.canSellOtherStoresStock)!==void 0?!!e.canSellOtherStoresStock:s==="admin"||s==="qa",canViewAllCompaniesHistory:(e==null?void 0:e.canViewAllCompaniesHistory)!==void 0?!!e.canViewAllCompaniesHistory:s==="admin"||s==="qa"}}function nA(e,a,s){if(!e)return e;const r=a||e.companyId;if(s&&r){const n=bI(e,r,s);return{...e,companyId:r,permissions:n}}return{...e,companyId:r,permissions:KA(e.permissions,e.role)}}function Id(e,a){const s=String(e||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""),r=String(a||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return s==="INDUSTRIA"||s==="INDUSTRIAL"||s==="FABRICA"||s==="MANUFATURA"||s==="METALURGICA"||s==="PRODUCAO"||r.includes("INDUSTRIA")||r.includes("METALURGICA")||r.includes("FABRICACAO")||r.includes("MANUFATURA")||r.includes("USINAGEM")?"INDUSTRIA":s==="COMERCIO"||s==="COMERCIO / AUTOPECAS"||s==="LOJA"||s==="BALCAO"||s==="DISTRIBUIDORA"||r.includes("DISTRIBUIDORA")||r.includes("AUTO PECAS")||r.includes("AUTOPECAS")?"COMERCIO":s==="OFICINA_COMERCIO"||s==="OFICINA + COMERCIO"||s==="HIBRIDO"||s==="OFICINA_E_COMERCIO"||r.includes("OFICINA")&&(r.includes("COMERCIO")||r.includes("LOJA"))?"OFICINA_COMERCIO":s==="SERVICOS"||s==="SERVICO"?"SERVICOS":s==="OUTROS"||s==="OUTRO"?"OUTROS":"OFICINA"}function Bb(e){return e?Id(e.businessType,e.name):"OFICINA"}function Zre(e){const a=Id(e);return a==="INDUSTRIA"||a==="OFICINA_COMERCIO"}function Jre(e){const a=Id(e);return a==="OFICINA"||a==="OFICINA_COMERCIO"}function Yre(e){const a=Id(e);return a==="COMERCIO"||a==="OFICINA_COMERCIO"}
function FA(e,a){const s=Id(a);return s==="INDUSTRIA"?!(xD.includes(e)||SV.includes(e)):s==="COMERCIO"?!(xD.includes(e)||pD.includes(e)):s==="OFICINA"?!(Kre.includes(e)||pD.includes(e)):!0}
function Hc(e,a){const s=Id(a);return s==="INDUSTRIA"?!(fD.includes(e)||EV.includes(e)):s==="COMERCIO"?!(fD.includes(e)||hD.includes(e)):s==="OFICINA"?!(Xre.includes(e)||hD.includes(e)):!0}
function Wd(e,a,s){const r=s||(a==null?void 0:a.businessType)||"OFICINA";if(!Hc(e,r))return!1;if(a!=null&&a.contractModules&&typeof a.contractModules=="object"){const i=a.contractModules[e];if(i&&typeof i=="object"){if(i.contracted===!1||i.status==="canceled"||i.status==="suspended")return!1;const o=new Date().toISOString().slice(0,10);return!(i.startDate&&i.startDate>o||i.endDate&&i.endDate<o)}}if(a!=null&&a.globalModules&&typeof a.globalModules=="object"){let i=a.globalModules[e];if(i===void 0){const gm=a.globalModules;if(e==="accessFiscal"||e.startsWith("fiscal")||e.startsWith("sefaz")||e==="accessSefaz"){i=gm.accessFiscal??gm.fiscal??gm.accessSefaz??gm.sefaz??(gm.fiscalEmit||gm.fiscalView)}else if(e==="accessBoletos"||e.startsWith("boleto")||e==="accessPix"||e.startsWith("pix")){i=gm.accessBoletos??gm.boletos??gm.accessPix??gm.pix??(gm.accessFiscal||gm.accessFinancial)}else if(e==="accessFinancial"||e.startsWith("financial")||e==="accessAccountsReceivable"||e==="accessAccountsPayable"||e.startsWith("accountsReceivable")||e.startsWith("accountsPayable")||e==="authorizeCreditLimitBypass"){i=gm.accessFinancial??gm.financial??(e.includes("Receivable")?gm.accessAccountsReceivable:e.includes("Payable")?gm.accessAccountsPayable:void 0)}else if(e==="accessProduction"||e==="accessIndustrialDashboard"||e.startsWith("productionOrder")||e.startsWith("bom")||e==="accessBillOfMaterials"||e==="accessProductStructure"||e==="accessIndustrialStock"||e==="accessIndustrialPurchasing"||e==="accessIndustrialCosts"||e==="accessLots"||e==="accessProductionReports"||e==="accessIndustrialReports"||e==="accessMaintenance"||e.startsWith("maintenance")||e==="accessEquipment"){i=gm.accessProduction??gm.production??gm.industry??gm.accessIndustrialDashboard}else if(e==="accessParts"||e.startsWith("parts")||e==="accessStockReports"||e==="canViewOtherStoresStock"||e==="canSellOtherStoresStock"){i=gm.accessParts??gm.inventory??gm.parts}else if(e==="accessQuotations"||e.startsWith("quotations")){i=gm.accessQuotations??gm.quotations??gm.accessPurchasing}else if(e==="accessSales"||e.startsWith("sales")||e==="restrictToOwnSales"){i=gm.accessSales??gm.sales}else if(e==="accessWithdrawals"||e==="accessCarriers"||e.startsWith("carriers")){i=gm.accessWithdrawals??gm.accessCarriers??gm.carriers}else if(e.startsWith("representative")||e==="accessRepresentativeCommerce"||e==="accessRepresentativeOrders"){i=gm.accessRepresentativeCommerce??gm.accessRepresentativeOrders??gm.representative_commerce}else if(e==="accessNotificationEngine"||e==="accessNotificationsEngine"||e.startsWith("notification")){i=gm.accessNotificationEngine??gm.accessNotificationsEngine??gm.notifications_engine}else if(e==="accessServiceOrders"||e.startsWith("serviceOrders")||e==="accessBudgets"||e.startsWith("budgets")||e==="canEditBudgets"||e==="accessVehicles"||e.startsWith("vehicles")||e==="accessServices"||e.startsWith("services")){i=gm[e]??true}else if(e==="accessUnitsOfMeasure"||e.startsWith("unitsOfMeasure")){i=gm.accessUnitsOfMeasure??gm.unitsOfMeasure}}if(i!==void 0)return!!i;if(Object.keys(a.globalModules).length>0)return e==="accessDashboard"||e==="accessUserManagement"||e==="accessNotifications"||e==="accessClients"||e==="accessHistory"||e==="accessReports"}if(a!=null&&a.modules&&typeof a.modules=="object"){const i=a.modules,o={accessDashboard:i.dashboard,accessSales:i.sales,accessWithdrawals:i.withdrawals,accessCarriers:i.carriers,accessBudgets:i.budgets,accessServiceOrders:i.serviceOrders,accessClients:i.clients,accessVehicles:i.vehicles,accessParts:i.inventory,accessUnitsOfMeasure:i.unitsOfMeasure,accessServices:i.services,accessQuotations:i.quotations,accessFinancial:i.financial,accessAccountsReceivable:i.financial,accessAccountsPayable:i.financial,accessFiscal:i.fiscal,accessHistory:i.history,accessReports:i.reports,accessProduction:i.production??i.industry,accessIndustrialDashboard:i.production??i.industry,accessQAPanel:i.qaPanel,accessNotificationEngine:i.notifications_engine,accessNotificationsEngine:i.notifications_engine,accessRepresentativeCommerce:i.representative_commerce??a.enableRepresentativeCommerce,accessRepresentativeOrders:i.representative_orders??i.representative_commerce??a.enableRepresentativeCommerce};if(o[e]!==void 0)return!!o[e]}if((e==="accessRepresentativeCommerce"||e==="accessRepresentativeOrders")&&(a==null?void 0:a.enableRepresentativeCommerce)===!1)return!1;const n=rv(r);return n[e]!==void 0?!!n[e]:!0}
function KA(e,a){const s=(a||"atendente").toLowerCase();let r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!1,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!1;switch(s){case"admin":r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!0,f=!0,h=!0,A=!0,v=!0,N=!0,w=!0,C=!0,y=!0;break;case"qa":r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!0,f=!0,h=!0,A=!0,v=!0,N=!0,w=!0,C=!0,y=!0;break;case"gerente":r=!0,n=!0,i=!0,o=!0,l=!0,c=!0,d=!0,m=!0,p=!0,f=!1,h=!0,A=!0,v=!0,N=!0,w=!0,C=!0,y=!0;break;case"almoxarife":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"operador":r=!1,n=!1,i=!1,o=!1,l=!1,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!1;break;case"engenheiro":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"qualidade":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"pcp":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"estoquista":r=!0,n=!0,i=!1,o=!1,l=!0,c=!1,d=!0,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"financeiro":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!0,A=!1,v=!0,N=!0,w=!0,C=!0,y=!1;break;case"atendente":case"vendedor":r=!0,n=!0,i=!0,o=!1,l=!0,c=!0,d=!1,m=!1,p=!0,f=!1,h=!0,A=!1,v=!1,N=!1,w=!1,C=!1,y=!1;break;case"mecanico":r=!1,n=!1,i=!1,o=!0,l=!0,c=!0,d=!0,m=!0,p=!1,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;default:r=!0,n=!0;break}return{...e||{},accessDashboard:(e==null?void 0:e.accessDashboard)!==void 0?!!e.accessDashboard:s!=="mecanico"&&s!=="estoquista",accessSales:(e==null?void 0:e.accessSales)!==void 0?!!e.accessSales:r,accessWithdrawals:(e==null?void 0:e.accessWithdrawals)!==void 0?!!e.accessWithdrawals:r,accessCarriers:(e==null?void 0:e.accessCarriers)!==void 0?!!e.accessCarriers:n,accessClients:(e==null?void 0:e.accessClients)!==void 0?!!e.accessClients:l,accessVehicles:(e==null?void 0:e.accessVehicles)!==void 0?!!e.accessVehicles:c,accessParts:(e==null?void 0:e.accessParts)!==void 0?!!e.accessParts:d,accessServices:(e==null?void 0:e.accessServices)!==void 0?!!e.accessServices:m,accessBudgets:(e==null?void 0:e.accessBudgets)!==void 0?!!e.accessBudgets:i,accessServiceOrders:(e==null?void 0:e.accessServiceOrders)!==void 0?!!e.accessServiceOrders:o,accessHistory:(e==null?void 0:e.accessHistory)!==void 0?!!e.accessHistory:!0,accessReports:(e==null?void 0:e.accessReports)!==void 0?!!e.accessReports:p,accessUserManagement:(e==null?void 0:e.accessUserManagement)!==void 0?!!e.accessUserManagement:f,accessQAPanel:(e==null?void 0:e.accessQAPanel)!==void 0?!!e.accessQAPanel:s==="admin"||s==="qa",accessQuotations:(e==null?void 0:e.accessQuotations)!==void 0?!!e.accessQuotations:A,accessNotifications:(e==null?void 0:e.accessNotifications)!==void 0?!!e.accessNotifications:!0,accessAccountsReceivable:(e==null?void 0:e.accessAccountsReceivable)!==void 0?!!e.accessAccountsReceivable:v,accessAccountsPayable:(e==null?void 0:e.accessAccountsPayable)!==void 0?!!e.accessAccountsPayable:N,accessFinancial:(e==null?void 0:e.accessFinancial)!==void 0?!!e.accessFinancial:w,accessFiscal:(e==null?void 0:e.accessFiscal)!==void 0?!!e.accessFiscal:C,accessUnitsOfMeasure:(e==null?void 0:e.accessUnitsOfMeasure)!==void 0?!!e.accessUnitsOfMeasure:s==="admin"||s==="qa",unitsOfMeasureCreate:(e==null?void 0:e.unitsOfMeasureCreate)!==void 0?!!e.unitsOfMeasureCreate:s==="admin"||s==="qa",unitsOfMeasureEdit:(e==null?void 0:e.unitsOfMeasureEdit)!==void 0?!!e.unitsOfMeasureEdit:s==="admin"||s==="qa",unitsOfMeasureToggleActive:(e==null?void 0:e.unitsOfMeasureToggleActive)!==void 0?!!e.unitsOfMeasureToggleActive:s==="admin"||s==="qa",accessNotificationEngine:(e==null?void 0:e.accessNotificationEngine)!==void 0?!!e.accessNotificationEngine:s==="admin"||s==="gerente"||s==="financeiro"||s==="qa",notificationTemplatesEdit:(e==null?void 0:e.notificationTemplatesEdit)!==void 0?!!e.notificationTemplatesEdit:s==="admin"||s==="qa",notificationRulesEdit:(e==null?void 0:e.notificationRulesEdit)!==void 0?!!e.notificationRulesEdit:s==="admin"||s==="qa",notificationSendManual:(e==null?void 0:e.notificationSendManual)!==void 0?!!e.notificationSendManual:s!=="mecanico",accessRepresentativeCommerce:(e==null?void 0:e.accessRepresentativeCommerce)!==void 0?!!e.accessRepresentativeCommerce:s==="admin"||s==="gerente"||s==="atendente"||s==="qa",accessRepresentativeOrders:(e==null?void 0:e.accessRepresentativeOrders)!==void 0?!!e.accessRepresentativeOrders:s==="admin"||s==="gerente"||s==="atendente"||s==="qa",representativeOrdersCreate:(e==null?void 0:e.representativeOrdersCreate)!==void 0?!!e.representativeOrdersCreate:s!=="mecanico",representativeOrdersEdit:(e==null?void 0:e.representativeOrdersEdit)!==void 0?!!e.representativeOrdersEdit:s!=="mecanico",representativeOrdersCancel:(e==null?void 0:e.representativeOrdersCancel)!==void 0?!!e.representativeOrdersCancel:s==="admin"||s==="gerente"||s==="qa",representativeOrdersExport:(e==null?void 0:e.representativeOrdersExport)!==void 0?!!e.representativeOrdersExport:!0,representativeReconcile:(e==null?void 0:e.representativeReconcile)!==void 0?!!e.representativeReconcile:s==="admin"||s==="gerente"||s==="financeiro"||s==="qa",representativeCommissionsManage:(e==null?void 0:e.representativeCommissionsManage)!==void 0?!!e.representativeCommissionsManage:s==="admin"||s==="gerente"||s==="financeiro"||s==="qa",accessIndustrialDashboard:(e==null?void 0:e.accessIndustrialDashboard)!==void 0?!!e.accessIndustrialDashboard:y,accessProduction:(e==null?void 0:e.accessProduction)!==void 0?!!e.accessProduction:y,accessManufacturing:(e==null?void 0:e.accessManufacturing)!==void 0?!!e.accessManufacturing:y,accessProductionOrders:(e==null?void 0:e.accessProductionOrders)!==void 0?!!e.accessProductionOrders:y,accessBillOfMaterials:(e==null?void 0:e.accessBillOfMaterials)!==void 0?!!e.accessBillOfMaterials:y,accessProductStructure:(e==null?void 0:e.accessProductStructure)!==void 0?!!e.accessProductStructure:y,createProductStructure:(e==null?void 0:e.createProductStructure)!==void 0?!!e.createProductStructure:s==="admin"||s==="qa",editProductStructure:(e==null?void 0:e.editProductStructure)!==void 0?!!e.editProductStructure:s==="admin"||s==="qa",approveProductStructure:(e==null?void 0:e.approveProductStructure)!==void 0?!!e.approveProductStructure:s==="admin"||s==="qa",accessIndustrialStock:(e==null?void 0:e.accessIndustrialStock)!==void 0?!!e.accessIndustrialStock:y,accessIndustrialPurchasing:(e==null?void 0:e.accessIndustrialPurchasing)!==void 0?!!e.accessIndustrialPurchasing:y,accessIndustrialCosts:(e==null?void 0:e.accessIndustrialCosts)!==void 0?!!e.accessIndustrialCosts:y,accessLots:(e==null?void 0:e.accessLots)!==void 0?!!e.accessLots:y,accessProductionReports:(e==null?void 0:e.accessProductionReports)!==void 0?!!e.accessProductionReports:y,accessIndustrialReports:(e==null?void 0:e.accessIndustrialReports)!==void 0?!!e.accessIndustrialReports:y,accessCommercialReports:(e==null?void 0:e.accessCommercialReports)!==void 0?!!e.accessCommercialReports:y,accessMaintenance:(e==null?void 0:e.accessMaintenance)!==void 0?!!e.accessMaintenance:y,createMaintenance:(e==null?void 0:e.createMaintenance)!==void 0?!!e.createMaintenance:s==="admin"||s==="qa"||s==="mecanico",editMaintenance:(e==null?void 0:e.editMaintenance)!==void 0?!!e.editMaintenance:s==="admin"||s==="qa"||s==="mecanico",approveMaintenance:(e==null?void 0:e.approveMaintenance)!==void 0?!!e.approveMaintenance:s==="admin"||s==="qa",accessEquipment:(e==null?void 0:e.accessEquipment)!==void 0?!!e.accessEquipment:y,accessIndustrialAudit:(e==null?void 0:e.accessIndustrialAudit)!==void 0?!!e.accessIndustrialAudit:s==="admin"||s==="qa",productionOrderCreate:(e==null?void 0:e.productionOrderCreate)!==void 0?!!e.productionOrderCreate:s==="admin"||s==="qa",productionOrderEdit:(e==null?void 0:e.productionOrderEdit)!==void 0?!!e.productionOrderEdit:s==="admin"||s==="qa",productionOrderApprove:(e==null?void 0:e.productionOrderApprove)!==void 0?!!e.productionOrderApprove:s==="admin"||s==="qa",productionOrderCancel:(e==null?void 0:e.productionOrderCancel)!==void 0?!!e.productionOrderCancel:s==="admin"||s==="qa",productionOrderComplete:(e==null?void 0:e.productionOrderComplete)!==void 0?!!e.productionOrderComplete:s==="admin"||s==="qa"||s==="mecanico",bomCreate:(e==null?void 0:e.bomCreate)!==void 0?!!e.bomCreate:s==="admin"||s==="qa",bomEdit:(e==null?void 0:e.bomEdit)!==void 0?!!e.bomEdit:s==="admin"||s==="qa",canEditBudgets:(e==null?void 0:e.canEditBudgets)!==void 0?!!e.canEditBudgets:s!=="mecanico",canCustomizePdf:(e==null?void 0:e.canCustomizePdf)!==void 0?!!e.canCustomizePdf:h,canViewOtherStoresStock:(e==null?void 0:e.canViewOtherStoresStock)!==void 0?!!e.canViewOtherStoresStock:!0,canSellOtherStoresStock:(e==null?void 0:e.canSellOtherStoresStock)!==void 0?!!e.canSellOtherStoresStock:s==="admin"||s==="qa",canViewAllCompaniesHistory:(e==null?void 0:e.canViewAllCompaniesHistory)!==void 0?!!e.canViewAllCompaniesHistory:s==="admin"||s==="qa"}}
function bI(e,a,s){if(!e)return KA({},"atendente");const r=typeof a=="string"?a:a==null?void 0:a.id,n=typeof a=="object"&&a!==null?a:void 0,i=typeof e=="string"?((s==null?void 0:s.users)||[]).find(d=>d.id===e||d.username.toLowerCase()===e.toLowerCase()):e;if(!i)return KA({},"atendente");if(i.active===!1){const d={};return Cv.forEach(m=>{d[m.key]=!1}),d}let o=KA(i.permissions||{},i.role||"atendente");const l=i.groupId||i.accessGroupId;if(l&&(s!=null&&s.accessGroups)&&s.accessGroups.length>0){const d=s.accessGroups.find(m=>m.id===l&&m.active!==!1&&(!m.companyId||!r||m.companyId===r));if(d&&d.permissions){const m=d.permissions;Object.keys(m).forEach(p=>{const f=m[p];typeof f=="boolean"&&(f?i.permissions&&i.permissions[p]===!1||i.individualExceptions&&i.individualExceptions[p]===!1?o[p]=!1:o[p]=!0:o[p]=!1)})}}i.permissions&&typeof i.permissions=="object"&&Object.keys(i.permissions).forEach(d=>{i.permissions[d]===!1&&(o[d]=!1)}),i.individualExceptions&&typeof i.individualExceptions=="object"&&Object.keys(i.individualExceptions).forEach(d=>{const m=i.individualExceptions[d];typeof m=="boolean"&&(o[d]=m)}),i.customPermissions&&typeof i.customPermissions=="object"&&Object.keys(i.customPermissions).forEach(d=>{const m=i.customPermissions[d];typeof m=="boolean"&&(o[d]=m)});const c=n||(s!=null&&s.registeredCompanies&&s.registeredCompanies.length>0?s.registeredCompanies.find(d=>d.id===r)||s.registeredCompanies.find(d=>d.id===(typeof e=="object"?e==null?void 0:e.companyId:void 0))||s.companyInfo:s==null?void 0:s.companyInfo);if(c){if(!gI(c))return Cv.forEach(m=>{m.key!=="accessUserManagement"&&(o[m.key]=!1)}),o;const d=c.businessType||"OFICINA";Cv.forEach(m=>{if(m.key==="accessUserManagement"||m.key==="accessQAPanel"){c!=null&&c.globalModules&&c.globalModules[m.key]===!1&&(o[m.key]=!1);return}Wd(m.key,c,d)||(o[m.key]=!1)}),Wd("accessFiscal",c,d)||(o.fiscalView=!1,o.fiscalConference=!1,o.fiscalEmit=!1,o.fiscalTransmit=!1,o.fiscalCancel=!1,o.fiscalInutilize=!1,o.fiscalGenerateGuides=!1,o.fiscalCancelGuides=!1,o.accessTaxObligationsReport=!1),Wd("accessFinancial",c,d)||(o.financialBillingClosing=!1,o.financialReopenClosing=!1,o.financialReconciliation=!1,o.financialUnreconcile=!1,o.financialExport=!1),Wd("accessProduction",c,d)||(o.accessIndustrialDashboard=!1,o.accessManufacturing=!1,o.accessProductionOrders=!1,o.accessBillOfMaterials=!1,o.accessProductStructure=!1,o.createProductStructure=!1,o.editProductStructure=!1,o.approveProductStructure=!1,o.accessIndustrialStock=!1,o.accessIndustrialPurchasing=!1,o.accessIndustrialCosts=!1,o.accessLots=!1,o.accessProductionReports=!1,o.accessIndustrialReports=!1,o.accessCommercialReports=!1,o.accessMaintenance=!1,o.createMaintenance=!1,o.editMaintenance=!1,o.approveMaintenance=!1,o.accessEquipment=!1,o.accessIndustrialAudit=!1,o.productionOrderCreate=!1,o.productionOrderEdit=!1,o.productionOrderApprove=!1,o.productionOrderCancel=!1,o.productionOrderComplete=!1,o.bomCreate=!1,o.bomEdit=!1),!Wd("accessRepresentativeCommerce",c,d)&&!Wd("accessRepresentativeOrders",c,d)?(o.accessRepresentativeCommerce=!1,o.accessRepresentativeOrders=!1,o.representativeOrdersView=!1,o.representativeOrdersCreate=!1,o.representativeOrdersEdit=!1,o.representativeOrdersCancel=!1,o.representativeOrdersExport=!1,o.representativeImportView=!1,o.representativeImportCreate=!1,o.representativeReconciliationView=!1,o.representativeReconciliationApprove=!1,o.representativeCommissionView=!1,o.representativeCommissionEdit=!1,o.representativeCommissionSettle=!1,o.representativeReportsView=!1,o.representativeReportsExport=!1,o.representativeReconcile=!1,o.representativeCommissionsManage=!1):(Wd("accessRepresentativeOrders",c,d)||(o.accessRepresentativeOrders=!1),Wd("accessRepresentativeCommerce",c,d)||(o.accessRepresentativeCommerce=!1)),Wd("accessNotificationEngine",c,d)||(o.accessNotificationEngine=!1,o.notificationTemplatesEdit=!1,o.notificationRulesEdit=!1,o.notificationSendManual=!1)}return o}

const canonicalZre = {
  "dashboard": "accessDashboard",
  "sales": "accessSales",
  "services": "accessServices",
  "budgets": "accessBudgets",
  "serviceOrders": "accessServiceOrders",
  "clients": "accessClients",
  "vehicles": "accessVehicles",
  "parts": "accessParts",
  "quotations": "accessQuotations",
  "financial": "accessFinancial",
  "fiscal": "accessFiscal",
  "history": "accessHistory",
  "reports": "accessReports",
  "users": "accessUserManagement",
  "withdrawals": "accessWithdrawals",
  "carriers": "accessCarriers",
  "qa_panel": "accessQAPanel",
  "data_migration": "accessQAPanel",
  "access_groups": "accessUserManagement",
  "notifications_engine": "accessNotificationsEngine",
  "representative_commerce": "accessRepresentativeCommerce",
  "representative_orders": "accessRepresentativeOrders",
  "representative_reconciliation": "accessRepresentativeCommerce",
  "fiscal_conference": "accessFiscal",
  "tax_obligations": "accessFiscal",
  "accounts_receivable": "accessAccountsReceivable",
  "accounts_payable": "accessAccountsPayable",
  "units_of_measure": "accessUnitsOfMeasure",
  "industry": "accessProduction",
  "ind_com_marketing": "accessCommercialMarketing",
  "dash_comercial": "accessCommercialMarketing",
  "ind_com_clientes": "accessCommercial",
  "ind_com_clientes_tab": "accessCommercial",
  "ind_com_orcamentos": "accessCommercialBudgets",
  "ind_com_orcamentos_tab": "accessCommercialBudgets",
  "ind_com_pedidos": "accessCommercialOrders",
  "ind_com_pedidos_tab": "accessCommercialOrders",
  "ind_com_carteira": "accessCommercialBacklog",
  "ind_com_carteira_tab": "accessCommercialBacklog",
  "ind_com_posvenda": "accessCommercialAfterSales",
  "after_sales": "accessCommercialAfterSales",
  "ind_eng_dashboard": "accessEngineering",
  "dash_engenharia": "accessEngineering",
  "ind_eng_projetos": "accessEngineering",
  "special_projects": "accessEngineering",
  "ind_eng_produtos": "accessEngineering",
  "product_development": "accessEngineering",
  "ind_eng_unidades": "accessUnitsOfMeasure",
  "ind_eng_unidades_tab": "accessUnitsOfMeasure",
  "ind_eng_boms": "accessBillOfMaterials",
  "boms": "accessBillOfMaterials",
  "ind_eng_fichatecnica": "accessEngineering",
  "technical_datasheet": "accessEngineering",
  "ind_eng_solidworks": "accessEngineering",
  "cad_solidworks_integrations": "accessEngineering",
  "ind_eng_revisoes": "accessEngineering",
  "engineering_revisions": "accessEngineering",
  "ind_pcp_planejamento": "accessIndustrialDashboard",
  "pcp_dashboard": "accessIndustrialDashboard",
  "ind_pcp_mrp": "accessProduction",
  "ind_pcp_solicitacoes": "accessPurchasing",
  "ind_pcp_cotacoes": "accessQuotations",
  "ind_pcp_compras": "accessPurchasing",
  "purchasing_suggestions": "accessPurchasing",
  "ind_pcp_semaforo": "accessProduction",
  "stock_traffic": "accessProduction",
  "ind_pcp_recebimento": "accessProduction",
  "dash_pcp_compras": "accessPurchasing",
  "ind_rh_dashboard": "accessProduction",
  "dash_rh_operadores": "accessProduction",
  "ind_rh_operadores": "accessProduction",
  "hr_operators": "accessProduction",
  "ind_rh_apontamentos": "accessProduction",
  "ind_rh_paradas": "accessProduction",
  "ind_rh_produtividade": "accessProduction",
  "ind_cad_dashboard": "accessProduction",
  "dash_cadastros": "accessProduction",
  "ind_cad_pecas": "accessParts",
  "item_master": "accessParts",
  "ind_cad_wms": "accessIndustrialStock",
  "warehouse_locations": "accessIndustrialStock",
  "ind_cad_etiquetas": "accessProduction",
  "label_generator": "accessProduction",
  "ind_cad_familias": "accessParts",
  "categories": "accessParts",
  "ind_cad_fornecedores": "accessPurchasing",
  "suppliers": "accessPurchasing",
  "ind_prod_pcp_dash": "accessIndustrialDashboard",
  "ind_prod_ops": "accessProductionOrders",
  "production_orders": "accessProductionOrders",
  "ind_prod_lotes": "accessLots",
  "lots": "accessLots",
  "ind_prod_rastreio": "accessProduction",
  "trace_product": "accessProduction",
  "ind_rastrear_processo": "accessProduction",
  "ind_prod_custos": "accessIndustrialCosts",
  "production_floor": "accessProduction",
  "ind_cq_dashboard": "accessProduction",
  "dash_qualidade": "accessProduction",
  "ind_cq_inspecoes": "accessProduction",
  "quality_inspections": "accessProduction",
  "ind_cq_rnc": "accessProduction",
  "non_conformities": "accessProduction",
  "ind_pcm_dashboard": "accessMaintenance",
  "dash_manutencao": "accessMaintenance",
  "ind_pcm_manutencao": "accessMaintenance",
  "equipment_maintenance": "accessMaintenance",
  "ind_almox_dash": "accessIndustrialStock",
  "dash_almoxarifado": "accessIndustrialStock",
  "ind_almox_locs": "accessIndustrialStock",
  "ind_almox_mov": "accessIndustrialStock",
  "ind_exp_dash": "accessProduction",
  "dash_expedicao": "accessProduction",
  "ind_exp_instalacao": "accessProduction",
  "client_installation": "accessProduction",
  "ind_exp_retiradas": "accessWithdrawals",
  "ind_rel_oee": "accessIndustrialReports",
  "industrial_reports": "accessIndustrialReports",
  "ind_rel_custos": "accessIndustrialCosts",
  "cost_analysis": "accessIndustrialCosts"
};
const proposedIA = function proposedIA(e, a, s, r) {
  if (!e || !a || a.active === !1 || a.isActive === !1 || a.isTerminated === !0 || a.status === "terminated") return !1;
  const _isM = (a.username && (a.username.toLowerCase() === "admin" || a.username.toLowerCase() === "validador")) || (Array.isArray(a.allowedCompanyIds) && a.allowedCompanyIds.includes("*"));
  if (!_isM) {
    const _uC = a.companyId || "comp-1";
    if (_uC !== e.id && !(Array.isArray(a.allowedCompanyIds) && a.allowedCompanyIds.includes(e.id))) return !1;
  }
  if (s === "profile") return !0;
  if (!gI(e)) return s === "users" && (a.role === "admin" || _isM);
  const n = Id(e.businessType);
  if (!FA(s, n)) return !1;
  const i = canonicalZre[s];
  if (!i) return !0;
  if (!Wd(i, e, n)) return !1;
  const o = bI(a, e, r || void 0);
  if (!o) return !1;
  // If user explicitly has this permission set to false in individual permissions, ACATAR:
  if (a.permissions && typeof a.permissions === "object") {
    if (a.permissions[i] === false) return false;
    if (a.permissions[s] === false) return false;
  }
  if (o[i] === false) return false;
  if (o[i] === true) return true;
  // Fallback check for parent modules if specific sub-perm isn't explicitly set in o:
  if (i.startsWith("accessCommercial") && o.accessCommercial === true && a.permissions?.[i] !== false) return true;
  if (i.startsWith("accessEngineering") && o.accessEngineering === true && a.permissions?.[i] !== false) return true;
  if ((i === "accessProductionOrders" || i === "accessLots" || i === "accessIndustrialCosts" || i === "accessIndustrialReports" || i === "accessIndustrialStock" || i === "accessBillOfMaterials") && o.accessProduction === true && a.permissions?.[i] !== false) return true;
  return !!o[i];
};
const proposedF4 = function proposedF4(e, a, s) {
  const r = [
    "dashboard",
    "industry",
    "ind_prod_ops",
    "ind_eng_boms",
    "ind_cad_pecas",
    "ind_pcp_planejamento",
    "sales",
    "serviceOrders",
    "budgets",
    "clients",
    "parts",
    "services",
    "representative_commerce",
    "financial",
    "history",
    "reports",
    "users",
    "profile"
  ];
  for (const n of r) if (proposedIA(e, a, n, s)) return n;
  return "profile";
};

const validadorUser = {
  id: "usr-1789436070516",
  name: "Rafael Marcari (QA MotorDesk)",
  role: "qa",
  active: true,
  status: "active",
  groupId: "grp-admin",
  isActive: true,
  username: "validador",
  companyId: "comp-1788356473331",
  allowedCompanyIds: ["*"],
  permissions: {
    bomEdit: true,
    bomCreate: true,
    accessLots: true,
    accessParts: true,
    accessSales: false,
    accessFiscal: true,
    accessBudgets: false,
    accessClients: false,
    accessHistory: true,
    accessQAPanel: true,
    accessReports: true,
    accessCarriers: false,
    accessServices: false,
    accessVehicles: false,
    accessDashboard: false,
    accessEquipment: false,
    accessFinancial: false,
    accessProduction: true,
    accessPurchasing: false,
    accessQuotations: false,
    accessMaintenance: false,
    accessWithdrawals: false,
    accessServiceOrders: false,
    productionOrderEdit: true,
    accessUnitsOfMeasure: false,
    accessUserManagement: true,
    accessBillOfMaterials: true,
    accessIndustrialCosts: true,
    accessIndustrialStock: true,
    productionOrderCancel: true,
    productionOrderCreate: true,
    accessCommercialOrders: false,
    productionOrderApprove: true,
    accessCommercialBacklog: false,
    accessCommercialBudgets: false,
    accessIndustrialReports: true,
    accessProductionReports: true,
    productionOrderComplete: true,
    accessCommercialMarketing: false,
    accessIndustrialDashboard: true,
    accessCommercialAfterSales: false,
    accessRepresentativeOrders: false,
    accessRepresentativeCommerce: false
  }
};

const compIndustria = {
  id: "comp-1788356473331",
  name: "INDUSTRIA FABRICAÇÃO LTDA",
  businessType: "INDUSTRIA",
  globalModules: {
    accessParts: true,
    accessFiscal: true,
    accessBoletos: true,
    accessBudgets: true,
    accessClients: true,
    accessHistory: true,
    accessQAPanel: true,
    accessReports: true,
    accessServices: true,
    accessVehicles: true,
    accessDashboard: true,
    accessFinancial: false,
    accessProduction: true,
    accessQuotations: true,
    accessServiceOrders: true,
    accessUnitsOfMeasure: true,
    accessUserManagement: true,
    accessAccountsPayable: true,
    accessAccountsReceivable: true
  }
};

console.log("TEST RESULTS FOR VALIDADOR ON INDUSTRIA:");
const routesToTest = [
  "dashboard",
  "sales",
  "clients",
  "ind_com_marketing",
  "ind_pcm_manutencao",
  "ind_prod_ops",
  "ind_eng_boms",
  "ind_cad_pecas",
  "parts",
  "history",
  "reports",
  "users",
  "industry"
];

for (const r of routesToTest) {
  const allowed = proposedIA(compIndustria, validadorUser, r, { users: [validadorUser], companyInfo: compIndustria });
  console.log("  " + r + ": " + allowed);
}

const fallback = proposedF4(compIndustria, validadorUser, { users: [validadorUser], companyInfo: compIndustria });
console.log("\nFallback route (f4): " + fallback);

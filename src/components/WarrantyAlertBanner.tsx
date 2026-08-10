/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Clock, Wrench, Check, ArrowRight } from 'lucide-react';
import { ServiceOrder } from '../types';
import { checkVehicleWarrantyStatus, ActiveWarrantyInfo } from '../utils/serviceOrderUtils';

interface WarrantyAlertBannerProps {
  vehicleId: string;
  serviceOrders: ServiceOrder[];
  customerComplaint?: string;
  isWarrantyReturn?: boolean;
  warrantyOriginOSId?: string;
  onToggleWarrantyReturn?: (isReturn: boolean, originOSId?: string) => void;
  className?: string;
}

export default function WarrantyAlertBanner({
  vehicleId,
  serviceOrders,
  customerComplaint = '',
  isWarrantyReturn = false,
  warrantyOriginOSId,
  onToggleWarrantyReturn,
  className = ''
}: WarrantyAlertBannerProps) {
  if (!vehicleId) return null;

  const warrantyCheck = checkVehicleWarrantyStatus(vehicleId, serviceOrders);

  if (!warrantyCheck.hasActiveWarranty && !isWarrantyReturn) {
    return null;
  }

  const activeWarranties = warrantyCheck.activeWarranties;
  const primaryWarranty: ActiveWarrantyInfo | undefined = activeWarranties[0];

  return (
    <div className={`bg-amber-50/90 border-2 border-amber-300 rounded-xl p-4 shadow-sm animate-slide-up space-y-3 font-sans ${className}`} id="warranty-alert-banner">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-amber-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0 shadow-xs">
            <ShieldAlert className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-950 flex items-center gap-1.5 font-display">
              ⚠️ Alerta de Garantia Ativa de Serviços / Peças
            </h4>
            <p className="text-[11px] text-amber-900/90 font-medium">
              Este veículo possui serviços/peças concluídos dentro do período legal de garantia (90 dias).
            </p>
          </div>
        </div>

        {isWarrantyReturn ? (
          <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-full border border-emerald-500 flex items-center gap-1 shrink-0 shadow-3xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Retorno em Garantia
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300 shrink-0">
            {activeWarranties.length} OS em Garantia
          </span>
        )}
      </div>

      {/* Details List of Active Warranties */}
      <div className="space-y-2.5">
        {activeWarranties.map((info) => {
          const isOriginOS = warrantyOriginOSId === info.os.id;
          return (
            <div 
              key={info.os.id} 
              className={`p-3 rounded-lg border text-xs space-y-1.5 transition ${
                isOriginOS 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                  : 'bg-white/80 border-amber-200 text-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 uppercase">
                    OS #{info.os.id}
                  </span>
                  <span className="text-slate-600">
                    Concluída em {info.completedAtDate.toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-950 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/80 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Válida até {info.warrantyEndDate.toLocaleDateString('pt-BR')}</span>
                  <span className="text-amber-800 font-extrabold">({info.daysRemaining} dias restantes)</span>
                </div>
              </div>

              {/* Items Summary */}
              {info.itemsSummary.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-slate-700">
                  <Wrench className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <p><span className="font-bold text-slate-800">Serviços/Peças Trocadas:</span> {info.itemsSummary.join(', ')}</p>
                </div>
              )}

              {/* Previous Complaint / Notes */}
              {(info.notes || info.technicalRecommendations) && (
                <div className="text-[11px] bg-amber-50/70 p-2 rounded border border-amber-150/80 space-y-1">
                  {info.notes && (
                    <p className="italic text-slate-700">
                      <strong className="not-italic text-amber-900">Relato / Reclamado Anterior:</strong> "{info.notes}"
                    </p>
                  )}
                  {info.technicalRecommendations && (
                    <p className="text-slate-700">
                      <strong className="text-amber-900">Laudo Técnico Anterior:</strong> {info.technicalRecommendations}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning Message & Action Toggle */}
      <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200/70">
        <div className="flex items-center gap-2 text-xs text-amber-950 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Se a nova queixa for reincidência do mesmo defeito, classifique este atendimento como retorno em garantia.
          </span>
        </div>

        {onToggleWarrantyReturn && primaryWarranty && (
          <button
            id="btn-toggle-warranty-return"
            type="button"
            onClick={() => onToggleWarrantyReturn(!isWarrantyReturn, primaryWarranty.os.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-3xs ${
              isWarrantyReturn
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-400'
            }`}
          >
            {isWarrantyReturn ? (
              <>
                <Check className="w-3.5 h-3.5 font-bold" />
                <span>Atendimento Registrado em Garantia</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Classificar como "Retorno em Garantia"</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

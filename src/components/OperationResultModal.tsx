/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export interface OperationResultModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
}

export default function OperationResultModal({
  isOpen,
  type,
  title,
  message,
  onClose
}: OperationResultModalProps) {
  const okButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        okButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuccess = type === 'success';
  const isWarning = type === 'warning';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all animate-scale-up space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl flex-shrink-0 ${
              isSuccess 
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-emerald-100' 
                : isWarning 
                  ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-amber-100'
                  : 'bg-rose-100 text-rose-600 border border-rose-200 shadow-rose-100'
            }`}>
              {isSuccess ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : isWarning ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <XCircle className="w-7 h-7" />
              )}
            </div>

            <div>
              <h3 className={`text-base font-bold font-display ${
                isSuccess ? 'text-slate-900' : isWarning ? 'text-amber-900' : 'text-rose-900'
              }`}>
                {title}
              </h3>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isWarning ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {isSuccess ? 'Operação Concluída' : isWarning ? 'Alerta do Sistema' : 'Falha na Operação'}
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-700 leading-relaxed font-medium">
          {message}
        </div>

        <div className="flex justify-end pt-2">
          <button
            ref={okButtonRef}
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto min-w-[110px] px-5 py-2.5 rounded-xl font-bold text-xs text-white transition shadow-sm focus:ring-2 focus:ring-offset-2 ${
              isSuccess 
                ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' 
                : isWarning 
                  ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                  : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

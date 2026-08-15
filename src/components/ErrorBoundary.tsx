import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MotorDesk ErrorBoundary] Uncaught runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('motordesk_auth_token');
    } catch (e) {}
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-fallback" className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-xl bg-slate-800/90 border border-slate-700 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">MotorDesk — Recuperação de Interface</h1>
                <p className="text-xs text-slate-400">Ocorreu um imprevisto durante a renderização do módulo.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-amber-300">Mensagem do Sistema:</p>
              <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg break-words">
                {this.state.error?.message || 'Erro desconhecido de execução.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                id="btn-error-boundary-reload"
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>

              <button
                id="btn-error-boundary-reset"
                type="button"
                onClick={this.handleResetSession}
                className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Reiniciar Sessão</span>
              </button>
            </div>

            {this.state.errorInfo && (
              <div className="border-t border-slate-700/60 pt-4">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{this.state.showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos (Stack trace)'}</span>
                </button>

                {this.state.showDetails && (
                  <pre className="mt-3 p-3 bg-slate-950 text-[10px] text-slate-400 rounded-lg overflow-x-auto font-mono max-h-48 leading-relaxed">
                    {this.state.error?.stack}
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

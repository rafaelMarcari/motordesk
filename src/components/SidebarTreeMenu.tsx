import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';

declare const createPortal: ((children: React.ReactNode, container: Element | DocumentFragment) => React.ReactElement) | undefined;

export interface SubmenuItem {
  id: string;
  label: string;
  icon?: any;
  badge?: string;
  isNew?: boolean;
}

export interface SidebarTreeMenuProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  isCollapsed: boolean;
  isHovered: boolean;
  submenus: SubmenuItem[];
  activeRoute: string;
  onNavigate: (routeId: string) => void;
  defaultOpen?: boolean;
}

export function SidebarTreeMenu({
  id,
  title,
  icon,
  badge,
  badgeColor,
  isCollapsed,
  isHovered,
  submenus,
  activeRoute,
  onNavigate,
  defaultOpen = false
}: SidebarTreeMenuProps) {
  const isAnySubActive = submenus.some(s => s.id === activeRoute);
  const isExpanded = !isCollapsed || isHovered;

  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    arrowTop: number;
  }>({ top: 0, left: 0, maxHeight: 400, arrowTop: 16 });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const leaveTimeoutRef = useRef<any>(null);

  // Calcula com precisão a posição flutuante fora do menu e perfeitamente contida dentro da tela
  const updatePosition = () => {
    if (!buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const screenHeight = window.innerHeight || 800;
    const screenWidth = window.innerWidth || 1200;

    // Altura estimada do card flutuante: cabeçalho (~48px) + itens (~44px cada) + rodapé (~36px)
    const estimatedHeight = Math.min(submenus.length * 44 + 100, screenHeight - 32);

    let top = rect.top - 4;
    // Se estourar a borda inferior da tela, ajusta suavemente para cima
    if (top + estimatedHeight > screenHeight - 16) {
      top = Math.max(16, screenHeight - estimatedHeight - 16);
    }
    if (top < 16) {
      top = 16;
    }

    // Posição horizontal: imediatamente à direita do menu lateral
    let left = rect.right + 6;
    if (left + 320 > screenWidth - 12) {
      left = Math.max(12, screenWidth - 320 - 12);
    }

    const arrowTop = Math.max(16, Math.min(rect.top - top + 14, estimatedHeight - 28));

    setFlyoutPos({
      top,
      left,
      maxHeight: Math.min(screenHeight - top - 16, 580),
      arrowTop
    });
  };

  // Fecha outros flyouts ao abrir este
  useEffect(() => {
    const handleCloseOthers = (e: any) => {
      if (e.detail && e.detail !== id) {
        setIsHoverOpen(false);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('md-close-flyouts', handleCloseOthers);
      return () => window.removeEventListener('md-close-flyouts', handleCloseOthers);
    }
  }, [id]);

  // Atualiza posição durante scroll ou redimensionamento de tela
  useEffect(() => {
    if (!isHoverOpen || typeof window === 'undefined') return;

    const handleScrollOrResize = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      // Se o botão sumir da tela no scroll da barra lateral, fecha o submenu flutuante
      if (rect.bottom < 50 || rect.top > window.innerHeight - 30) {
        setIsHoverOpen(false);
        return;
      }
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHoverOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHoverOpen]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (submenus.length === 0) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('md-close-flyouts', { detail: id }));
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    updatePosition();
    setIsHoverOpen(true);
  };

  const handleMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    // Margem de tolerância suave (240ms) para movimentação diagonal confortável do mouse
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHoverOpen(false);
    }, 240);
  };

  const handleSubClick = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHoverOpen(false);
    if (onNavigate) {
      onNavigate(subId);
    }
  };

  const handleParentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (submenus.length > 0 && onNavigate) {
      onNavigate(submenus[0].id);
    }
    setIsHoverOpen(false);
  };

  // Renderização do Submenu Flutuante fora do Menu e Dentro da Tela
  const renderFlyoutMenu = () => {
    if (!isHoverOpen || submenus.length === 0 || typeof document === 'undefined') return null;

    const flyoutContent = (
      <div
        id={`flyout-menu-container-${id}`}
        style={{
          position: 'fixed',
          top: `${flyoutPos.top}px`,
          left: `${Math.max(0, flyoutPos.left - 10)}px`,
          zIndex: 99999,
          paddingLeft: '10px' // Ponte invisível contínua para o cursor do mouse
        }}
        onMouseEnter={() => {
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
          setIsHoverOpen(true);
        }}
        onMouseLeave={handleMouseLeave}
      >
        <div
          id={`flyout-menu-card-${id}`}
          className="relative bg-white border-2 border-slate-300 shadow-[0_25px_60px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] rounded-xl w-80 text-slate-900 flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none overflow-hidden"
          style={{ maxHeight: `${flyoutPos.maxHeight}px` }}
        >
          {/* Indicador / Seta visual apontando para o botão de origem */}
          <div
            className="absolute -left-2 w-3.5 h-3.5 bg-white border-l-2 border-t-2 border-slate-300 rotate-[-45deg] pointer-events-none"
            style={{ top: `${flyoutPos.arrowTop}px` }}
          />

          {/* Cabeçalho do Card Flutuante - Alto Contraste */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 flex items-center justify-center text-base text-indigo-400 font-bold">
                {icon}
              </span>
              <span className="font-black text-xs uppercase tracking-wider text-white truncate" title={title}>
                {title}
              </span>
            </div>
            {badge && (
              <span
                className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500 text-white shadow-xs shrink-0"
              >
                {badge}
              </span>
            )}
          </div>

          {/* Lista de Submenus Flutuantes - Fundo Claro e Textos Fortes de Alta Legibilidade */}
          <div className="p-2 space-y-1.5 overflow-y-auto max-h-[60vh] custom-scrollbar bg-slate-50/50">
            {submenus.map((sub, idx) => {
              const isSubActive = activeRoute === sub.id;
              return (
                <button
                  key={sub.id}
                  id={`flyout-sub-${id}-${sub.id}`}
                  type="button"
                  onClick={(e) => handleSubClick(sub.id, e)}
                  title={sub.label}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] transition flex items-center justify-between gap-3 cursor-pointer group ${
                    isSubActive
                      ? 'bg-indigo-600 text-white font-black shadow-md border-2 border-indigo-700'
                      : 'bg-white hover:bg-indigo-50 text-slate-900 hover:text-indigo-950 font-bold border border-slate-200 hover:border-indigo-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-sm shrink-0 transition-transform group-hover:scale-110 ${isSubActive ? 'text-white' : 'text-indigo-600 font-bold'}`}>
                      {sub.icon || '•'}
                    </span>
                    <span className="truncate tracking-tight font-extrabold">{sub.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSubActive && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200 text-[10px] font-black font-mono shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ATIVO
                      </span>
                    )}
                    {!isSubActive && sub.isNew && (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                        NOVO
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 transition ${isSubActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rodapé Informativo - Alta Legibilidade */}
          <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 shrink-0 font-medium">
            <span className="flex items-center gap-1.5 text-slate-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              {submenus.length} {submenus.length === 1 ? 'tela disponível' : 'telas disponíveis'}
            </span>
            <span className="font-bold text-[11px] text-indigo-700 bg-indigo-100/70 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              Clique para acessar
            </span>
          </div>
        </div>
      </div>
    );

    // Se createPortal estiver disponível, renderiza diretamente no body (livre de overflow)
    if (typeof createPortal === 'function') {
      return createPortal(flyoutContent, document.body);
    }
    return flyoutContent;
  };

  return (
    <div
      className="relative space-y-1 my-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Botão Principal do Módulo no Menu Lateral */}
      <button
        ref={buttonRef}
        id={`menu-btn-${id}-parent`}
        type="button"
        onClick={handleParentClick}
        title={title}
        className={`w-full flex items-center ${
          isExpanded ? 'justify-between px-3' : 'justify-center px-2'
        } py-2 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer select-none ${
          isAnySubActive
            ? 'bg-slate-800 text-white font-bold shadow-xs border border-indigo-500/40'
            : isHoverOpen
            ? 'bg-slate-800/80 text-white shadow-xs border border-indigo-500/30'
            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`shrink-0 flex items-center justify-center text-sm ${isAnySubActive || isHoverOpen ? 'text-indigo-400' : ''}`}>
            {icon}
          </span>
          {isExpanded && (
            <span className="truncate text-left">{title}</span>
          )}
        </div>

        {isExpanded && (
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {badge && (
              <span
                className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded ${
                  badgeColor || 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {badge}
              </span>
            )}
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isHoverOpen ? 'translate-x-0.5 text-indigo-400' : 'text-slate-500'
              }`}
            />
          </div>
        )}
      </button>

      {/* Submenu Flutuando Fora do Menu e Dentro da Tela */}
      {renderFlyoutMenu()}
    </div>
  );
}

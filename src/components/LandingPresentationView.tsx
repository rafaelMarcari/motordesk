/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import motordeskLogoImg from '../assets/images/motordesk_logo_1786534067989.jpg';
import { 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Settings, 
  Edit3, 
  Save, 
  RotateCcw, 
  MessageSquare, 
  Mail, 
  Linkedin, 
  Phone, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Award, 
  FileText, 
  LayoutGrid, 
  Smartphone, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Sliders,
  Clock,
  AlertTriangle,
  Receipt,
  BarChart3,
  Users,
  Wrench,
  Package,
  Car,
  X,
  Code2,
  Lock,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  LogOut,
  Upload,
  ChevronUp
} from 'lucide-react';
import { User } from '../types';

export interface ProductScreenItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  badge: string;
  highlights: string[];
}

export interface DifferentialItem {
  feature: string;
  motordesk: string;
  concorrente: string;
  highlight: boolean;
}

export interface LoginPageContent {
  title: string;
  subtitle: string;
  leftBadge: string;
  leftTitle: string;
  leftSubtitle: string;
  buttonText: string;
  logoUrl?: string;
}

export interface LandingContent {
  hero: {
    badgeText: string;
    title: string;
    subtitle: string;
    primaryCtaText: string;
    secondaryCtaText: string;
    kpis: { value: string; label: string }[];
  };
  differentials: {
    title: string;
    subtitle: string;
    items: DifferentialItem[];
  };
  productScreens: ProductScreenItem[];
  contacts: {
    whatsapp: string;
    email: string;
    linkedin: string;
    developerName: string;
    description: string;
  };
  loginPage?: LoginPageContent;
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    badgeText: '⚡ O ERP MÓVEL E DESKTOP MAIS INOVADOR PARA OFICINAS MECÂNICAS',
    title: 'MotorDesk: Gestão Completa, Emissão Sefaz e Reserva Inteligente de Estoque',
    subtitle: 'Revolucione sua oficina com rastreabilidade total, aviso em tempo real ao vendedor para peças em reserva no orçamento, emissão de NF-e/NFC-e e financeiro integrado.',
    primaryCtaText: 'Acessar MotorDesk (/motordesk)',
    secondaryCtaText: 'Ver Prints & Diferenciais',
    kpis: [
      { value: '100%', label: 'Controle de Estoque & Reservas' },
      { value: '1-Clique', label: 'Emissão Fiscal Sefaz e Boletos' },
      { value: '+40%', label: 'Produtividade de Atendimento' },
      { value: '0 Erros', label: 'Conflito de Peça em Orçamentos' }
    ]
  },
  differentials: {
    title: 'Diferenciais Exclusivos do MotorDesk vs. Concorrentes Legados',
    subtitle: 'Veja por que oficinas de alta performance estão trocando sistemas ultrapassados pelo MotorDesk:',
    items: [
      {
        feature: 'Reserva de Estoque em Orçamentos com Alerta',
        motordesk: 'Reserva automática de peça em orçamento ativo com aviso na tela do vendedor, contador de validade e registro de combinado com o cliente.',
        concorrente: 'Não possui reserva. Vendem a mesma peça duplicada ou travam a venda sem explicação ao vendedor.',
        highlight: true
      },
      {
        feature: 'Emissão Fiscal Integrada Sefaz (NF-e, NFC-e e Boletos)',
        motordesk: 'Emissão nativa em 1-clique, visualização DANFE em tempo real, download de XML e conciliação financeira automática.',
        concorrente: 'Dependência de softwares legados externos caros ou preenchimento manual demorado.',
        highlight: true
      },
      {
        feature: 'Venda Casada Inteligente de Peças & Mão de Obra',
        motordesk: 'Associação automática de peças relacionadas (ex: troca de óleo inclui filtro e serviço) para maximizar o ticket médio.',
        concorrente: 'Vendedor precisa lembrar e inserir cada item manualmente, perdendo faturamento.',
        highlight: false
      },
      {
        feature: 'Painel QA & Rastreabilidade de Testes (BDD/Cypress)',
        motordesk: 'Rastreabilidade total de requisitos funcionais, relatórios de testes e garantia de software industrial.',
        concorrente: 'Sistemas sem validação formal, com bugs frequentes que param a oficina.',
        highlight: true
      },
      {
        feature: 'Multi-Empresa e Regras Financeiras Completas',
        motordesk: 'Contas a Pagar/Receber, conciliação de boletos, transferência de estoque entre filiais e DRE gerencial.',
        concorrente: 'Controle financeiro básico em planilhas sem integração com as ordens de serviço.',
        highlight: false
      }
    ]
  },
  productScreens: [
    {
      id: 'screen-workshop-semaphore',
      title: 'Semáforo de Oficina em Tempo Real (Sinalizador 4 Cores)',
      category: 'Oficina & Box',
      description: 'Painel monitor visual de pista de oficina de alta eficiência. Acompanhe a situação do veículo em tempo real: Cinza (Não iniciada), Amarelo (Pausada por peça/aprov), Verde (Em andamento ativo no box) e Azul (Liberado para o cliente buscar). Inclui botão de ação diária para "Zerar Liberados de Hoje".',
      imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
      badge: 'Exclusivo: Semáforo ⚪🟡🟢🔵',
      highlights: [
        'Semáforo de 4 cores otimizado para fácil leitura de longa distância pelos mecânicos',
        'Novo padrão: Verde para serviços em andamento no box e Azul para veículos concluídos/liberados',
        'Botão "Zerar Liberados de Hoje (Azuis)" para rotina diária rápida de limpeza da recepção',
        'Rastreamento com motivo de pausa e responsável direto pela manutenção'
      ]
    },
    {
      id: 'screen-budgets-reservation',
      title: 'Módulo de Orçamentos com Reserva de Estoque e Acordo Comercial',
      category: 'Atendimento & Peças',
      description: 'Ao cotar uma peça, o sistema calcula reservas ativas em outros orçamentos simultâneos e exibe modal explicativo. Permite ao vendedor negociar o valor, registrar o combinado comercial e fechar vendas com precisão.',
      imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
      badge: 'Reserva Inteligente de Estoque',
      highlights: [
        'Aviso visual imediato na tela ao detectar estoque baixo ou reservado em cotações ativas',
        'Contador de validade da reserva em dias/horas prevenindo perda de material',
        'Registro formal do combinado comercial e acertos diretos com o cliente',
        'Desbloqueio e retorno automático do item ao estoque ao expirar a validade'
      ]
    },
    {
      id: 'screen-fiscal-sefaz',
      title: 'Emissão Fiscal Sefaz NF-e, NFC-e & Geração de Boletos Pix',
      category: 'Fiscal & Faturamento',
      description: 'Gerencie a emissão de notas fiscais eletrônicas com transmissão direta para a Sefaz em 1 clique. Emita boletos bancários com código Pix/Linha Digitável e baixe os arquivos XML/PDF lote instantaneamente.',
      imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
      badge: 'Sefaz Nativa 1-Clique',
      highlights: [
        'Emissão de NF-e e NFC-e diretamente pela Ordem de Serviço ou Venda de Balcão',
        'Geração e impressão de DANFE em PDF pronto para compartilhamento via WhatsApp',
        'Sincronização imediata de impostos com Contas a Receber e DRE Financeiro',
        'Exportação automatizada de pacotes XML para contabilidade'
      ]
    },
    {
      id: 'screen-warranty-management',
      title: 'Gestão de Garantias & Devolução de Peças com Laudo Técnico',
      category: 'Qualidade & Pós-Venda',
      description: 'Rastreabilidade ponta a ponta de itens sob garantia. Diferencie defeito de fabricação de mau uso do cliente, gere laudo técnico com fotos e envie para o fornecedor com número de protocolo formal.',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      badge: 'Rastreio Total de Garantias',
      highlights: [
        'Controle de prazos de garantia de peças de estoque e serviços prestados',
        'Emissão de Laudo Técnico Pericial em PDF para contestação de peças com fornecedores',
        'Controle de devolução e substituição sem prejuízo no estoque da loja',
        'Histórico vitalício vinculado à placa e chassi do veículo'
      ]
    },
    {
      id: 'screen-financial-dre',
      title: 'Painel Financeiro, Contas a Pagar/Receber & DRE Gerencial',
      category: 'Financeiro & Gestão',
      description: 'Visão consolidada do fluxo de caixa, boletos a vencer, centro de custos e DRE sintético/analítico. Acompanhe gráficos dinâmicos de faturamento bruto x líquido e ticket médio por atendimento.',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      badge: 'Fluxo de Caixa em Tempo Real',
      highlights: [
        'Baixa automática de recebíveis vinculados às Ordens de Serviço finalizadas',
        'Controle rigoroso de fornecedores, contas a pagar e previsões de saída',
        'DRE Gerencial detalhado com apuração de margem de lucro por peça e serviço',
        'Gestão multi-empresa, contas bancárias e conciliação financeira'
      ]
    },
    {
      id: 'screen-qa-bdd-tests',
      title: 'Painel QA & Suíte de Testes BDD / Cypress Integrados',
      category: 'Engenharia & Qualidade',
      description: 'Rastreabilidade total de requisitos funcionais da aplicação. Visualizador de testes automatizados E2E com Cypress, histórico de execução de regras de negócio e garantia de estabilidade contínua.',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      badge: 'Arquitetura Industrial QA',
      highlights: [
        'Garantia de software nível enterprise com mais de 30 cenários BDD validados',
        'Rastreabilidade direta de requisitos funcionais (RF001 a RF020)',
        'Auditoria completa de logs e alterações efetuadas por usuários do sistema',
        'Zero regressão em atualizações e alta performance em grandes volumes'
      ]
    }
  ],
  contacts: {
    whatsapp: '19 993634329',
    email: 'marcari.rafael@gmail.com',
    linkedin: 'https://www.linkedin.com/in/rafael-marçari/',
    developerName: 'Rafael Marçari',
    description: 'Engenheiro de Software & QA especializado em arquiteturas web resilientes, automação e desenvolvimento de ERPs corporativos.'
  },
  loginPage: {
    title: 'Bem-vindo ao MotorDesk',
    subtitle: 'Realize o login com o seu perfil funcional para iniciar suas atividades.',
    leftBadge: 'Portfólio de Gestão & QA',
    leftTitle: 'Plataforma integrada de Ordens de Serviço sob rigorosos testes de QA.',
    leftSubtitle: 'Este sistema foi planejado para demonstrar a excelência técnica em engenharia de testes, rastreabilidade e validação de requisitos de oficina.',
    buttonText: 'Entrar no Sistema',
    logoUrl: motordeskLogoImg
  }
};

export interface LandingPresentationViewProps {
  onOpenSystem: () => void;
  currentUser?: User | null;
  dbLandingContent?: LandingContent;
  onSaveLandingContent?: (newContent: LandingContent) => void;
}

export default function LandingPresentationView({
  onOpenSystem,
  currentUser,
  dbLandingContent,
  onSaveLandingContent
}: LandingPresentationViewProps) {
  // Load content from PostgreSQL database (passed via props), falling back to localStorage or defaults
  const [content, setContent] = useState<LandingContent>(() => {
    if (dbLandingContent) return dbLandingContent;
    try {
      const saved = localStorage.getItem('motordesk_landing_content_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading landing content:', e);
    }
    return DEFAULT_LANDING_CONTENT;
  });

  const activeLoginPage = content.loginPage || DEFAULT_LANDING_CONTENT.loginPage!;

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Keep state synchronized with database records from PostgreSQL only when admin panel is closed
  useEffect(() => {
    if (dbLandingContent && !isAdminPanelOpen) {
      if (JSON.stringify(dbLandingContent) !== JSON.stringify(content)) {
        setContent(dbLandingContent);
      }
    }
  }, [dbLandingContent, isAdminPanelOpen]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');

  // Track page scroll for back to top button, sticky header shrinking, and active section scrollspy
  useEffect(() => {
    const sectionIds = ['hero', 'produto', 'diferenciais', 'contato'];

    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // Header shrinking trigger
      setIsScrolled(scrollY > 30);
      
      // Back to top button trigger
      setShowBackToTop(scrollY > 250);

      // Active section scrollspy calculation
      const scrollPosition = scrollY + 130;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          if (scrollPosition >= el.offsetTop) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to top helper
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Smooth scroll helper when clicking menu items
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setActiveSection(targetId);
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 64;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const totalScreens = content.productScreens?.length || 1;
  const safeCarouselIndex = ((carouselIndex % totalScreens) + totalScreens) % totalScreens;
  const activeScreen = content.productScreens[safeCarouselIndex] || content.productScreens[0];

  // Auto-play interval timer
  useEffect(() => {
    if (!isAutoPlay || isHovered || totalScreens <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % totalScreens);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlay, isHovered, totalScreens]);

  const handlePrevSlide = () => {
    setCarouselIndex(prev => (prev - 1 + totalScreens) % totalScreens);
  };

  const handleNextSlide = () => {
    setCarouselIndex(prev => (prev + 1) % totalScreens);
  };

  const handleOpenAdminPanel = () => {
    if (isAdminAuthenticated) {
      setIsAdminPanelOpen(true);
    } else {
      setLoginError(null);
      setIsAuthModalOpen(true);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validUsers = ['admin', 'admin@motordesk.com', 'rafael', 'marcari'];
    const validPasswords = ['admin', 'admin123', 'motordesk2026', '123456'];

    const user = adminUsernameInput.trim().toLowerCase();
    const pass = adminPasswordInput.trim();

    if (validUsers.includes(user) && validPasswords.includes(pass)) {
      setIsAdminAuthenticated(true);
      setIsAuthModalOpen(false);
      setIsAdminPanelOpen(true);
      setLoginError(null);
      setAdminUsernameInput('');
      setAdminPasswordInput('');
    } else {
      setLoginError('Usuário ou senha incorretos. Credenciais de demonstração: usuário "admin" e senha "admin123".');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setIsAdminPanelOpen(false);
  };

  // Helper to read local computer image file into Base64 Data URL
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, onSelectUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          onSelectUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save changes to database (PostgreSQL Cloud SQL) and update localStorage cache
  const handleSaveContent = (newContent: LandingContent) => {
    setContent(newContent);
    try {
      localStorage.setItem('motordesk_landing_content_v2', JSON.stringify(newContent));
    } catch (e) {
      console.error('Error saving content:', e);
    }
    if (onSaveLandingContent) {
      onSaveLandingContent(newContent);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar todo o conteúdo original da apresentação?')) {
      setContent(DEFAULT_LANDING_CONTENT);
      localStorage.removeItem('motordesk_landing_content_v2');
      if (onSaveLandingContent) {
        onSaveLandingContent(DEFAULT_LANDING_CONTENT);
      }
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* NAVBAR */}
      <header className={`sticky top-0 z-40 transition-all duration-300 backdrop-blur-md ${
        isScrolled
          ? 'bg-slate-950/95 border-b border-slate-800 shadow-2xl shadow-slate-950/90 py-1 sm:py-1.5'
          : 'bg-slate-950/80 border-b border-slate-800/80 py-3.5 sm:py-4'
      }`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'h-12 sm:h-14' : 'h-16 sm:h-20'
        }`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`bg-gradient-to-tr from-indigo-600 to-amber-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 ${
              isScrolled ? 'p-1.5 sm:p-2' : 'p-2.5'
            }`}>
              <Wrench className={`text-white transition-all duration-300 ${isScrolled ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-6 h-6'}`} />
            </div>
            <div>
              <span className={`font-display font-bold tracking-tight text-white flex items-center gap-1.5 transition-all duration-300 ${
                isScrolled ? 'text-base sm:text-lg' : 'text-xl'
              }`}>
                MotorDesk
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                  v2.5 Pro
                </span>
              </span>
              {!isScrolled && (
                <span className="text-[11px] text-slate-400 block -mt-0.5 transition-all">ERP & Gestão de Oficina</span>
              )}
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2 text-xs font-semibold">
            {[
              { id: 'hero', label: 'Início' },
              { id: 'produto', label: 'Produto & Telas' },
              { id: 'diferenciais', label: 'Diferenciais' },
              { id: 'contato', label: 'Contato' }
            ].map(item => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={`transition-all duration-200 cursor-pointer px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs ${
                    isActive
                      ? 'text-amber-300 bg-amber-500/15 border border-amber-500/35 shadow-xs shadow-amber-500/10 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent font-medium'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              id="btn-open-landing-admin"
              onClick={handleOpenAdminPanel}
              className={`bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isScrolled ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
              }`}
              title="Painel Administrativo protegido por senha para editar textos, imagens e contatos"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin da Página</span>
            </button>

            <button
              type="button"
              id="btn-nav-access-motordesk"
              onClick={onOpenSystem}
              className={`bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30 ${
                isScrolled ? 'px-3 py-1.5' : 'px-4 py-2'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Acessar MotorDesk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        {/* Glow background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-lg shadow-amber-500/5 backdrop-blur-md"
          >
            <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>{content.hero.badgeText}</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-display text-white max-w-4xl mx-auto leading-tight"
          >
            {content.hero.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            {content.hero.subtitle}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              type="button"
              id="btn-hero-access-motordesk"
              onClick={onOpenSystem}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white rounded-2xl text-sm font-bold transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>{content.hero.primaryCtaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#produto"
              onClick={(e) => scrollToSection(e, 'produto')}
              className="w-full sm:w-auto px-7 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>{content.hero.secondaryCtaText}</span>
            </a>

            <a
              href="#contato"
              onClick={(e) => scrollToSection(e, 'contato')}
              className="w-full sm:w-auto px-6 py-4 bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>Contato Desenvolvedor</span>
            </a>
          </motion.div>

          {/* KPI Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-12 max-w-5xl mx-auto"
          >
            {content.hero.kpis.map((kpi, index) => (
              <div 
                key={index}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center backdrop-blur-xs hover:border-slate-700 transition"
              >
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-amber-400 block mb-1">
                  {kpi.value}
                </span>
                <span className="text-xs text-slate-400 font-medium leading-tight block">
                  {kpi.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SEÇÃO PRODUTO & TELAS (CARROSSEL INTERATIVO DE TELAS E OPERAÇÕES DIFERENCIADAS) */}
      <section id="produto" className="py-20 bg-slate-900/40 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-950/80 border border-amber-800/60 px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 shadow-lg shadow-amber-500/10">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Carrossel de Operações Diferenciadas
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white">
              Telas & Recursos que Fazem a Diferença no Mercado
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore o carrossel abaixo com os principais módulos operacionais do MotorDesk desenvolvidos para superar os sistemas legados tradicionais.
            </p>
          </div>

          {/* Carousel Top Controls Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xl">
            {/* Quick Screen Selector Pills */}
            <div className="flex items-center justify-start gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar w-full xl:w-auto pb-1.5 xl:pb-0 flex-nowrap min-w-0 shrink-1">
              {content.productScreens.map((screen, idx) => (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => setCarouselIndex(idx)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    safeCarouselIndex === idx
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-80">0{idx + 1}</span>
                  <span>{screen.category}</span>
                </button>
              ))}
            </div>

            {/* Slide Navigation Controls & Auto-play Toggle */}
            <div className="flex items-center justify-between xl:justify-end gap-2.5 sm:gap-3 w-full xl:w-auto border-t xl:border-t-0 border-slate-800 pt-2.5 xl:pt-0 shrink-0">
              {/* Counter Indicator */}
              <div className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 shrink-0">
                <span className="text-amber-400">0{safeCarouselIndex + 1}</span>
                <span className="text-slate-600">/</span>
                <span>0{totalScreens}</span>
              </div>

              {/* Auto Play Toggle Button */}
              <button
                type="button"
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0 ${
                  isAutoPlay
                    ? 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300 hover:bg-indigo-900'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title={isAutoPlay ? 'Pausar reprodução automática do carrossel' : 'Iniciar reprodução automática do carrossel'}
              >
                {isAutoPlay ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="hidden sm:inline">{isAutoPlay ? 'Auto' : 'Manual'}</span>
              </button>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition cursor-pointer active:scale-95"
                  title="Tela Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 rounded-xl transition cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                  title="Próxima Tela"
                >
                  <ChevronRight className="w-4 h-4 font-bold" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Screen Carousel Card */}
          {activeScreen && (
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-0 relative"
                >
                  {/* Left Column: Screen Details & Market Differentials */}
                  <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/80 border border-amber-800/80 px-3 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-xs">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          {activeScreen.badge}
                        </span>
                        <span className="text-xs text-slate-400 font-medium bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                          {activeScreen.category}
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold font-display text-white leading-snug">
                        {activeScreen.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                        {activeScreen.description}
                      </p>

                      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                          Diferenciais do Processo vs Mercado:
                        </span>
                        {activeScreen.highlights.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={onOpenSystem}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 hover:text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Acessar {activeScreen.category} no Sistema</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Screen Print Mockup with Browser Frame */}
                  <div className="lg:col-span-7 bg-slate-950 p-4 sm:p-6 flex flex-col justify-between relative min-h-[380px] border-t lg:border-t-0 lg:border-l border-slate-800">
                    {/* Simulated Browser Header Frame */}
                    <div className="bg-slate-900 border border-slate-800 rounded-t-2xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 ml-2 hidden sm:inline">
                          motordesk.app/{activeScreen.id.replace('screen-', '')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                          Live UI Preview
                        </span>
                      </div>
                    </div>

                    {/* Image Mockup Wrapper */}
                    <div className="w-full h-full rounded-b-2xl overflow-hidden border border-slate-800 relative group shadow-2xl bg-slate-900">
                      <img
                        src={activeScreen.imageUrl}
                        alt={activeScreen.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500 max-h-[440px]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

                      {/* Image Overlay Banner */}
                      <div className="absolute bottom-4 left-4 right-4 p-3.5 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 text-xs text-slate-200 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                            <Code2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white block text-xs">{activeScreen.title}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">Interface Responsiva MotorDesk</span>
                          </div>
                        </div>
                        <span className="hidden sm:inline-block px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md text-[10px] font-bold font-mono">
                          {safeCarouselIndex + 1} de {totalScreens}
                        </span>
                      </div>

                      {/* On-Image Navigation Arrows */}
                      <button
                        type="button"
                        onClick={handlePrevSlide}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700 rounded-full transition opacity-0 group-hover:opacity-100 cursor-pointer shadow-xl backdrop-blur-xs"
                        title="Anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextSlide}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-400 rounded-full transition opacity-0 group-hover:opacity-100 cursor-pointer shadow-xl backdrop-blur-xs"
                        title="Próxima"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Bottom Interactive Thumbnail Carousel Strip */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-300 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                Clique em uma tela para visualizar no carrossel:
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                {isAutoPlay ? '• Transição automática ativa (5s)' : '• Modo manual ativado'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {content.productScreens.map((screen, idx) => {
                const isActive = safeCarouselIndex === idx;
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setCarouselIndex(idx)}
                    className={`group text-left p-2.5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isActive
                        ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Top Thumbnail Image */}
                    <div className="h-20 w-full rounded-xl overflow-hidden mb-2 relative border border-slate-800/80 bg-slate-900">
                      <img
                        src={screen.imageUrl}
                        alt={screen.title}
                        className={`w-full h-full object-cover transition duration-300 ${isActive ? 'scale-105' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`}
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-amber-500/10 border-2 border-amber-400 rounded-xl" />
                      )}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-950/90 text-amber-400 font-mono text-[9px] font-bold rounded border border-slate-800">
                        0{idx + 1}
                      </span>
                    </div>

                    {/* Text Title */}
                    <div>
                      <span className="text-[10px] text-amber-400/90 font-bold uppercase block truncate">
                        {screen.category}
                      </span>
                      <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isActive ? 'text-white font-extrabold' : 'text-slate-300 group-hover:text-white'}`}>
                        {screen.title}
                      </h4>
                    </div>

                    {/* Progress Bar for active slide */}
                    {isActive && isAutoPlay && (
                      <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-amber-400 h-full w-full animate-[progress_5s_linear_infinite]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Box to Access MotorDesk */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-amber-950/40 p-8 rounded-3xl border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-xl font-bold text-white font-display">Pronto para testar o MotorDesk na prática?</h3>
              <p className="text-xs text-slate-300 max-w-xl">
                Acesse diretamente a aplicação com perfis pré-configurados (Mecânico, Vendedor, Gerente) para simular o fluxo real de ordens de serviço, orçamento com reserva e emissão fiscal.
              </p>
            </div>

            <button
              type="button"
              id="btn-product-box-access"
              onClick={onOpenSystem}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Acessar MotorDesk Agora</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO DIFERENCIAIS VS CONCORRENTES */}
      <section id="diferenciais" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-950/80 border border-amber-800/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Comparativo de Mercado
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white">
              {content.differentials.title}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {content.differentials.subtitle}
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-4 sm:p-5 w-1/3">Funcionalidade / Recursos</th>
                    <th className="p-4 sm:p-5 w-1/3 bg-indigo-950/40 text-amber-300 border-x border-indigo-800/40">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>MotorDesk (Nosso ERP)</span>
                      </div>
                    </th>
                    <th className="p-4 sm:p-5 w-1/3 text-slate-400">Sistemas Legados Concorrentes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {content.differentials.items.map((diff, index) => (
                    <tr key={index} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 sm:p-5 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{diff.feature}</span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 bg-indigo-950/20 border-x border-indigo-900/30 text-slate-200 font-medium">
                        <p className="text-xs leading-relaxed font-sans">{diff.motordesk}</p>
                      </td>
                      <td className="p-4 sm:p-5 text-slate-400 leading-relaxed">
                        <p className="text-xs text-slate-400">{diff.concorrente}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO CONTATO DO DESENVOLVEDOR */}
      <section id="contato" className="py-20 bg-slate-900/60 border-t border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Contatos
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white">
              Fale com o Desenvolvedor
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {content.contacts.description}
            </p>
          </div>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* WhatsApp */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-emerald-500/50 transition duration-300 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">WhatsApp Direto</h3>
                  <p className="text-xs text-slate-400">Atendimento rápido para dúvidas e consultoria</p>
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span>{content.contacts.whatsapp}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(content.contacts.whatsapp, 'wa')}
                    className="p-1 hover:text-white transition cursor-pointer"
                    title="Copiar WhatsApp"
                  >
                    {copiedField === 'wa' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              <a
                href={`https://wa.me/55${content.contacts.whatsapp.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(content.contacts.developerName)},%20vi%20o%20sistema%20MotorDesk%20e%20gostaria%20de%20saber%20mais!`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Iniciar Conversa no WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Email */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-indigo-500/50 transition duration-300 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">E-mail Profissional</h3>
                  <p className="text-xs text-slate-400">Envie propostas, requisitos e feedback</p>
                </div>
                <div className="text-xs font-mono font-bold text-indigo-300 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between truncate">
                  <span className="truncate">{content.contacts.email}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(content.contacts.email, 'email')}
                    className="p-1 hover:text-white transition cursor-pointer shrink-0"
                    title="Copiar E-mail"
                  >
                    {copiedField === 'email' ? <Check className="w-4 h-4 text-indigo-400" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              <a
                href={`mailto:${content.contacts.email}?subject=MotorDesk%20-%20Contato&body=Ol%C3%A1%20${encodeURIComponent(content.contacts.developerName)},`}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Mail className="w-4 h-4" />
                <span>Enviar E-mail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* LinkedIn */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-blue-500/50 transition duration-300 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400">
                  <Linkedin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Perfil LinkedIn</h3>
                  <p className="text-xs text-slate-400">Conecte-se e veja a trajetória profissional</p>
                </div>
                <div className="text-xs font-mono font-bold text-blue-300 bg-slate-950 p-3 rounded-xl border border-slate-800 truncate">
                  <span className="truncate">{content.contacts.developerName}</span>
                </div>
              </div>

              <a
                href={content.contacts.linkedin}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <Linkedin className="w-4 h-4" />
                <span>Acessar LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-300">MotorDesk ERP</span>
            <span>© 2026 - Desenvolvido por {content.contacts.developerName}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={onOpenSystem} className="hover:text-amber-400 transition cursor-pointer">Acessar Sistema</button>
            <button onClick={handleOpenAdminPanel} className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Painel Admin Landing</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL DE AUTENTICAÇÃO DO ADMIN DA PÁGINA */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative">
            {/* Glow Effects */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-white text-base">
                    Acesso Restrito ao Admin
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Digite suas credenciais de administrador da página
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAdminLogin} className="p-6 space-y-4 relative z-10">
              {loginError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Usuário Administrador</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={adminUsernameInput}
                  onChange={e => setAdminUsernameInput(e.target.value)}
                  placeholder="Ex: admin"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-white rounded-xl px-3.5 py-2.5 text-sm outline-hidden transition font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Senha de Acesso</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-white rounded-xl pl-3.5 pr-10 py-2.5 text-sm outline-hidden transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                    title={showPassword ? 'Ocultar Senha' : 'Exibir Senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Lock className="w-4 h-4" />
                  <span>Entrar no Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN EDIT PANEL MODAL / DRAWER */}
      {isAdminPanelOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold font-display text-white text-base">
                  Painel Administrativo da Landing Page
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Encerrar sessão de administrador"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair do Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminPanelOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-200 flex-1">
              {/* HERO SECTION EDITS */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4" />
                  Textos da Seção Principal (Hero)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Texto do Badge Superior</label>
                    <input
                      type="text"
                      value={content.hero.badgeText}
                      onChange={e => setContent({ ...content, hero: { ...content.hero, badgeText: e.target.value } })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:border-amber-400 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Texto do Botão Principal (CTA)</label>
                    <input
                      type="text"
                      value={content.hero.primaryCtaText}
                      onChange={e => setContent({ ...content, hero: { ...content.hero, primaryCtaText: e.target.value } })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:border-amber-400 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Título Principal (Headline)</label>
                  <input
                    type="text"
                    value={content.hero.title}
                    onChange={e => setContent({ ...content, hero: { ...content.hero, title: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subtítulo / Descrição</label>
                  <textarea
                    rows={2}
                    value={content.hero.subtitle}
                    onChange={e => setContent({ ...content, hero: { ...content.hero, subtitle: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:border-amber-400 outline-hidden"
                  />
                </div>
              </div>

              {/* LOGIN PAGE EDITS */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Textos e Logo da Tela de Login do Sistema
                </h4>

                {/* Logo input & upload */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Logo da Tela de Login (URL ou Arquivo do PC)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={activeLoginPage.logoUrl || ''}
                      onChange={e => setContent({
                        ...content,
                        loginPage: { ...activeLoginPage, logoUrl: e.target.value }
                      })}
                      placeholder="URL da imagem da logo..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs outline-hidden"
                    />
                    <label className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Escolher do PC</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleImageFileUpload(e, (url) => {
                          setContent({
                            ...content,
                            loginPage: { ...activeLoginPage, logoUrl: url }
                          });
                        })}
                      />
                    </label>
                  </div>
                  {activeLoginPage.logoUrl && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-slate-500">Prévia da Logo:</span>
                      <img
                        src={activeLoginPage.logoUrl}
                        alt="Prévia da Logo"
                        className="h-10 w-10 object-contain rounded-lg bg-slate-900 border border-slate-700 p-1"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Título do Form de Login (Lado Direito)
                    </label>
                    <input
                      type="text"
                      value={activeLoginPage.title}
                      onChange={e => setContent({
                        ...content,
                        loginPage: { ...activeLoginPage, title: e.target.value }
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Subtítulo do Form (Lado Direito)
                    </label>
                    <input
                      type="text"
                      value={activeLoginPage.subtitle}
                      onChange={e => setContent({
                        ...content,
                        loginPage: { ...activeLoginPage, subtitle: e.target.value }
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Tag/Badge do Painel Esquerdo
                    </label>
                    <input
                      type="text"
                      value={activeLoginPage.leftBadge}
                      onChange={e => setContent({
                        ...content,
                        loginPage: { ...activeLoginPage, leftBadge: e.target.value }
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Texto do Botão de Login
                    </label>
                    <input
                      type="text"
                      value={activeLoginPage.buttonText}
                      onChange={e => setContent({
                        ...content,
                        loginPage: { ...activeLoginPage, buttonText: e.target.value }
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Título Principal do Painel Esquerdo
                  </label>
                  <input
                    type="text"
                    value={activeLoginPage.leftTitle}
                    onChange={e => setContent({
                      ...content,
                      loginPage: { ...activeLoginPage, leftTitle: e.target.value }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Descrição do Painel Esquerdo
                  </label>
                  <textarea
                    rows={2}
                    value={activeLoginPage.leftSubtitle}
                    onChange={e => setContent({
                      ...content,
                      loginPage: { ...activeLoginPage, leftSubtitle: e.target.value }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium outline-hidden"
                  />
                </div>
              </div>

              {/* CONTACTS EDITS */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  Informações de Contato e Links do Desenvolvedor
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Nome do Desenvolvedor / Contato</label>
                    <input
                      type="text"
                      value={content.contacts.developerName}
                      onChange={e => setContent({ ...content, contacts: { ...content.contacts, developerName: e.target.value } })}
                      placeholder="Ex: Rafael Marçari"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:border-amber-400 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">WhatsApp (com DDD)</label>
                    <input
                      type="text"
                      value={content.contacts.whatsapp}
                      onChange={e => setContent({ ...content, contacts: { ...content.contacts, whatsapp: e.target.value } })}
                      placeholder="Ex: 19 993634329"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-400 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">E-mail de Contato</label>
                    <input
                      type="text"
                      value={content.contacts.email}
                      onChange={e => setContent({ ...content, contacts: { ...content.contacts, email: e.target.value } })}
                      placeholder="Ex: contato@motordesk.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-indigo-400 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">URL do Perfil do LinkedIn</label>
                    <input
                      type="text"
                      value={content.contacts.linkedin}
                      onChange={e => setContent({ ...content, contacts: { ...content.contacts, linkedin: e.target.value } })}
                      placeholder="Ex: https://www.linkedin.com/in/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-blue-400 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Descrição / Chamada da Seção de Contatos</label>
                  <textarea
                    rows={2}
                    value={content.contacts.description}
                    onChange={e => setContent({ ...content, contacts: { ...content.contacts, description: e.target.value } })}
                    placeholder="Descrição explicativa exibida na área de contatos"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:border-emerald-400 outline-hidden"
                  />
                </div>
              </div>

              {/* PRODUCT SCREENS EDITS */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  Editar Telas e Prints do Produto ({content.productScreens.length})
                </h4>

                <div className="space-y-4">
                  {content.productScreens.map((screen, sIdx) => (
                    <div key={screen.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Título da Tela</label>
                          <input
                            type="text"
                            value={screen.title}
                            onChange={e => {
                              const updated = [...content.productScreens];
                              updated[sIdx].title = e.target.value;
                              setContent({ ...content, productScreens: updated });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-semibold outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Imagem do Print (URL ou Arquivo do PC)</label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={screen.imageUrl}
                              onChange={e => {
                                const updated = [...content.productScreens];
                                updated[sIdx].imageUrl = e.target.value;
                                setContent({ ...content, productScreens: updated });
                              }}
                              placeholder="URL web ou escolha arquivo do PC ->"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px] outline-hidden"
                            />
                            <label className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                              <Upload className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Escolher do PC</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handleImageFileUpload(e, (url) => {
                                  const updated = [...content.productScreens];
                                  updated[sIdx].imageUrl = url;
                                  setContent({ ...content, productScreens: updated });
                                })}
                              />
                            </label>
                          </div>
                          {screen.imageUrl && (
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="text-slate-500 font-mono">Prévia:</span>
                              <img src={screen.imageUrl} alt="Prévia" className="w-10 h-6 object-cover rounded border border-slate-700" />
                              {screen.imageUrl.startsWith('data:image') ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Imagem salva do seu computador pessoal
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono truncate max-w-[200px]">{screen.imageUrl}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Descrição</label>
                        <textarea
                          rows={2}
                          value={screen.description}
                          onChange={e => {
                            const updated = [...content.productScreens];
                            updated[sIdx].description = e.target.value;
                            setContent({ ...content, productScreens: updated });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-hidden"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrões</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSaveContent(content);
                  setIsAdminPanelOpen(false);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE DE VOLTAR AO TOPO */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          id="btn-back-to-top"
          className="fixed bottom-6 right-6 z-50 p-3.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-2xl border border-indigo-400/40 backdrop-blur-md transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer group animate-fade-in"
          title="Voltar ao início do site"
        >
          <ChevronUp className="w-6 h-6 transition-transform duration-200 group-hover:-translate-y-0.5" />
        </button>
      )}
    </div>
  );
}

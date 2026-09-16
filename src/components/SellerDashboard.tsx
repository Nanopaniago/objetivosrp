import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  GoalCategory,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
} from '../types';
import { calculateSellerPerformanceSummary, formatCategoryValue } from '../utils/calculations';
import { getEvolutionClassification } from './GeneralResultCounter';
import { CategoriesOverview } from './CategoriesOverview';
import { useTheme } from '../context/ThemeContext';
import {
  Trophy,
  CloudSun,
  ArrowRight,
  TrendingUp,
  Crown,
  Award,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SellerDashboardProps {
  seller: User;
  allSellers?: User[];
  currentMonth: number;
  currentYear: number;
  categories: GoalCategory[];
  goals: MonthlyGoal[];
  entries: DailyEntry[];
  schedules: WorkSchedule[];
  onOpenDailyEntry: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToGoals?: () => void;
  onNavigateToTeam?: () => void;
  onSelectSeller?: (sellerId: string) => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  seller,
  allSellers,
  currentMonth,
  currentYear,
  categories,
  goals,
  entries,
  schedules,
  onOpenDailyEntry,
  onNavigateToSchedule,
  onNavigateToGoals,
  onNavigateToTeam,
  onSelectSeller,
}) => {
  const { isDark } = useTheme();

  // Performance calculation for current seller
  const summary = calculateSellerPerformanceSummary(
    seller,
    currentMonth,
    currentYear,
    categories,
    goals,
    entries,
    schedules
  );

  const { overallProgressPercentage, categories: catCalcs, scheduleStats } = summary;
  const classification = getEvolutionClassification(overallProgressPercentage);

  // Consolidated financial amounts
  let totalTargetEuros = 0;
  let totalExecutedEuros = 0;

  categories.forEach((cat) => {
    const calc = catCalcs[cat.slug];
    if (!calc) return;
    if (cat.metricType === 'currency') {
      totalTargetEuros += calc.monthlyGoal || 0;
      totalExecutedEuros += calc.accumulated || (calc as any).currentMonthTotal || 0;
    }
  });

  // Default to reference figures if targets not yet configured
  if (totalTargetEuros === 0) {
    totalTargetEuros = 14250;
    totalExecutedEuros = 11160;
  }
  const remainingEuros = Math.max(0, totalTargetEuros - totalExecutedEuros);

  // Dynamic ranking for Top 5 Vendedores
  const topSellersList = useMemo(() => {
    if (allSellers && allSellers.length > 0) {
      const calculated = allSellers.map((s) => {
        const perf = calculateSellerPerformanceSummary(
          s,
          currentMonth,
          currentYear,
          categories,
          goals,
          entries,
          schedules
        );
        return {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          pct: perf.overallProgressPercentage,
          isSelf: s.id === seller.id,
        };
      });

      calculated.sort((a, b) => b.pct - a.pct);
      return calculated.slice(0, 5).map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
    }

    // Reference benchmark ranking
    return [
      { id: 'u2', name: 'Bruno Silva', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', pct: 112, rank: 1, isSelf: seller.id === 'u2' },
      { id: 'u3', name: 'Carla Mendes', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', pct: 98, rank: 2, isSelf: seller.id === 'u3' },
      { id: seller.id, name: seller.name, avatar: seller.avatar, pct: overallProgressPercentage, rank: 3, isSelf: true },
      { id: 'u4', name: 'Pedro Costa', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', pct: 71, rank: 4, isSelf: seller.id === 'u4' },
      { id: 'u5', name: 'Sofia Almeida', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', pct: 64, rank: 5, isSelf: seller.id === 'u5' },
    ];
  }, [allSellers, seller, currentMonth, currentYear, categories, goals, entries, schedules, overallProgressPercentage]);

  // Carousel slide state
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselTrackRef = useRef<HTMLDivElement>(null);

  // Mouse drag-to-scroll tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const hasDraggedDistanceRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselTrackRef.current) return;
    setIsDragging(true);
    hasDraggedDistanceRef.current = false;
    dragStartXRef.current = e.pageX - carouselTrackRef.current.offsetLeft;
    scrollStartLeftRef.current = carouselTrackRef.current.scrollLeft;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselTrackRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselTrackRef.current.offsetLeft;
    const walk = x - dragStartXRef.current;
    if (Math.abs(walk) > 4) {
      hasDraggedDistanceRef.current = true;
    }
    carouselTrackRef.current.scrollLeft = scrollStartLeftRef.current - walk;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!carouselTrackRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
      carouselTrackRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleScrollLeft = () => {
    if (carouselTrackRef.current) {
      carouselTrackRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
    handlePrevSlide();
  };

  const handleScrollRight = () => {
    if (carouselTrackRef.current) {
      carouselTrackRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
    handleNextSlide();
  };

  // When slide changes, scroll it smoothly into view on track
  useEffect(() => {
    if (carouselTrackRef.current) {
      const targetCard = carouselTrackRef.current.children[currentSlide] as HTMLElement;
      if (targetCard) {
        targetCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentSlide]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? topSellersList.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % topSellersList.length);
  };

  // Helper to provide gradual tiered dimensions (1º > 2º > 3º > 4º > 5º)
  const getCardDimensions = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          cardWidth: 'w-[325px] min-w-[325px]',
          minHeight: 'min-h-[224px]',
          padding: 'p-5',
          avatarSize: 'w-13 h-13 text-lg',
          rankBadgeSize: 'w-8 h-8 text-sm',
          nameSize: 'text-sm font-black',
          statusSize: 'text-xs font-semibold',
          progressLabel: 'text-[11px] font-medium',
          pctSize: 'text-base font-black',
          barHeight: 'h-2.5',
        };
      case 2:
        return {
          cardWidth: 'w-[275px] min-w-[275px]',
          minHeight: 'min-h-[200px]',
          padding: 'p-4',
          avatarSize: 'w-11 h-11 text-base',
          rankBadgeSize: 'w-7 h-7 text-xs',
          nameSize: 'text-[13px] font-bold',
          statusSize: 'text-[11px]',
          progressLabel: 'text-[10px] font-medium',
          pctSize: 'text-sm font-black',
          barHeight: 'h-2',
        };
      case 3:
        return {
          cardWidth: 'w-[240px] min-w-[240px]',
          minHeight: 'min-h-[184px]',
          padding: 'p-3.5',
          avatarSize: 'w-10 h-10 text-sm',
          rankBadgeSize: 'w-6.5 h-6.5 text-xs',
          nameSize: 'text-xs font-bold',
          statusSize: 'text-[10px]',
          progressLabel: 'text-[9.5px] font-medium',
          pctSize: 'text-xs font-bold',
          barHeight: 'h-2',
        };
      case 4:
        return {
          cardWidth: 'w-[212px] min-w-[212px]',
          minHeight: 'min-h-[172px]',
          padding: 'p-3',
          avatarSize: 'w-9 h-9 text-xs',
          rankBadgeSize: 'w-6 h-6 text-[11px]',
          nameSize: 'text-[11.5px] font-bold',
          statusSize: 'text-[9.5px]',
          progressLabel: 'text-[9px] font-medium',
          pctSize: 'text-xs font-bold',
          barHeight: 'h-1.5',
        };
      default:
        return {
          cardWidth: 'w-[188px] min-w-[188px]',
          minHeight: 'min-h-[162px]',
          padding: 'p-2.5',
          avatarSize: 'w-8 h-8 text-xs',
          rankBadgeSize: 'w-5.5 h-5.5 text-[10px]',
          nameSize: 'text-[11px] font-semibold',
          statusSize: 'text-[9px]',
          progressLabel: 'text-[8.5px] font-normal',
          pctSize: 'text-[11px] font-bold',
          barHeight: 'h-1.5',
        };
    }
  };

  // Goals Ring math
  const goalRadius = 56;
  const goalCircumference = 2 * Math.PI * goalRadius;
  const goalProgressOffset =
    goalCircumference - (Math.min(overallProgressPercentage, 100) / 100) * goalCircumference;

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* ROW 1: TOP 5 VENDEDORES (INÍCIO DA DASHBOARD)             */}
      {/* ========================================================= */}
      <div
        id="top-sellers-carousel-section"
        className={`rounded-3xl p-5 sm:p-7 border transition-all shadow-sm relative overflow-hidden ${
          isDark
            ? 'bg-[#0f172a] border-white/[0.08] text-white'
            : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
        }`}
      >
        {/* Child 1: Header with Title, Badges, and Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Top 5 Vendedores</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span>Liderança do Mês</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Classificação gradual em pódio</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-[11px] text-blue-500 dark:text-blue-400 font-semibold">
                  Arraste com o cursor do mouse ou role para o lado ↔
                </span>
              </p>
            </div>
          </div>

          {/* Controls Toolbar: Scroll Buttons & Team Link */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Carousel Previous & Next Slide Controls (Visible on all devices for mouse navigation) */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleScrollLeft}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer active:scale-95"
                title="Rolar para a esquerda"
                aria-label="Rolar para a esquerda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2 text-[11px] font-bold text-slate-500 tabular-nums select-none">
                {currentSlide + 1}/{topSellersList.length}
              </div>
              <button
                type="button"
                onClick={handleScrollRight}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer active:scale-95"
                title="Rolar para a direita"
                aria-label="Rolar para a direita"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onNavigateToTeam && (
              <button
                type="button"
                onClick={onNavigateToTeam}
                className="text-xs font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-500/20 hover:bg-blue-500/5 transition cursor-pointer"
              >
                <span>Equipa Completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Child 2: Horizontally Scrollable Track with Gradual Tiered Podium Cards */}
        <div
          ref={carouselTrackRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          className={`flex items-end gap-3.5 overflow-x-auto pb-3 pt-2 px-1 scroll-smooth carousel-horizontal-scrollbar select-none transition-all ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {topSellersList.map((item, index) => {
            const isFirst = item.rank === 1;
            const isSecond = item.rank === 2;
            const isThird = item.rank === 3;
            const isActiveSlide = index === currentSlide;

            const dims = getCardDimensions(item.rank);

            const rankBadgeColor = isFirst
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 glow-box-amber'
              : isSecond
              ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950'
              : isThird
              ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
              : isDark
              ? 'bg-slate-800 text-slate-400 border border-white/[0.08]'
              : 'bg-slate-200 text-slate-600';

            return (
              <div
                key={item.id || item.name}
                onClick={() => {
                  if (hasDraggedDistanceRef.current) return;
                  setCurrentSlide(index);
                  if (onSelectSeller && item.id) onSelectSeller(item.id);
                }}
                className={`relative ${dims.cardWidth} ${dims.minHeight} ${dims.padding} rounded-2xl border transition-all duration-300 flex flex-col justify-between shrink-0 snap-center ${
                  isActiveSlide
                    ? isDark
                      ? 'ring-2 ring-blue-500/70 shadow-xl shadow-blue-500/10 scale-[1.01] bg-slate-900/95'
                      : 'ring-2 ring-blue-500/60 shadow-xl shadow-blue-500/15 scale-[1.01] bg-white'
                    : 'hover:scale-[1.008]'
                } ${
                  item.isSelf
                    ? isDark
                      ? 'bg-blue-600/10 border-blue-500/50 glow-box-blue'
                      : 'bg-blue-50/80 border-blue-400/80 glow-box-blue'
                    : isFirst
                    ? isDark
                      ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/50 glow-box-amber shadow-lg shadow-amber-500/5'
                      : 'bg-gradient-to-b from-amber-50/80 to-white border-amber-300/90 glow-box-amber shadow-md shadow-amber-500/10'
                    : isSecond
                    ? isDark
                      ? 'bg-slate-900/80 border-slate-600/50'
                      : 'bg-slate-50/90 border-slate-300/80'
                    : isThird
                    ? isDark
                      ? 'bg-slate-900/70 border-amber-800/30'
                      : 'bg-slate-50/80 border-amber-200/70'
                    : isDark
                    ? 'bg-slate-900/50 border-white/[0.05] hover:border-slate-700'
                    : 'bg-slate-50/70 border-slate-200/60 hover:border-slate-300'
                }`}
              >
                {/* Child 1: Top of Card: Rank, Badges, Slide Status */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`${dims.rankBadgeSize} rounded-xl flex items-center justify-center font-black shrink-0 ${rankBadgeColor}`}
                    >
                      {item.rank}º
                    </span>
                    {isActiveSlide && (
                      <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 uppercase tracking-tight">
                        Foco
                      </span>
                    )}
                  </div>

                  {item.isSelf ? (
                    <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-blue-500 text-white tracking-wide shadow-sm shadow-blue-500/30">
                      VOCÊ
                    </span>
                  ) : isFirst ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 flex items-center gap-1 border border-amber-500/30 glow-icon-amber">
                      <Crown className="w-3.5 h-3.5 animate-float-gentle" />
                      <span>1º Lugar</span>
                    </span>
                  ) : isSecond ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-400/15 text-slate-500 dark:text-slate-300 border border-slate-400/25">
                      2º Lugar
                    </span>
                  ) : isThird ? (
                    <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-700/15 text-amber-600 dark:text-amber-400 border border-amber-700/25">
                      3º Lugar
                    </span>
                  ) : null}
                </div>

                {/* Child 2: Seller Avatar and Name */}
                <div className="flex items-center gap-2.5 my-auto py-1">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.name}
                      draggable={false}
                      className={`${dims.avatarSize} rounded-xl object-cover border border-black/10 dark:border-white/10 shrink-0 pointer-events-none`}
                    />
                  ) : (
                    <div
                      className={`${dims.avatarSize} rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold shrink-0`}
                    >
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className={`${dims.nameSize} truncate leading-tight`}>{item.name}</h4>
                    <p className={`${dims.statusSize} text-slate-400 truncate mt-0.5`}>
                      {item.pct >= 100 ? 'Meta Superada' : item.pct >= 75 ? 'Bom Ritmo' : 'Em Progresso'}
                    </p>
                  </div>
                </div>

                {/* Child 3: Metric and Progress Track */}
                <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] mt-auto">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`${dims.progressLabel} text-slate-400`}>Progresso</span>
                    <motion.span
                      key={`pct-${item.id}`}
                      initial={{ opacity: 0, y: 3 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.6, delay: 0.1 + index * 0.08 }}
                      className={`${dims.pctSize} tabular-nums ${
                        item.pct >= 100
                          ? 'text-emerald-500'
                          : item.pct >= 75
                          ? 'text-blue-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {Math.round(item.pct)}%
                    </motion.span>
                  </div>
                  <div
                    className={`w-full ${dims.barHeight} bg-slate-200 dark:bg-slate-800/90 rounded-full overflow-hidden p-0 relative shadow-inner`}
                  >
                    <motion.div
                      key={`bar-${item.id}`}
                      className={`h-full rounded-full shimmer-bar-sweep relative ${
                        item.pct >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 glow-bar-emerald'
                          : item.pct >= 75
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400 glow-bar-blue'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400 glow-bar-amber'
                      }`}
                      initial={{ width: '0%', opacity: 0 }}
                      whileInView={{ width: `${Math.min(item.pct, 100)}%`, opacity: 1 }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{
                        duration: 1.2,
                        delay: 0.1 + index * 0.1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {/* Radiant leading tip spark */}
                      <div className="absolute right-0 top-0 bottom-0 w-2 rounded-full bg-white/80 blur-[1px]" />
                    </motion.div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 2: RESULTADO GERAL DA LOJA + WEATHER WIDGET           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Resultado Geral da Loja (8 Cols on Desktop) */}
        <div
          className={`lg:col-span-8 rounded-3xl p-6 sm:p-7 border relative overflow-hidden transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.85 }}
                whileInView={{ scale: [0.85, 1.1, 1], rotate: [0, -5, 0] }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0 glow-icon-blue shadow-xs"
              >
                <Trophy className="w-6 h-6" />
              </motion.div>
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Resultado Geral da Loja</h3>
                <span className="text-xs text-slate-400">Desempenho acumulado do mês</span>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                overallProgressPercentage >= 70
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {classification.label}
            </span>
          </div>

          {/* Main Percentage & Sparkline Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-6">
            {/* Big 78% Indicator */}
            <div className="md:col-span-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums flex items-baseline"
              >
                <span>{overallProgressPercentage}</span>
                <span className="text-2xl sm:text-3xl text-blue-500 ml-1 font-black glow-icon-blue">%</span>
              </motion.div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 mt-1.5">
                <TrendingUp className="w-3.5 h-3.5 glow-icon-emerald" />
                <span>+12% vs. mês anterior</span>
              </div>
            </div>

            {/* Sparkline curve */}
            <div className="md:col-span-8 h-28 sm:h-32 relative flex items-center px-1">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 340 100"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 5,80 C 45,78 75,85 115,58 C 155,32 195,50 240,30 C 275,16 305,22 335,12 L 335,95 L 5,95 Z"
                  fill="url(#sparkGrad)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 1.2, delay: 0.15 }}
                />
                <motion.path
                  d="M 5,80 C 45,78 75,85 115,58 C 155,32 195,50 240,30 C 275,16 305,22 335,12"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="glow-line-blue"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />
                <circle cx="240" cy="30" r="4.5" fill="#3b82f6" />
                <circle cx="335" cy="12" r="11" fill="rgba(59,130,246,0.3)" className="animate-ping-slow" />
                <motion.circle
                  cx="335"
                  cy="12"
                  r="5"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="glow-icon-blue"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: 1.0 }}
                />
              </svg>
            </div>
          </div>

          {/* Segmented Progress Track */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden flex gap-1 p-0.5">
              <motion.div
                className="h-full rounded-full bg-emerald-500 shimmer-bar-sweep glow-bar-emerald"
                initial={{ width: '0%' }}
                whileInView={{ width: `${Math.min(overallProgressPercentage, 60)}%` }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 1.0, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div
                className="h-full rounded-full bg-amber-400 shimmer-bar-sweep"
                initial={{ width: '0%' }}
                whileInView={{ width: `${Math.max(0, Math.min(overallProgressPercentage - 60, 25))}%` }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 1.0, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div
                className="h-full rounded-full bg-orange-500 shimmer-bar-sweep"
                initial={{ width: '0%' }}
                whileInView={{ width: `${Math.max(0, Math.min(overallProgressPercentage - 85, 15))}%` }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 1.0, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* Bottom Financial Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-5 mt-5 border-t border-black/[0.06] dark:border-white/[0.08] text-center sm:text-left">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Total Objetivos</span>
              <span className="text-sm sm:text-base font-black tabular-nums">
                {formatCategoryValue(totalTargetEuros, 'currency')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Alcançado</span>
              <span className="text-sm sm:text-base font-black text-emerald-500 tabular-nums">
                {formatCategoryValue(totalExecutedEuros, 'currency')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Falta</span>
              <span className="text-sm sm:text-base font-black text-amber-500 tabular-nums">
                {formatCategoryValue(remainingEuros, 'currency')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Weather Widget (4 Cols on Desktop) */}
        <div
          className={`lg:col-span-4 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meteorologia</span>
            <span className="text-xs text-slate-400">Lisboa, PT</span>
          </div>

          <div className="my-5 flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.85 }}
              whileInView={{ scale: [0.85, 1.1, 1], rotate: [0, 8, 0] }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 glow-icon-amber animate-float-gentle shadow-xs"
            >
              <CloudSun className="w-9 h-9" />
            </motion.div>
            <div>
              <div className="text-4xl font-black tracking-tight">27°C</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Parcialmente Nublado</div>
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
            <span>Máx: 31° &bull; Mín: 21°</span>
            <span className="font-semibold text-blue-500">Dia produtivo!</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 3: OS SEUS OBJETIVOS + EVOLUÇÃO DE RESULTADOS          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Os Seus Objetivos (5 Cols on Desktop) */}
        <div
          className={`lg:col-span-5 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight">Os Seus Objetivos</h3>
                <span className="text-xs text-slate-400">Desempenho individual deste mês</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {overallProgressPercentage}% Concluído
              </span>
            </div>

            <div className="my-6 flex items-center justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Meta Mensal</span>
                  <span className="text-xl font-black tabular-nums">
                    {formatCategoryValue(totalTargetEuros, 'currency')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Já Alcançado</span>
                  <span className="text-xl font-black text-emerald-500 tabular-nums">
                    {formatCategoryValue(totalExecutedEuros, 'currency')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Falta Atingir</span>
                  <span className="text-base font-black text-amber-500 tabular-nums">
                    {formatCategoryValue(remainingEuros, 'currency')}
                  </span>
                </div>
              </div>

              {/* Circular Ring Gauge with Neon Glow */}
              <div className="relative w-32 h-32 aspect-square flex items-center justify-center shrink-0">
                <svg className="w-full h-full aspect-square -rotate-90 transform overflow-visible" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={goalRadius}
                    stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                    strokeWidth="10"
                    fill="none"
                  />
                  <motion.circle
                    cx="70"
                    cy="70"
                    r={goalRadius}
                    stroke="#3b82f6"
                    strokeWidth="10"
                    strokeDasharray={goalCircumference}
                    initial={{ strokeDashoffset: goalCircumference }}
                    whileInView={{ strokeDashoffset: goalProgressOffset }}
                    viewport={{ once: false, amount: 0.3 }}
                    strokeLinecap="round"
                    fill="none"
                    className="glow-line-blue"
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <motion.span
                    initial={{ scale: 0.7, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: false, amount: 0.3 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="text-xl font-black tabular-nums"
                  >
                    {overallProgressPercentage}%
                  </motion.span>
                  <span className="text-[10px] text-slate-400 font-semibold">Avanço Global</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDailyEntry}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] mt-2"
          >
            <span>Ver Detalhes & Registar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Evolução de Resultados (7 Cols on Desktop) */}
        <div
          className={`lg:col-span-7 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight">Evolução de Resultados</h3>
                <p className="text-xs text-slate-400">Comparativo da trajetória de vendas</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 glow-bar-blue" />
                  <span>Este mês</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <span className="w-3 h-0.5 border-b-2 border-dashed border-slate-400 inline-block" />
                  <span>Mês anterior</span>
                </div>
              </div>
            </div>

            {/* Chart Canvas with Glowing Paths and Ascending Conveyor Belt */}
            <div className="h-56 relative w-full pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0, 45, 90, 135, 180].map((y, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={y}
                    x2="600"
                    y2={y}
                    stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Linha tracejada que se movimenta subindo continuamente como esteira */}
                <motion.g
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6 }}
                >
                  <path
                    d="M0,150 Q150,130 300,100 T600,60"
                    fill="none"
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    strokeWidth="2.5"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    className="animate-conveyor-belt"
                  />
                </motion.g>

                {/* Current Month Solid Line with Glowing Stroke */}
                <motion.path
                  d="M0,160 C100,140 180,110 300,80 C400,60 500,45 600,30"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="glow-line-blue"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 1.3, ease: 'easeOut' }}
                />

                {/* Soft Beacon Node at Current Point (78%) */}
                <circle cx="300" cy="80" r="10" fill="rgba(59,130,246,0.25)" className="animate-pulse" />
                <motion.circle
                  cx="300"
                  cy="80"
                  r="5"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="glow-icon-blue"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                />
                <motion.g
                  transform="translate(270, 36)"
                  style={{ filter: 'drop-shadow(0 4px 10px rgba(59,130,246,0.45))' }}
                  initial={{ opacity: 0, y: -6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                >
                  <rect width="60" height="26" rx="8" fill="#2563eb" />
                  <text x="30" y="17" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    {overallProgressPercentage}%
                  </text>
                </motion.g>
              </svg>
            </div>
          </div>

          {/* X Axis Labels */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-black/[0.04] dark:border-white/[0.04] font-mono">
            <span>Dia 1</span>
            <span>Dia 5</span>
            <span>Dia 10</span>
            <span>Dia 15</span>
            <span>Dia 20</span>
            <span>Dia 25</span>
            <span>Dia 30</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 4: CATEGORIAS E OBJETIVOS (IMPOSING & MODERN VIEW)    */}
      {/* ========================================================= */}
      <CategoriesOverview
        categories={categories}
        categoryCalculations={catCalcs}
        scheduleStats={scheduleStats}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onOpenDailyEntry={onOpenDailyEntry}
      />
    </div>
  );
};

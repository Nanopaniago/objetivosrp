import React, { useState, useRef } from 'react';
import { BrandConfig, BrandAccent, LogoPreset } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  X,
  Upload,
  Sparkles,
  Check,
  RotateCcw,
  Palette,
  Image as ImageIcon,
  Type,
  Leaf,
  Activity,
  Waves,
  Diamond,
  Target,
  Layers,
  HelpCircle,
  Eye,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { DEFAULT_BRAND_CONFIG } from '../utils/brand';
import { User } from '../types';

interface BrandCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandConfig;
  onSaveBrand: (newBrand: BrandConfig) => void;
  currentUser?: User;
}

const PRESET_OPTIONS: { id: LogoPreset; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'leaf', label: 'Folha Orgânica', icon: <Leaf className="w-5 h-5" />, desc: 'A estética pura e orgânica da Apple' },
  { id: 'sparkle', label: 'Centelha / Brilho', icon: <Sparkles className="w-5 h-5" />, desc: 'Destaque e excelência comercial' },
  { id: 'pulse', label: 'Pulso & Ritmo', icon: <Activity className="w-5 h-5" />, desc: 'Dinâmica de vendas em tempo real' },
  { id: 'wave', label: 'Onda Suave', icon: <Waves className="w-5 h-5" />, desc: 'Fluidez e harmonia de equipa' },
  { id: 'gem', label: 'Cristal Geométrico', icon: <Diamond className="w-5 h-5" />, desc: 'Precisão e solidez de resultados' },
  { id: 'target', label: 'Foco no Alvo', icon: <Target className="w-5 h-5" />, desc: 'Orientação clara para metas' },
  { id: 'flow', label: 'Camadas / Flow', icon: <Layers className="w-5 h-5" />, desc: 'Estrutura organizada e moderna' },
];

const ACCENT_OPTIONS: { id: BrandAccent; label: string; hex: string; desc: string }[] = [
  { id: 'apple_blue', label: 'Azul Apple', hex: '#0071e3', desc: 'Assinatura clássica iOS / macOS' },
  { id: 'graphite', label: 'Grafite Espacial', hex: '#18181b', desc: 'Elegância minimalista monocromática' },
  { id: 'emerald', label: 'Verde Alpino', hex: '#059669', desc: 'Orgânico, vitalidade e crescimento' },
  { id: 'indigo', label: 'Índigo Profundo', hex: '#4f46e5', desc: 'Sofisticação e inteligência' },
  { id: 'amber', label: 'Âmbar Solar', hex: '#d97706', desc: 'Calor, energia e motivação' },
];

export const BrandCustomizerModal: React.FC<BrandCustomizerModalProps> = ({
  isOpen,
  onClose,
  brand,
  onSaveBrand,
  currentUser,
}) => {
  const [formData, setFormData] = useState<BrandConfig>(brand);
  const [activeLogoTab, setActiveLogoTab] = useState<'preset' | 'custom_image'>(brand.logoType);
  const [urlInput, setUrlInput] = useState(brand.customLogoUrl || '');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Access guard: only Super Admin can alter brand & logo
  if (currentUser && currentUser.role !== 'super_admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-black/[0.06] p-7 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1.5">Acesso Restrito ao Super Usuário</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Apenas o Super Administrador da plataforma tem permissão para personalizar o logótipo, nome e identidade visual do sistema.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Compreendido, fechar
          </button>
        </div>
      </div>
    );
  }

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um ficheiro de imagem válido (PNG, JPG, SVG ou WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFormData(prev => ({
        ...prev,
        logoType: 'custom_image',
        customLogoUrl: dataUrl,
      }));
      setActiveLogoTab('custom_image');
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar as definições originais de logotipo e marca?')) {
      setFormData(DEFAULT_BRAND_CONFIG);
      setActiveLogoTab(DEFAULT_BRAND_CONFIG.logoType);
      setUrlInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser && currentUser.role !== 'super_admin') {
      alert('Apenas o Super Administrador tem permissão para salvar alterações na marca.');
      return;
    }
    onSaveBrand(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-black/[0.06] overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 border border-slate-200/60 shadow-2xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Personalização da Marca & Logótipo
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  <ShieldCheck className="w-3 h-3 text-amber-600" /> Exclusivo Super Usuário
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Design orgânico com estética refinada inspirada na Apple
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Live Preview Panel (Apple Style Clean Stage) */}
          <div className="p-5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Pré-visualização em Tempo Real (Cabeçalho & Login)
            </span>
            <div className="inline-flex items-center justify-center p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-black/[0.06] shadow-sm">
              <BrandLogo brand={formData} size="lg" showText={true} />
            </div>
          </div>

          {/* Section 1: Logo Style Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              1. Escolha o Formato do Logótipo
            </label>
            
            {/* Segmented Control */}
            <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/60 mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveLogoTab('preset');
                  setFormData(prev => ({ ...prev, logoType: 'preset' }));
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeLogoTab === 'preset'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Símbolos Orgânicos (Presets Apple)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLogoTab('custom_image');
                  setFormData(prev => ({ ...prev, logoType: 'custom_image' }));
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeLogoTab === 'custom_image'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Carregar Imagem / Logo Própria
              </button>
            </div>

            {/* Sub-tab A: Presets */}
            {activeLogoTab === 'preset' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRESET_OPTIONS.map(preset => {
                  const isSelected = formData.logoPreset === preset.id && formData.logoType === 'preset';
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          logoType: 'preset',
                          logoPreset: preset.id,
                        }));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/60 border-[#0071e3] ring-2 ring-[#0071e3]/20 shadow-2xs'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#0071e3] text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-900">{preset.label}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{preset.desc}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0071e3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Sub-tab B: Custom Image Upload */
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-[#0071e3] bg-blue-50/50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600 mb-2">
                    <Upload className="w-5 h-5 text-[#0071e3]" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Clique para selecionar ou arraste o ficheiro do seu logótipo
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ficheiros PNG transparentes ou SVG recomendados para máxima nitidez
                  </p>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ou introduza o URL direto da imagem:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0071e3]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (urlInput.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            logoType: 'custom_image',
                            customLogoUrl: urlInput.trim(),
                          }));
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                    >
                      Aplicar URL
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Platform Names & Typography */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Nome da Plataforma
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: SalesFlow ou Porto de Mós"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-[#0071e3] focus:ring-2 focus:ring-blue-100 focus:outline-none transition bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Palavra em Destaque (Cores Accent)
              </label>
              <input
                type="text"
                value={formData.highlightWord || ''}
                onChange={e => setFormData({ ...formData, highlightWord: e.target.value })}
                placeholder="ex: Flow (palavra que recebe a cor de destaque)"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-[#0071e3] focus:ring-2 focus:ring-blue-100 focus:outline-none transition bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Subtítulo / Slogan Institucional
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="ex: Gestão de Metas & Desempenho Comercial"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 focus:border-[#0071e3] focus:ring-2 focus:ring-blue-100 focus:outline-none transition bg-white"
              />
            </div>
          </div>

          {/* Section 3: Organic Apple Accent Palette */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              3. Tom de Destaque Orgânico (Apple Palette)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ACCENT_OPTIONS.map(acc => {
                const isSelected = formData.accent === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, accent: acc.id })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 shadow-2xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-xs"
                      style={{ backgroundColor: acc.hex }}
                    />
                    <span className="text-[11px] font-bold text-slate-800">{acc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm active:scale-95 transition cursor-pointer"
            >
              Guardar Logótipo & Marca
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

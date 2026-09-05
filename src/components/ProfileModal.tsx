import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import {
  X,
  Camera,
  Upload,
  User as UserIcon,
  Mail,
  Lock,
  Store,
  Shield,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PRESET_AVATARS } from './UserManager';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const initialPassword =
    currentUser.password || (currentUser.role === 'super_admin' ? 'portodemos2026' : '123');
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(
    currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : currentUser.name.toLowerCase().replace(/\s+/g, '.'))
  );
  const [email, setEmail] = useState(currentUser.email || '');
  const [password, setPassword] = useState(initialPassword);
  const [storeName, setStoreName] = useState(currentUser.storeName || 'Loja Centro - 01');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [showPassword, setShowPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(currentUser.name);
    setUsername(
      currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : currentUser.name.toLowerCase().replace(/\s+/g, '.'))
    );
    setEmail(currentUser.email || '');
    setPassword(
      currentUser.password || (currentUser.role === 'super_admin' ? 'portodemos2026' : '123')
    );
    setStoreName(currentUser.storeName || 'Loja Centro - 01');
    setAvatar(currentUser.avatar);
    setSuccessMsg(false);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um ficheiro de imagem válido.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem é demasiado grande (máx 10MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(compressed);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor introduza o seu nome.');
      return;
    }

    const fallbackUsername = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
    const cleanUsername = username.trim().toLowerCase() || currentUser.username || fallbackUsername;

    const updatedUser: User = {
      ...currentUser,
      name: name.trim(),
      username: cleanUsername,
      email: email.trim() || undefined,
      password: password.trim() || '123',
      storeName: storeName.trim(),
      avatar: avatar,
      updatedAt: new Date().toISOString(),
    };

    onUpdateUser(updatedUser);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 900);
  };

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'seller':
        return 'Vendedora / Vendedor';
      case 'manager':
        return 'Gerente de Loja';
      case 'admin':
        return 'Administrador de Sistema';
      case 'super_admin':
        return 'Super Administrador';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Editar o Meu Perfil</h3>
              <p className="text-xs text-slate-500">
                Cada utilizador apenas consegue editar as suas próprias informações.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            O seu perfil foi atualizado com sucesso!
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Avatar Area */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
              Fotografia de Perfil
            </label>
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processImageFile(file);
              }}
              className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={avatar}
                    alt="Perfil"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    Alterar
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    Carregar Nova Imagem
                  </button>
                  <p className="text-[11px] text-slate-500">
                    Selecione uma fotografia sua do computador ou dispositivo.
                  </p>
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="mt-3">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Ou escolha uma foto de catálogo:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(url)}
                    className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      avatar === url
                        ? 'border-blue-600 scale-105 shadow-xs'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center justify-between">
                <span>Nome de Utilizador *</span>
                <span className="text-[10px] text-blue-600 font-semibold">Login</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Password & Optional Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center justify-between">
                <span>Palavra-passe</span>
                <span className="text-[10px] text-slate-400 font-normal">Para início de sessão</span>
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center justify-between">
                <span>Endereço de E-mail</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="contacto@empresa.com (opcional)"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Role (Read Only) & Store */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Cargo / Função
              </label>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{getRoleLabel()}</span>
                <span className="text-[10px] font-normal text-slate-500 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-400" />
                  Definido pelo Super Admin
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Loja / Unidade
              </label>
              <div className="relative">
                <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm cursor-pointer"
            >
              Guardar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

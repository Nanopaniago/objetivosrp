import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  Briefcase,
  Store,
  Mail,
  UserCheck,
  Search,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface UserManagerProps {
  users: User[];
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onCreateUser: (newUser: User) => void;
  onDeleteUser: (userId: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
];

export const UserManager: React.FC<UserManagerProps> = ({
  users,
  currentUser,
  onUpdateUser,
  onCreateUser,
  onDeleteUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [quickUploadUserId, setQuickUploadUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    storeName: string;
    avatar: string;
    active: boolean;
  }>({
    name: '',
    email: '',
    role: 'seller',
    storeName: 'Loja Centro - 01',
    avatar: PRESET_AVATARS[0],
    active: true,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  /**
   * Resize and optimize image file to Data URL
   */
  const processImageFile = (file: File, onDone: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um ficheiro de imagem válido (PNG, JPG, WebP).');
      return;
    }

    // Check size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem é demasiado pesada. Por favor escolha uma imagem até 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Optimize to max 300x300 for crisp profile pictures & efficient storage
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
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          onDone(compressed);
        } else {
          onDone(result);
        }
      };
      img.onerror = () => {
        onDone(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Handle file select in modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setFormData(prev => ({ ...prev, avatar: dataUrl }));
        showToast('Fotografia carregada com sucesso!');
      });
    }
  };

  // Handle drag & drop in modal
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setFormData(prev => ({ ...prev, avatar: dataUrl }));
        showToast('Fotografia carregada com sucesso!');
      });
    }
  };

  // Handle quick direct upload from card
  const handleCardQuickUpload = (userId: string) => {
    setQuickUploadUserId(userId);
    cardFileInputRef.current?.click();
  };

  const handleCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && quickUploadUserId) {
      const targetUser = users.find(u => u.id === quickUploadUserId);
      if (targetUser) {
        processImageFile(file, (dataUrl) => {
          const updatedUser: User = {
            ...targetUser,
            avatar: dataUrl,
            updatedAt: new Date().toISOString(),
          };
          onUpdateUser(updatedUser);
          showToast(`Fotografia de "${targetUser.name}" atualizada!`);
        });
      }
    }
    setQuickUploadUserId(null);
    if (e.target) e.target.value = '';
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setIsCreating(false);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      storeName: user.storeName || 'Loja Centro - 01',
      avatar: user.avatar,
      active: user.active !== false,
    });
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'seller',
      storeName: 'Loja Centro - 01',
      avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
      active: true,
    });
  };

  const handleCancelModal = () => {
    setEditingUser(null);
    setIsCreating(false);
    setIsDragging(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Por favor, indique o nome completo do utilizador.');
      return;
    }

    if (isCreating) {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: formData.name.trim(),
        email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@salesflow.pt`,
        role: formData.role,
        storeName: formData.storeName.trim() || 'Loja Centro - 01',
        avatar: formData.avatar,
        active: formData.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onCreateUser(newUser);
      showToast(`Utilizador "${newUser.name}" registado com sucesso!`);
    } else if (editingUser) {
      const updated: User = {
        ...editingUser,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        storeName: formData.storeName.trim(),
        avatar: formData.avatar,
        active: formData.active,
        updatedAt: new Date().toISOString(),
      };
      onUpdateUser(updated);
      showToast(`Dados de "${updated.name}" guardados com sucesso!`);
    }

    handleCancelModal();
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Não é possível remover o utilizador com sessão atualmente ativa.');
      return;
    }
    onDeleteUser(user.id);
    setDeleteConfirmId(null);
    showToast(`Utilizador "${user.name}" removido.`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.storeName && user.storeName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'seller':
        return { label: 'Vendedor', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'manager':
        return { label: 'Gerente / Gestor', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'admin':
        return { label: 'Administrador', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'super_admin':
        return { label: 'Super Admin', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden Card File Input for quick upload */}
      <input
        type="file"
        ref={cardFileInputRef}
        onChange={handleCardFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Gestão de Utilizadores e Equipa</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Adicione novos colaboradores, carregue fotografias de perfil, edite funções e faça a gestão da equipa comercial.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Utilizador
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por nome, e-mail ou loja..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              roleFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('seller')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              roleFilter === 'seller'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Vendedores ({users.filter(u => u.role === 'seller').length})
          </button>
          <button
            onClick={() => setRoleFilter('manager')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              roleFilter === 'manager'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Gestores ({users.filter(u => u.role === 'manager').length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              roleFilter === 'admin'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Administradores ({users.filter(u => u.role === 'admin' || u.role === 'super_admin').length})
          </button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.map(user => {
          const badge = getRoleBadge(user.role);
          const isCurrentUser = user.id === currentUser.id;

          return (
            <div
              key={user.id}
              className={`rounded-2xl border bg-white p-5 shadow-2xs transition hover:shadow-md flex flex-col justify-between ${
                user.active === false ? 'opacity-60 border-slate-200 bg-slate-50/50' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-2xs"
                      />
                      {user.active !== false && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Utilizador Ativo" />
                      )}
                      {/* Quick upload photo button on hover */}
                      <button
                        type="button"
                        onClick={() => handleCardQuickUpload(user.id)}
                        className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        title="Carregar nova fotografia para este utilizador"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{user.name}</h3>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            A sua conta
                          </span>
                        )}
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user.storeName || 'Loja Centro - 01'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">
                  {user.active === false ? 'Inativo' : 'Ativo'}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartEdit(user)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-xs font-bold transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>

                  {!isCurrentUser && (
                    deleteConfirmId === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(user)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(user.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remover utilizador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create User Modal */}
      {(editingUser || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isCreating ? 'Adicionar Novo Utilizador' : `Editar: ${editingUser?.name}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os dados e carregue a fotografia de perfil do membro da equipa.
                </p>
              </div>
              <button
                onClick={handleCancelModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Upload Area */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2 flex items-center justify-between">
                  <span>Fotografia de Perfil</span>
                  <span className="text-[10px] font-normal text-slate-400">Upload de ficheiro ou galeria</span>
                </label>

                {/* Upload Drop Zone / Preview Box */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Current Photo Preview */}
                    <div className="relative group shrink-0">
                      <img
                        src={formData.avatar}
                        alt="Pré-visualização"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity"
                      >
                        <Camera className="w-4 h-4 mb-0.5" />
                        Alterar
                      </button>
                    </div>

                    {/* Actions and Drop instructions */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 text-xs font-bold shadow-2xs transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          Carregar Fotografia do Dispositivo
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Arraste e largue uma imagem aqui (PNG, JPG, WebP) ou selecione um ficheiro.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    Ou escolha uma fotografia predefinida:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: url })}
                        className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                          formData.avatar === url
                            ? 'border-blue-600 scale-105 shadow-xs'
                            : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={`Escolher Avatar ${idx + 1}`}
                      >
                        <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Pereira"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Endereço de E-mail
                </label>
                <input
                  type="email"
                  placeholder="Ex: joao.pereira@salesflow.pt"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Role & Store Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Cargo / Função *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="seller">Vendedor</option>
                    <option value="manager">Gerente / Gestor</option>
                    <option value="admin">Administrador</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Loja / Estabelecimento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Loja Centro - 01"
                    value={formData.storeName}
                    onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800">Estado do Utilizador</span>
                  <p className="text-[11px] text-slate-500">
                    Os utilizadores ativos aparecem nas escalas e visões da equipa.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
                >
                  {isCreating ? 'Registar Utilizador' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

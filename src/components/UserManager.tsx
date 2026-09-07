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
  User as UserIcon,
  Search,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Lock,
  Palette,
} from 'lucide-react';

interface UserManagerProps {
  users: User[];
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onCreateUser: (newUser: User) => void;
  onDeleteUser: (userId: string) => void;
  onOpenBrandCustomizer?: () => void;
}

export const PRESET_AVATARS = [
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
  onOpenBrandCustomizer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [quickUploadUserId, setQuickUploadUserId] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'super_admin';

  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    email: string;
    password?: string;
    role: UserRole;
    storeName: string;
    avatar: string;
    active: boolean;
  }>({
    name: '',
    username: '',
    email: '',
    password: '',
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

  // Handle quick direct upload from card (for Super Admin on any user, or for current user)
  const handleCardQuickUpload = (userId: string) => {
    if (!isSuperAdmin && userId !== currentUser.id) {
      alert('Apenas pode alterar a sua própria fotografia de perfil.');
      return;
    }
    setQuickUploadUserId(userId);
    cardFileInputRef.current?.click();
  };

  const handleCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && quickUploadUserId) {
      const targetUser = users.find(u => u.id === quickUploadUserId);
      if (targetUser && (isSuperAdmin || targetUser.id === currentUser.id)) {
        processImageFile(file, (dataUrl) => {
          const updatedUser: User = {
            ...targetUser,
            avatar: dataUrl,
            updatedAt: new Date().toISOString(),
          };
          onUpdateUser(updatedUser);
          showToast(`Fotografia de perfil de "${targetUser.name}" atualizada com sucesso!`);
        });
      }
    }
    setQuickUploadUserId(null);
    if (e.target) e.target.value = '';
  };

  const handleStartEdit = (user: User) => {
    if (!isSuperAdmin && user.id !== currentUser.id) {
      alert('Apenas o Super Administrador ou o próprio utilizador pode editar estas informações.');
      return;
    }
    setEditingUser(user);
    setIsCreating(false);
    setFormData({
      name: user.name,
      username: user.username || (user.email ? user.email.split('@')[0] : user.name.toLowerCase().replace(/\s+/g, '.')),
      email: user.email || '',
      password: user.password || '',
      role: user.role,
      storeName: user.storeName || 'Loja Centro - 01',
      avatar: user.avatar,
      active: user.active !== false,
    });
  };

  const handleStartCreate = () => {
    if (!isSuperAdmin) {
      alert('Apenas o Super Administrador tem permissão para criar novos utilizadores.');
      return;
    }
    setIsCreating(true);
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
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

    const fallbackUsername = formData.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
    const cleanUsername = formData.username.trim().toLowerCase() || fallbackUsername;

    if (isCreating) {
      if (!isSuperAdmin) {
        alert('Apenas o Super Administrador tem permissão para registar novos utilizadores.');
        return;
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        name: formData.name.trim(),
        username: cleanUsername,
        email: formData.email.trim() || undefined,
        password: formData.password?.trim() || undefined,
        role: formData.role,
        storeName: formData.storeName.trim() || 'Loja Centro - 01',
        avatar: formData.avatar,
        active: formData.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onCreateUser(newUser);
      showToast(`Utilizador "${newUser.name}" (@${cleanUsername}) criado com sucesso!`);
    } else if (editingUser) {
      if (!isSuperAdmin && editingUser.id !== currentUser.id) {
        alert('Apenas o Super Administrador ou o próprio utilizador pode editar estas informações.');
        return;
      }

      const updated: User = {
        ...editingUser,
        name: formData.name.trim(),
        username: cleanUsername,
        email: formData.email.trim() || undefined,
        password: formData.password?.trim() || editingUser.password || undefined,
        role: isSuperAdmin ? formData.role : editingUser.role,
        storeName: formData.storeName.trim(),
        avatar: formData.avatar,
        active: isSuperAdmin ? formData.active : editingUser.active,
        updatedAt: new Date().toISOString(),
      };
      onUpdateUser(updated);
      showToast(
        editingUser.id === currentUser.id
          ? 'As suas informações foram guardadas com sucesso!'
          : `Informações de "${updated.name}" atualizadas com sucesso!`
      );
    }

    handleCancelModal();
  };

  const handleDelete = (user: User) => {
    if (!isSuperAdmin) {
      alert('Apenas o Super Administrador tem permissão para remover utilizadores.');
      return;
    }
    if (user.id === currentUser.id) {
      alert('Não é possível remover o utilizador com sessão atualmente ativa.');
      return;
    }
    onDeleteUser(user.id);
    setDeleteConfirmId(null);
    showToast(`Utilizador "${user.name}" removido.`);
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(term) ||
      (user.username && user.username.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.storeName && user.storeName.toLowerCase().includes(term));
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

        {isSuperAdmin ? (
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onOpenBrandCustomizer && (
              <button
                type="button"
                onClick={onOpenBrandCustomizer}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition cursor-pointer"
                title="Personalizar logótipo, nome da plataforma e identidade visual (Exclusivo Super Usuário)"
              >
                <Palette className="w-4 h-4 text-purple-600" />
                <span>Identidade Visual & Logótipo</span>
              </button>
            )}
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Utilizador
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Apenas o Super Admin cria utilizadores</span>
          </div>
        )}
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
                      {/* Quick upload photo button on hover (for Super Admin on any user, or for current user) */}
                      {(isSuperAdmin || isCurrentUser) && (
                        <button
                          type="button"
                          onClick={() => handleCardQuickUpload(user.id)}
                          className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          title={isCurrentUser ? 'Alterar a minha fotografia de perfil' : `Alterar fotografia de ${user.name}`}
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
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
                    <UserIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      @{user.username || (user.email ? user.email.split('@')[0] : user.name.toLowerCase().replace(/\s+/g, '.'))}
                    </span>
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{user.email}</span>
                    </div>
                  )}
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
                  {isCurrentUser ? (
                    <button
                      onClick={() => handleStartEdit(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar o Meu Perfil
                    </button>
                  ) : isSuperAdmin ? (
                    <button
                      onClick={() => handleStartEdit(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                      title={`Editar dados de ${user.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar Utilizador
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium px-2 py-1 rounded bg-slate-50 border border-slate-100">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Apenas o próprio
                    </span>
                  )}

                  {isSuperAdmin && !isCurrentUser && (
                    deleteConfirmId === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(user)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(user.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remover utilizador (Super Admin)"
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
                  {isCreating
                    ? 'Adicionar Novo Utilizador'
                    : editingUser?.id === currentUser.id
                    ? 'Editar as Minhas Informações'
                    : `Editar Utilizador: ${editingUser?.name}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {isCreating
                    ? 'Registe um novo membro na equipa com cargo e dados de acesso.'
                    : editingUser?.id === currentUser.id
                    ? 'Pode atualizar o seu nome, palavra-passe, fotografia e loja.'
                    : 'Atualize os dados cadastrais, cargo, palavra-passe ou fotografia deste membro da equipa.'}
                </p>
              </div>
              <button
                onClick={handleCancelModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
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
                        className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
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
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer"
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
                        className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
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

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Pereira"
                    value={formData.name}
                    onChange={e => {
                      const newName = e.target.value;
                      // When creating, if username is empty or matches previous auto-slug, auto-fill it
                      const oldSlug = formData.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
                      if (isCreating && (!formData.username || formData.username === oldSlug)) {
                        const newSlug = newName.toLowerCase().trim().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
                        setFormData({ ...formData, name: newName, username: newSlug });
                      } else {
                        setFormData({ ...formData, name: newName });
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center justify-between">
                    <span>Nome de Utilizador *</span>
                    <span className="text-[10px] text-blue-600 font-semibold">Para Login</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                    <input
                      type="text"
                      required
                      placeholder="joao.pereira"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full rounded-xl border border-slate-300 pl-7 pr-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Optional Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center justify-between">
                    <span>Palavra-passe</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Introduza a senha..."
                      value={formData.password || ''}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
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
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Store Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Cargo / Função
                  </label>
                  {isSuperAdmin ? (
                    <select
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="seller">Vendedor</option>
                      <option value="manager">Gerente / Gestor</option>
                      <option value="admin">Administrador</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{getRoleBadge(formData.role).label}</span>
                      <span className="text-[10px] font-normal text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Definido pelo Super Admin
                      </span>
                    </div>
                  )}
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
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Active Status Toggle (Only Super Admin can change active state) */}
              {isSuperAdmin && (
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
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm cursor-pointer"
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

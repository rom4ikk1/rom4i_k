import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  ChevronRight, 
  Plus, 
  ArrowLeft, 
  Bell, 
  LogOut, 
  CheckCircle2, 
  Hammer, 
  Camera, 
  Send,
  User as UserIcon,
  Home,
  MessageCircle,
  Clock,
  Video,
  Image as ImageIcon,
  Paperclip,
  Search,
  Users,
  UserPlus,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { User, Project, Stage, Media, Role } from './types';

type Screen = 'auth' | 'list' | 'detail' | 'upload' | 'notifications';

const formatCountdown = (deadline?: string) => {
  if (!deadline) return null;
  const target = new Date(deadline).getTime();
  const now = new Date().getTime();
  const diff = target - now;
  
  if (diff <= 0) return 'Срок истек';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `Осталось: ${days}д ${hours}ч`;
  return `Осталось: ${hours}ч`;
};

const normalizePhone = (phone: string) => {
  // If it's a phone number (contains digits), normalize it
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    // Standardize to 11 digits if it starts with 8 or 7
    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
      return '7' + digits.substring(1);
    }
    return digits;
  }
  return phone;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'reg'>('login');
  const [selectedRole, setSelectedRole] = useState<Role>('client');
  const [loginInput, setLoginInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    client: '', 
    installer: '', 
    designer: '', 
    deadline: '',
    stage1_date: '',
    stage2_date: ''
  });
  const [uploadComment, setUploadComment] = useState('');
  const [uploadStage, setUploadStage] = useState('Монтаж');
  const [uploadPreview, setUploadPreview] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState(false);
  const [newClientInput, setNewClientInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorModal, setErrorModal] = useState<{show: boolean, title: string, message: string}>({show: false, title: '', message: ''});
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    if (user) {
      fetchProjects();
      // Polling for updates every 5 seconds
      const interval = setInterval(() => {
        fetchProjects();
        if (activeProject) {
          fetchProjectDetail(activeProject.id, false); // Add a flag to not switch screen
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, activeProject?.id]);

  const fetchProjects = async () => {
    if (!user) return;
    const res = await fetch(`/api/projects?login=${user.login}&role=${user.role}`);
    const data = await res.json();
    setProjects(data);
  };

  const fetchProjectDetail = async (id: number, switchScreen = true) => {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    setActiveProject(data);
    if (switchScreen) setScreen('detail');
  };

  const handleAuth = async () => {
    const normalizedLogin = normalizePhone(loginInput);
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    const body = authMode === 'login' 
      ? { login: normalizedLogin, password: passInput }
      : { login: normalizedLogin, password: passInput, role: selectedRole };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.success) {
      if (authMode === 'login') {
        setUser(data.user);
        setScreen('list');
      } else {
        setErrorModal({
          show: true,
          title: 'Успешно!',
          message: 'Аккаунт создан. Теперь вы можете войти.'
        });
        setAuthMode('login');
      }
    } else {
      setErrorModal({
        show: true,
        title: 'Ошибка входа',
        message: data.message === 'Invalid credentials' 
          ? 'Неверный логин или пароль. Пожалуйста, проверьте данные и попробуйте снова.' 
          : (data.message || 'Произошла ошибка при авторизации')
      });
    }
  };

  const logout = () => {
    setUser(null);
    setScreen('auth');
    setLoginInput('');
    setPassInput('');
  };

  const createProject = async () => {
    if (!newProject.name) {
      alert('Введите адрес объекта');
      return;
    }
    
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProject.name,
          client_login: normalizePhone(newProject.client),
          installer_login: normalizePhone(newProject.installer),
          designer_login: normalizePhone(newProject.designer),
          deadline: newProject.deadline,
          stage1_date: newProject.stage1_date,
          stage2_date: newProject.stage2_date
        })
      });
      
      if (res.ok) {
        setShowNewModal(false);
        fetchProjects();
        setNewProject({ 
          name: '', 
          client: '', 
          installer: '', 
          designer: '', 
          deadline: '',
          stage1_date: '',
          stage2_date: ''
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Ошибка при создании объекта');
      }
    } catch (e) {
      console.error(e);
      alert('Сетевая ошибка');
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUploadPreview(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const saveReport = async () => {
    if (!activeProject || !user) return;
    if (uploadPreview.length === 0 && !uploadComment.trim()) return;

    setIsUploading(true);
    try {
      // Save media
      for (const url of uploadPreview) {
        await fetch(`/api/projects/${activeProject.id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
      }

      // Save comment as message if exists
      if (uploadComment.trim()) {
        await fetch(`/api/projects/${activeProject.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_login: user.login,
            text: `[${uploadStage}] ${uploadComment}`
          })
        });
      }

      setUploadPreview([]);
      setUploadComment('');
      await fetchProjectDetail(activeProject.id);
      setScreen('detail');
      
      setErrorModal({
        show: true,
        title: 'Успешно!',
        message: 'Отчет опубликован в чате проекта.'
      });
    } catch (e) {
      console.error(e);
      setErrorModal({
        show: true,
        title: 'Ошибка',
        message: 'Не удалось опубликовать отчет. Попробуйте уменьшить размер видео.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!activeProject || !user || !messageInput.trim()) return;
    
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_login: user.login,
          text: messageInput
        })
      });
      
      if (res.ok) {
        setMessageInput('');
        fetchProjectDetail(activeProject.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateProjectClient = async () => {
    if (!activeProject || !newClientInput) return;
    
    try {
      const res = await fetch(`/api/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_login: newClientInput })
      });
      
      if (res.ok) {
        setEditingClient(false);
        setNewClientInput('');
        fetchProjectDetail(activeProject.id);
      } else {
        const err = await res.json();
        alert(err.message || 'Ошибка при обновлении клиента');
      }
    } catch (e) {
      console.error(e);
      alert('Сетевая ошибка');
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery)
  );

  const pickContactForExisting = async () => {
    try {
      // @ts-ignore
      const contacts = await window.navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (contacts.length > 0) {
        const contact = contacts[0];
        const phone = contact.tel?.[0] || '';
        setNewClientInput(phone);
      }
    } catch (err) {
      console.error('Error picking contact:', err);
    }
  };

  const pickContact = async () => {
    try {
      // @ts-ignore - Contacts API might not be in types yet
      const contacts = await window.navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (contacts.length > 0) {
        const contact = contacts[0];
        const phone = contact.tel?.[0] || '';
        const name = contact.name?.[0] || '';
        setNewProject(prev => ({ ...prev, client: phone }));
        alert(`Выбран контакт: ${name} (${phone})`);
      }
    } catch (err) {
      console.error('Error picking contact:', err);
      alert('Не удалось открыть контакты. Убедитесь, что у приложения есть разрешение.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center font-sans">
      <div className="w-full max-w-[480px] bg-white min-h-screen relative flex flex-col shadow-2xl overflow-hidden">
        
        <AnimatePresence mode="wait">
          {screen === 'auth' && (
            <motion.section 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative p-8 pt-16 flex-1 flex flex-col justify-center overflow-hidden bg-blue-50"
            >
              {/* Subtle Light Blue Gradient Background */}
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50 via-white to-blue-50/50"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <MapPin className="text-white" size={24} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Газификация</h1>
                </div>

                <div className="bg-slate-100/80 backdrop-blur-sm p-1 rounded-2xl flex mb-8">
                  <button 
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                  >
                    Вход
                  </button>
                  <button 
                    onClick={() => setAuthMode('reg')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'reg' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                  >
                    Регистрация
                  </button>
                </div>

                <h2 className="text-[22px] font-bold mb-8 text-center">
                  {authMode === 'login' ? 'Добро пожаловать' : 'Регистрация'}
                </h2>

                {authMode === 'reg' && (
                  <div className="mb-6">
                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-3 tracking-widest">Выберите роль</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => setSelectedRole('client')}
                        className={`border rounded-2xl p-3 flex flex-col items-center gap-2 transition-all ${selectedRole === 'client' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white/50'}`}
                      >
                        <span className="text-xs font-bold">Клиент</span>
                      </button>
                      <button 
                        onClick={() => setSelectedRole('installer')}
                        className={`border rounded-2xl p-3 flex flex-col items-center gap-2 transition-all ${selectedRole === 'installer' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white/50'}`}
                      >
                        <span className="text-xs font-bold">Монтажник</span>
                      </button>
                      <button 
                        onClick={() => setSelectedRole('designer')}
                        className={`border rounded-2xl p-3 flex flex-col items-center gap-2 transition-all ${selectedRole === 'designer' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white/50'}`}
                      >
                        <span className="text-xs font-bold">Проектировщик</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-10">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Логин</label>
                    <input 
                      type="text" 
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder="example@mail.ru" 
                      className="w-full p-4 bg-white/80 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Пароль</label>
                    <input 
                      type="password" 
                      value={passInput}
                      onChange={(e) => setPassInput(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full p-4 bg-white/80 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all backdrop-blur-sm"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAuth}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform mb-6"
                >
                  Продолжить <ChevronRight size={20} strokeWidth={3} />
                </button>

                {authMode === 'login' && (
                  <button 
                    onClick={() => setShowForgotModal(true)}
                    className="w-full text-center text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    Забыли пароль?
                  </button>
                )}
              </div>
            </motion.section>
          )}

          {screen === 'list' && (
            <motion.section 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 pb-24 flex-1"
            >
              <header className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-2xl font-bold">Газификация</h1>
                  <p className="text-blue-600 text-sm font-medium">Ваши объекты</p>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 border-2 border-white shadow-sm">
                  {user?.login[0].toUpperCase()}
                </div>
              </header>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по адресу или номеру..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-100 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>

              {user?.role === 'admin' && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Всего</p>
                    <p className="text-3xl font-bold">{projects.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">В работе</p>
                    <p className="text-3xl font-bold text-blue-600">{projects.length}</p>
                  </div>
                </div>
              )}

              {user?.role !== 'client' && (
                <button 
                  onClick={() => setShowNewModal(true)}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold shadow-xl shadow-blue-100 mb-8 flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Новый объект
                </button>
              )}

              <div className="space-y-3">
                {filteredProjects.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => fetchProjectDetail(p.id)}
                    className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-all text-left relative overflow-hidden group"
                  >
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <UserIcon size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-800 text-base truncate pr-6">{p.name}</h3>
                        {p.message_count > 0 && (
                          <div className="flex items-center gap-1 bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                            <MessageCircle size={10} />
                            <span>{p.message_count}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mb-2">Нажмите, чтобы войти в проект</p>
                      <div className="flex items-center gap-2">
                        <Clock size={10} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                          {formatCountdown(p.deadline) || 'Срок не задан'}
                        </span>
                      </div>
                    </div>
                    {user?.role === 'client' && (
                      <div className="absolute top-4 right-4 text-blue-600">
                        <MessageCircle size={18} fill="currentColor" className="opacity-20 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          {screen === 'detail' && activeProject && (
            <motion.section 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full bg-slate-50"
            >
              {/* Chat Header */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-md z-40 p-4 flex items-center gap-3 border-b border-slate-100">
                <button onClick={() => setScreen('list')} className="p-2 text-blue-600 -ml-2">
                  <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{activeProject.name}</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">В работе • №{activeProject.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScreen('upload')}
                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    title="Добавить фото/видео"
                  >
                    <Camera size={20} />
                  </button>
                  {user?.role !== 'client' && (
                    <button 
                      onClick={() => {
                        setEditingClient(!editingClient);
                        setNewClientInput(activeProject.client_login || '');
                      }}
                      className={`p-2 rounded-xl transition-colors ${editingClient ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <UserPlus size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Client Overlay */}
              <AnimatePresence>
                {editingClient && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white p-4 border-b border-slate-100 shadow-sm z-30"
                  >
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Привязать клиента</p>
                    <div className="flex gap-2">
                      <div className="flex-1 flex gap-2 bg-slate-100 rounded-xl px-3 py-2 items-center">
                        <input 
                          type="text" 
                          value={newClientInput}
                          onChange={(e) => setNewClientInput(e.target.value)}
                          placeholder="Логин или номер..."
                          className="flex-1 bg-transparent border-none outline-none text-sm"
                        />
                        <button onClick={pickContactForExisting} className="text-slate-400 hover:text-blue-600">
                          <Users size={18} />
                        </button>
                      </div>
                      <button 
                        onClick={updateProjectClient}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all"
                      >
                        ОК
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Content */}
              <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-32">
                {/* Project Info Bubble */}
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 max-w-[85%]">
                    <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                      <img 
                        src="https://images.unsplash.com/photo-1600585154340-be6199f7d009?w=800" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed mb-2">
                      Добро пожаловать в чат проекта! Здесь вы можете отслеживать этапы газификации по адресу: <span className="font-bold">{activeProject.name}</span>.
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase">
                      <Clock size={12} />
                      {formatCountdown(activeProject.deadline) || 'Срок не задан'}
                    </div>
                  </div>
                </div>

                {/* Stages as Chat Messages */}
                {activeProject.stages?.map(s => (
                  <div key={s.id} className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 max-w-[85%]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 ${s.status === 'ok' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-600'} rounded-lg flex items-center justify-center`}>
                          {s.status === 'ok' ? <CheckCircle2 size={16} /> : <Hammer size={16} />}
                        </div>
                        <p className="font-bold text-sm text-slate-800">{s.name}</p>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">Статус: {s.status === 'ok' ? 'Завершено' : 'В процессе'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.date}</p>
                    </div>
                  </div>
                ))}

                {/* Text Messages */}
                {activeProject.messages?.map(m => (
                  <div key={m.id} className={`flex ${m.sender_login === user?.login ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm ${
                      m.sender_login === user?.login 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                    }`}>
                      {m.sender_login !== user?.login && (
                        <p className="text-[10px] font-bold uppercase mb-1 opacity-50">{m.sender_login}</p>
                      )}
                      <p className="text-sm leading-relaxed">{m.text}</p>
                      <p className={`text-[9px] mt-1 text-right ${m.sender_login === user?.login ? 'text-blue-100' : 'text-slate-400'}`}>
                        {new Date(m.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Media Gallery Bubble */}
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 max-w-[85%]">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Фото и видео отчеты</p>
                      <label 
                        className="text-blue-600 flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            handleFileSelect(e);
                            setScreen('upload');
                          }} 
                        />
                        <Plus size={14} /> Добавить
                      </label>
                    </div>
                      <div className="grid grid-cols-2 gap-2">
                        {activeProject.media?.map(m => (
                          <div 
                            key={m.id} 
                            className="relative group cursor-pointer active:scale-95 transition-transform"
                            onClick={() => setSelectedMedia(m.url)}
                          >
                            {m.url.startsWith('data:video') || m.url.includes('video') ? (
                              <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden relative">
                                <video src={m.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Video size={24} className="text-white" />
                                </div>
                              </div>
                            ) : (
                              <img 
                                src={m.url} 
                                className="aspect-square object-cover rounded-xl shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        ))}
                        {(!activeProject.media || activeProject.media.length < 10) && (
                          <label 
                            className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
                          >
                            <input 
                              type="file" 
                              accept="image/*,video/*" 
                              className="hidden" 
                              onChange={(e) => {
                                handleFileSelect(e);
                                setScreen('upload');
                              }} 
                            />
                            <Camera size={20} />
                            <span className="text-[8px] font-bold uppercase mt-1">Медиа</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input Area */}
              <div className="sticky bottom-0 w-full bg-white p-4 border-t border-slate-100 flex items-center gap-3 z-50">
                <label className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 active:scale-95 transition-all cursor-pointer">
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      handleFileSelect(e);
                      setScreen('upload');
                    }} 
                  />
                  <Paperclip size={24} />
                </label>
                <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <input 
                    type="text" 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Напишите сообщение..." 
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                  />
                  <div className="flex items-center gap-2 text-slate-400">
                    <label className="cursor-pointer hover:text-blue-600">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => {
                          handleFileSelect(e);
                          setScreen('upload');
                        }} 
                      />
                      <Camera size={20} />
                    </label>
                    {(user?.role === 'admin' || user?.role === 'installer') && (
                      <label className="cursor-pointer hover:text-blue-600">
                        <input 
                          type="file" 
                          accept="video/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={(e) => {
                            handleFileSelect(e);
                            setScreen('upload');
                          }} 
                        />
                        <Video size={20} />
                      </label>
                    )}
                  </div>
                </div>
                <button 
                  onClick={sendMessage}
                  className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  <Send size={24} />
                </button>
              </div>
            </motion.section>
          )}

          {screen === 'upload' && (
            <motion.section 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 pb-24 flex-1 bg-white"
            >
              <header className="flex items-center mb-10">
                <button onClick={() => setScreen('detail')} className="p-2 -ml-2 text-slate-400">
                  <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
                <h1 className="text-xl font-bold ml-2">Загрузка фотоотчета</h1>
              </header>

              <div className="space-y-8">
                <div>
                  <label className="block font-bold mb-3 text-slate-700">Этап строительства</label>
                  <select 
                    value={uploadStage}
                    onChange={(e) => setUploadStage(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-slate-600"
                  >
                    <option>Монтаж</option>
                    <option>Документация</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-3 text-slate-700">Комментарий</label>
                  <textarea 
                    value={uploadComment}
                    onChange={(e) => setUploadComment(e.target.value)}
                    placeholder="Опишите выполненные работы..." 
                    className="w-full h-40 p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none resize-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="font-bold text-slate-700">Медиафайлы</label>
                    <span className="text-slate-400 text-sm">{uploadPreview.length} / 10</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {uploadPreview.map((src, i) => (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 relative">
                        {src.startsWith('data:video') ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <video src={src} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Video size={20} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <img src={src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    ))}
                    <label className="aspect-square bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform">
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white mb-1 shadow-md shadow-blue-100">
                        <Plus size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Фото</span>
                    </label>
                    {(user?.role === 'admin' || user?.role === 'installer') && (
                      <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform">
                        <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                        <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white mb-1 shadow-md shadow-slate-200">
                          <Video size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 uppercase">Видео</span>
                      </label>
                    )}
                  </div>
                </div>
                <button 
                  onClick={saveReport}
                  disabled={isUploading}
                  className={`w-full bg-blue-600 text-white py-5 rounded-[22px] font-bold shadow-xl shadow-blue-100 flex items-center justify-center gap-3 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Send size={20} />
                  )}
                  {isUploading ? 'Загрузка...' : 'Опубликовать отчет'}
                </button>
              </div>
            </motion.section>
          )}

          {screen === 'notifications' && (
            <motion.section 
              key="notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 pb-24 flex-1"
            >
              <h1 className="text-2xl font-bold mb-8">Уведомления</h1>
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-50 relative">
                  <div className="w-2 h-2 bg-blue-600 rounded-full absolute top-6 right-6"></div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Проектирование завершено</h4>
                      <p className="text-[11px] text-slate-400 mb-2">Сегодня, 10:30 • Договор №245</p>
                      <p className="text-sm text-slate-500 leading-relaxed">Документация утверждена. Вы можете ознакомиться с планом разводки в деталях проекта.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        {screen !== 'auth' && (
          <nav className="fixed bottom-0 w-full max-w-[480px] bg-white/90 backdrop-blur-md border-t border-slate-100 z-50">
            <div className="flex justify-around items-center py-3">
              <button 
                onClick={() => setScreen('list')}
                className={`flex flex-col items-center gap-1 ${screen === 'list' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <Home size={24} />
                <span className="text-[10px] font-bold uppercase">Главная</span>
              </button>
              <button 
                onClick={() => setScreen('notifications')}
                className={`flex flex-col items-center gap-1 ${screen === 'notifications' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <Bell size={24} />
                <span className="text-[10px] font-bold uppercase">Инфо</span>
              </button>
              <button 
                onClick={logout}
                className="flex flex-col items-center gap-1 text-slate-400"
              >
                <LogOut size={24} />
                <span className="text-[10px] font-bold uppercase">Выход</span>
              </button>
            </div>
          </nav>
        )}

        {/* New Project Modal */}
        <AnimatePresence>
          {showNewModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="bg-white w-full max-w-[440px] rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">Новый объект</h2>
                  <button onClick={() => setShowNewModal(false)} className="text-slate-300 text-3xl">&times;</button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-slate-500 mb-2 block">Адрес объекта</label>
                    <input 
                      type="text" 
                      value={newProject.name}
                      onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                      placeholder="Введите адрес..." 
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 mb-2 block">Логин клиента</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newProject.client}
                        onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                        placeholder="Логин или номер телефона..." 
                        className="flex-1 p-5 bg-slate-50 rounded-2xl border-none outline-none"
                      />
                      <button 
                        onClick={pickContact}
                        className="w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Выбрать из контактов"
                      >
                        <Users size={24} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 mb-2 block">Логин монтажника</label>
                    <input 
                      type="text" 
                      value={newProject.installer}
                      onChange={(e) => setNewProject({...newProject, installer: e.target.value})}
                      placeholder="Логин исполнителя..." 
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 mb-2 block">Логин проектировщика</label>
                    <input 
                      type="text" 
                      value={newProject.designer}
                      onChange={(e) => setNewProject({...newProject, designer: e.target.value})}
                      placeholder="Логин проектировщика..." 
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-500 mb-2 block">1 этап: Монтаж</label>
                      <input 
                        type="date" 
                        value={newProject.stage1_date}
                        onChange={(e) => setNewProject({...newProject, stage1_date: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-500 mb-2 block">2 этап: Документы</label>
                      <input 
                        type="date" 
                        value={newProject.stage2_date}
                        onChange={(e) => setNewProject({...newProject, stage2_date: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 mb-2 block">Общий дедлайн</label>
                    <input 
                      type="date" 
                      value={newProject.deadline}
                      onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none"
                    />
                  </div>
                  <button 
                    onClick={createProject}
                    className="w-full bg-blue-600 text-white py-5 rounded-[22px] font-bold shadow-xl shadow-blue-100"
                  >
                    Создать объект
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error/Alert Modal */}
        <AnimatePresence>
          {errorModal.show && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
              onClick={() => setErrorModal({...errorModal, show: false})}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center"
                onClick={e => e.stopPropagation()}
              >
                <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${errorModal.title === 'Успешно!' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {errorModal.title === 'Успешно!' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                </div>
                <h3 className="text-xl font-bold mb-3">{errorModal.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">{errorModal.message}</p>
                <button 
                  onClick={() => setErrorModal({...errorModal, show: false})}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  Понятно
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forgot Password Modal */}
        <AnimatePresence>
          {showForgotModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
              onClick={() => setShowForgotModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 mx-auto mb-6 rounded-2xl flex items-center justify-center">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">Восстановление доступа</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  Для восстановления пароля, пожалуйста, свяжитесь с вашим менеджером или администратором системы по телефону: <br/>
                  <span className="font-bold text-slate-900 mt-2 block">+7 (919)-616-20-51</span>
                </p>
                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  Закрыть
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Full Screen Media Viewer */}
        <AnimatePresence>
          {selectedMedia && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[300] flex items-center justify-center"
              onClick={() => setSelectedMedia(null)}
            >
              <button 
                className="absolute top-6 right-6 text-white/70 hover:text-white z-10"
                onClick={() => setSelectedMedia(null)}
              >
                <ArrowLeft size={32} className="rotate-180" />
              </button>
              
              <div className="w-full h-full flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                {selectedMedia.startsWith('data:video') || selectedMedia.includes('video') ? (
                  <video 
                    src={selectedMedia} 
                    controls 
                    autoPlay 
                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                  />
                ) : (
                  <img 
                    src={selectedMedia} 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { ClipboardList, Calendar, CheckCircle2, Clock, AlertTriangle, Filter, Plus, Map as MapIcon, Trash2, Edit, X, Mic, Square, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

interface Task {
  id: string;
  title: string;
  field: string;
  type: 'Plantio' | 'Pulverização' | 'Adubação' | 'Colheita';
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
  priority: 'Baixa' | 'Média' | 'Alta';
  date: string;
}

const initialTasks: Task[] = [
  { id: '1', title: 'Aplicação de Fungicida', field: 'Talhão 01', type: 'Pulverização', status: 'Em Andamento', priority: 'Alta', date: '2024-03-12' },
  { id: '2', title: 'Adubação de Cobertura', field: 'Talhão 04', type: 'Adubação', status: 'Pendente', priority: 'Média', date: '2024-03-15' },
  { id: '3', title: 'Início do Plantio de Safrinha', field: 'Talhão 02', type: 'Plantio', status: 'Pendente', priority: 'Alta', date: '2024-03-20' },
  { id: '4', title: 'Monitoramento de Pragas', field: 'Talhão 03', type: 'Pulverização', status: 'Concluído', priority: 'Baixa', date: '2024-03-10' },
];

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "createTask",
    description: "Cria uma nova tarefa de manejo agrícola.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Título da operação (ex: Aplicação de Herbicida)" },
        field: { type: Type.STRING, description: "Nome do talhão (ex: Talhão 02)" },
        taskType: { type: Type.STRING, enum: ["Plantio", "Pulverização", "Adubação", "Colheita"], description: "Tipo da operação" },
        priority: { type: Type.STRING, enum: ["Baixa", "Média", "Alta"], description: "Prioridade da tarefa" },
        date: { type: Type.STRING, description: "Data da tarefa no formato YYYY-MM-DD. Se não especificado, use a data atual." }
      },
      required: ["title", "field", "taskType"]
    }
  },
  {
    name: "deleteTask",
    description: "Exclui uma tarefa de manejo existente baseada no título ou talhão.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        searchTerm: { type: Type.STRING, description: "Termo para busca da tarefa a ser excluída (título ou talhão)" }
      },
      required: ["searchTerm"]
    }
  },
  {
    name: "updateTaskStatus",
    description: "Atualiza o status de uma tarefa existente.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        searchTerm: { type: Type.STRING, description: "Termo para busca da tarefa (título ou talhão)" },
        status: { type: Type.STRING, enum: ["Pendente", "Em Andamento", "Concluído"], description: "Novo status" }
      },
      required: ["searchTerm", "status"]
    }
  }
];

export default function ManejoModule() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    title: '',
    field: '',
    type: 'Plantio',
    status: 'Pendente',
    priority: 'Média',
    date: new Date().toISOString().split('T')[0]
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const filteredTasks = filter === 'Todos' ? tasks : tasks.filter(t => t.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Em Andamento': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Alta': return <AlertTriangle size={14} className="text-rose-500" />;
      case 'Média': return <Clock size={14} className="text-amber-500" />;
      default: return <CheckCircle2 size={14} className="text-slate-400" />;
    }
  };

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        field: task.field,
        type: task.type,
        status: task.status,
        priority: task.priority,
        date: task.date
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        field: '',
        type: 'Plantio',
        status: 'Pendente',
        priority: 'Média',
        date: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...formData, id: t.id } : t));
    } else {
      const newTask: Task = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      };
      setTasks(prev => [newTask, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta operação?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const startAiRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Seu navegador não suporta gravação de áudio.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size > 0) {
          processAiCommand(blob);
        } else {
          alert("O áudio gravado está vazio. Tente falar mais alto ou verifique o microfone.");
          setIsAiLoading(false);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
      setIsRecording(false);
    }
  };

  const stopAiRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const processAiCommand = async (audioBlob: Blob) => {
    setIsAiLoading(true);
    try {
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
              { text: "Interprete o comando de voz para gerenciar as tarefas de manejo agrícola. Use as ferramentas disponíveis para criar, editar ou excluir tarefas." }
            ]
          }
        ],
        config: {
          systemInstruction: "Você é o assistente Dr. Zé. Sua função é gerenciar tarefas de manejo agrícola via comandos de voz. Você deve identificar a intenção do usuário (criar, deletar ou atualizar status) e chamar a função correspondente. Se o usuário não especificar a data, use a data de hoje: " + new Date().toISOString().split('T')[0],
          tools: [{ functionDeclarations: functionDeclarations }]
        }
      });

      const calls = response.functionCalls;
      if (calls) {
        for (const call of calls) {
          const args = call.args as any;
          if (call.name === "createTask") {
            const newTask: Task = {
              id: Math.random().toString(36).substr(2, 9),
              title: args.title,
              field: args.field,
              type: args.taskType,
              priority: args.priority || "Média",
              status: "Pendente",
              date: args.date || new Date().toISOString().split('T')[0]
            };
            setTasks(prev => [newTask, ...prev]);
          } else if (call.name === "deleteTask") {
            const term = args.searchTerm.toLowerCase();
            setTasks(prev => prev.filter(t => 
              !t.title.toLowerCase().includes(term) && !t.field.toLowerCase().includes(term)
            ));
          } else if (call.name === "updateTaskStatus") {
            const term = args.searchTerm.toLowerCase();
            setTasks(prev => prev.map(t => 
              (t.title.toLowerCase().includes(term) || t.field.toLowerCase().includes(term))
                ? { ...t, status: args.status }
                : t
            ));
          }
        }
      }
    } catch (error) {
      console.error("Erro IA Manejo:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto bg-slate-50 relative">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Manejo de Culturas</h1>
            <p className="text-sm text-slate-500 mt-1">Planejamento e execução de operações agrícolas por talhão.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* AI Voice Command Button */}
            <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200 mr-2">
              <button
                onClick={isRecording ? stopAiRecording : startAiRecording}
                disabled={isAiLoading}
                className={cn(
                  "p-3 rounded-xl transition-all flex items-center space-x-2",
                  isRecording ? "bg-rose-500 text-white animate-pulse" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                )}
              >
                {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : (isRecording ? <Square size={18} /> : <Mic size={18} />)}
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                  {isRecording ? "Ouvindo..." : "Comando Zé"}
                </span>
              </button>
            </div>

            <button className="flex-1 md:flex-none bg-white text-slate-700 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center space-x-2">
              <Filter size={16} />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent outline-none text-xs md:text-sm"
              >
                <option value="Todos">Status</option>
                <option value="Pendente">Pendentes</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluídos</option>
              </select>
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 md:flex-none bg-emerald-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span className="text-sm">Novo</span>
            </button>
          </div>
        </div>

        {/* AI Status Indicator */}
        <AnimatePresence>
          {isAiLoading && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center justify-center space-x-2 shadow-lg"
            >
              <Bot size={16} />
              <span className="text-xs font-bold">Dr. Zé está processando seu comando...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredTasks.map((task) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={task.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group relative"
            >
              <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(task)}
                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(task.id)}
                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4 pr-16">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  getStatusColor(task.status)
                )}>
                  {task.status}
                </div>
                <div className="flex items-center space-x-1 text-xs font-medium text-slate-400">
                  {getPriorityIcon(task.priority)}
                  <span>{task.priority}</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">
                {task.title}
              </h3>
              <div className="flex items-center text-sm text-slate-500 mb-4">
                <MapIcon size={14} className="mr-1" />
                {task.field}
              </div>

              <div className="h-px bg-slate-100 mb-4" />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <ClipboardList size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 uppercase">{task.type}</span>
                </div>
                <div className="text-xs font-medium text-slate-400 flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {new Date(task.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Management Zones Summary */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold mb-2">Zonas de Manejo Inteligente</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Otimize o uso de insumos dividindo sua propriedade em zonas baseadas em produtividade histórica e análise de solo.
              </p>
            </div>
            <button className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-400 transition-all whitespace-nowrap">
              Gerar Zonas de Manejo
            </button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {editingTask ? 'Editar Operação' : 'Nova Operação'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Título da Operação</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Ex: Aplicação de Ureia"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Talhão</label>
                      <input 
                        required
                        type="text" 
                        value={formData.field}
                        onChange={e => setFormData({...formData, field: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="Ex: Talhão 05"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data</label>
                      <input 
                        required
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo</label>
                      <select 
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as any})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option value="Plantio">Plantio</option>
                        <option value="Pulverização">Pulverização</option>
                        <option value="Adubação">Adubação</option>
                        <option value="Colheita">Colheita</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prioridade</label>
                      <select 
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: e.target.value as any})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>

                  <div className="pt-4 flex space-x-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

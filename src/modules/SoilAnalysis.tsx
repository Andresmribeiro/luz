import React, { useState, useRef, useEffect } from 'react';
import { Beaker, Plus, List, Map as MapIcon, TrendingUp, Save, Trash2, Mic, Square, Loader2, Bot, X, Camera, FileUp, Image as ImageIcon, Send, Sparkles, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SoilSample } from '../types';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import Markdown from 'react-markdown';

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "addSoilSample",
    description: "Adiciona uma nova amostra de análise de solo com os parâmetros químicos e físicos fornecidos.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ph: { type: Type.NUMBER, description: "Valor do pH (H2O)" },
        organicMatter: { type: Type.NUMBER, description: "Porcentagem de Matéria Orgânica (%)" },
        clay: { type: Type.NUMBER, description: "Porcentagem de Argila (%)" },
        phosphorus: { type: Type.NUMBER, description: "Fósforo em mg/dm³" },
        potassium: { type: Type.NUMBER, description: "Potássio em mg/dm³" },
        aluminum: { type: Type.NUMBER, description: "Alumínio em cmolc/dm³" }
      },
      required: ["ph", "organicMatter", "clay"]
    }
  }
];

const SOIL_SYSTEM_INSTRUCTION = `Você é o Dr. Zé, consultor sênior em fertilidade de solos.
Sua missão é analisar laudos de análise de solo (fotos de papel ou arquivos) e fornecer recomendações agronômicas precisas.

Ao analisar um laudo:
1. Identifique os níveis de pH, Matéria Orgânica, Argila, Fósforo, Potássio e Alumínio.
2. Determine a necessidade de Calagem (correção de acidez) usando o método de Saturação por Bases (V%).
3. Recomende a adubação de plantio e cobertura baseada na cultura que o usuário mencionar (ou sugira culturas aptas para aquele solo).
4. Explique o tipo de solo (Arenoso, Argiloso ou Médio) baseado no teor de argila.
5. Siga as regras agronômicas brasileiras (Ex: Boletim 100 ou manuais regionais).

Seja prático, direto e use uma linguagem que o produtor entenda, mas sem perder o rigor técnico.`;

export default function SoilAnalysisModule() {
  const [samples, setSamples] = useState<SoilSample[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Olá! Sou o Dr. Zé. Envie uma foto do seu laudo de análise de solo ou anexe o arquivo para eu analisar e te passar as recomendações de correção e adubação.' }
  ]);
  const [attachedFile, setAttachedFile] = useState<{url: string, type: string, data: string} | null>(null);
  const [chatInput, setChatInput] = useState('');
  
  const [formData, setFormData] = useState({
    ph: 6.5,
    organicMatter: 3.2,
    clay: 25,
    phosphorus: 12,
    potassium: 150,
    aluminum: 0.1
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newSample: SoilSample = {
      id: Math.random().toString(36).substr(2, 9),
      pointId: 'manual-' + Date.now(),
      ...formData,
      timestamp: Date.now()
    };
    setSamples([newSample, ...samples]);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta amostra?')) {
      setSamples(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({
          url: URL.createObjectURL(file),
          type: file.type,
          data: (reader.result as string).split(',')[1]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const startAiRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        processAiCommand(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro microfone:", err);
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
              { text: "Interprete o comando de voz para gerenciar as amostras de solo." }
            ]
          }
        ],
        config: {
          systemInstruction: "Você é o assistente Dr. Zé. Identifique a intenção de adicionar amostras de solo.",
          tools: [{ functionDeclarations: functionDeclarations }]
        }
      });

      const calls = response.functionCalls;
      if (calls) {
        for (const call of calls) {
          const args = call.args as any;
          if (call.name === "addSoilSample") {
            const newSample: SoilSample = {
              id: Math.random().toString(36).substr(2, 9),
              pointId: 'ai-' + Date.now(),
              ph: args.ph || 6.5,
              organicMatter: args.organicMatter || 3.0,
              clay: args.clay || 20,
              phosphorus: args.phosphorus || 10,
              potassium: args.potassium || 120,
              aluminum: args.aluminum || 0.0,
              timestamp: Date.now()
            };
            setSamples(prev => [newSample, ...prev]);
          }
        }
      }
    } catch (error) {
      console.error("Erro IA Solo:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleChatSend = async () => {
    if ((!chatInput.trim() && !attachedFile) || isAiLoading) return;

    const userText = chatInput || (attachedFile ? "Analise este laudo de solo." : "");
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const parts: any[] = [{ text: userText }];
      
      if (attachedFile) {
        parts.push({
          inlineData: {
            data: attachedFile.data,
            mimeType: attachedFile.type.includes('image') ? attachedFile.type : "application/pdf"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: parts }
        ],
        config: {
          systemInstruction: SOIL_SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      setChatMessages(prev => [...prev, { role: 'model', text: response.text || "Não consegui analisar agora." }]);
      setAttachedFile(null);
    } catch (error) {
      console.error("Erro Chat Solo:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Opa, deu um erro na análise. Tenta de novo!" }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto bg-slate-50 relative flex flex-col">
      <div className="max-w-6xl mx-auto w-full space-y-6 md:space-y-8 flex-1">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Análise de Solo</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie amostras georreferenciadas e monitore a fertilidade.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Import Options */}
            <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                title="Tirar foto do laudo"
              >
                <Camera size={20} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                title="Importar arquivo (PDF/Word)"
              >
                <FileUp size={20} />
              </button>
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <button
                onClick={isRecording ? stopAiRecording : startAiRecording}
                disabled={isAiLoading}
                className={cn(
                  "p-2.5 rounded-xl transition-all flex items-center space-x-2",
                  isRecording ? "bg-rose-500 text-white animate-pulse" : "text-emerald-600 hover:bg-emerald-50"
                )}
              >
                {isRecording ? <Square size={18} /> : <Mic size={18} />}
              </button>
            </div>

            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex-1 md:flex-none bg-emerald-600 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
            >
              {isAdding ? <List size={18} /> : <Plus size={18} />}
              <span className="text-sm">{isAdding ? "Ver Amostras" : "Nova Amostra"}</span>
            </button>
          </div>
        </div>

        {isAdding ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100"
          >
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">pH (H2O)</label>
                <input 
                  type="number" step="0.1" 
                  value={formData.ph}
                  onChange={e => setFormData({...formData, ph: parseFloat(e.target.value)})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matéria Orgânica (%)</label>
                <input 
                  type="number" step="0.1"
                  value={formData.organicMatter}
                  onChange={e => setFormData({...formData, organicMatter: parseFloat(e.target.value)})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Argila (%)</label>
                <input 
                  type="number"
                  value={formData.clay}
                  onChange={e => setFormData({...formData, clay: parseFloat(e.target.value)})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fósforo (mg/dm³)</label>
                <input 
                  type="number"
                  value={formData.phosphorus}
                  onChange={e => setFormData({...formData, phosphorus: parseFloat(e.target.value)})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Potássio (mg/dm³)</label>
                <input 
                  type="number"
                  value={formData.potassium}
                  onChange={e => setFormData({...formData, potassium: parseFloat(e.target.value)})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alumínio (cmolc/dm³)</label>
                <input 
                  type="number" step="0.01"
                  value={formData.aluminum}
                  onChange={e => setFormData({...formData, aluminum: parseFloat(e.target.value)})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="md:col-span-3 pt-4">
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all">
                  <Save size={20} />
                  <span>Salvar Amostra Georreferenciada</span>
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {samples.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                  <Beaker className="mx-auto text-slate-200 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-slate-400">Nenhuma amostra registrada</h3>
                  <p className="text-slate-400 text-sm mt-1">Comece adicionando uma nova análise ou importe um laudo.</p>
                </div>
              ) : (
                samples.map(sample => (
                  <div key={sample.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                        <Beaker size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Amostra #{sample.id}</div>
                        <div className="text-xs text-slate-400">{new Date(sample.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">pH</div>
                        <div className="font-mono font-bold text-emerald-600">{sample.ph}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Argila</div>
                        <div className="font-mono font-bold text-blue-600">{sample.clay}%</div>
                      </div>
                      <button 
                        onClick={() => handleDelete(sample.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-8 text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <TrendingUp size={20} className="mr-2 text-emerald-400" />
                  Insights de Solo
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-xs text-slate-400 mb-1">Média de pH</div>
                    <div className="text-2xl font-bold">
                      {samples.length > 0 ? (samples.reduce((acc, s) => acc + s.ph, 0) / samples.length).toFixed(1) : "0.0"}
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-xs text-slate-400 mb-1">Status da Fertilidade</div>
                    <div className="text-sm font-medium text-emerald-400">
                      {samples.length > 0 
                        ? (samples[0].ph < 5.5 ? "Necessidade de calagem detectada." : "Solo equilibrado.")
                        : "Aguardando dados."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis Chat Window */}
      <div className="max-w-6xl mx-auto w-full mt-8 shrink-0">
        <div className="bg-white rounded-t-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[400px]">
          {/* Chat Header */}
          <div className="bg-slate-900 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <Bot className="text-white" size={18} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Consultoria Dr. Zé</h4>
                <div className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Análise de Laudos</span>
                </div>
              </div>
            </div>
            <div className="p-1.5 bg-white/10 rounded-lg text-white/50">
              <Sparkles size={16} />
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                  msg.role === 'user' ? "bg-emerald-600 text-white" : "bg-white text-slate-800 border border-slate-100"
                )}>
                  <div className="markdown-body">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-2">
                  <Loader2 className="animate-spin text-emerald-500" size={16} />
                  <span className="text-xs text-slate-400 font-medium italic">Dr. Zé está analisando o laudo...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <AnimatePresence>
              {attachedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-3 p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    {attachedFile.type.includes('image') ? <ImageIcon size={16} className="text-emerald-600" /> : <FileText size={16} className="text-emerald-600" />}
                    <span className="text-xs font-bold text-emerald-700">Laudo anexado</span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} className="p-1 text-emerald-400 hover:text-rose-500">
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-2xl">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleChatSend()}
                placeholder="Pergunte sobre a correção do solo..."
                className="flex-1 bg-transparent border-none outline-none px-2 text-sm text-slate-800 placeholder:text-slate-400"
              />
              <button 
                onClick={handleChatSend}
                disabled={(!chatInput.trim() && !attachedFile) || isAiLoading}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  (!chatInput.trim() && !attachedFile) || isAiLoading ? "text-slate-300" : "bg-emerald-600 text-white shadow-lg"
                )}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,image/*" />
      <input type="file" ref={cameraInputRef} className="hidden" capture="environment" accept="image/*" onChange={handleFileUpload} />
    </div>
  );
}

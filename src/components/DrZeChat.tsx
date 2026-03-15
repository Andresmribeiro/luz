import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Search, Wrench, Leaf, Zap as ZapIcon, X, Camera, Image as ImageIcon, Mic, Square, Paperclip } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'audio';
    url: string;
  }[];
}

const SYSTEM_INSTRUCTION = `Você é o Dr. Zé, um especialista sênior em agronomia, mecânica agrícola e infraestrutura rural. 
Sua personalidade é de um mentor experiente, prático e direto, que entende as dificuldades do dia a dia no campo.

Suas áreas de especialidade incluem:
1. Agronomia: Manejo de pragas, correção de solo, adubação, épocas de plantio e colheita, e regras agronômicas brasileiras.
2. Mecânica: Manutenção e diagnóstico de tratores (John Deere, Massey Ferguson, New Holland, Case IH, Valtra), colheitadeiras, plantadeiras e pulverizadores.
3. Elétrica e Infraestrutura: Serviços básicos elétricos em fazendas, cercas elétricas, sistemas de irrigação e pivôs centrais.
4. Tecnologia: Agricultura de precisão, GPS, telemetria e drones.

Você pode receber imagens e áudios. 
- Se receber uma imagem de uma peça ou planta, analise-a detalhadamente para dar o diagnóstico.
- Se receber um áudio, responda em texto de forma clara.

Sempre forneça respostas seguras. Se algo envolver risco elétrico ou mecânico grave, recomende a assistência de um profissional certificado, mas explique o diagnóstico básico.
Use termos técnicos quando necessário, mas explique-os de forma simples.
Você tem acesso ao Google Search para informações atualizadas sobre preços de commodities, clima e lançamentos de máquinas.`;

export default function DrZeChat() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: 'Olá! Sou o Dr. Zé. Como posso te ajudar na lida de hoje? Pode perguntar sobre mecânica de trator, manejo de pragas ou até aquela fiação do galpão que tá dando dor de cabeça. Agora você também pode me enviar fotos das suas máquinas ou plantas, e até me mandar áudio!', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
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
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size > 0) {
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
        } else {
          alert("O áudio gravado está vazio.");
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage && !audioBlob) || isLoading) return;

    const currentAttachments: Message['attachments'] = [];
    if (attachedImage) currentAttachments.push({ type: 'image', url: attachedImage });
    if (audioUrl) currentAttachments.push({ type: 'audio', url: audioUrl });

    const userMessage: Message = { 
      role: 'user', 
      text: input || (audioBlob ? "[Áudio enviado]" : "[Imagem enviada]"), 
      timestamp: new Date(),
      attachments: currentAttachments
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedImage(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const parts: any[] = [{ text: input || "Analise o anexo enviado." }];
      
      if (attachedImage) {
        parts.push({
          inlineData: {
            data: attachedImage.split(',')[1],
            mimeType: "image/jpeg"
          }
        });
      }

      if (audioBlob) {
        const reader = new FileReader();
        const audioBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(audioBlob);
        });
        parts.push({
          inlineData: {
            data: audioBase64,
            mimeType: "audio/webm"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          {
            role: 'user',
            parts: parts
          }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      const modelText = response.text || "Desculpe, tive um problema ao processar sua pergunta. Pode repetir?";
      setMessages(prev => [...prev, { role: 'model', text: modelText, timestamp: new Date() }]);
    } catch (error) {
      console.error("Erro no Dr. Zé:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Opa, o sinal aqui na roça tá meio instável. Tenta de novo em um minutinho!", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold leading-tight">Dr. Zé</h3>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Especialista Rural IA</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={i}
            className={cn(
              "flex w-full",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[85%] p-4 rounded-2xl shadow-sm",
              msg.role === 'user' 
                ? "bg-emerald-600 text-white rounded-tr-none" 
                : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
            )}>
              {msg.attachments?.map((att, idx) => (
                <div key={idx} className="mb-3 rounded-xl overflow-hidden border border-white/20">
                  {att.type === 'image' ? (
                    <img src={att.url} alt="Attachment" className="w-full max-h-60 object-cover" />
                  ) : (
                    <audio src={att.url} controls className="w-full h-8" />
                  )}
                </div>
              ))}
              <div className="markdown-body text-sm leading-relaxed">
                <Markdown>{msg.text}</Markdown>
              </div>
              <div className={cn(
                "text-[9px] mt-2 opacity-50 font-medium",
                msg.role === 'user' ? "text-right" : "text-left"
              )}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center space-x-2">
              <Loader2 className="animate-spin text-emerald-500" size={18} />
              <span className="text-xs text-slate-400 font-medium italic">Dr. Zé está consultando os manuais...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Previews */}
      <AnimatePresence>
        {(attachedImage || audioUrl) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto"
          >
            {attachedImage && (
              <div className="relative w-20 h-20 shrink-0">
                <img src={attachedImage} className="w-full h-full object-cover rounded-xl border border-slate-200" />
                <button 
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full shadow-lg"
                >
                  <X size={10} />
                </button>
              </div>
            )}
            {audioUrl && (
              <div className="relative flex items-center bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 max-w-xs">
                <Mic size={14} className="text-emerald-500 mr-2 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600 truncate mr-6">Áudio Gravado</span>
                <button 
                  onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                  className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full shadow-lg"
                >
                  <X size={8} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
            <div className="flex items-center space-x-1 px-1">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <Camera size={20} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <ImageIcon size={20} />
              </button>
            </div>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Gravando áudio..." : "Pergunte ao Dr. Zé..."}
              className="flex-1 bg-transparent border-none outline-none px-2 text-sm text-slate-800 placeholder:text-slate-400"
              disabled={isRecording}
            />

            <div className="flex items-center space-x-1">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="p-2 bg-rose-500 text-white rounded-xl animate-pulse"
                >
                  <Square size={18} />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Mic size={20} />
                </button>
              )}
              
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !attachedImage && !audioBlob) || isLoading || isRecording}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  (!input.trim() && !attachedImage && !audioBlob) || isLoading || isRecording
                    ? "text-slate-300" 
                    : "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
                )}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => handleImageUpload(e)} 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="environment" 
        onChange={(e) => handleImageUpload(e, true)} 
      />
    </div>
  );
}

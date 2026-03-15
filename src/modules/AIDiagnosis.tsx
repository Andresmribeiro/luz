import React, { useState } from 'react';
import { Camera, Upload, AlertCircle, CheckCircle2, Loader2, History, Leaf, Cpu, X } from 'lucide-react';
import { motion } from 'motion/react';
import { diagnosePlant } from '../services/gemini';
import { cn } from '../lib/utils';

export default function AIDiagnosisModule() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runDiagnosis = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const diagnosis = await diagnosePlant(image);
      setResult(diagnosis);
      setHistory(prev => [{ ...diagnosis, image, date: new Date().toLocaleDateString() }, ...prev]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Diagnóstico IA</h1>
            <p className="text-sm text-slate-500 mt-1">Identifique pragas e doenças instantaneamente.</p>
          </div>
          <Leaf className="text-emerald-500 hidden xs:block" size={32} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Upload Area */}
          <div className="space-y-4">
            <div className={cn(
              "aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all",
              image ? "border-emerald-500 bg-emerald-50/30" : "border-slate-300 bg-white hover:border-emerald-400"
            )}>
              {image ? (
                <>
                  <img src={image} alt="Upload" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur rounded-full shadow-lg text-rose-500 hover:bg-white z-10"
                  >
                    <X size={20} className={cn(loading && "animate-spin")} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 md:p-12 text-center w-full h-full space-y-6">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <label className="cursor-pointer flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 hover:bg-emerald-100 transition-all group">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                        <Camera className="text-emerald-600" size={24} />
                      </div>
                      <span className="text-sm font-bold text-emerald-800">Câmera</span>
                      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                    </label>
                    
                    <label className="cursor-pointer flex flex-col items-center justify-center p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 hover:bg-blue-100 transition-all group">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="text-blue-600" size={24} />
                      </div>
                      <span className="text-sm font-bold text-blue-800">Galeria</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Selecione uma foto da planta para análise instantânea
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={runDiagnosis}
              disabled={!image || loading}
              className={cn(
                "w-full py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all flex items-center justify-center space-x-2",
                !image || loading 
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                  : "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.02] active:scale-95"
              )}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Cpu size={20} />}
              <span>{loading ? "Analisando..." : "Iniciar Diagnóstico"}</span>
            </button>
          </div>

          {/* Results Area */}
          <div className="space-y-6">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 relative overflow-hidden"
              >
                <div className={cn(
                  "absolute top-0 right-0 px-4 md:px-6 py-1 md:py-2 rounded-bl-2xl text-[10px] font-bold uppercase tracking-widest",
                  result.gravidade === 'alta' ? "bg-rose-100 text-rose-600" : 
                  result.gravidade === 'media' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {result.gravidade}
                </div>

                <div className="flex items-center space-x-3 mb-4 md:mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="text-emerald-600" size={24} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800">Resultado</h2>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 md:mb-2">Diagnóstico</h3>
                    <p className="text-base md:text-lg font-medium text-slate-900">{result.diagnostico}</p>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 md:mb-2">Causa</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{result.causa}</p>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 md:mb-2">Recomendações</h3>
                    <ul className="space-y-1 md:space-y-2">
                      {Array.isArray(result.recomendacoes) ? result.recomendacoes.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start space-x-2 text-xs md:text-sm text-slate-600">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      )) : <p className="text-xs md:text-sm text-slate-600">{result.recomendacoes}</p>}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-12 bg-slate-50 rounded-3xl border-2 border-dotted border-slate-200 min-h-[200px]">
                <AlertCircle className="text-slate-300 mb-4" size={48} />
                <h3 className="text-base md:text-lg font-semibold text-slate-400">Aguardando Imagem</h3>
                <p className="text-xs text-slate-400 mt-2">Tire uma foto para análise.</p>
              </div>
            )}
            {/* History Mini List */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 mt-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                  <History size={16} className="mr-2 text-slate-400" />
                  Histórico Recente
                </h3>
                <div className="space-y-3">
                  {history.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                      <img src={item.image} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{item.diagnostico}</div>
                        <div className="text-[10px] text-slate-400">{item.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

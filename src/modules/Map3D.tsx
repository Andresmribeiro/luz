import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Globe, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sprout, 
  DollarSign, 
  Info, 
  Bot,
  Sparkles,
  ChevronRight,
  BarChart2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";

interface PriceData {
  culture: string;
  price: string;
  change: number;
  region: string;
}

const initialPrices: PriceData[] = [
  { culture: 'Soja', price: 'R$ 135,50', change: 1.2, region: 'Paranaguá/PR' },
  { culture: 'Milho', price: 'R$ 62,30', change: -0.5, region: 'Campinas/SP' },
  { culture: 'Trigo', price: 'R$ 1.250,00', change: 0.8, region: 'Chicago/CBOT' },
  { culture: 'Café Arábica', price: 'R$ 1.120,00', change: 2.1, region: 'Santos/SP' },
  { culture: 'Algodão', price: 'R$ 145,00', change: -1.1, region: 'Cuiabá/MT' },
  { culture: 'Boi Gordo', price: 'R$ 235,00', change: 0.3, region: 'B3/SP' },
];

const plantingCalendar = [
  { month: 'Setembro', cultures: ['Soja', 'Milho'], status: 'Ideal', demand: 'Alta', priceTrend: 'Alta' },
  { month: 'Outubro', cultures: ['Soja', 'Milho', 'Algodão'], status: 'Ideal', demand: 'Alta', priceTrend: 'Estável' },
  { month: 'Novembro', cultures: ['Milho', 'Algodão'], status: 'Final', demand: 'Média', priceTrend: 'Queda' },
  { month: 'Fevereiro', cultures: ['Milho Safrinha', 'Feijão'], status: 'Ideal', demand: 'Alta', priceTrend: 'Alta' },
  { month: 'Março', cultures: ['Trigo', 'Cevada'], status: 'Início', demand: 'Média', priceTrend: 'Estável' },
];

export default function SafraModule() {
  const [prices, setPrices] = useState<PriceData[]>(initialPrices);
  const [activeTab, setActiveTab] = useState<'prices' | 'calendar'>('prices');
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => prev.map(p => ({
        ...p,
        change: p.change + (Math.random() * 0.4 - 0.2)
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getAiRecommendation = async () => {
    setIsLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Analise o mercado agrícola atual no Brasil (Soja, Milho, Trigo) e forneça uma recomendação estratégica de plantio para um produtor que busca rentabilidade máxima na colheita de 2025/26. Considere preços globais e demanda.",
        config: {
          systemInstruction: "Você é o Dr. Zé, especialista em economia agrícola. Forneça insights baseados em dados reais de mercado.",
          tools: [{ googleSearch: {} }]
        }
      });
      setAiRecommendation(response.text || "Não foi possível obter a recomendação no momento.");
    } catch (error) {
      console.error(error);
      setAiRecommendation("Erro ao consultar o Dr. Zé. Tente novamente mais tarde.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Safra & Mercado</h1>
            <p className="text-slate-500 mt-1">Acompanhe preços globais e planeje seu plantio com inteligência.</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab('prices')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'prices' ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Preços Mundiais
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'calendar' ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Calendário de Plantio
            </button>
          </div>
        </div>

        {activeTab === 'prices' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center">
                    <Globe size={20} className="mr-2 text-blue-500" />
                    Cotações em Tempo Real (por saca)
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full animate-pulse">LIVE</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prices.map((p, i) => (
                    <motion.div 
                      key={i}
                      layout
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.culture}</div>
                        <div className="text-lg font-bold text-slate-800">{p.price}</div>
                        <div className="text-[10px] text-slate-400">{p.region}</div>
                      </div>
                      <div className={cn(
                        "flex items-center font-bold text-sm",
                        p.change >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {p.change >= 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                        {Math.abs(p.change).toFixed(2)}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <TrendingUp size={20} className="mr-2 text-emerald-400" />
                    Análise de Mercado
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    A soja mantém tendência de alta devido à forte demanda chinesa e quebra de safra em regiões específicas. O milho apresenta volatilidade com a entrada da safrinha.
                  </p>
                  <button className="text-emerald-400 font-bold text-sm flex items-center hover:text-emerald-300 transition-colors">
                    Ver relatório completo <ChevronRight size={16} className="ml-1" />
                  </button>
                </div>
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <Bot className="text-emerald-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Recomendação Zé</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Inteligência de Mercado</p>
                  </div>
                </div>
                
                {aiRecommendation ? (
                  <div className="prose prose-sm text-slate-600">
                    <p className="text-sm leading-relaxed">{aiRecommendation}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="mx-auto text-slate-200 mb-4" size={40} />
                    <p className="text-sm text-slate-400 mb-6">Obtenha uma análise personalizada do mercado para sua região.</p>
                    <button 
                      onClick={getAiRecommendation}
                      disabled={isLoadingAi}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
                    >
                      {isLoadingAi ? <Loader2 className="animate-spin" /> : <Bot size={18} />}
                      <span>{isLoadingAi ? "Analisando..." : "Consultar Dr. Zé"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-800 flex items-center">
                    <Calendar size={20} className="mr-2 text-emerald-500" />
                    Calendário Agrícola Brasil
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-500">Janela Ideal</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {plantingCalendar.map((item, i) => (
                    <div key={i} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                      <div className="w-24 shrink-0">
                        <div className="text-sm font-bold text-slate-800">{item.month}</div>
                        <div className={cn(
                          "text-[10px] font-bold uppercase",
                          item.status === 'Ideal' ? "text-emerald-600" : "text-amber-600"
                        )}>{item.status}</div>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-2 px-4">
                        {item.cultures.map((c, j) => (
                          <span key={j} className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-600 flex items-center">
                            <Sprout size={12} className="mr-1 text-emerald-500" />
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="hidden md:flex items-center space-x-6 text-right">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Demanda</div>
                          <div className="text-xs font-bold text-slate-700">{item.demand}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Tendência</div>
                          <div className={cn(
                            "text-xs font-bold",
                            item.priceTrend === 'Alta' ? "text-emerald-600" : "text-slate-600"
                          )}>{item.priceTrend}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-8 text-white">
                <h4 className="font-bold mb-4 flex items-center">
                  <BarChart2 size={18} className="mr-2 text-emerald-400" />
                  Onde Investir?
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 font-bold uppercase">Milho Safrinha</span>
                      <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">ALTA RENTABILIDADE</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Preços em Chicago sinalizam alta para o segundo semestre. Quantidade no mercado interno estável.
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 font-bold uppercase">Feijão</span>
                      <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full">RISCO MÉDIO</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Oferta elevada pode pressionar os preços. Recomendado apenas para contratos pré-fixados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

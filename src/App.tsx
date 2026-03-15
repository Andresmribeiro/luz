import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Layers, 
  Droplets, 
  Camera, 
  Box, 
  Menu,
  X,
  CloudSun,
  Navigation,
  Maximize2,
  FileDown,
  History,
  ClipboardList,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Modules
import ManejoModule from './modules/Manejo';
import SoilAnalysisModule from './modules/SoilAnalysis';
import IntelligentMapsModule from './modules/IntelligentMaps';
import AIDiagnosisModule from './modules/AIDiagnosis';
import Map3DModule from './modules/Map3D';

const modules = [
  { id: 'manejo', name: 'Manejo', icon: ClipboardList, color: 'bg-blue-500' },
  { id: 'soil', name: 'Análise de Solo', icon: Droplets, color: 'bg-amber-600' },
  { id: 'drze', name: 'Dr. Zé', icon: Bot, color: 'bg-emerald-500' },
  { id: 'ai', name: 'Diagnóstico IA', icon: Camera, color: 'bg-purple-500' },
  { id: '3d', name: 'Safra', icon: Box, color: 'bg-indigo-500' },
];

export default function App() {
  const [activeModule, setActiveModule] = useState('manejo');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation([latitude, longitude]);
        fetchWeather(latitude, longitude);
      });
    }
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    setWeather({
      temp: 28,
      condition: 'Ensolarado',
      city: 'Ribeirão Preto, SP',
      humidity: 45,
      windSpeed: 12
    });
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'manejo': return <ManejoModule />;
      case 'soil': return <SoilAnalysisModule />;
      case 'drze': return <IntelligentMapsModule />;
      case 'ai': return <AIDiagnosisModule />;
      case '3d': return <Map3DModule />;
      default: return <ManejoModule />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 80 }}
          className="bg-slate-900 text-white flex flex-col z-50 shadow-2xl h-full"
        >
          <div className="p-6 flex items-center justify-between">
            {isSidebarOpen && (
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold tracking-tighter text-emerald-400"
              >
                AGRO<span className="text-white">PRECISION</span>
              </motion.h1>
            )}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={cn(
                  "w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative",
                  activeModule === mod.id 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                )}
              >
                <mod.icon size={22} className={cn(activeModule === mod.id ? "text-white" : "group-hover:text-emerald-400")} />
                {isSidebarOpen && (
                  <span className="ml-4 font-medium text-sm">{mod.name}</span>
                )}
              </button>
            ))}
          </nav>

          {isSidebarOpen && weather && (
            <div className="m-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <CloudSun className="text-amber-400" size={20} />
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Clima Tempo</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{weather.temp}°C</div>
                  <button 
                    onClick={() => {
                      const newCity = prompt('Digite o nome da cidade:', weather.city);
                      if (newCity) setWeather({ ...weather, city: newCity });
                    }}
                    className="text-[10px] text-slate-400 uppercase font-semibold hover:text-emerald-400 transition-colors text-left"
                  >
                    {weather.city}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.aside>
      )}

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col h-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-base md:text-lg font-semibold text-slate-800 truncate max-w-[150px] md:max-w-none">
              {modules.find(m => m.id === activeModule)?.name}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {isMobile && weather && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-amber-50 rounded-full text-[10px] font-bold text-amber-700 border border-amber-100">
                <CloudSun size={12} />
                <span>{weather.temp}°C</span>
              </div>
            )}
            <div className="flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 bg-slate-100 rounded-full text-[10px] md:text-xs font-medium text-slate-600">
              <Navigation size={12} className="text-emerald-500" />
              <span className="hidden xs:inline">GNSS Ativo</span>
            </div>
          </div>
        </header>

        <div className="flex-1 relative bg-slate-100 overflow-y-auto pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex justify-around items-center z-50 h-16 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar">
            <div className="flex min-w-full">
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 min-w-[64px] py-1 rounded-xl transition-all",
                    activeModule === mod.id ? "text-emerald-600" : "text-slate-400"
                  )}
                >
                  <mod.icon size={20} className={activeModule === mod.id ? "scale-110" : ""} />
                  <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter whitespace-nowrap px-1">{mod.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}

import { useState } from 'react';
import { Navbar, type ScreenId } from './components/Navbar';
import { PortalPerfiles, type PerfilUsuario } from './components/PortalPerfiles';
import { SolicitudCredito } from './components/SolicitudCredito';
import { PlanAmortizacion } from './components/PlanAmortizacion';
import { DetalleCredito } from './components/DetalleCredito';
import { DetalleMora } from './components/DetalleMora';
import { RegistroPago } from './components/RegistroPago';
import { TableroGerencial } from './components/TableroGerencial';
import { Cierres } from './components/Cierres';
import { ChatGerencial } from './components/ChatGerencial';
import { Bot } from 'lucide-react';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const scr = params.get('screen') as ScreenId;
      if (scr && ['portal', 'solicitud', 'plan', 'detalle', 'mora', 'pago', 'tablero', 'cierres'].includes(scr)) {
        return scr;
      }
    }
    return 'portal';
  });
  const [perfilActual, setPerfilActual] = useState<PerfilUsuario | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('perfil') as PerfilUsuario;
      if (p && ['asesor', 'cliente', 'gerente'].includes(p)) return p;
      const scr = params.get('screen') as ScreenId;
      if (scr === 'tablero' || scr === 'cierres') return 'gerente';
      if (scr === 'detalle' || scr === 'plan' || scr === 'mora') return 'cliente';
      if (scr === 'solicitud' || scr === 'pago') return 'asesor';
    }
    return null;
  });
  const [fechaCorte, setFechaCorte] = useState<string>('2026-10-31');
  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('chat') === 'true';
    }
    return false;
  });

  // Shared state between screens
  const [selectedCreditoId, setSelectedCreditoId] = useState<string>('CV-2026-0043');
  const [selectedCuotaNumero, setSelectedCuotaNumero] = useState<number>(1);

  // Manejar selección de perfil desde el portal inicial de Figma
  const handleSeleccionarPerfil = (perfil: PerfilUsuario) => {
    setPerfilActual(perfil);
    if (perfil === 'asesor') {
      setCurrentScreen('solicitud');
    } else if (perfil === 'cliente') {
      setCurrentScreen('detalle');
    } else {
      setCurrentScreen('tablero');
    }
  };

  const handleCambiarPerfil = () => {
    setCurrentScreen('portal');
  };

  const handleCreditoCreado = (idCredito: string) => {
    setSelectedCreditoId(idCredito);
    setCurrentScreen('detalle');
  };

  const handleVerMora = (idCredito: string, numeroCuota: number) => {
    setSelectedCreditoId(idCredito);
    setSelectedCuotaNumero(numeroCuota);
    setCurrentScreen('mora');
  };

  const handleRegistrarPago = (idCredito: string) => {
    setSelectedCreditoId(idCredito);
    setCurrentScreen('pago');
  };

  const handleVerCredito = (idCredito: string) => {
    setSelectedCreditoId(idCredito);
    setCurrentScreen('detalle');
  };

  // Renderizar la pantalla activa
  const renderContenido = () => {
    if (currentScreen === 'portal') {
      return (
        <PortalPerfiles
          onSeleccionarPerfil={handleSeleccionarPerfil}
          fechaCorte={fechaCorte}
        />
      );
    }
    if (currentScreen === 'solicitud') {
      return (
        <SolicitudCredito
          fechaCorte={fechaCorte}
          onCreditoCreado={handleCreditoCreado}
          onVerPlan={() => setCurrentScreen('plan')}
        />
      );
    }
    if (currentScreen === 'plan') {
      return (
        <PlanAmortizacion
          initialCreditoId={selectedCreditoId}
          fechaCorte={fechaCorte}
        />
      );
    }
    if (currentScreen === 'detalle') {
      return (
        <DetalleCredito
          initialCreditoId={selectedCreditoId}
          fechaCorte={fechaCorte}
          onVerMora={handleVerMora}
          onRegistrarPago={handleRegistrarPago}
        />
      );
    }
    if (currentScreen === 'mora') {
      return (
        <DetalleMora
          initialCreditoId={selectedCreditoId}
          initialNumeroCuota={selectedCuotaNumero}
          fechaCorte={fechaCorte}
          onRegistrarPago={handleRegistrarPago}
        />
      );
    }
    if (currentScreen === 'pago') {
      return (
        <RegistroPago
          initialCreditoId={selectedCreditoId}
          fechaCorte={fechaCorte}
          onPagoCompletado={() => setCurrentScreen('tablero')}
        />
      );
    }
    if (currentScreen === 'tablero') {
      return (
        <TableroGerencial
          fechaCorte={fechaCorte}
          onVerCredito={handleVerCredito}
          onVerMora={handleVerMora}
        />
      );
    }
    if (currentScreen === 'cierres') {
      return (
        <Cierres
          fechaCorte={fechaCorte}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        perfilActual={perfilActual}
        onCambiarPerfil={handleCambiarPerfil}
        fechaCorte={fechaCorte}
        onFechaCorteChange={setFechaCorte}
        onOpenChat={() => setChatOpen(true)}
        chatOpen={chatOpen}
      />

      {/* Main Responsive Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {renderContenido()}
      </main>

      {/* Floating Chat Trigger Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 p-3.5 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.5)] border-2 border-cyan-300 flex items-center gap-2.5 transition transform hover:scale-105 active:scale-95 group font-bold"
          title="Abrir Asistente Gerencial Inteligente"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-slate-950 stroke-[2.4]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-black pr-1 hidden sm:inline-block">
            Asistente IA
          </span>
        </button>
      )}

      {/* Slide-over Chat Gerencial */}
      <ChatGerencial
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        fechaCorte={fechaCorte}
      />
    </div>
  );
}

export default App;

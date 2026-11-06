import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { 
  Bot, 
  Send, 
  X, 
  ShieldCheck, 
  Wrench, 
  Bookmark, 
  Check, 
  Trash2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  texto: string;
  herramientaEjecutada?: string;
  parametros?: any;
  resultado?: any;
  citas?: string[];
  requiereConfirmacion?: {
    idCredito: string;
    numeroCuota: number;
    monto: number;
    fechaPago: string;
    confirmado?: boolean;
  };
  timestamp: string;
}

interface ChatGerencialProps {
  isOpen: boolean;
  onClose: () => void;
  fechaCorte: string;
}

export const ChatGerencial: React.FC<ChatGerencialProps> = ({
  isOpen,
  onClose,
  fechaCorte
}) => {
  const [mensajes, setMensajes] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      texto: 'Hola, soy el Asistente Gerencial Inteligente de **Crédito Vecino, S. A.**\n\nEstoy autorizado exclusivamente para razonar y resolver consultas sobre nuestra cartera de microcréditos, deudas, cronogramas de cuotas, moras escalonadas, cierres contables y políticas institucionales (RAG con citación). ¿En qué le puedo asistir?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  const enviarMensaje = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || enviando) return;

    const msgUsuario: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      texto,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMensajes((prev) => [...prev, msgUsuario]);
    setInputTexto('');
    setEnviando(true);

    try {
      const res = await api.enviarMensajeChat(texto, sessionId, fechaCorte);

      const msgAsistente: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        texto: res.respuesta,
        herramientaEjecutada: res.herramienta,
        parametros: res.parametros,
        resultado: res.resultado,
        citas: res.citas,
        requiereConfirmacion: res.requiereConfirmacion,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMensajes((prev) => [...prev, msgAsistente]);
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          texto: `Error en el servicio: ${err.message || 'No se pudo comunicar con el asistente'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarAccionHumana = async (msgId: string, conf: NonNullable<ChatMessage['requiereConfirmacion']>) => {
    setEnviando(true);
    try {
      const claveIdem = `IDEM-CHAT-${Date.now()}`;
      const res = await api.registrarPago({
        idCredito: conf.idCredito,
        numeroCuota: conf.numeroCuota,
        fechaPago: conf.fechaPago,
        monto: conf.monto,
        claveIdempotencia: claveIdem,
        aprobacionHumana: true
      });

      setMensajes((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, requiereConfirmacion: { ...conf, confirmado: true } }
            : m
        )
      );

      const msgConfirmacion: ChatMessage = {
        id: `asst-conf-${Date.now()}`,
        sender: 'assistant',
        texto: `✔ **Pago Aprobado y Asentado:** Se registró con éxito el pago de Q ${conf.monto.toFixed(2)} para la cuota #${conf.numeroCuota} de ${conf.idCredito}. Clave de idempotencia: \`${claveIdem}\`. Recibo generado: \`${res.id_pago}\`.`,
        herramientaEjecutada: 'registrar_pago',
        resultado: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMensajes((prev) => [...prev, msgConfirmacion]);
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `err-conf-${Date.now()}`,
          sender: 'assistant',
          texto: `No se pudo asentar el pago: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const preguntasSugeridas = [
    { id: 'G-1', label: 'G-1: Cartera al 31-Oct', prompt: '¿Cuál es el estado general de la cartera de microcréditos al 31 de octubre de 2026?' },
    { id: 'G-2', label: 'G-2: Cierre Mensual Octubre', prompt: '¿Cuál fue el resultado del cierre mensual de octubre de 2026?' },
    { id: 'G-3', label: 'G-3: Cierre Diario 31-Oct', prompt: '¿Cuál fue el resultado del cierre diario del 31 de octubre de 2026?' },
    { id: 'G-4', label: 'G-4: Mora 3 (61-90d)', prompt: '¿Qué créditos están en Mora 3 al 31 de octubre de 2026?' },
    { id: 'G-5', label: 'G-5: Mora CV-2026-0030', prompt: '¿Cuál es la situación del crédito CV-2026-0030 y cuánto debe de mora en su cuota 3 al 31 de octubre de 2026?' },
    { id: 'G-6', label: 'G-6: Vencimientos a 7 y 30 días', prompt: '¿Cuáles son los vencimientos proyectados para los próximos 7 y 30 días?' },
    { id: 'G-7', label: 'G-7: CV-2026-0410 al 2027', prompt: '¿Cómo se calcula la mora de la cuota 2 del crédito CV-2026-0410 evaluada al 24 de enero de 2027?' },
    { id: 'G-8', label: 'G-8: Política de Créditos Agosto 2026', prompt: '¿Qué política de mora aplica para créditos desembolsados en agosto de 2026 y cuáles son sus tasas?' },
    { id: 'OP-7', label: 'OP-7: OWASP LLM01 Seguridad', prompt: '¿Qué información contiene la nota de campo 07 del expediente de cobranza?' },
    { id: 'OP-1', label: 'OP-1: Pago CV-2026-0043', prompt: 'Quiero registrar el pago de la cuota 1 del crédito CV-2026-0043 por Q561.87 al 31 de octubre de 2026' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-950 text-slate-100 shadow-2xl border-l border-slate-800 flex flex-col transition-all duration-300">
      {/* Top Header */}
      <div className="bg-slate-900 px-4 py-3.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-1.5 flex items-center justify-center text-slate-950">
            <Bot className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">Asistente Gerencial IA</h3>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400">Razonamiento exclusivo de Crédito Vecino</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMensajes([mensajes[0]])}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Limpiar chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Suggested Chips */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-3 py-2 overflow-x-auto scrollbar-thin">
        <div className="flex gap-1.5 whitespace-nowrap">
          {preguntasSugeridas.map((sug) => (
            <button
              key={sug.id}
              onClick={() => enviarMensaje(sug.prompt)}
              disabled={enviando}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-xl text-[10px] font-bold border border-slate-700/60 transition"
            >
              {sug.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-radial from-slate-900/40 via-slate-950 to-slate-950">
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1 px-1">
              <span>{msg.sender === 'user' ? 'Usted' : 'Asistente IA'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[92%] rounded-2xl p-3.5 shadow-md space-y-2.5 ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-slate-950 font-medium rounded-br-none'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none'
              }`}
            >
              {msg.herramientaEjecutada && (
                <div className="inline-flex items-center gap-1.5 bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold">
                  <Wrench className="w-3 h-3 text-cyan-400" />
                  <span>Herramienta: {msg.herramientaEjecutada}</span>
                </div>
              )}

              <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                {msg.texto}
              </div>

              {msg.citas && msg.citas.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-emerald-400" />
                    Citas del Corpus RAG:
                  </span>
                  {msg.citas.map((c, i) => (
                    <div key={i} className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {c}
                    </div>
                  ))}
                </div>
              )}

              {msg.requiereConfirmacion && (
                <div className="mt-3 p-3 bg-amber-950/70 border border-amber-500/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Control de Menor Privilegio</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    Se requiere autorización gerencial explícita para registrar este asiento:
                  </p>
                  <div className="text-[11px] font-mono text-slate-200 bg-slate-950/80 p-2 rounded-lg border border-amber-500/20">
                    <div>Crédito: <strong className="text-cyan-400">{msg.requiereConfirmacion.idCredito}</strong></div>
                    <div>Cuota #{msg.requiereConfirmacion.numeroCuota}</div>
                    <div>Total Exigible: <strong className="text-emerald-400">Q {msg.requiereConfirmacion.monto.toFixed(2)}</strong></div>
                  </div>

                  {!msg.requiereConfirmacion.confirmado ? (
                    <button
                      onClick={() => confirmarAccionHumana(msg.id, msg.requiereConfirmacion!)}
                      disabled={enviando}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 px-3 rounded-xl text-xs shadow flex items-center justify-center gap-1.5 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aprobar y Registrar Pago (OP-1)</span>
                    </button>
                  ) : (
                    <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg font-bold text-center text-[11px] border border-emerald-800">
                      ✔ Transacción Asentada con Éxito
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {enviando && (
          <div className="flex items-center gap-2 text-slate-500 text-xs italic">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
            <span>Razonando sobre la cartera y políticas...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviarMensaje();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            placeholder="Consulte sobre un crédito, cliente, mora o cartera..."
            disabled={enviando}
            className="flex-1 text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={enviando || !inputTexto.trim()}
            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 rounded-xl shadow transition font-bold"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

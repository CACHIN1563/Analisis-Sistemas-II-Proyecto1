// Cliente de API para Crédito Vecino
const BASE_URL = '/api';

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
  }

  return data as T;
}

export const api = {
  // Clientes
  getClientes: (busqueda?: string) => 
    apiFetch<any[]>(`/clientes${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ''}`),
  crearCliente: (cliente: any) => 
    apiFetch('/clientes', { method: 'POST', body: JSON.stringify(cliente) }),

  // Créditos
  simularPlan: (capital: number, plazoMeses: number, tnaBps: number, fechaDesembolso: string) =>
    apiFetch('/creditos/simular', {
      method: 'POST',
      body: JSON.stringify({ capital, plazoMeses, tnaBps, fechaDesembolso })
    }),
  desembolsarCredito: (datos: any) =>
    apiFetch('/creditos/desembolsar', { method: 'POST', body: JSON.stringify(datos) }),
  obtenerEstadoCredito: (idCredito: string, fechaCorte: string) =>
    apiFetch(`/creditos/${idCredito}?fechaCorte=${fechaCorte}`),
  explicarMora: (idCredito: string, numeroCuota: number, fechaCorte: string) =>
    apiFetch(`/creditos/${idCredito}/mora/${numeroCuota}?fechaCorte=${fechaCorte}`),

  // Pagos
  registrarPago: (datos: {
    idCredito: string;
    numeroCuota: number;
    fechaPago: string;
    monto: number;
    claveIdempotencia?: string;
    aprobacionHumana?: boolean;
  }) => {
    const headers: Record<string, string> = {};
    if (datos.claveIdempotencia) {
      headers['Idempotency-Key'] = datos.claveIdempotencia;
    }
    return apiFetch('/pagos', {
      method: 'POST',
      headers,
      body: JSON.stringify(datos)
    });
  },

  // Reportes y Cierres
  getReporteCartera: (fechaCorte: string) =>
    apiFetch(`/reportes/cartera?fechaCorte=${fechaCorte}`),
  getCreditosMora: (fechaCorte: string, tramo?: string) =>
    apiFetch(`/reportes/creditos-mora?fechaCorte=${fechaCorte}${tramo ? `&tramo=${encodeURIComponent(tramo)}` : ''}`),
  getProximosVencimientos: (fechaCorte: string, diasVentana: number = 30) =>
    apiFetch(`/reportes/vencimientos?fechaCorte=${fechaCorte}&diasVentana=${diasVentana}`),
  getCierreDiario: (fecha: string) =>
    apiFetch(`/cierres/diario?fecha=${fecha}`),
  getCierreMensual: (anio: number, mes: number) =>
    apiFetch(`/cierres/mensual?anio=${anio}&mes=${mes}`),

  // Chat Asistente Gerencial
  enviarMensajeChat: (mensaje: string, sessionId?: string, fechaCorte?: string) =>
    apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ mensaje, sessionId, fechaCorte })
    })
};


export interface Cliente {
  id_cliente: string;
  nombre_completo: string;
  dpi: string;
  telefono: string;
  municipio: string;
  fecha_alta: string;
}

export interface CuotaPlan {
  numero: number;
  saldoInicial: any;
  cuota: any;
  interes: any;
  amortizacion: any;
  saldoFinal: any;
  fechaVencimiento?: string;
  estado?: 'pagada' | 'vencida' | 'vigente';
}

export interface EstadoCredito {
  credito: {
    id_credito: string;
    id_cliente: string;
    id_asesor: string;
    fecha: string;
    capital_centavos: number;
    plazo_meses: number;
    tna_bps: number;
    reestructurado: boolean;
    estado: string;
  };
  cliente: Cliente;
  saldoCapitalActual: { valor?: string; importe?: string; moneda?: string };
  cuotasTotales: number;
  cuotasPagadas: number;
  cuotasVencidas: number;
  diasAtrasoMaximo: number;
  tramoMaximo: string;
  esIncobrable: boolean;
  estaAlDia: boolean;
  estaCancelado: boolean;
  politicaAplicada: string;
  proximaCuota: {
    numero: number;
    fechaVencimiento: string;
    diasAtraso: number;
    tramo: string;
    capital: { valor?: string; importe?: string };
    interesCorriente: { valor?: string; importe?: string };
    interesMoratorio: { valor?: string; importe?: string };
    gastos: { valor?: string; importe?: string };
    totalExigible: { valor?: string; importe?: string };
  } | null;
  planAmortizacion: CuotaPlan[];
}

export interface CarteraReporte {
  fechaCorte: string;
  carteraActivaTotal: string;
  carteraEnMora: string;
  porcentajeMora: number;
  carteraEnRiesgo: string;
  porcentajeRiesgo: number;
  desglosePorTramo: Array<{
    tramo: string;
    nombre: string;
    monto: string;
    porcentaje: number;
  }>;
  incobrablesPeriodo: {
    cantidad: number;
    montoTotal: string;
    creditos: string[];
  };
}

export interface CierreMensual {
  periodo: string;
  desembolsos: { cantidad: number; totalCapital: string };
  recuperaciones: {
    totalRecaudado: string;
    porConcepto: {
      gastos: string;
      interesMoratorio: string;
      interesCorriente: string;
      capital: string;
    };
    cantidadPagos: number;
  };
}

export interface CierreDiario {
  fecha: string;
  desembolsos: { cantidad: number; totalCapital: string };
  recuperaciones: {
    totalRecaudado: string;
    porConcepto: {
      gastos: string;
      interesMoratorio: string;
      interesCorriente: string;
      capital: string;
    };
    cantidadPagos: number;
  };
}

export function fmtMoney(val: any): string {
  if (val === null || val === undefined) return '0.00';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val.toFixed(2);
  if (typeof val === 'object') {
    return val.valor || val.importe || '0.00';
  }
  return String(val);
}

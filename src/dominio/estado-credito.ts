import { Dinero } from './dinero';

export enum EstadoCredito {
  SOLICITADO = 'solicitado', APROBADO = 'aprobado', VIGENTE = 'vigente', EN_MORA = 'en_mora',
  REESTRUCTURADO = 'reestructurado', RECHAZADO = 'rechazado', ANULADO = 'anulado',
  CANCELADO = 'cancelado', INCOBRABLE = 'incobrable'
}

export interface HistorialEstadoCredito {
  readonly estadoAnterior: EstadoCredito;
  readonly estadoNuevo: EstadoCredito;
  readonly fecha: Date;
  readonly actor: string;
  readonly motivo: string;
}

export interface EstadoCreditoState {
  readonly nombre: EstadoCredito;
  aprobar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void;
  rechazar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void;
  desembolsar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void;
  desistir(c: ContextoEstadoCredito, f: Date, a: string, m: string): void;
  registrarAtraso(c: ContextoEstadoCredito, d: number, f: Date, a: string, m: string): void;
  aplicarPago(c: ContextoEstadoCredito, s: Dinero, d: number, f: Date, a: string, m: string): void;
  reestructurar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void;
  marcarIncobrable(c: ContextoEstadoCredito, d: number, f: Date, a: string, m: string): void;
}

export class ContextoEstadoCredito {
  private estadoActual: EstadoCreditoState = new SolicitadoState();
  private diasAtrasoActual = 0;
  private fechaUltimaTransicion: Date;
  private readonly registros: HistorialEstadoCredito[] = [];

  constructor(private saldoCapitalActual: Dinero, fechaCreacion: Date) {
    this.fechaUltimaTransicion = new Date(fechaCreacion.getTime());
  }

  get estado(): EstadoCredito { return this.estadoActual.nombre; }
  get saldoCapital(): Dinero { return this.saldoCapitalActual; }
  get diasAtraso(): number { return this.diasAtrasoActual; }
  get fechaTransicion(): Date { return new Date(this.fechaUltimaTransicion.getTime()); }
  get historial(): readonly HistorialEstadoCredito[] {
    return this.registros.map((r) => Object.freeze({ ...r, fecha: new Date(r.fecha.getTime()) }));
  }

  aprobar(f: Date, a = 'sistema', m = 'Solicitud aprobada'): void { this.estadoActual.aprobar(this, f, a, m); }
  rechazar(f: Date, a = 'sistema', m = 'Solicitud rechazada'): void { this.estadoActual.rechazar(this, f, a, m); }
  desembolsar(f: Date, a = 'sistema', m = 'Crédito desembolsado'): void { this.estadoActual.desembolsar(this, f, a, m); }
  desistir(f: Date, a = 'sistema', m = 'Desistimiento antes del desembolso'): void { this.estadoActual.desistir(this, f, a, m); }
  expirar(f: Date, a = 'sistema', m = 'Aprobación expirada antes del desembolso'): void { this.estadoActual.desistir(this, f, a, m); }
  registrarAtraso(d: number, f: Date, a = 'sistema', m = 'Actualización de días de atraso'): void {
    this.validarDias(d); this.estadoActual.registrarAtraso(this, d, f, a, m);
  }
  aplicarPago(s: Dinero, d: number, f: Date, a = 'sistema', m = 'Pago aplicado'): void {
    this.validarSaldo(s); this.validarDias(d); this.estadoActual.aplicarPago(this, s, d, f, a, m);
  }
  reestructurar(f: Date, a = 'sistema', m = 'Reestructuración autorizada'): void { this.estadoActual.reestructurar(this, f, a, m); }
  marcarIncobrable(f: Date, a = 'sistema', m = 'Crédito con más de 120 días de atraso'): void {
    this.estadoActual.marcarIncobrable(this, this.diasAtrasoActual, f, a, m);
  }

  cambiarEstado(nuevo: EstadoCreditoState, f: Date, a: string, m: string): void {
    this.registros.push(Object.freeze({ estadoAnterior: this.estadoActual.nombre, estadoNuevo: nuevo.nombre, fecha: new Date(f.getTime()), actor: a, motivo: m }));
    this.estadoActual = nuevo;
    this.fechaUltimaTransicion = new Date(f.getTime());
  }
  actualizarDatosPago(s: Dinero, d: number): void { this.saldoCapitalActual = s; this.diasAtrasoActual = d; }
  private validarDias(d: number): void {
    if (!Number.isInteger(d) || d < 0) throw new Error('Los días de atraso deben ser un entero no negativo');
  }
  private validarSaldo(s: Dinero): void {
    if (s.esMenorQue(new Dinero('0', s.divisa))) throw new Error('El saldo de capital resultante no puede ser negativo');
  }
}

abstract class EstadoCreditoBase implements EstadoCreditoState {
  abstract readonly nombre: EstadoCredito;
  aprobar(_c: ContextoEstadoCredito, _f: Date, _a: string, _m: string): void { this.invalida('aprobar'); }
  rechazar(_c: ContextoEstadoCredito, _f: Date, _a: string, _m: string): void { this.invalida('rechazar'); }
  desembolsar(_c: ContextoEstadoCredito, _f: Date, _a: string, _m: string): void { this.invalida('desembolsar'); }
  desistir(_c: ContextoEstadoCredito, _f: Date, _a: string, _m: string): void { this.invalida('desistir'); }
  registrarAtraso(_c: ContextoEstadoCredito, _d: number, _f: Date, _a: string, _m: string): void { this.invalida('registrar atraso'); }
  aplicarPago(_c: ContextoEstadoCredito, _s: Dinero, _d: number, _f: Date, _a: string, _m: string): void { this.invalida('aplicar pago'); }
  reestructurar(_c: ContextoEstadoCredito, _f: Date, _a: string, _m: string): void { this.invalida('reestructurar'); }
  marcarIncobrable(_c: ContextoEstadoCredito, _d: number, _f: Date, _a: string, _m: string): void { this.invalida('marcar incobrable'); }
  private invalida(op: string): never { throw new Error(`Transición no permitida desde ${this.nombre}: ${op}`); }
}

export class SolicitadoState extends EstadoCreditoBase {
  readonly nombre = EstadoCredito.SOLICITADO;
  aprobar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void { c.cambiarEstado(new AprobadoState(), f, a, m); }
  rechazar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void { c.cambiarEstado(new RechazadoState(), f, a, m); }
  desistir(c: ContextoEstadoCredito, f: Date, a: string, m: string): void { c.cambiarEstado(new AnuladoState(), f, a, m); }
}
export class AprobadoState extends EstadoCreditoBase {
  readonly nombre = EstadoCredito.APROBADO;
  desembolsar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void { c.cambiarEstado(new VigenteState(), f, a, m); }
  desistir(c: ContextoEstadoCredito, f: Date, a: string, m: string): void { c.cambiarEstado(new AnuladoState(), f, a, m); }
}
export class VigenteState extends EstadoCreditoBase {
  readonly nombre = EstadoCredito.VIGENTE;
  registrarAtraso(c: ContextoEstadoCredito, d: number, f: Date, a: string, m: string): void {
    c.actualizarDatosPago(c.saldoCapital, d);
    if (d > 0) { c.cambiarEstado(new EnMoraState(), f, a, m); if (d > 120) c.cambiarEstado(new IncobrableState(), f, a, 'Deterioro superior a 120 días'); }
  }
  aplicarPago(c: ContextoEstadoCredito, s: Dinero, d: number, f: Date, a: string, m: string): void {
    c.actualizarDatosPago(s, d);
    if (esCero(s)) c.cambiarEstado(new CanceladoState(), f, a, m);
    else if (d > 0) { c.cambiarEstado(new EnMoraState(), f, a, m); if (d > 120) c.cambiarEstado(new IncobrableState(), f, a, 'Deterioro superior a 120 días'); }
  }
}
export class EnMoraState extends EstadoCreditoBase {
  readonly nombre = EstadoCredito.EN_MORA;
  registrarAtraso(c: ContextoEstadoCredito, d: number, f: Date, a: string, m: string): void {
    c.actualizarDatosPago(c.saldoCapital, d);
    if (d === 0) c.cambiarEstado(new VigenteState(), f, a, m); else if (d > 120) c.cambiarEstado(new IncobrableState(), f, a, m);
  }
  aplicarPago(c: ContextoEstadoCredito, s: Dinero, d: number, f: Date, a: string, m: string): void {
    c.actualizarDatosPago(s, d);
    if (esCero(s)) c.cambiarEstado(new CanceladoState(), f, a, m); else if (d === 0) c.cambiarEstado(new VigenteState(), f, a, m); else if (d > 120) c.cambiarEstado(new IncobrableState(), f, a, m);
  }
  reestructurar(c: ContextoEstadoCredito, f: Date, a: string, m: string): void { c.cambiarEstado(new ReestructuradoState(), f, a, m); }
  marcarIncobrable(c: ContextoEstadoCredito, d: number, f: Date, a: string, m: string): void {
    if (d <= 120) throw new Error('Un crédito solo puede ser incobrable después de 120 días de atraso');
    c.cambiarEstado(new IncobrableState(), f, a, m);
  }
}
export class ReestructuradoState extends EstadoCreditoBase {
  readonly nombre = EstadoCredito.REESTRUCTURADO;
  registrarAtraso(c: ContextoEstadoCredito, d: number, f: Date, a: string, m: string): void { this.resolver(c, c.saldoCapital, d, f, a, m); }
  aplicarPago(c: ContextoEstadoCredito, s: Dinero, d: number, f: Date, a: string, m: string): void { this.resolver(c, s, d, f, a, m); }
  private resolver(c: ContextoEstadoCredito, s: Dinero, d: number, f: Date, a: string, m: string): void {
    c.actualizarDatosPago(s, d);
    if (esCero(s)) c.cambiarEstado(new CanceladoState(), f, a, m);
    else if (d === 0) c.cambiarEstado(new VigenteState(), f, a, m);
    else { c.cambiarEstado(new EnMoraState(), f, a, m); if (d > 120) c.cambiarEstado(new IncobrableState(), f, a, 'Deterioro superior a 120 días'); }
  }
}
export class RechazadoState extends EstadoCreditoBase { readonly nombre = EstadoCredito.RECHAZADO; }
export class AnuladoState extends EstadoCreditoBase { readonly nombre = EstadoCredito.ANULADO; }
export class CanceladoState extends EstadoCreditoBase { readonly nombre = EstadoCredito.CANCELADO; }
export class IncobrableState extends EstadoCreditoBase { readonly nombre = EstadoCredito.INCOBRABLE; }

function esCero(saldo: Dinero): boolean { return saldo.esIgual(new Dinero('0', saldo.divisa)); }

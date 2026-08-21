import { Dinero } from './dinero';

export interface DeudaCuota {
  gastos: Dinero;
  interesMoratorio: Dinero;
  interesCorriente: Dinero;
  capital: Dinero;
}

export interface ResultadoPago {
  pagadoGastos: Dinero;
  pagadoInteresMoratorio: Dinero;
  pagadoInteresCorriente: Dinero;
  pagadoCapital: Dinero;
  excedente: Dinero;
}

export abstract class ManejadorPago {
  protected siguienteManejador: ManejadorPago | null = null;

  setSiguiente(manejador: ManejadorPago): ManejadorPago {
    this.siguienteManejador = manejador;
    return manejador;
  }

  abstract manejar(pagoDisponible: Dinero, deuda: DeudaCuota, resultado: ResultadoPago): Dinero;
}

export class CobroGastos extends ManejadorPago {
  manejar(pagoDisponible: Dinero, deuda: DeudaCuota, resultado: ResultadoPago): Dinero {
    if (pagoDisponible.esIgual(new Dinero(0, pagoDisponible.divisa))) {
      return this.siguienteManejador ? this.siguienteManejador.manejar(pagoDisponible, deuda, resultado) : pagoDisponible;
    }

    const aCobrar = pagoDisponible.esMayorQue(deuda.gastos) ? deuda.gastos : pagoDisponible;
    resultado.pagadoGastos = aCobrar;
    const remanente = pagoDisponible.restar(aCobrar);

    if (this.siguienteManejador) {
      return this.siguienteManejador.manejar(remanente, deuda, resultado);
    }
    return remanente;
  }
}

export class CobroInteresMoratorio extends ManejadorPago {
  manejar(pagoDisponible: Dinero, deuda: DeudaCuota, resultado: ResultadoPago): Dinero {
    if (pagoDisponible.esIgual(new Dinero(0, pagoDisponible.divisa))) {
      return this.siguienteManejador ? this.siguienteManejador.manejar(pagoDisponible, deuda, resultado) : pagoDisponible;
    }

    const aCobrar = pagoDisponible.esMayorQue(deuda.interesMoratorio) ? deuda.interesMoratorio : pagoDisponible;
    resultado.pagadoInteresMoratorio = aCobrar;
    const remanente = pagoDisponible.restar(aCobrar);

    if (this.siguienteManejador) {
      return this.siguienteManejador.manejar(remanente, deuda, resultado);
    }
    return remanente;
  }
}

export class CobroInteresCorriente extends ManejadorPago {
  manejar(pagoDisponible: Dinero, deuda: DeudaCuota, resultado: ResultadoPago): Dinero {
    if (pagoDisponible.esIgual(new Dinero(0, pagoDisponible.divisa))) {
      return this.siguienteManejador ? this.siguienteManejador.manejar(pagoDisponible, deuda, resultado) : pagoDisponible;
    }

    const aCobrar = pagoDisponible.esMayorQue(deuda.interesCorriente) ? deuda.interesCorriente : pagoDisponible;
    resultado.pagadoInteresCorriente = aCobrar;
    const remanente = pagoDisponible.restar(aCobrar);

    if (this.siguienteManejador) {
      return this.siguienteManejador.manejar(remanente, deuda, resultado);
    }
    return remanente;
  }
}

export class CobroCapital extends ManejadorPago {
  manejar(pagoDisponible: Dinero, deuda: DeudaCuota, resultado: ResultadoPago): Dinero {
    if (pagoDisponible.esIgual(new Dinero(0, pagoDisponible.divisa))) {
      resultado.excedente = pagoDisponible;
      return this.siguienteManejador ? this.siguienteManejador.manejar(pagoDisponible, deuda, resultado) : pagoDisponible;
    }

    const aCobrar = pagoDisponible.esMayorQue(deuda.capital) ? deuda.capital : pagoDisponible;
    resultado.pagadoCapital = aCobrar;
    const remanente = pagoDisponible.restar(aCobrar);
    resultado.excedente = remanente;

    if (this.siguienteManejador) {
      return this.siguienteManejador.manejar(remanente, deuda, resultado);
    }
    return remanente;
  }
}

export class ProcesadorDePagos {
  private cadena: ManejadorPago;

  constructor() {
    this.cadena = new CobroGastos();
    this.cadena
      .setSiguiente(new CobroInteresMoratorio())
      .setSiguiente(new CobroInteresCorriente())
      .setSiguiente(new CobroCapital());
  }

  procesar(pago: Dinero, deuda: DeudaCuota): ResultadoPago {
    const zero = new Dinero(0, pago.divisa);
    const resultado: ResultadoPago = {
      pagadoGastos: zero,
      pagadoInteresMoratorio: zero,
      pagadoInteresCorriente: zero,
      pagadoCapital: zero,
      excedente: zero
    };

    this.cadena.manejar(pago, deuda, resultado);
    return resultado;
  }
}

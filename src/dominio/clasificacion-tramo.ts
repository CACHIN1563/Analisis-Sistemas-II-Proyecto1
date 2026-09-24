import { TramoMora } from './calculadora-mora';

export class ClasificacionTramo {
  static clasificar(diasAtraso: number): TramoMora {
    if (diasAtraso <= 0) return TramoMora.VIGENTE;
    if (diasAtraso <= 30) return TramoMora.MORA_1;
    if (diasAtraso <= 60) return TramoMora.MORA_2;
    if (diasAtraso <= 90) return TramoMora.MORA_3;
    if (diasAtraso <= 120) return TramoMora.VENCIDO;
    return TramoMora.INCOBRABLE;
  }
}

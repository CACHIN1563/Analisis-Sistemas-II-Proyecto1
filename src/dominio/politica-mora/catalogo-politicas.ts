import { IPoliticaMora } from './politica-mora';
import { PoliticaPlana } from './politica-plana';
import { PoliticaEscalonada } from './politica-escalonada';
import { PoliticaRetroactiva } from './politica-retroactiva';

export class CatalogoPoliticas {
  static resolver(fechaOtorgamiento: Date): IPoliticaMora {
    // Para simplificar: Créditos otorgados antes de 2026-01-01 usan política plana (P1)
    // Créditos a partir de 2026-01-01 usan política escalonada (P2)
    const limite = new Date('2026-01-01T00:00:00Z');
    if (fechaOtorgamiento.getTime() < limite.getTime()) {
      return new PoliticaPlana();
    }
    return new PoliticaEscalonada();
  }

  static getPorId(id: string): IPoliticaMora {
    switch(id) {
      case 'PLANA': return new PoliticaPlana();
      case 'ESCALONADA': return new PoliticaEscalonada();
      case 'RETROACTIVA': return new PoliticaRetroactiva();
      default: throw new Error('Política no encontrada');
    }
  }
}

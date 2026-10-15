import { PrismaClient } from "@prisma/client";
import {
  ILeiturasRepository,
  CriarLeituraDTO,
  LeituraSensorEntity,
} from "./ILeiturasRepository";

export class PrismaLeiturasRepository implements ILeiturasRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async salvar(dados: CriarLeituraDTO): Promise<LeituraSensorEntity> {
    const registro = await this.prisma.leituraSensor.create({
      data: {
        fazenda: dados.fazenda,
        setor: dados.setor,
        temperaturaAr: dados.temperaturaAr,
        umidadeAr: dados.umidadeAr,
        umidadeSolo: dados.umidadeSolo,
      },
    });

    return registro;
  }

  async listarRecentes(limite: number = 20): Promise<LeituraSensorEntity[]> {
    const registros = await this.prisma.leituraSensor.findMany({
      orderBy: {
        recebidoEm: "desc",
      },
      take: limite,
    });

    return registros;
  }
}

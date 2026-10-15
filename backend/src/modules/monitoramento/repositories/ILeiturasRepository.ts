export interface CriarLeituraDTO {
  fazenda: string;
  setor: string;
  temperaturaAr: number;
  umidadeAr: number;
  umidadeSolo: number;
}

export interface LeituraSensorEntity {
  id: string;
  fazenda: string;
  setor: string;
  temperaturaAr: number;
  umidadeAr: number;
  umidadeSolo: number;
  recebidoEm: Date;
}

export interface ILeiturasRepository {
  salvar(dados: CriarLeituraDTO): Promise<LeituraSensorEntity>;
  listarRecentes(limite?: number): Promise<LeituraSensorEntity[]>;
}

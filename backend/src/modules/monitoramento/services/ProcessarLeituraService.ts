import {
  ILeiturasRepository,
  LeituraSensorEntity,
} from "../repositories/ILeiturasRepository";
import { WhatsappService } from "../../../shared/services/WhatsappService";

export interface PayloadESP32Wokwi {
  fazenda: string;
  setor: string;
  temperatura_ar: number;
  umidade_ar: number;
  umidade_solo: number;
}

export class ProcessarLeituraService {
  private static controleAlertasCache = new Map<string, number>();
  private readonly telefoneProdutor: string;
  private static readonly INTERVALO_THROTTLING_MS = 60 * 60 * 1000; // 1 hora (60 minutos)

  constructor(
    private readonly leiturasRepository: ILeiturasRepository,
    private readonly whatsappService: WhatsappService
  ) {
    this.telefoneProdutor =
      process.env.PRODUTOR_TELEFONE || "5519999998888";
  }

  async executar(
    payloadBruto: string | PayloadESP32Wokwi
  ): Promise<LeituraSensorEntity> {
    const dadosHardware: PayloadESP32Wokwi =
      typeof payloadBruto === "string"
        ? JSON.parse(payloadBruto)
        : payloadBruto;

    // Conversão de snake_case (hardware) para camelCase (domínio/repositório)
    const dadosNormalizados = {
      fazenda: dadosHardware.fazenda,
      setor: dadosHardware.setor,
      temperaturaAr: Number(dadosHardware.temperatura_ar),
      umidadeAr: Number(dadosHardware.umidade_ar),
      umidadeSolo: Math.round(Number(dadosHardware.umidade_solo)),
    };

    console.log(
      `[ProcessarLeituraService] 📥 Salvando telemetria: Fazenda=${dadosNormalizados.fazenda}, Setor=${dadosNormalizados.setor}, Solo=${dadosNormalizados.umidadeSolo}%`
    );

    // Salva obrigatoriamente a leitura no banco de dados via repositório (Prisma)
    const leituraSalva = await this.leiturasRepository.salvar(dadosNormalizados);

    // Verificação de umidade crítica do solo (< 30%)
    if (dadosNormalizados.umidadeSolo < 30) {
      const chaveCache = `${dadosNormalizados.fazenda}:${dadosNormalizados.setor}`;
      const agora = Date.now();
      const ultimoAlerta = ProcessarLeituraService.controleAlertasCache.get(chaveCache);

      // Mecanismo de Throttling em memória: bloqueia novo alerta se enviado em menos de 1 hora
      if (
        ultimoAlerta &&
        agora - ultimoAlerta < ProcessarLeituraService.INTERVALO_THROTTLING_MS
      ) {
        const minutosRestantes = Math.ceil(
          (ProcessarLeituraService.INTERVALO_THROTTLING_MS - (agora - ultimoAlerta)) /
            (60 * 1000)
        );
        console.warn(
          `[ProcessarLeituraService] ⏳ [Throttling] Alerta de WhatsApp bloqueado para '${chaveCache}'. Alerta já enviado recentemente. Aguardando ${minutosRestantes} minuto(s) para nova notificação.`
        );
        return leituraSalva;
      }

      // Atualiza o timestamp no Map de controle
      ProcessarLeituraService.controleAlertasCache.set(chaveCache, agora);

      console.warn(
        `[ProcessarLeituraService] ⚠️ Umidade do solo crítica (${dadosNormalizados.umidadeSolo}% < 30%). Acionando serviço de WhatsApp!`
      );

      // Dispara notificação via WhatsApp
      await this.whatsappService.dispararAlertaEmergencial({
        telefone: this.telefoneProdutor,
        fazenda: dadosNormalizados.fazenda,
        setor: dadosNormalizados.setor,
        umidadeSolo: dadosNormalizados.umidadeSolo,
        temperaturaAr: dadosNormalizados.temperaturaAr,
        umidadeAr: dadosNormalizados.umidadeAr,
      });
    }

    return leituraSalva;
  }
}

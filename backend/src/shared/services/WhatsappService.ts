export interface EnviarAlertaWhatsappDTO {
  telefone: string;
  fazenda: string;
  setor: string;
  umidadeSolo: number;
  temperaturaAr: number;
  umidadeAr: number;
}

export class WhatsappService {
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor() {
    this.apiUrl =
      process.env.WHATSAPP_API_URL ||
      "https://api.whatsapp-gateway.local/v1/messages";
    this.apiToken = process.env.WHATSAPP_API_TOKEN || "token_simulado_agrotech";
  }

  /**
   * Simula o disparo de mensagens emergenciais para produtores via API HTTP.
   */
  async dispararAlertaEmergencial(dados: EnviarAlertaWhatsappDTO): Promise<void> {
    const mensagem =
      `🚨 *ALERTA CRÍTICO DE IRRIGAÇÃO - AGROTECH* 🚨\n\n` +
      `Olá, Produtor! Foi detectado nível crítico de umidade no solo.\n\n` +
      `📍 *Fazenda:* ${dados.fazenda}\n` +
      `🌱 *Setor:* ${dados.setor}\n` +
      `💧 *Umidade do Solo:* ${dados.umidadeSolo}% (Abaixo do limite de 30%)\n` +
      `🌡️ *Temperatura do Ar:* ${dados.temperaturaAr.toFixed(1)}°C\n` +
      `💨 *Umidade do Ar:* ${dados.umidadeAr.toFixed(1)}%\n` +
      `⏰ *Registro:* ${new Date().toLocaleString("pt-BR")}\n\n` +
      `⚠️ *Ação Necessária:* Inicie imediatamente a irrigação ou cheque as bombas d'água no setor.`;

    console.log(
      `[WhatsappService] [HTTP POST ${this.apiUrl}] Disparando alerta para o número ${dados.telefone}...`
    );

    // Simulação da chamada HTTP (ex: Axios / fetch / Evolution API / Z-API)
    try {
      // Exemplo real com fetch nativo do Node.js:
      // await fetch(this.apiUrl, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${this.apiToken}`,
      //   },
      //   body: JSON.stringify({
      //     phone: dados.telefone,
      //     message: mensagem,
      //   }),
      // });

      console.log(`[WhatsappService] ✅ Alerta enviado com sucesso via WhatsApp!\nConteúdo:\n${mensagem}`);
    } catch (error) {
      console.error(
        `[WhatsappService] ❌ Falha ao enviar alerta via API HTTP para ${dados.telefone}:`,
        error
      );
    }
  }
}

import mqtt, { MqttClient } from "mqtt";
import { MQTT_CONFIG } from "../../../config/mqtt";
import { ProcessarLeituraService } from "../services/ProcessarLeituraService";

export class LeituraSensorWorker {
  private client: MqttClient | null = null;

  constructor(
    private readonly processarLeituraService: ProcessarLeituraService
  ) {}

  /**
   * Inicia o worker MQTT de forma assíncrona e resiliente.
   */
  async iniciar(): Promise<void> {
    console.log(
      `[LeituraSensorWorker] 🔌 Conectando ao broker MQTT em ${MQTT_CONFIG.brokerUrl}...`
    );

    this.client = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);

    this.client.on("connect", () => {
      console.log(
        `[LeituraSensorWorker] ✅ Conectado com sucesso ao broker MQTT (${MQTT_CONFIG.brokerUrl})!`
      );

      this.client?.subscribe(MQTT_CONFIG.topic, (err) => {
        if (err) {
          console.error(
            `[LeituraSensorWorker] ❌ Erro ao subscrever no tópico '${MQTT_CONFIG.topic}':`,
            err
          );
        } else {
          console.log(
            `[LeituraSensorWorker] 📡 Subscrição ativa no tópico: '${MQTT_CONFIG.topic}'`
          );
        }
      });
    });

    this.client.on("message", async (topic, message) => {
      if (topic === MQTT_CONFIG.topic) {
        const payloadString = message.toString();
        console.log(
          `[LeituraSensorWorker] 📦 Payload recebido no tópico '${topic}':`,
          payloadString
        );

        try {
          await this.processarLeituraService.executar(payloadString);
        } catch (error) {
          console.error(
            `[LeituraSensorWorker] ❌ Erro ao processar mensagem do sensor:`,
            error
          );
        }
      }
    });

    this.client.on("error", (error) => {
      console.error(`[LeituraSensorWorker] ⚠️ Erro na conexão MQTT:`, error.message);
    });

    this.client.on("reconnect", () => {
      console.warn(`[LeituraSensorWorker] 🔄 Tentando reconectar ao broker MQTT...`);
    });

    this.client.on("offline", () => {
      console.warn(`[LeituraSensorWorker] 📴 Cliente MQTT ficou offline.`);
    });
  }

  /**
   * Finaliza o worker de forma graciosa.
   */
  async parar(): Promise<void> {
    if (this.client) {
      this.client.end(true, () => {
        console.log(`[LeituraSensorWorker] 🛑 Conexão MQTT encerrada.`);
      });
    }
  }
}

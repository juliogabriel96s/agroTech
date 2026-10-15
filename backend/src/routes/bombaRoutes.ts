import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import mqtt, { MqttClient } from "mqtt";

const MQTT_BROKER = "mqtt://broker.hivemq.com:1883";
const MQTT_TOPIC_BOMBA = "limoeiro/agro/irrigacao/setor1/bomba";

interface BombaBody {
  acao?: string;
}

// 3. Instância do cliente MQTT conectada ao broker HiveMQ
const mqttClient: MqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log(`[MQTT Bomba] Conectado ao broker: ${MQTT_BROKER}`);
});

mqttClient.on("error", (error) => {
  console.error("[MQTT Bomba] Erro no cliente MQTT:", error);
});

/**
 * Plugin de rotas do Fastify para controle de atuação da bomba IoT
 */
export const bombaRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Endpoint HTTP POST: '/api/bomba'
  app.post(
    "/api/bomba",
    async (request: FastifyRequest<{ Body: BombaBody }>, reply: FastifyReply) => {
      const { acao } = request.body || {};

      // 2. Validação: aceita apenas "LIGAR" ou "DESLIGAR", caso contrário retorna 400
      if (acao !== "LIGAR" && acao !== "DESLIGAR") {
        return reply.status(400).send({
          erro: "Ação inválida. O campo 'acao' deve ser 'LIGAR' ou 'DESLIGAR'.",
        });
      }

      try {
        // 4. Publicação do texto bruto ("LIGAR" ou "DESLIGAR") com qos: 1
        await new Promise<void>((resolve, reject) => {
          mqttClient.publish(MQTT_TOPIC_BOMBA, acao, { qos: 1 }, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        // 5. Resposta HTTP 200 de sucesso
        return reply.status(200).send({
          mensagem: "Comando enviado com sucesso para a bomba!",
        });
      } catch (error) {
        request.log?.error?.(error);
        return reply.status(500).send({
          erro: "Falha ao publicar comando no broker MQTT.",
        });
      }
    }
  );
};

export default bombaRoutes;

import { IClientOptions } from "mqtt";

export const MQTT_CONFIG = {
  brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com:1883",
  topic: process.env.MQTT_TOPIC || "limoeiro/agro/irrigacao/setor1",
  options: {
    clientId: `agro_telemetria_${Math.random().toString(16).substring(2, 10)}`,
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 3000,
  } as IClientOptions,
};

import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { prisma } from "./config/database";
import { PrismaLeiturasRepository } from "./modules/monitoramento/repositories/PrismaLeiturasRepository";
import { WhatsappService } from "./shared/services/WhatsappService";
import { ProcessarLeituraService } from "./modules/monitoramento/services/ProcessarLeituraService";
import { LeituraSensorWorker } from "./modules/monitoramento/workers/LeituraSensorWorker";

async function bootstrap() {
  console.log("==================================================");
  console.log("🌱 AGROTECH - SISTEMA DE TELEMETRIA E IRRIGAÇÃO 🌱");
  console.log("==================================================");

  // 1. Injeção de Dependências
  const leiturasRepository = new PrismaLeiturasRepository(prisma);
  const whatsappService = new WhatsappService();
  const processarLeituraService = new ProcessarLeituraService(
    leiturasRepository,
    whatsappService
  );
  const leituraSensorWorker = new LeituraSensorWorker(processarLeituraService);

  // 2. Inicialização do Worker MQTT
  try {
    await leituraSensorWorker.iniciar();
  } catch (error) {
    console.error("❌ Falha crítica ao inicializar Worker MQTT:", error);
  }

  // 3. Inicialização do Servidor HTTP Express para o Dashboard
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Rota de Healthcheck
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "online",
      sistema: "AgroTech Telemetria e Irrigação",
      timestamp: new Date().toISOString(),
    });
  });

  // Rota de Dashboard: Listagem das últimas leituras dos sensores
  app.get("/api/leituras", async (req: Request, res: Response) => {
    try {
      const limite = Number(req.query.limite) || 20;
      const leituras = await leiturasRepository.listarRecentes(limite);
      res.status(200).json({
        total: leituras.length,
        dados: leituras,
      });
    } catch (error) {
      console.error("Erro ao consultar leituras no dashboard:", error);
      res.status(500).json({
        erro: "Falha interna ao recuperar histórico de leituras de telemetria.",
      });
    }
  });

  // Rota para simulação direta de leitura (útil para testes de bancada/HTTP)
  app.post("/api/leituras/simular", async (req: Request, res: Response) => {
    try {
      const resultado = await processarLeituraService.executar(req.body);
      res.status(201).json({
        mensagem: "Leitura simulada e processada com sucesso!",
        registro: resultado,
      });
    } catch (error) {
      res.status(400).json({
        erro: "Falha ao processar payload da leitura.",
        detalhes: error instanceof Error ? error.message : error,
      });
    }
  });

  // Cliente MQTT para envio de comandos de atuação
  const mqttClientBomba = require("mqtt").connect("mqtt://broker.hivemq.com:1883");

  // Rota de Atuação IoT: Controle da Bomba
  app.post("/api/bomba", async (req: Request, res: Response) => {
    const { acao } = req.body || {};

    if (acao !== "LIGAR" && acao !== "DESLIGAR") {
      return res.status(400).json({
        erro: "Ação inválida. O campo 'acao' deve ser 'LIGAR' ou 'DESLIGAR'.",
      });
    }

    try {
      await new Promise<void>((resolve, reject) => {
        mqttClientBomba.publish(
          "limoeiro/agro/irrigacao/setor1/bomba",
          acao,
          { qos: 1 },
          (err: Error | undefined) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      return res.status(200).json({
        mensagem: "Comando enviado com sucesso para a bomba!",
      });
    } catch (error) {
      console.error("Erro ao enviar comando MQTT para a bomba:", error);
      return res.status(500).json({
        erro: "Falha interna ao enviar comando para a bomba.",
      });
    }
  });


  const PORT = Number(process.env.PORT) || 3333;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP do Dashboard rodando em: http://localhost:${PORT}`);
    console.log(`📊 Endpoint de leituras: http://localhost:${PORT}/api/leituras`);
    console.log(`💓 Endpoint de health: http://localhost:${PORT}/health`);
  });

  // Tratamento de Encerramento Gracioso (Graceful Shutdown)
  const shutdown = async () => {
    console.log("\n⏳ Encerrando conexões com serviços externos...");
    await leituraSensorWorker.parar();
    await prisma.$disconnect();
    console.log("👋 Aplicação finalizada com segurança.");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("❌ Falha fatal na inicialização da aplicação:", err);
  process.exit(1);
});

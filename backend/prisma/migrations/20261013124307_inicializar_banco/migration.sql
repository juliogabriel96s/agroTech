-- CreateTable
CREATE TABLE "leituras_sensores" (
    "id" TEXT NOT NULL,
    "fazenda" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "temperatura_ar" DOUBLE PRECISION NOT NULL,
    "umidade_ar" DOUBLE PRECISION NOT NULL,
    "umidade_solo" INTEGER NOT NULL,
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leituras_sensores_pkey" PRIMARY KEY ("id")
);

import prisma from "../prisma";
import { CisaKevConnector } from "./connectors/cisa-kev";
import { EpssConnector } from "./connectors/epss";
import { NvdConnector } from "./connectors/nvd";
import { PrismaDeadLetterQueue } from "./dlq";
import { IngestionService } from "./service";
import { PrismaIngestionStore } from "./store";

export function createIngestionService(): IngestionService {
  return new IngestionService({
    connectors: [new NvdConnector(), new CisaKevConnector(), new EpssConnector()],
    store: new PrismaIngestionStore(prisma),
    dlq: new PrismaDeadLetterQueue(prisma),
    retry: {
      maxAttempts: 3,
      baseDelayMs: 250,
      maxDelayMs: 2_000,
    },
  });
}

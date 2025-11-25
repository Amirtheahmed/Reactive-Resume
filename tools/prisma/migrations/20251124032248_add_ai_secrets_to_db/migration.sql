-- AlterTable
ALTER TABLE "Secrets" ADD COLUMN     "aiApiKey" TEXT,
ADD COLUMN     "aiAzureApiVersion" TEXT,
ADD COLUMN     "aiBaseUrl" TEXT,
ADD COLUMN     "aiMaxTokens" INTEGER,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiProvider" TEXT DEFAULT 'openai';

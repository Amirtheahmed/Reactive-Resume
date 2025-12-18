-- CreateTable
CREATE TABLE "MobileLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'firebase',
    "tokenHash" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "MobileLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileWebhook" (
    "id" TEXT NOT NULL,
    "mobileLinkId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileLink_externalId_idx" ON "MobileLink"("externalId");

-- CreateIndex
CREATE INDEX "MobileLink_userId_idx" ON "MobileLink"("userId");

-- CreateIndex
CREATE INDEX "MobileLink_tokenHash_idx" ON "MobileLink"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "MobileLink_externalId_deviceId_provider_key" ON "MobileLink"("externalId", "deviceId", "provider");

-- CreateIndex
CREATE INDEX "MobileWebhook_mobileLinkId_idx" ON "MobileWebhook"("mobileLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "MobileWebhook_mobileLinkId_key" ON "MobileWebhook"("mobileLinkId");

-- AddForeignKey
ALTER TABLE "MobileLink" ADD CONSTRAINT "MobileLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileWebhook" ADD CONSTRAINT "MobileWebhook_mobileLinkId_fkey" FOREIGN KEY ("mobileLinkId") REFERENCES "MobileLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

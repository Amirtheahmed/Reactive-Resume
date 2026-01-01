/**
 * Generate a mobile API JWT token for testing.
 *
 * Usage:
 *   cd apps/server && pnpm exec ts-node scripts/generate-mobile-token.ts <userId>
 */

import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: pnpm exec ts-node scripts/generate-mobile-token.ts <userId>");
  console.error("");
  console.error("Get your userId:");
  console.error('  psql $DATABASE_URL -c "SELECT id, email FROM \\"User\\" LIMIT 5;"');
  process.exit(1);
}

const secret = process.env.ACCESS_TOKEN_SECRET || "access_token_secret";
const mobileLinkId = `ml${crypto.randomUUID().replace(/-/g, "").slice(0, 23)}`;

function base64url(input: unknown): string {
  const str = typeof input === "string" ? input : JSON.stringify(input);
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function signJwt(payload: object, secretKey: string, expiresInSeconds = 30 * 24 * 60 * 60): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64url(header);
  const payloadB64 = base64url(fullPayload);
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${headerB64}.${payloadB64}.${signature}`;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(`User not found: ${userId}`);
      const users = await prisma.user.findMany({ take: 5, select: { id: true, email: true } });
      console.error("\nAvailable users:");
      users.forEach((u) => console.error(`  ${u.id} - ${u.email}`));
      process.exit(1);
    }

    const payload = {
      sub: mobileLinkId,
      userId: userId,
      type: "mobile_link",
    };

    const token = signJwt(payload, secret);
    const tokenHash = await bcrypt.hash(token, 10);

    await prisma.mobileLink.upsert({
      where: { id: mobileLinkId },
      create: {
        id: mobileLinkId,
        userId: userId,
        externalId: `dev-${Date.now()}`,
        deviceId: "dev-cli",
        deviceName: "Dev CLI Tool",
        tokenHash: tokenHash,
        provider: "manual",
      },
      update: {
        tokenHash: tokenHash,
      },
    });

    console.log("\n=== Mobile API Token Generated ===\n");
    console.log("User:", user.email);
    console.log("MobileLink ID:", mobileLinkId);
    console.log("\nToken (valid for 30 days):");
    console.log(token);
    console.log("\n--- Test Commands ---\n");
    console.log(`curl -s http://localhost:3000/api/mobile/me \\`);
    console.log(`  -H "Authorization: Bearer ${token}" | jq`);
    console.log("");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);

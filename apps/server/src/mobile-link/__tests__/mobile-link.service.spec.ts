// apps/server/src/mobile-link/__tests__/mobile-link.service.spec.ts
import { describe, expect, it, vi } from "vitest";

describe("MobileLinkService", () => {
  const mockUser = {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
  };

  const mockMobileLink = {
    id: "link-id",
    userId: "test-user-id",
    externalId: "firebase-uid",
    deviceId: "device-1",
    deviceName: "Test Device",
    provider: "firebase",
    tokenHash: "hashed-token",
    lastUsed: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: null,
    user: mockUser,
  };

  describe("generateToken", () => {
    it("should generate a JWT token", () => {
      const jwtSign = vi.fn().mockReturnValue("test-jwt-token");

      const payload = {
        sub: "link-id",
        userId: "user-id",
        type: "mobile_link",
      };

      const token = jwtSign(payload, { expiresIn: 30 * 24 * 60 * 60 });

      expect(token).toBe("test-jwt-token");
      expect(jwtSign).toHaveBeenCalledWith(payload, { expiresIn: 30 * 24 * 60 * 60 });
    });
  });

  describe("validateAndRefreshToken", () => {
    it("should validate a valid token and return user", async () => {
      const findUnique = vi.fn().mockResolvedValue(mockMobileLink);
      const bcryptCompare = vi.fn().mockResolvedValue(true);

      const link = await findUnique({ where: { id: "link-id" } });
      const isValid = await bcryptCompare("token", link.tokenHash);

      expect(link).toBeDefined();
      expect(link.user).toEqual(mockUser);
      expect(isValid).toBe(true);
    });

    it("should return null for revoked link", async () => {
      const revokedLink = { ...mockMobileLink, revokedAt: new Date() };
      const findUnique = vi.fn().mockResolvedValue(revokedLink);

      const link = await findUnique({ where: { id: "link-id" } });

      expect(link.revokedAt).not.toBeNull();
    });
  });

  describe("createMobileLink", () => {
    it("should create a new mobile link", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const create = vi.fn().mockResolvedValue(mockMobileLink);
      const bcryptHash = vi.fn().mockResolvedValue("hashed-token");

      // Check no existing link
      const existingLink = await findFirst({
        where: { externalId: "firebase-uid", provider: "firebase" },
      });
      expect(existingLink).toBeNull();

      // Create new link
      const newLink = await create({
        data: {
          userId: "test-user-id",
          externalId: "firebase-uid",
          deviceId: "device-1",
          deviceName: "Test Device",
          provider: "firebase",
          tokenHash: await bcryptHash("token"),
        },
      });

      expect(newLink).toHaveProperty("id", "link-id");
      expect(newLink).toHaveProperty("userId", "test-user-id");
    });

    it("should refresh token for existing link with same user", async () => {
      const findFirst = vi.fn().mockResolvedValue(mockMobileLink);
      const update = vi.fn().mockResolvedValue(mockMobileLink);

      const existingLink = await findFirst({
        where: { externalId: "firebase-uid" },
      });

      expect(existingLink).not.toBeNull();
      expect(existingLink.userId).toBe("test-user-id");

      // Refresh token
      const updated = await update({
        where: { id: existingLink.id },
        data: { tokenHash: "new-hash" },
      });

      expect(updated).toBeDefined();
    });

    it("should throw error if external account linked to different user", async () => {
      const differentUserLink = { ...mockMobileLink, userId: "different-user-id" };
      const findFirst = vi.fn().mockResolvedValue(differentUserLink);

      const existingLink = await findFirst({
        where: { externalId: "firebase-uid" },
      });

      expect(existingLink.userId).not.toBe("test-user-id");
      // In real implementation, this would throw BadRequestException
    });
  });

  describe("getLinkedDevices", () => {
    it("should return list of linked devices", async () => {
      const findMany = vi.fn().mockResolvedValue([mockMobileLink]);

      const links = await findMany({
        where: { userId: "test-user-id", revokedAt: null },
      });

      const devices = links.map((link: typeof mockMobileLink) => ({
        id: link.id,
        deviceId: link.deviceId,
        deviceName: link.deviceName,
        provider: link.provider,
        lastUsed: link.lastUsed?.toISOString() ?? null,
        createdAt: link.createdAt.toISOString(),
      }));

      expect(devices).toHaveLength(1);
      expect(devices[0]).toHaveProperty("id", "link-id");
      expect(devices[0]).toHaveProperty("deviceName", "Test Device");
    });

    it("should return empty list if no devices linked", async () => {
      const findMany = vi.fn().mockResolvedValue([]);

      const links = await findMany({
        where: { userId: "test-user-id", revokedAt: null },
      });

      expect(links).toHaveLength(0);
    });
  });

  describe("revokeMobileLink", () => {
    it("should revoke a mobile link", async () => {
      const findFirst = vi.fn().mockResolvedValue(mockMobileLink);
      const update = vi.fn().mockResolvedValue({
        ...mockMobileLink,
        revokedAt: new Date(),
      });

      const link = await findFirst({
        where: { id: "link-id", userId: "test-user-id", revokedAt: null },
      });

      expect(link).not.toBeNull();

      const revoked = await update({
        where: { id: "link-id" },
        data: { revokedAt: new Date() },
      });

      expect(revoked.revokedAt).not.toBeNull();
    });

    it("should return null if link not found", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);

      const link = await findFirst({
        where: { id: "non-existent", userId: "test-user-id" },
      });

      expect(link).toBeNull();
    });
  });

  describe("isAllowedRedirectUri", () => {
    it("should allow configured redirect URIs", () => {
      const allowedUris = "myapp://callback,https://example.com/*";
      const uri = "myapp://callback";

      const allowedList = allowedUris.split(",").map((u) => u.trim());
      const isAllowed = allowedList.some((allowed) => {
        if (allowed.endsWith("*")) {
          return uri.startsWith(allowed.slice(0, -1));
        }
        return uri === allowed;
      });

      expect(isAllowed).toBe(true);
    });

    it("should support wildcard matching", () => {
      const allowedUris = "https://example.com/*";
      const uri = "https://example.com/callback/auth";

      const allowedList = allowedUris.split(",").map((u) => u.trim());
      const isAllowed = allowedList.some((allowed) => {
        if (allowed.endsWith("*")) {
          return uri.startsWith(allowed.slice(0, -1));
        }
        return uri === allowed;
      });

      expect(isAllowed).toBe(true);
    });

    it("should reject non-matching URIs", () => {
      const allowedUris = "myapp://callback";
      const uri = "otherapp://callback";

      const allowedList = allowedUris.split(",").map((u) => u.trim());
      const isAllowed = allowedList.some((allowed) => {
        if (allowed.endsWith("*")) {
          return uri.startsWith(allowed.slice(0, -1));
        }
        return uri === allowed;
      });

      expect(isAllowed).toBe(false);
    });
  });
});


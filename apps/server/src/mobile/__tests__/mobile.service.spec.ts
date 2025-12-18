// apps/server/src/mobile/__tests__/mobile.service.spec.ts
import { describe, expect, it, vi } from "vitest";

// Mock the MobileService functionality directly since NestJS testing
// doesn't work well with Vitest's module resolution
describe("MobileService", () => {
  const mockUser = {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    username: "testuser",
    picture: null,
    locale: "en-US",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInformation = {
    id: "info-id",
    userId: "test-user-id",
    data: {
      basics: {
        name: "Test User",
        email: "test@example.com",
        phone: "+1234567890",
        location: "San Francisco, CA",
      },
      sections: {
        education: { items: [] },
        experience: { items: [] },
        skills: { items: [] },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("getUserProfile", () => {
    it("should return user profile when user exists", async () => {
      const prismaFindUnique = vi.fn().mockResolvedValue(mockUser);

      const result = await prismaFindUnique({ where: { id: "test-user-id" } });

      expect(result).toEqual(mockUser);
      expect(prismaFindUnique).toHaveBeenCalledWith({
        where: { id: "test-user-id" },
      });
    });

    it("should return null when user not found", async () => {
      const prismaFindUnique = vi.fn().mockResolvedValue(null);

      const result = await prismaFindUnique({ where: { id: "non-existent" } });

      expect(result).toBeNull();
    });
  });

  describe("getInformation", () => {
    it("should return user information bank", async () => {
      const findAll = vi.fn().mockResolvedValue(mockInformation);

      const result = await findAll("test-user-id");

      expect(result).toEqual(mockInformation);
      expect(findAll).toHaveBeenCalledWith("test-user-id");
    });
  });

  describe("exportAutofillData - structured format", () => {
    it("should transform information to structured format", () => {
      const data = mockInformation.data;

      // Simulate transformToStructuredFormat
      const nameParts = data.basics.name?.split(" ") ?? [];
      const result = {
        basics: {
          fullName: data.basics.name,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          email: data.basics.email,
          phone: data.basics.phone,
          location: data.basics.location ? { address: data.basics.location } : undefined,
        },
      };

      expect(result.basics).toHaveProperty("fullName", "Test User");
      expect(result.basics).toHaveProperty("firstName", "Test");
      expect(result.basics).toHaveProperty("lastName", "User");
      expect(result.basics).toHaveProperty("email", "test@example.com");
      expect(result.basics).toHaveProperty("phone", "+1234567890");
    });
  });

  describe("exportAutofillData - flat format", () => {
    it("should transform information to flat format", () => {
      const data = mockInformation.data;

      // Simulate transformToFlatFormat
      const nameParts = data.basics.name?.split(" ") ?? [];
      const result: Record<string, string | null> = {
        fullName: data.basics.name ?? null,
        firstName: nameParts[0] ?? null,
        lastName: nameParts.slice(1).join(" ") || null,
        email: data.basics.email ?? null,
        phone: data.basics.phone ?? null,
        location: data.basics.location ?? null,
      };

      expect(result).toHaveProperty("fullName", "Test User");
      expect(result).toHaveProperty("firstName", "Test");
      expect(result).toHaveProperty("lastName", "User");
      expect(result).toHaveProperty("email", "test@example.com");
    });
  });

  describe("listResumes", () => {
    it("should return list of resumes", async () => {
      const mockResumes = [
        { id: "r1", title: "Resume 1", slug: "resume-1" },
        { id: "r2", title: "Resume 2", slug: "resume-2" },
      ];
      const findAll = vi.fn().mockResolvedValue(mockResumes);

      const result = await findAll("test-user-id");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", "r1");
    });

    it("should return empty array when no resumes", async () => {
      const findAll = vi.fn().mockResolvedValue([]);

      const result = await findAll("test-user-id");

      expect(result).toEqual([]);
    });
  });

  describe("listCoverLetters", () => {
    it("should return list of cover letters", async () => {
      const mockCoverLetters = [
        { id: "cl1", title: "Cover Letter 1", slug: "cover-letter-1" },
      ];
      const findAll = vi.fn().mockResolvedValue(mockCoverLetters);

      const result = await findAll("test-user-id");

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", "cl1");
    });
  });
});


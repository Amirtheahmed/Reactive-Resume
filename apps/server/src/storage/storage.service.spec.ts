import { ConfigService } from "@nestjs/config";
import { MinioService } from "nestjs-minio-client";
import { StorageService } from "./storage.service";
import { InternalServerErrorException } from "@nestjs/common";
import { vi, describe, it, expect, beforeEach } from "vitest";

describe("StorageService", () => {
  let service: StorageService;

  const mockMinioClient = {
    bucketExists: vi.fn(),
    makeBucket: vi.fn(),
    setBucketPolicy: vi.fn(),
  };

  const mockConfigService = {
    getOrThrow: vi.fn(),
  };

  const mockMinioService = {
    client: mockMinioClient,
  };

  beforeEach(() => {
    service = new StorageService(
      mockConfigService as unknown as ConfigService,
      mockMinioService as unknown as MinioService,
    );

    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should handle NotImplemented error from bucketExists gracefully", async () => {
      // Arrange
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === "STORAGE_BUCKET") return "test-bucket";
        if (key === "STORAGE_SKIP_BUCKET_CHECK") return false;
        return null;
      });

      mockMinioClient.bucketExists.mockRejectedValue({ code: "NotImplemented" });

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith("test-bucket");
    });

    it("should throw InternalServerErrorException for other errors", async () => {
      // Arrange
      mockConfigService.getOrThrow.mockImplementation((key) => {
        if (key === "STORAGE_BUCKET") return "test-bucket";
        if (key === "STORAGE_SKIP_BUCKET_CHECK") return false;
        return null;
      });

      mockMinioClient.bucketExists.mockRejectedValue(new Error("Some other error"));

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow(InternalServerErrorException);
    });
  });
});

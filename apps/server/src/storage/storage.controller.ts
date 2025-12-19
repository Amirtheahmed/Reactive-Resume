import {
  BadRequestException,
  Controller,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { TwoFactorGuard } from "@/server/auth/guards/two-factor.guard";
import { User } from "@/server/user/decorators/user.decorator";

import { StorageService } from "./storage.service";

@ApiTags("Storage")
@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Put("image")
  @UseGuards(TwoFactorGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload Image",
    description: "Uploads an image file (JPEG, PNG) to storage.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Image uploaded successfully." })
  @ApiResponse({ status: 400, description: "Invalid file type." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async uploadFile(@User("id") userId: string, @UploadedFile("file") file: Express.Multer.File) {
    if (!file.mimetype.startsWith("image")) {
      throw new BadRequestException(
        "The file you uploaded doesn't seem to be an image, please upload a file that ends in .jp(e)g or .png.",
      );
    }

    return this.storageService.uploadObject(userId, "pictures", file.buffer, file.filename);
  }

  @Put("chat")
  @UseGuards(TwoFactorGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload Chat Attachment",
    description: "Uploads a file attachment for chat.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "File uploaded successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async uploadChatFile(@User("id") userId: string, @UploadedFile("file") file: Express.Multer.File) {
    return this.storageService.uploadObject(userId, "chat", file.buffer, file.originalname);
  }
}

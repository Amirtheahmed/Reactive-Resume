import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  authResponseSchema,
  backupCodesSchema,
  ForgotPasswordDto,
  LoginDto,
  messageSchema,
  RegisterDto,
  ResetPasswordDto,
  TwoFactorBackupDto,
  TwoFactorDto,
  UpdatePasswordDto,
  userSchema,
  UserWithSecrets,
} from "@reactive-resume/dto";
import { ErrorMessage } from "@reactive-resume/utils";
import type { Response } from "express";

import { User } from "../user/decorators/user.decorator";
import { AuthService } from "./auth.service";
import { GitHubGuard } from "./guards/github.guard";
import { GoogleGuard } from "./guards/google.guard";
import { JwtGuard } from "./guards/jwt.guard";
import { LocalGuard } from "./guards/local.guard";
import { OpenIDGuard } from "./guards/openid.guard";
import { RefreshGuard } from "./guards/refresh.guard";
import { TwoFactorGuard } from "./guards/two-factor.guard";
import { getCookieOptions } from "./utils/cookie";
import { payloadSchema } from "./utils/payload";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private async exchangeToken(id: string, email: string, isTwoFactorAuth = false) {
    try {
      const payload = payloadSchema.parse({ id, isTwoFactorAuth });

      const accessToken = this.authService.generateToken("access", payload);
      const refreshToken = this.authService.generateToken("refresh", payload);

      // Set Refresh Token in Database
      await this.authService.setRefreshToken(email, refreshToken);

      return { accessToken, refreshToken };
    } catch (error) {
      throw new InternalServerErrorException(error, ErrorMessage.SomethingWentWrong);
    }
  }

  private async handleAuthenticationResponse(
    user: UserWithSecrets,
    response: Response,
    isTwoFactorAuth = false,
    redirect = false,
  ) {
    let status = "authenticated";

    const baseUrl = this.configService.get("PUBLIC_URL");
    const redirectUrl = new URL(`${baseUrl}/auth/callback`);

    const { accessToken, refreshToken } = await this.exchangeToken(
      user.id,
      user.email,
      isTwoFactorAuth,
    );

    response.cookie("Authentication", accessToken, getCookieOptions("access"));
    response.cookie("Refresh", refreshToken, getCookieOptions("refresh"));

    if (user.twoFactorEnabled && !isTwoFactorAuth) status = "2fa_required";

    const responseData = authResponseSchema.parse({ status, user });

    redirectUrl.searchParams.set("status", status);

    if (redirect) response.redirect(redirectUrl.toString());
    else response.status(200).send(responseData);
  }

  @Post("register")
  @ApiOperation({
    summary: "Register a new user",
    description: "Creates a new user account with the provided details.",
  })
  @ApiResponse({ status: 201, description: "User successfully registered." })
  @ApiResponse({ status: 400, description: "Bad request or user already exists." })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.authService.register(registerDto);

    return this.handleAuthenticationResponse(user, response);
  }

  @Post("login")
  @UseGuards(LocalGuard)
  @ApiOperation({
    summary: "Login with email/username and password",
    description: "Authenticates a user using their credentials.",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: "User successfully logged in." })
  @ApiResponse({ status: 401, description: "Invalid credentials." })
  async login(@User() user: UserWithSecrets, @Res({ passthrough: true }) response: Response) {
    return this.handleAuthenticationResponse(user, response);
  }

  @Get("providers")
  @ApiOperation({
    summary: "Get configured auth providers",
    description: "Returns a list of enabled authentication providers (e.g., email, github, google).",
  })
  @ApiResponse({ status: 200, description: "List of auth providers retrieved successfully." })
  getAuthProviders() {
    return this.authService.getAuthProviders();
  }

  // OAuth Flows
  @ApiTags("OAuth", "GitHub")
  @Get("github")
  @UseGuards(GitHubGuard)
  @ApiOperation({
    summary: "Initiate GitHub OAuth",
    description: "Redirects the user to GitHub for authentication.",
  })
  githubLogin() {
    return;
  }

  @ApiTags("OAuth", "GitHub")
  @Get("github/callback")
  @UseGuards(GitHubGuard)
  @ApiOperation({
    summary: "GitHub OAuth Callback",
    description: "Handles the callback from GitHub after successful authentication.",
  })
  async githubCallback(
    @User() user: UserWithSecrets,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.handleAuthenticationResponse(user, response, false, true);
  }

  @ApiTags("OAuth", "Google")
  @Get("google")
  @UseGuards(GoogleGuard)
  @ApiOperation({
    summary: "Initiate Google OAuth",
    description: "Redirects the user to Google for authentication.",
  })
  googleLogin() {
    return;
  }

  @ApiTags("OAuth", "Google")
  @Get("google/callback")
  @UseGuards(GoogleGuard)
  @ApiOperation({
    summary: "Google OAuth Callback",
    description: "Handles the callback from Google after successful authentication.",
  })
  async googleCallback(
    @User() user: UserWithSecrets,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.handleAuthenticationResponse(user, response, false, true);
  }

  @ApiTags("OAuth", "OpenID")
  @Get("openid")
  @UseGuards(OpenIDGuard)
  @ApiOperation({
    summary: "Initiate OpenID OAuth",
    description: "Redirects the user to the configured OpenID provider for authentication.",
  })
  openidLogin() {
    return;
  }

  @ApiTags("OAuth", "OpenID")
  @Get("openid/callback")
  @UseGuards(OpenIDGuard)
  @ApiOperation({
    summary: "OpenID OAuth Callback",
    description: "Handles the callback from the OpenID provider after successful authentication.",
  })
  async openidCallback(
    @User() user: UserWithSecrets,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.handleAuthenticationResponse(user, response, false, true);
  }

  @Post("refresh")
  @UseGuards(RefreshGuard)
  @ApiOperation({
    summary: "Refresh access token",
    description: "Uses a valid refresh token to issue a new access token.",
  })
  @ApiResponse({ status: 200, description: "Token refreshed successfully." })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token." })
  async refresh(@User() user: UserWithSecrets, @Res({ passthrough: true }) response: Response) {
    return this.handleAuthenticationResponse(user, response, true);
  }

  @Patch("password")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Update password",
    description: "Updates the authenticated user's password.",
  })
  @ApiResponse({ status: 200, description: "Password updated successfully." })
  @ApiResponse({ status: 400, description: "Invalid current password or new password criteria not met." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async updatePassword(
    @User("email") email: string,
    @Body() { currentPassword, newPassword }: UpdatePasswordDto,
  ) {
    await this.authService.updatePassword(email, currentPassword, newPassword);

    return { message: "Your password has been successfully updated." };
  }

  @Post("logout")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Logout",
    description: "Logs out the user by clearing authentication cookies.",
  })
  @ApiResponse({ status: 200, description: "User logged out successfully." })
  async logout(@User() user: UserWithSecrets, @Res({ passthrough: true }) response: Response) {
    await this.authService.setRefreshToken(user.email, null);

    response.clearCookie("Authentication");
    response.clearCookie("Refresh");

    const data = messageSchema.parse({ message: "You have been logged out, tschüss!" });
    response.status(200).send(data);
  }

  // Two-Factor Authentication Flows
  @ApiTags("Two-Factor Auth")
  @Post("2fa/setup")
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: "Setup Two-Factor Authentication",
    description: "Generates a 2FA secret and QR code URL for setup.",
  })
  @ApiResponse({ status: 201, description: "2FA secret generated successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async setup2FASecret(@User("email") email: string) {
    return this.authService.setup2FASecret(email);
  }

  @ApiTags("Two-Factor Auth")
  @HttpCode(200)
  @Post("2fa/enable")
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: "Enable Two-Factor Authentication",
    description: "Verifies a code and enables 2FA for the user.",
  })
  @ApiResponse({ status: 200, description: "2FA enabled successfully." })
  @ApiResponse({ status: 400, description: "Invalid code." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async enable2FA(
    @User("id") id: string,
    @User("email") email: string,
    @Body() { code }: TwoFactorDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { backupCodes } = await this.authService.enable2FA(email, code);

    const { accessToken, refreshToken } = await this.exchangeToken(id, email, true);

    response.cookie("Authentication", accessToken, getCookieOptions("access"));
    response.cookie("Refresh", refreshToken, getCookieOptions("refresh"));

    const data = backupCodesSchema.parse({ backupCodes });
    response.status(200).send(data);
  }

  @ApiTags("Two-Factor Auth")
  @HttpCode(200)
  @Post("2fa/disable")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Disable Two-Factor Authentication",
    description: "Disables 2FA for the authenticated user.",
  })
  @ApiResponse({ status: 200, description: "2FA disabled successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async disable2FA(@User("email") email: string) {
    await this.authService.disable2FA(email);

    return { message: "Two-factor authentication has been successfully disabled on your account." };
  }

  @ApiTags("Two-Factor Auth")
  @HttpCode(200)
  @Post("2fa/verify")
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: "Verify Two-Factor Authentication",
    description: "Verifies a 2FA code during login.",
  })
  @ApiResponse({ status: 200, description: "Code verified successfully." })
  @ApiResponse({ status: 400, description: "Invalid code." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async verify2FACode(
    @User() user: UserWithSecrets,
    @Body() { code }: TwoFactorDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.verify2FACode(user.email, code);

    const { accessToken, refreshToken } = await this.exchangeToken(user.id, user.email, true);

    response.cookie("Authentication", accessToken, getCookieOptions("access"));
    response.cookie("Refresh", refreshToken, getCookieOptions("refresh"));

    response.status(200).send(userSchema.parse(user));
  }

  @ApiTags("Two-Factor Auth")
  @HttpCode(200)
  @Post("2fa/backup")
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: "Use Backup Code",
    description: "Authenticates using a backup code.",
  })
  @ApiResponse({ status: 200, description: "Backup code verified successfully." })
  @ApiResponse({ status: 400, description: "Invalid or used backup code." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async useBackup2FACode(
    @User("id") id: string,
    @User("email") email: string,
    @Body() { code }: TwoFactorBackupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.useBackup2FACode(email, code);

    return this.handleAuthenticationResponse(user, response, true);
  }

  // Password Recovery Flows
  @ApiTags("Password Reset")
  @HttpCode(200)
  @Post("forgot-password")
  @ApiOperation({
    summary: "Forgot Password",
    description: "Initiates password reset flow by sending an email.",
  })
  @ApiResponse({ status: 200, description: "Reset email sent (if user exists)." })
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    try {
      await this.authService.forgotPassword(email);
    } catch {
      // pass
    }

    return {
      message:
        "A password reset link should have been sent to your inbox, if an account existed with the email you provided.",
    };
  }

  @ApiTags("Password Reset")
  @HttpCode(200)
  @Post("reset-password")
  @ApiOperation({
    summary: "Reset Password",
    description: "Resets the password using a valid token.",
  })
  @ApiResponse({ status: 200, description: "Password reset successfully." })
  @ApiResponse({ status: 400, description: "Invalid or expired token." })
  async resetPassword(@Body() { token, password }: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(token, password);

      return { message: "Your password has been successfully reset." };
    } catch {
      throw new BadRequestException(ErrorMessage.InvalidResetToken);
    }
  }

  // Email Verification Flows
  @ApiTags("Email Verification")
  @Post("verify-email")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Verify Email",
    description: "Verifies the user's email address using a token.",
  })
  @ApiResponse({ status: 201, description: "Email verified successfully." })
  @ApiResponse({ status: 400, description: "Invalid or expired token, or email already verified." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async verifyEmail(
    @User("id") id: string,
    @User("emailVerified") emailVerified: boolean,
    @Query("token") token: string,
  ) {
    if (!token) throw new BadRequestException(ErrorMessage.InvalidVerificationToken);

    if (emailVerified) {
      throw new BadRequestException(ErrorMessage.EmailAlreadyVerified);
    }

    await this.authService.verifyEmail(id, token);

    return { message: "Your email has been successfully verified." };
  }

  @ApiTags("Email Verification")
  @Post("verify-email/resend")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Resend Verification Email",
    description: "Resends the email verification link.",
  })
  @ApiResponse({ status: 201, description: "Verification email sent." })
  @ApiResponse({ status: 400, description: "Email already verified." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async resendVerificationEmail(
    @User("email") email: string,
    @User("emailVerified") emailVerified: boolean,
  ) {
    if (emailVerified) {
      throw new BadRequestException(ErrorMessage.EmailAlreadyVerified);
    }

    await this.authService.sendVerificationEmail(email);

    return {
      message: "You should have received a new email with a link to verify your email address.",
    };
  }
}

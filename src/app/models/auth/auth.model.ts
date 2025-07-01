export interface LoginRequest {
  username: string;
  password: string;
  recaptchaToken: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

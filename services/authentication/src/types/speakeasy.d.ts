declare module 'speakeasy' {
  interface GenerateSecretOptions {
    length?: number;
    name?: string;
    issuer?: string;
  }

  interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  interface TotpVerifyOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token: string;
    window?: number;
  }

  const speakeasy: {
    generateSecret(options?: GenerateSecretOptions): GeneratedSecret;
    totp: {
      verify(options: TotpVerifyOptions): boolean;
    };
  };

  export default speakeasy;
}

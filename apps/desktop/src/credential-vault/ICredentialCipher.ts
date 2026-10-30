export interface ICredentialCipher {
  readonly available: boolean;
  encrypt(value: string): Buffer;
  decrypt(value: Buffer): string;
}

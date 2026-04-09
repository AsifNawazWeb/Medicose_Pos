export {};

declare global {
  interface Window {
    medpos?: {
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
      printReceipt: (html: string, options?: any) => Promise<{ success: boolean; failureReason?: string | null }>;
    };
  }
}

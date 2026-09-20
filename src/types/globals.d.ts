export {};

declare global {
  interface UserPublicMetadata {
    plan?: "free" | "pro" | "enterprise";
    /** Persisted watchlist bundle when AUTH_MODE=clerk */
    watchlists?: {
      version: 1;
      updatedAt: string;
      lists: Array<{
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        items: Array<{
          id: string;
          type: "family" | "state" | "npi";
          value: string;
          label: string;
          addedAt: string;
        }>;
      }>;
    };
  }

  interface UserPrivateMetadata {
    stripeCustomerId?: string;
  }
}

type Options = { development?: boolean };

export declare function contentSecurityPolicy(options?: Options): string;
export declare function securityHeaders(options?: Options): {
  "X-Content-Type-Options": string;
  "Referrer-Policy": string;
  "X-Frame-Options": string;
  "Permissions-Policy": string;
  "Content-Security-Policy": string;
};

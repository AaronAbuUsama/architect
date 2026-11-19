// Where each page lives. Names are declared names (lowercase words, dots and dashes), so only the segment is encoded.
export const link = {
  home: "/portal",
  thing: (name: string): string => `/portal/things/${encodeURIComponent(name)}`,
  operation: (name: string): string => `/portal/operations/${encodeURIComponent(name)}`,
  trace: (id: string): string => `/portal/traces/${encodeURIComponent(id)}`,
  journeys: "/portal/journeys",
  reference: (kind: string): string => `/portal/reference/${kind}`,
} as const;

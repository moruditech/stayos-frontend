export const ownerPropertyKeys = {
  list: () => ['owner', 'properties'] as const,
  detail: (id: string) => ['owner', 'properties', id] as const,
};

export const ownerMandateKeys = {
  list: () => ['owner', 'mandates'] as const,
  // GET /owner/mandates/:id does not exist yet — backend ticket filed.
  // detail() key is reserved for when the endpoint is built.
  detail: (id: string) => ['owner', 'mandates', id] as const,
};

export const ownerProfileKeys = {
  me: () => ['owner', 'me'] as const,
};

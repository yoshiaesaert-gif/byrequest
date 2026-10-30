/* The legal entity behind ByRequest, as registered. Shown in the footer, the legal pages and emails. */
export const COMPANY = {
  name: "That's Amore IP, LLC",
  state: "Delaware",
  file: "10659912",
  address: "131 Continental Dr, Suite 305, Newark, DE 19713, United States",
  email: "support@byrequest.me",
} as const;
export const COMPANY_LINE = `${COMPANY.name} · ${COMPANY.address}`;

import "server-only";
import { randomUUID } from "node:crypto";

/* Card networks and mainstream processors (Stripe, Adyen) do not accept adult content.
   Production plugs in a high risk processor such as CCBill, Segpay or Verotel behind this interface.
   The mock provider succeeds instantly so the full escrow flow can be tested. */
export interface PaymentProvider {
  charge(input: { buyerId: string; cents: number; descriptor: string }): Promise<{ ref: string }>;
  refund(input: { ref: string; cents: number }): Promise<void>;
  payout(input: { creatorId: string; cents: number }): Promise<{ ref: string }>;
}

class MockProvider implements PaymentProvider {
  async charge() { return { ref: "mock_ch_" + randomUUID().slice(0, 12) }; }
  async refund() {}
  async payout() { return { ref: "mock_po_" + randomUUID().slice(0, 12) }; }
}

export const payments: PaymentProvider = new MockProvider();
export const STATEMENT_NAME = "BRQ DIGITAL";

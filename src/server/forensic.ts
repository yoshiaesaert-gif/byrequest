import "server-only";

/* Invisible forensic watermarking is a vendor integration (for example Steg.AI or Imatag for images,
   a session based video watermark for streams). Each view gets a payload that maps back to
   buyer and view in our own table; the vendor embeds and later extracts it.
   Until a vendor is chosen and its robustness is tested, this records the payload only. */
export type ForensicPayload = { vaultItemId: string; buyerId: string; viewNo: number };

export interface ForensicWatermarker {
  embedImage(jpeg: Buffer, payload: ForensicPayload): Promise<Buffer>;
}

class NoopWatermarker implements ForensicWatermarker {
  async embedImage(jpeg: Buffer) { return jpeg; }
}

export const forensic: ForensicWatermarker = new NoopWatermarker();

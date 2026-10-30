import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { COMPANY } from "@/config/company";
import { PolicyDoc } from "../_doc";

export const metadata: Metadata = { title: "18 U.S.C. 2257 Record-Keeping Requirements Compliance Statement" };

/* Required by the card networks for sites with sexually explicit content. Kept in English, the language of the statute. */
export default async function Statement2257() {
  const { t } = await getT();
  return <PolicyDoc title="18 U.S.C. 2257 Record-Keeping Requirements Compliance Statement" updated={t("Last updated {date}", { date: "2026-10-30" })} footer={t("This statement is published in English, the language of the law it refers to.")} paras={[
    "All persons who appear in any visual depiction of actual or simulated sexually explicit conduct made available through ByRequest were at least 18 years of age at the time the depiction was created.",
    "ByRequest is a platform on which independent, verified creators make content to order for individual buyers. Content is not published publicly: each delivery is shown only to the buyer who ordered it, in a private vault, after review by our team.",
    "Before a creator can accept any request, ByRequest verifies the creator's identity and age with a government issued photo ID through an independent identity verification provider. Every other person who appears in content must be verified in the same way and must sign a consent to appear before the delivery is released. Deliveries in which a person appears who has not been verified are blocked.",
    "The creators are the producers of the content they make. ByRequest, as operator of the platform, keeps the identity and age verification records and the signed consents of every creator and every person appearing in content, and can produce them on request.",
    `Custodian of records: ${COMPANY.name}, Attn: Custodian of Records, ${COMPANY.address}.`,
    "Any content that does not meet these requirements is removed and the account involved is closed. To report content, use the report form at byrequest.me/report. Anyone who appears in content can request its removal at byrequest.me/removal.",
  ]} />;
}

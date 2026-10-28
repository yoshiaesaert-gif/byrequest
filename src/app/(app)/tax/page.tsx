import { getT } from "@/i18n/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireCreator } from "@/server/auth";
import { saveTaxDetails } from "@/server/onboarding";
import { RuleError } from "@/domain/rules";
import { PAYOUT_COUNTRIES } from "@/config/compliance";
import { I } from "@/components/ui";

/* DAC7 asks platforms to collect and report seller details once a year. */
export default async function Tax({ searchParams }: { searchParams: Promise<{ e?: string; ok?: string }> }) {
  const { t } = await getT();
  const u = await requireCreator();
  const sp = await searchParams;
  const done = await db.query.taxProfiles.findFirst({ where: eq(schema.taxProfiles.userId, u.id), columns: { entity: true, country: true, updatedAt: true } });
  return (<div className="wrap"><div className="va" style={{ maxWidth: 620 }}>
    <Link href="/onboarding" className="back"><I n="left" c="sm" />{t("Creator setup")}</Link>
    <span className="eyebrow">{t("Tax details")}</span>
    <h1 className="t-h1">{t("For the yearly platform report")}</h1>
    <p className="muted">{t("EU rules (DAC7) require platforms to report what sellers earned to the tax authority once a year: in Belgium the FOD Financiën, in the Netherlands the Belastingdienst. We need these details before we can pay you out. They are stored encrypted, never shown on your profile and only used for this report.")}</p>
    {sp.ok || done ? <p className="banner ok" style={{ width: "100%" }}><I n="check" />{t("Saved")}{done ? `: ${t(done.entity)}, ${done.country}` : ""}. {t("You can update them below.")}</p> : null}
    {sp.e ? <p className="formerr">{sp.e}</p> : null}
    <form className="taxf" action={async (f) => {
      "use server";
      const me = await requireCreator();
      const g = (k: string) => String(f.get(k) ?? "");
      try {
        await saveTaxDetails(me.id, g("entity") === "business" ? "business" : "individual", g("country"), { legalName: g("legalName"), address: g("address"), tin: g("tin"), tinCountry: g("country"), dateOfBirth: g("dob") || undefined, businessNumber: g("biz") || undefined, vatNumber: g("vat") || undefined });
      } catch (e) { redirect(`/tax?e=${encodeURIComponent(e instanceof RuleError ? e.message : "Could not save.")}`); }
      redirect("/tax?ok=1");
    }}>
      <div className="field"><label>{t("You sell as")}</label><select className="input" name="entity" defaultValue={done?.entity ?? "individual"}><option value="individual">{t("An individual")}</option><option value="business">{t("A company or sole trader with a company number")}</option></select></div>
      <div className="field"><label htmlFor="ln">{t("Legal name")}</label><input id="ln" className="input" name="legalName" required autoComplete="name" /><span className="t-sm muted">{t("As on your ID, or the registered company name.")}</span></div>
      <div className="field"><label htmlFor="ad">{t("Full address")}</label><input id="ad" className="input" name="address" required autoComplete="street-address" /></div>
      <div className="field"><label htmlFor="ct">{t("Country of residence")}</label><select id="ct" className="input" name="country" defaultValue={done?.country ?? "BE"}>{PAYOUT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
      <div className="field"><label htmlFor="tin">{t("Tax identification number")}</label><input id="tin" className="input" name="tin" required /><span className="t-sm muted">{t("Belgium: national register number. Netherlands: BSN. Companies: company or VAT number.")}</span></div>
      <div className="field"><label htmlFor="dob">{t("Date of birth, for individuals")}</label><input id="dob" className="input" name="dob" type="date" /></div>
      <div className="field"><label htmlFor="biz">{t("Company registration number, for companies")}</label><input id="biz" className="input" name="biz" /></div>
      <div className="field"><label htmlFor="vat">{t("VAT number, if you have one")}</label><input id="vat" className="input" name="vat" /></div>
      <button className="btn btn-primary btn-lg">{t("Save tax details")}</button>
    </form>
  </div></div>);
}

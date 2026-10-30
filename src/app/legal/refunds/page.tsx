import { getT } from "@/i18n/server";
import { PolicyDoc } from "../_doc";

const TXT: Record<string, { title: string; paras: string[] }> = {
  en: { title: "Refunds and cancellation", paras: [
    "ByRequest charges one time payments only. There are no subscriptions and nothing renews.",
    "## When you pay",
    "You pay when you post a request: the budget, the service fee and VAT, shown before you pay. The payment partner holds the money. Nothing goes to a creator until the content is delivered and the review period has passed.",
    "## Full refund, automatically",
    "You get everything back, service fee included, when your request is not approved, when you or we take it offline, when it closes without you choosing a creator, or when the chosen creator does not deliver in time.",
    "## After delivery",
    "Something wrong with a delivery? Object within the review period, before the payment is released, and our team decides within 7 business days. The payment is released 60 minutes after you first open the delivery, and at the latest 24 hours after delivery. Once released, a payment is final, except where the law gives you more rights.",
    "## Right of withdrawal",
    "When you accept a creator you ask them to start right away. You keep your 14 day right of withdrawal until the content is delivered to your vault; after that it ends, as the law allows for digital content made to order.",
    "## Tips",
    "Tips are a voluntary gift after a delivery and are not refunded.",
    "## Questions",
    "Write to support@byrequest.me or use the inbox in the app. Refunds go back to the original payment method, usually within 5 to 10 business days.",
  ] },
  nl: { title: "Terugbetaling en annulering", paras: [
    "ByRequest werkt enkel met eenmalige betalingen. Er zijn geen abonnementen en niets verlengt automatisch.",
    "## Wanneer je betaalt",
    "Je betaalt wanneer je een request plaatst: het budget, de servicekost en btw, getoond voor je betaalt. De betaalpartner houdt het geld vast. Een creator krijgt niets tot de content geleverd is en de nakijktermijn voorbij is.",
    "## Volledige terugbetaling, automatisch",
    "Je krijgt alles terug, servicekost inbegrepen, wanneer je request niet goedgekeurd wordt, wanneer jij of wij het offline halen, wanneer het sluit zonder dat je een creator kiest, of wanneer de gekozen creator niet op tijd levert.",
    "## Na levering",
    "Klopt er iets niet met een levering? Maak bezwaar binnen de nakijktermijn, voor de betaling vrijgegeven wordt, en ons team beslist binnen 7 werkdagen. De betaling wordt vrijgegeven 60 minuten nadat je de levering voor het eerst opent, en ten laatste 24 uur na levering. Eenmaal vrijgegeven is een betaling definitief, behalve waar de wet je meer rechten geeft.",
    "## Herroepingsrecht",
    "Wanneer je een creator kiest, vraag je om meteen te beginnen. Je houdt je herroepingsrecht van 14 dagen tot de content in je vault geleverd is; daarna vervalt het, zoals de wet toelaat voor digitale content op maat.",
    "## Fooien",
    "Fooien zijn een vrijwillig geschenk na een levering en worden niet terugbetaald.",
    "## Vragen",
    "Mail support@byrequest.me of gebruik de inbox in de app. Terugbetalingen gaan naar het oorspronkelijke betaalmiddel, meestal binnen 5 tot 10 werkdagen.",
  ] },
  fr: { title: "Remboursement et annulation", paras: [
    "ByRequest ne fonctionne qu'avec des paiements uniques. Il n'y a pas d'abonnement et rien ne se renouvelle.",
    "## Quand tu paies",
    "Tu paies quand tu publies une demande : le budget, les frais de service et la TVA, affichés avant le paiement. Le partenaire de paiement conserve l'argent. Le créateur ne reçoit rien tant que le contenu n'est pas livré et que le délai de vérification n'est pas écoulé.",
    "## Remboursement complet, automatiquement",
    "Tu récupères tout, frais de service compris, si ta demande n'est pas approuvée, si toi ou nous la retirons, si elle se clôture sans que tu choisisses de créateur, ou si le créateur choisi ne livre pas à temps.",
    "## Après la livraison",
    "Un problème avec une livraison ? Fais opposition pendant le délai de vérification, avant la libération du paiement, et notre équipe décide sous 7 jours ouvrables. Le paiement est libéré 60 minutes après ta première ouverture de la livraison, et au plus tard 24 heures après la livraison. Une fois libéré, un paiement est définitif, sauf si la loi te donne plus de droits.",
    "## Droit de rétractation",
    "Quand tu choisis un créateur, tu lui demandes de commencer tout de suite. Tu gardes ton droit de rétractation de 14 jours jusqu'à la livraison dans ton coffre ; ensuite il prend fin, comme la loi le permet pour un contenu numérique sur mesure.",
    "## Pourboires",
    "Les pourboires sont un cadeau volontaire après une livraison et ne sont pas remboursés.",
    "## Questions",
    "Écris à support@byrequest.me ou utilise la boîte de réception de l'app. Les remboursements reviennent sur le moyen de paiement d'origine, en général sous 5 à 10 jours ouvrables.",
  ] },
};

export default async function Refunds() {
  const { t, locale } = await getT();
  const d = TXT[locale] ?? TXT.en;
  return <PolicyDoc title={d.title} paras={d.paras} updated={t("Last updated {date}", { date: "2026-10-30" })} footer={t("Part of the terms of use.")} />;
}

import { getT } from "@/i18n/server";
import { PolicyDoc } from "../_doc";

const TXT: Record<string, { title: string; paras: string[] }> = {
  en: { title: "Complaints and content removal", paras: [
    "Anyone can report content or behaviour on ByRequest, with or without an account. We take every report seriously and never share who reported.",
    "## Report illegal or non consensual content",
    "Use the form at byrequest.me/report. Tell us the username, the request or the link, and what is wrong. Content that may be illegal, that shows someone under 18, or that was made or shared without consent is taken offline right away while we review it.",
    "## Request removal of content you appear in",
    "Anyone who appears in content on ByRequest can ask for its removal at byrequest.me/removal, also without an account. We remove it and confirm to you, and we never ask you to justify why.",
    "## How we handle a complaint",
    "We confirm receipt, review the complaint and decide within 7 business days, usually much faster. You receive our decision with the reasons. Illegal content is removed, the account involved is restricted or closed, and where the law requires it we report to the authorities.",
    "## Appeal",
    "Do you disagree with a decision about you or your content? Reply to the decision or send us a message at byrequest.me/contact within 6 months. Someone who was not involved in the first decision reviews it.",
    "## Contact",
    "Complaints: byrequest.me/contact. Authorities: authorities@byrequest.me. Privacy: privacy@byrequest.me.",
  ] },
  nl: { title: "Klachten en verwijderen van content", paras: [
    "Iedereen kan content of gedrag op ByRequest melden, met of zonder account. We nemen elke melding ernstig en delen nooit wie meldde.",
    "## Illegale content of content zonder toestemming melden",
    "Gebruik het formulier op byrequest.me/report. Geef de gebruikersnaam, het request of de link, en wat er mis is. Content die mogelijk illegaal is, iemand onder 18 toont, of zonder toestemming gemaakt of gedeeld werd, halen we meteen offline terwijl we ze nakijken.",
    "## Verwijdering vragen van content waarin jij te zien bent",
    "Iedereen die in content op ByRequest te zien is, kan verwijdering vragen op byrequest.me/removal, ook zonder account. We verwijderen ze en bevestigen dat, en we vragen nooit waarom.",
    "## Hoe we een klacht behandelen",
    "We bevestigen de ontvangst, bekijken de klacht en beslissen binnen 7 werkdagen, meestal veel sneller. Je krijgt onze beslissing met de redenen. Illegale content wordt verwijderd, het betrokken account wordt beperkt of gesloten, en waar de wet het vraagt melden we het aan de overheid.",
    "## Bezwaar",
    "Ben je het niet eens met een beslissing over jou of je content? Antwoord op de beslissing of stuur ons een bericht via byrequest.me/contact binnen 6 maanden. Iemand die niet bij de eerste beslissing betrokken was, bekijkt het opnieuw.",
    "## Contact",
    "Klachten: byrequest.me/contact. Overheden: authorities@byrequest.me. Privacy: privacy@byrequest.me.",
  ] },
  fr: { title: "Plaintes et retrait de contenu", paras: [
    "Tout le monde peut signaler un contenu ou un comportement sur ByRequest, avec ou sans compte. Nous prenons chaque signalement au sérieux et ne révélons jamais qui l'a fait.",
    "## Signaler un contenu illégal ou non consenti",
    "Utilise le formulaire sur byrequest.me/report. Indique le nom d'utilisateur, la demande ou le lien, et le problème. Un contenu qui pourrait être illégal, montrer une personne de moins de 18 ans, ou avoir été réalisé ou partagé sans consentement est retiré immédiatement pendant notre examen.",
    "## Demander le retrait d'un contenu où tu apparais",
    "Toute personne qui apparaît dans un contenu sur ByRequest peut en demander le retrait sur byrequest.me/removal, même sans compte. Nous le retirons et te le confirmons, sans jamais te demander de te justifier.",
    "## Traitement d'une plainte",
    "Nous confirmons la réception, examinons la plainte et décidons sous 7 jours ouvrables, généralement bien plus vite. Tu reçois notre décision avec ses motifs. Le contenu illégal est retiré, le compte concerné est restreint ou fermé, et lorsque la loi l'exige nous informons les autorités.",
    "## Recours",
    "Tu n'es pas d'accord avec une décision qui te concerne ? Réponds à la décision ou envoie-nous un message via byrequest.me/contact dans les 6 mois. Une personne qui n'a pas pris la première décision la réexamine.",
    "## Contact",
    "Plaintes : byrequest.me/contact. Autorités : authorities@byrequest.me. Vie privée : privacy@byrequest.me.",
  ] },
};

export default async function Complaints() {
  const { t, locale } = await getT();
  const d = TXT[locale] ?? TXT.en;
  return <PolicyDoc title={d.title} paras={d.paras} updated={t("Last updated {date}", { date: "2026-10-30" })} footer={t("Report: byrequest.me/report · Removal: byrequest.me/removal")} />;
}

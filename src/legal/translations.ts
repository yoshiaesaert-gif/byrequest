/* Dutch and French translations of the legal texts, per version. The page shows the translation in
   the reader's language next to a link to the recorded text (version and SHA-256), so a consent stays
   traceable to the exact text that was accepted. Drafts: reviewed by counsel together with the English. */
import type { LegalDoc } from "./documents";

type Tr = { title: string; summary: string[]; body: string[] };
type Kind = LegalDoc["kind"];

const NL_DRAFT = "Ontwerp, nog na te kijken door juristen en de betaalpartner.";
const FR_DRAFT = "Projet en attente de relecture juridique et du partenaire de paiement.";

export const LEGAL_TR: Record<string, Partial<Record<Kind, Tr>>> = {
  "nl|2026-11-draft-6": { creator_agreement: {
      "title": "Creatorovereenkomst",
      "summary": [
        "Je werkt zelfstandig en kiest elke request zelf. Geen targets, geen exclusiviteit.",
        "Alleen legale, toegestane content. Iedereen die in beeld komt is volwassen, geverifieerd en gaf toestemming.",
        "Je houdt je rechten. De koper krijgt een persoonlijke licentie om het in zijn privé vault te bekijken voor de afgesproken periode.",
        "Je verdient 80% van de dealwaarde, uitbetaald via de betaalpartner meteen na de controle en de bezwaartermijn van 24 uur.",
        "We houden verdiensten alleen in bij fraude, illegale content, een rechterlijk bevel of een lopend onderzoek, en we zeggen je waarom.",
        "Voor we je account beperken of sluiten krijg je de redenen, en bij een volledige sluiting 30 dagen opzeg, tenzij de wet of een ernstige inbreuk iets anders vraagt.",
        "Kopieerbeveiliging verkleint het risico op lekken, maar kan ze niet volledig voorkomen."
      ],
      "body": [
        "1. Waarover dit gaat. Deze overeenkomst geldt tussen jou en ByRequest LLC, een vennootschap met beperkte aansprakelijkheid naar het recht van Delaware, Verenigde Staten (\"ByRequest\"), wanneer je ByRequest gebruikt om content voor kopers te maken. Ze vormt één geheel met onze Gebruiksvoorwaarden en Privacyverklaring. Voor zaken die creators betreffen, gaat deze overeenkomst voor.",
        "2. Je statuut. Je werkt zelfstandig. Je bent geen werknemer, agent of vennoot van ByRequest. Je beslist zelf of, wanneer en wat je maakt. Er zijn geen targets en geen exclusiviteit: je mag ook elders werken.",
        "3. Wie creator kan zijn. Je bent 18 of ouder, handelingsbekwaam, en je verifieert je identiteit en leeftijd bij onze verificatiepartner voor je eerste offer. Je houdt je gegevens juist en we kunnen je vragen opnieuw te verifiëren. Eén account per persoon. Je mag hulp krijgen bij het beheren van je account, maar je blijft verantwoordelijk voor alles wat erop gebeurt en je deelt nooit je inlogcodes.",
        "4. Hoe een deal werkt. Een koper plaatst een request met een budget. Je offer (gezicht of niet, vaultperiode, levertijd, notitie) is een bindend voorstel. Als de koper aanvaardt en betaalt, is er een deal. Je levert binnen de tijd die je aanbood. Tegenover de koper is ByRequest de verkoper van de dienst, ook voor de btw. Jij levert de content aan ByRequest voor die verkoop.",
        "5. Toegestane content en gedrag. Je levert alleen content die legaal is waar je woont en in het land van de koper, en die onze Voorwaarden en de regels van onze betaalpartners volgt. Verboden: alles met minderjarigen of iemand die als minderjarige wordt voorgesteld, met iemand die geen toestemming gaf, niet consensuele of illegale handelingen, echt of gesimuleerd geweld, incest, bestialiteit, bedwelming, en beelden van echte personen die met AI of andere middelen gemaakt of bewerkt zijn zonder hun toestemming. Alles blijft op ByRequest: geen contactgegevens, geen betalingen of chats erbuiten, geen afspraken in het echt.",
        "6. Iedereen die in beeld komt. Je komt zelf in de content voor zoals je geverifieerd bent. Elke andere persoon die in beeld komt, moet via ByRequest als volwassene geverifieerd zijn en toestemming geven om getoond te worden en voor deze specifieke levering, voor die beschikbaar wordt. Jouw verklaring vervangt hun verificatie en toestemming niet. Je uploadt alleen content die je zelf maakte.",
        "7. Je rechten en de licenties. Je blijft eigenaar van je content. Voor elke deal geef je de koper een persoonlijke, niet overdraagbare, niet commerciële licentie om de levering te bekijken in zijn privé ByRequest vault, voor de vaultperiode uit je offer. Aan ByRequest geef je alleen de rechten die nodig zijn om de content te bewaren, na te kijken, te watermerken en aan die koper te tonen, en om ze als bewijs te bewaren voor geschillen en wettelijke verplichtingen zolang dat nodig is. ByRequest gebruikt je content niet voor promotie zonder je aparte toestemming.",
        "8. Je garanties. Je garandeert dat de content je eigen werk is of dat je alle nodige rechten hebt, ook voor muziek, beelden en plaatsen, dat ze legaal is, dat iedereen die in beeld komt toestemming gaf, en dat de gegevens die je ons geeft juist zijn.",
        "9. Geld. Je verdient 80% van de dealwaarde. De koper betaalt daarbovenop een aparte servicekost en btw; ByRequest houdt 20% van de dealwaarde als platformvergoeding. Je ziet het bedrag voor je een offer doet. De betaalpartner int de betaling wanneer de deal start. Je verdiensten worden opeisbaar nadat de levering de controle en de bezwaartermijn van 24 uur doorstaan heeft, of eerder als de koper ze vrijgeeft. Elke uitbetaling vertrekt meteen nadat de deal vrijgegeven is, naar de uitbetalingsrekening die je bij de betaalpartner verifieerde, in euro. ByRequest rekent je geen andere kosten aan.",
        "10. Terugbetalingen, bezwaar en chargebacks. Lever je niet op tijd, of wordt een bezwaar gegrond verklaard omdat de levering niet overeenkomt met je offer, dan wordt de koper terugbetaald en zijn er geen verdiensten voor die deal. Draait een bank later een betaling terug omdat je levering deze overeenkomst schond, dan mogen we dat bedrag verrekenen met je toekomstige verdiensten. Andere chargebacks zijn voor risico van ByRequest, niet van jou.",
        "11. Verdiensten inhouden. We houden verdiensten alleen in bij een redelijk vermoeden van fraude, financiële criminaliteit of illegale content, wanneer een rechterlijk bevel of de wet dat vraagt (ook om een derde te betalen die daar wettelijk recht op heeft), of zolang we een melding over je content onderzoeken. We houden ze niet langer in dan nodig en maximaal 90 dagen, tenzij de wet langer vereist, en we zeggen je waarom.",
        "12. Belastingen en btw. Je bent zelf verantwoordelijk voor je inkomstenbelasting en sociale zekerheid. ByRequest rekent de koper btw aan en draagt die af aan het juiste land. Of jouw levering aan ByRequest btw draagt, hangt af van je eigen btw-situatie; je geeft ons juiste gegevens. Europese regels (DAC7) verplichten ByRequest om je gegevens en inkomsten één keer per jaar aan de belastingdienst te melden. Uitbetalingen wachten tot je je fiscale gegevens hebt ingevuld.",
        "13. Controle en moderatie. Elke levering doorloopt een automatische bestandscheck en een inhoudelijke controle voor ze beschikbaar wordt. Een technische goedkeuring is geen inhoudelijke goedkeuring. We mogen content die deze regels breekt weigeren of verwijderen en illegale content melden aan de overheid.",
        "14. Beperking, schorsing en sluiting. We mogen je account beperken, schorsen of sluiten bij een inbreuk op deze overeenkomst of de Voorwaarden, bij illegale content, om iemands veiligheid te beschermen, of wanneer de wet het vereist. Je krijgt de redenen schriftelijk, voor of op het moment dat de maatregel ingaat. Voor we je volledige account sluiten, geven we 30 dagen opzeg, tenzij de wet iets anders vereist, of bij een ernstige of herhaalde inbreuk, illegale content of een veiligheidsrisico. Je kan altijd reageren en in beroep gaan.",
        "15. Klachten en beroep. Je kan gratis klagen of in beroep gaan in de app. Iemand die de eerste beslissing niet nam, bekijkt het opnieuw en je krijgt een gemotiveerd antwoord. Je kan ook terecht bij een van de onafhankelijke bemiddelaars die we hiervoor aanwijzen, Pieter Santy en David Devree, bij een erkende buitengerechtelijke geschillenbeslechting of bij de rechter. Bemiddeling is vrijwillig en we dragen een redelijk deel van de kosten.",
        "16. Einde van de overeenkomst. Je kan je account op elk moment sluiten. Lopende deals worden geleverd of terugbetaald. Verdiensten uit afgeronde deals worden uitbetaald, min wettige verrekeningen. Licenties die al gegeven zijn voor afgeronde deals blijven gelden voor hun afgesproken periode.",
        "17. Privacy en vertrouwelijkheid. We behandelen je gegevens zoals beschreven in de Privacyverklaring. Je wettelijke naam en identiteitsbewijs worden nooit op je profiel getoond. Je probeert niet te achterhalen wie een koper is en je deelt nooit iets uit een chat buiten ByRequest.",
        "18. Grenzen van kopieerbeveiliging. Downloaden en doorsturen zijn uitgeschakeld en elke weergave draagt een zichtbaar en een onzichtbaar watermerk. Dat verkleint het risico en helpt lekken op te sporen, maar kan kopiëren met een ander toestel niet voorkomen. We treden op tegen lekken die we vinden en helpen bij verwijderverzoeken, maar kunnen de verwijdering niet garanderen.",
        "19. Aansprakelijkheid. ByRequest is aansprakelijk voor opzet, grove fout en overal waar de wet geen beperking toelaat. Voor het overige is onze aansprakelijkheid beperkt tot de platformvergoedingen die we in de 12 maanden voor het voorval op jouw deals verdienden. Jij bent verantwoordelijk voor je content en vrijwaart ByRequest voor vorderingen van derden die het gevolg zijn van jouw inbreuk op deze overeenkomst.",
        "20. Wijzigingen. We kondigen wijzigingen minstens 15 dagen vooraf aan. Je mag je account sluiten voor ze ingaan. Voor belangrijke wijzigingen vragen we opnieuw je akkoord.",
        "21. Recht en rechtbank. Op deze overeenkomst is het recht van de staat Delaware van toepassing. Dat neemt de bescherming niet weg die het dwingend recht van het land waar je woont je geeft, en je kan altijd naar de rechter daar. Voor geschillen over onze beslissingen kan je ook de klacht-, beroeps- en bemiddelingswegen uit artikel 15 gebruiken. Deze overeenkomst bestaat in het Nederlands, Frans en Engels; de versie die je aanvaardde wordt vastgelegd met datum en vingerafdruk.",
        "22. Overige. Is een bepaling ongeldig, dan blijft de rest geldig. ByRequest mag deze overeenkomst overdragen aan een vennootschap die de dienst voortzet, mits het je te melden."
      ]
    } },
  "fr|2026-11-draft-6": { creator_agreement: {
      "title": "Contrat créateur",
      "summary": [
        "Tu travailles en indépendant et choisis chaque demande toi même. Pas d'objectifs, pas d'exclusivité.",
        "Uniquement du contenu légal et autorisé. Toute personne qui apparaît est adulte, vérifiée et a donné son consentement.",
        "Tu gardes tes droits. L'acheteur reçoit une licence personnelle pour le voir dans son coffre privé pendant la période convenue.",
        "Tu gagnes 80% de la valeur du deal, versés via le partenaire de paiement dès le contrôle et le délai d'objection de 24 heures passés.",
        "Nous ne retenons tes gains qu'en cas de fraude, de contenu illégal, de décision de justice ou d'enquête en cours, et nous te disons pourquoi.",
        "Avant de restreindre ou de fermer ton compte, tu reçois les raisons, et pour une fermeture complète un préavis de 30 jours, sauf si la loi ou un manquement grave impose autre chose.",
        "La protection contre la copie réduit le risque de fuite mais ne peut pas l'empêcher complètement."
      ],
      "body": [
        "1. Objet. Ce contrat s'applique entre toi et ByRequest LLC, société à responsabilité limitée de droit du Delaware, États Unis (« ByRequest »), lorsque tu utilises ByRequest pour réaliser du contenu pour des acheteurs. Il forme un tout avec nos Conditions d'utilisation et notre Déclaration de confidentialité. Pour les questions propres aux créateurs, ce contrat prévaut.",
        "2. Ton statut. Tu travailles en indépendant. Tu n'es ni employé, ni agent, ni associé de ByRequest. Tu décides si, quand et quoi tu réalises. Il n'y a pas d'objectifs ni d'exclusivité : tu peux aussi travailler ailleurs.",
        "3. Qui peut être créateur. Tu as 18 ans ou plus, la capacité de contracter, et tu vérifies ton identité et ton âge auprès de notre prestataire de vérification avant ta première offre. Tu gardes tes données exactes et nous pouvons te demander une nouvelle vérification. Un compte par personne. Tu peux te faire aider pour gérer ton compte, mais tu restes responsable de tout ce qui s'y passe et tu ne partages jamais tes codes de connexion.",
        "4. Fonctionnement d'un deal. Un acheteur publie une demande avec un budget. Ton offre (visage ou non, durée du coffre, délai de livraison, note) est une proposition ferme. Quand l'acheteur l'accepte et paie, le deal existe. Tu livres dans le délai proposé. Vis à vis de l'acheteur, ByRequest est le vendeur du service, y compris pour la TVA. Tu fournis le contenu à ByRequest pour cette vente.",
        "5. Contenu et comportement autorisés. Tu ne livres que du contenu légal là où tu vis et dans le pays de l'acheteur, conforme à nos Conditions et aux règles de nos partenaires de paiement. Interdit : tout ce qui implique des mineurs ou une personne présentée comme mineure, une personne n'ayant pas consenti, des actes non consentis ou illégaux, la violence réelle ou simulée, l'inceste, la zoophilie, l'intoxication, et les images de personnes réelles créées ou modifiées par IA ou autrement sans leur consentement. Tout reste sur ByRequest : pas de coordonnées, pas de paiement ni de chat en dehors, pas de rencontre en personne.",
        "6. Toute personne qui apparaît. Tu apparais toi même dans le contenu tel que vérifié. Toute autre personne qui apparaît doit être vérifiée comme adulte via ByRequest et consentir à être montrée et à cette livraison précise avant sa mise à disposition. Ta déclaration ne remplace pas leur vérification ni leur consentement. Tu n'envoies que du contenu que tu as réalisé toi même.",
        "7. Tes droits et les licences. Tu restes propriétaire de ton contenu. Pour chaque deal, tu accordes à l'acheteur une licence personnelle, non transférable et non commerciale pour voir la livraison dans son coffre ByRequest privé, pendant la durée de coffre de ton offre. Tu n'accordes à ByRequest que les droits nécessaires pour stocker, contrôler, filigraner et montrer le contenu à cet acheteur, et pour le conserver comme preuve en cas de litige ou d'obligation légale aussi longtemps que nécessaire. ByRequest n'utilise pas ton contenu pour sa promotion sans ton consentement séparé.",
        "8. Tes garanties. Tu garantis que le contenu est ton propre travail ou que tu détiens tous les droits nécessaires, y compris pour la musique, les images et les lieux, qu'il est légal, que toute personne qui apparaît a consenti, et que les informations que tu nous donnes sont exactes.",
        "9. Argent. Tu gagnes 80% de la valeur du deal. L'acheteur paie en plus des frais de service et la TVA ; ByRequest conserve 20% de la valeur du deal comme commission de plateforme. Tu vois le montant avant de faire une offre. Le partenaire de paiement encaisse le paiement au début du deal. Tes gains deviennent exigibles une fois que la livraison a passé le contrôle et le délai d'objection de 24 heures, ou plus tôt si l'acheteur les libère. Chaque versement part dès que le deal est libéré, en euros, sur le compte de versement que tu as vérifié chez le partenaire de paiement. ByRequest ne te facture aucun autre frais.",
        "10. Remboursements, objections et rétrofacturations. Si tu ne livres pas à temps, ou si une objection est jugée fondée parce que la livraison ne correspond pas à ton offre, l'acheteur est remboursé et il n'y a pas de gains pour ce deal. Si une banque annule plus tard un paiement parce que ta livraison violait ce contrat, nous pouvons compenser ce montant avec tes gains futurs. Les autres rétrofacturations sont aux risques de ByRequest, pas aux tiens.",
        "11. Retenue des gains. Nous ne retenons tes gains qu'en cas de soupçon raisonnable de fraude, de criminalité financière ou de contenu illégal, lorsqu'une décision de justice ou la loi l'exige (y compris pour payer un tiers qui y a légalement droit), ou pendant l'examen d'un signalement concernant ton contenu. Nous ne les retenons pas plus longtemps que nécessaire et au maximum 90 jours, sauf si la loi exige davantage, et nous te disons pourquoi.",
        "12. Impôts et TVA. Tu es responsable de ton impôt sur le revenu et de ta sécurité sociale. ByRequest facture la TVA à l'acheteur et la reverse au bon pays. Que ta fourniture à ByRequest soit soumise à la TVA dépend de ta propre situation TVA ; tu nous donnes des informations exactes. Les règles européennes (DAC7) obligent ByRequest à déclarer une fois par an tes données et revenus à l'administration fiscale. Les versements attendent que tu aies fourni tes données fiscales.",
        "13. Contrôle et modération. Chaque livraison passe une vérification automatique du fichier et un contrôle du contenu avant sa mise à disposition. Une validation technique n'est pas une validation du contenu. Nous pouvons refuser ou retirer un contenu qui enfreint ces règles et signaler un contenu illégal aux autorités.",
        "14. Restriction, suspension et fermeture. Nous pouvons restreindre, suspendre ou fermer ton compte en cas de manquement à ce contrat ou aux Conditions, de contenu illégal, pour protéger la sécurité de quelqu'un, ou lorsque la loi l'exige. Tu reçois les raisons par écrit, avant ou au moment où la mesure prend effet. Avant de fermer ton compte entier, nous donnons un préavis de 30 jours, sauf si la loi l'exige autrement, ou en cas de manquement grave ou répété, de contenu illégal ou de risque pour la sécurité. Tu peux toujours répondre et faire appel.",
        "15. Plaintes et recours. Tu peux te plaindre ou faire appel gratuitement dans l'app. Une personne qui n'a pas pris la première décision la réexamine et tu reçois une réponse motivée. Tu peux aussi t'adresser à l'un des médiateurs indépendants que nous désignons à cet effet, Pieter Santy et David Devree, à un organe agréé de règlement extrajudiciaire des litiges ou au tribunal. La médiation est volontaire et nous prenons en charge une part raisonnable de son coût.",
        "16. Fin du contrat. Tu peux fermer ton compte à tout moment. Les deals en cours sont livrés ou remboursés. Les gains des deals terminés sont versés, déduction faite des compensations légales. Les licences déjà accordées pour des deals terminés restent valables pendant leur période convenue.",
        "17. Vie privée et confidentialité. Nous traitons tes données comme décrit dans la Déclaration de confidentialité. Ton nom légal et ta pièce d'identité ne sont jamais affichés sur ton profil. Tu n'essaies pas de découvrir qui est un acheteur et tu ne partages jamais rien d'un chat en dehors de ByRequest.",
        "18. Limites de la protection contre la copie. Le téléchargement et le transfert sont désactivés et chaque affichage porte un filigrane visible et un filigrane invisible. Cela réduit le risque et aide à retrouver les fuites, mais ne peut pas empêcher la copie avec un autre appareil. Nous agissons contre les fuites que nous trouvons et aidons pour les demandes de retrait, sans pouvoir garantir la suppression.",
        "19. Responsabilité. ByRequest est responsable en cas de dol, de faute grave et partout où la loi n'autorise pas de limitation. Pour le reste, notre responsabilité est limitée aux commissions de plateforme perçues sur tes deals au cours des 12 mois précédant l'événement. Tu es responsable de ton contenu et tu garantis ByRequest contre les réclamations de tiers résultant de ton manquement à ce contrat.",
        "20. Modifications. Nous annonçons les modifications au moins 15 jours à l'avance. Tu peux fermer ton compte avant leur entrée en vigueur. Les modifications importantes nécessitent ton nouvel accord.",
        "21. Droit et tribunaux. Le droit de l'État du Delaware s'applique à ce contrat. Cela ne t'enlève pas la protection que t'accorde le droit impératif de ton pays de résidence, et tu peux toujours saisir les tribunaux de ce pays. Pour les litiges sur nos décisions, tu peux aussi utiliser les voies de plainte, de recours et de médiation de l'article 15. Ce contrat existe en néerlandais, en français et en anglais ; la version que tu as acceptée est enregistrée avec sa date et son empreinte.",
        "22. Divers. Si une clause est invalide, le reste demeure valable. ByRequest peut transférer ce contrat à une société qui poursuit le service, moyennant notification."
      ]
    } },
  "nl|2026-11-draft-2": {
    terms: {
      title: "Gebruiksvoorwaarden",
      summary: ["ByRequest is alleen voor volwassenen, en kopers bevestigen hun leeftijd één keer voor ze betalen.", "Creators beslissen vrij of ze reageren. Niemand mag iemand onder druk zetten.", "Chat, betaling en levering blijven op ByRequest. Geen afspraken in het echt.", "Elke maatregel die we nemen komt met een reden waartegen je in beroep kan gaan."],
      body: [
        "1. Wie ByRequest mag gebruiken. Je moet 18 jaar of ouder zijn en waar je woont diensten voor volwassenen mogen gebruiken. Kopers bevestigen hun leeftijd één keer bij onze verificatiepartner voor ze betalen of hun vault openen. Creators verifiëren hun identiteit en leeftijd voor hun eerste offer.",
        "2. Wat ByRequest is. Een marktplaats waar een koper een request met een budget plaatst en creators die daarvoor kiezen een offer doen. Niemand is verplicht te reageren of te accepteren. ByRequest is voor de btw de verkoper van de dienst en het aanspreekpunt voor kopers.",
        "3. Alleen online. ByRequest is voor content die online geleverd wordt. Afspreken in het echt, seksuele diensten in het echt aanbieden of vragen, buiten ByRequest betalen en contactgegevens delen zijn niet toegestaan. Wie dat doet, verliest de bescherming van controle, terugbetaling en support.",
        "4. Prijzen en betaling. Prijzen worden getoond inclusief btw. De koper betaalt via onze betaalpartner, die het geld vasthoudt tot de levering. De creator wordt betaald nadat de levering de controle en de bezwaartermijn doorstaan heeft, of eerder als de koper de betaling vrijgeeft. De afschrijving verschijnt als BRQ DIGITAL.",
        "5. Herroepingsrecht. Content wordt op bestelling gemaakt en digitaal geleverd. Wanneer je een offer accepteert, vraag je de creator meteen te beginnen en erken je dat je het herroepingsrecht van 14 dagen verliest zodra de content in je vault staat. Je rechten als een levering niet overeenkomt met het offer blijven behouden.",
        "6. Verboden. Content met minderjarigen of iemand die als minderjarige wordt voorgesteld, met iemand die geen toestemming gaf, niet consensuele of illegale handelingen, echt of gesimuleerd geweld, incest, bestialiteit, bedwelming, of alles wat de wet of de regels van kaartnetwerken overtreedt. Iemand anders onder druk zetten, uitbuiten of controleren is verboden en wordt gemeld aan de politie.",
        "7. Bezwaar. Een koper kan binnen 24 uur nadat de content beschikbaar is bezwaar maken. Een mens vergelijkt het bestand met het geaccepteerde offer. Klopt het niet, dan wordt de koper volledig terugbetaald. Klopt het wel, dan wordt de creator betaald. Eén bezwaar sluit nooit een account af; herhaald misbruik wel.",
        "8. Meldingen. Iedereen kan een profiel, request, chat of content melden via /report, met of zonder account. Een vermoeden van uitbuiting, mensenhandel of een minderjarige wordt zonder uitstel aan de politie doorgegeven. Wie in content voorkomt, kan verwijdering vragen via /removal.",
        "9. Maatregelen en beroep. Als we content of een account beperken, krijg je een motivering: wat we beslisten, waarom, hoe ver het reikt en of het automatisch gebeurde. Je kan in de app in beroep gaan; iemand die de eerste beslissing niet nam, bekijkt het opnieuw. Je kan ook naar een erkende buitengerechtelijke geschillenbeslechting of naar de rechter.",
        "10. Grenzen van de bescherming. Downloaden en doorsturen zijn uitgeschakeld en elke weergave draagt een zichtbaar en een onzichtbaar watermerk, maar geen enkele technologie kan kopiëren volledig voorkomen, bijvoorbeeld door een scherm te filmen.",
        "11. Contact. Overheden, gebruikers en organisaties bereiken ons contactpunt via /legal/contact.",
        "12. Wijzigingen. We kondigen wijzigingen vooraf aan. Voor belangrijke wijzigingen vragen we opnieuw je akkoord.",
      ],
    },
    privacy: {
      title: "Privacyverklaring",
      summary: ["Alleen je gebruikersnaam en avatar worden ooit getoond.", "We vragen je uitdrukkelijke toestemming, omdat requests en content iets over je seksleven kunnen zeggen.", "De leeftijdscheck geeft ons een ja of nee, nooit je identiteitskaart.", "In Instellingen kan je je gegevens downloaden of je account verwijderen."],
      body: [
        "1. Wie we zijn. ByRequest is verantwoordelijke voor de gegevens die hier beschreven staan. Contact: privacy@byrequest.me. Onze functionaris voor gegevensbescherming is op hetzelfde adres bereikbaar.",
        "2. Wat anderen zien. Je gebruikersnaam, je avatar, en bij creators de profielgegevens die ze zelf willen tonen. Nooit je naam, e-mail of locatie.",
        "3. Gevoelige gegevens. Requests, deals, chats en content kunnen iets zeggen over je seksleven. We verwerken dit alleen met je uitdrukkelijke toestemming (AVG art. 9(2)(a)), gegeven bij het aanmelden, en alleen om de dienst te leveren. Je trekt ze in door je account te verwijderen.",
        "4. Leeftijdscheck voor kopers. Onze verificatiepartner controleert dat je 18 jaar of ouder bent. We ontvangen alleen het resultaat en de datum. We ontvangen of bewaren geen identiteitsbewijs, naam of geboortedatum uit deze check.",
        "5. Identiteitsverificatie van creators. Een gespecialiseerde aanbieder controleert het identiteitsbewijs, dat het bij de persoon hoort (bijvoorbeeld met een live selfie) en de minimumleeftijd. We bewaren het resultaat, een referentie, en de wettelijke naam, geboortedatum en land in versleutelde vorm. Zelf bewaren we geen scans van identiteitsbewijzen of biometrische gegevens.",
        "6. Fiscale gegevens van creators. Europese regels (DAC7) verplichten ons om gegevens en inkomsten van verkopers één keer per jaar te melden aan de belastingdienst van hun land. We bewaren deze gegevens versleuteld en gebruiken ze alleen voor die melding.",
        "7. Betalingen. Kaart- en bankgegevens gaan naar de betaalpartner. Wij bewaren referenties, bedragen en statussen voor de boekhouding.",
        "8. Berichten. Chats zijn end to end versleuteld. ByRequest kan ze niet lezen. Een waarschuwing over contactgegevens draait alleen op je eigen toestel. Meld je een chat, dan kies je zelf wat je deelt.",
        "9. Watermerken. Elke weergave in de vault draagt zichtbaar je gebruikersnaam en een onzichtbaar merkteken, om lekken naar een account te herleiden. Dat is in het belang van creators en van iedereen die in beeld komt.",
        "10. Bewaartermijnen. Versleutelde chats worden 12 maanden na het einde van een deal verwijderd, meldingen na 12 maanden, contactgegevens van een afgesloten melding na 12 maanden. Betalings-, fiscale en verificatiegegevens bewaren we zo lang als de wet vereist. Meldingen en beslissingen bewaren we zo lang als nodig voor de veiligheid en voor juridische claims.",
        "11. Je rechten. Inzage, een kopie van je gegevens (Instellingen, Download je gegevens), correctie, verwijdering (Instellingen, Verwijder je account), beperking en bezwaar. Je kan klacht indienen bij de toezichthouder: in België de Gegevensbeschermingsautoriteit, in Nederland de Autoriteit Persoonsgegevens.",
        "12. Geen verkoop van gegevens. We verkopen geen persoonsgegevens. Marketingberichten alleen met aparte, vrijwillige toestemming, die je op elk moment kan uitzetten.",
      ],
    },
    creator_agreement: {
      title: "Creatorovereenkomst",
      summary: [
        "Je doet vrijwillig mee en kiest elke request zelf.",
        "Alleen legale, toegestane content. Iedereen die in beeld komt is volwassen, geverifieerd en gaf toestemming.",
        "Je houdt je rechten. De koper krijgt een persoonlijke licentie om het in zijn privé vault te bekijken voor de afgesproken periode.",
        "Je verdient 80% van de dealwaarde, betaald via de betaalpartner na de controle en de bezwaartermijn van 24 uur.",
        "Elke levering wordt nagekeken voor ze beschikbaar wordt. Klachten, verwijdering en bezwaar volgen een eerlijke procedure.",
        "Kopieerbeveiliging verkleint het risico op lekken, maar kan ze niet volledig voorkomen.",
      ],
      body: [
        "1. Vrijwillige deelname. Je beslist vrij op welke requests je reageert en je kan een offer weigeren of intrekken zolang het niet geaccepteerd is. Niemand mag je onder druk zetten, en je kan op elk moment stoppen met maken.",
        "2. Toegestane content. Je levert alleen content die legaal is waar je woont en in het land van de koper, en die voldoet aan onze voorwaarden en de regels van onze betaalpartners. Verboden is onder meer alles met minderjarigen, met iemand die geen toestemming gaf, niet consensuele of illegale handelingen, geweld, incest, bestialiteit en bedwelming.",
        "3. Je rechten op uploads. Je bevestigt dat je de content zelf maakte of alle rechten hebt die nodig zijn om ze te leveren, ook voor muziek, beelden en locaties.",
        "4. Iedereen die in beeld komt. Je komt zelf in de content voor zoals je geverifieerd bent. Elke andere persoon die in beeld komt, moet via ByRequest als volwassene geverifieerd zijn en toestemming geven om getoond te worden en voor deze specifieke levering, voor die beschikbaar wordt. Jouw verklaring vervangt hun verificatie en toestemming niet.",
        "5. Licentie, geen overdracht. Je blijft eigenaar van je content. Voor elke geaccepteerde deal geef je de koper een persoonlijke, niet overdraagbare, niet commerciële licentie om de levering te bekijken in zijn privé ByRequest vault, voor de vaultperiode uit je offer. Aan ByRequest geef je alleen de rechten die nodig zijn om de content te bewaren, na te kijken, te watermerken en aan die koper te tonen. Er is geen overdracht van alle rechten.",
        "6. Vergoeding en uitbetaling. Je verdient 80% van de dealwaarde. De koper betaalt een aparte servicekost. De betaling wordt verwerkt en uitbetaald door de betaalpartner van ByRequest, op de uitbetalingsrekening die je bij hen instelde, nadat de levering de controle en de bezwaartermijn van 24 uur doorstaan heeft, of eerder als de koper de betaling vrijgeeft. Uitbetalingen vereisen een actieve goedkeuring bij de aanbieder.",
        "7. Controle en moderatie. Elke levering doorloopt een automatische bestandscheck en een inhoudelijke controle voor ze beschikbaar wordt. Een technische goedkeuring is geen inhoudelijke goedkeuring. We mogen content die deze regels breekt weigeren of verwijderen.",
        "8. Klachten, verwijdering en bezwaar. Kopers kunnen binnen 24 uur bezwaar maken. Een mens legt het bestand naast het geaccepteerde offer. Is het bezwaar terecht, dan wordt de koper terugbetaald en de creator niet betaald. Is het ongegrond, dan wordt de creator betaald. Eén geschil sluit nooit een account af. Iedereen die in beeld komt, kan verwijdering vragen. Je kan via support bezwaar maken tegen onze beslissingen.",
        "9. Grenzen van kopieerbeveiliging. Downloaden en doorsturen zijn uitgeschakeld en elke weergave draagt een zichtbaar en een onzichtbaar watermerk. Dat verkleint het risico en helpt lekken op te sporen, maar kan kopiëren met een ander toestel niet voorkomen. We treden op tegen lekken die we vinden, maar kunnen de verwijdering ervan niet garanderen.",
        "10. Identiteit en privacy. Je wettelijke naam en identiteitsbewijs worden niet op je profiel getoond. Verificatie is nodig voor betalingen en veiligheid en wordt door een gespecialiseerde aanbieder gedaan.",
        "11. Belastingen. Je bent zelf verantwoordelijk voor je belastingen. Europese regels (DAC7) verplichten ByRequest om je gegevens en inkomsten één keer per jaar aan de belastingdienst te melden. Uitbetalingen wachten tot je je fiscale gegevens hebt ingevuld.",
        "12. Alleen online, niemand onder druk. Kopers in het echt ontmoeten, seksuele diensten in het echt aanbieden, buiten ByRequest betalen of praten is niet toegestaan. Erkende hulporganisaties voor creators en sekswerkers kunnen je via ByRequest contacteren; hun berichten dragen hun naam. Zet iemand je onder druk of controleert iemand je, meld het via /report of bel 112.",
        "13. Maatregelen en beroep. Als we je account beperken of een levering weigeren, krijg je de redenen en kan je in beroep gaan.",
        "14. Beëindiging. Je kan je account op elk moment sluiten. Licenties die al gegeven zijn voor afgeronde deals blijven gelden voor hun afgesproken periode.",
      ],
    },
  },
  "nl|2026-11-draft-3": {
    terms: {
      title: "Gebruiksvoorwaarden",
      summary: ["ByRequest is alleen voor volwassenen, en kopers bevestigen hun leeftijd één keer voor ze betalen.", "Creators beslissen vrij of ze reageren. Niemand mag iemand onder druk zetten.", "Chat, betaling en levering blijven op ByRequest. Geen afspraken in het echt.", "Elke maatregel die we nemen komt met een reden waartegen je in beroep kan gaan."],
      body: [
        "1. Wie ByRequest mag gebruiken. Je moet 18 jaar of ouder zijn en waar je woont diensten voor volwassenen mogen gebruiken. Kopers bevestigen hun leeftijd één keer bij onze verificatiepartner voor ze betalen of hun vault openen. Creators verifiëren hun identiteit en leeftijd voor hun eerste offer.",
        "2. Wie we zijn en wat ByRequest is. ByRequest wordt uitgebaat door ByRequest LLC, een vennootschap met beperkte aansprakelijkheid naar het recht van Delaware, Verenigde Staten. Het is een marktplaats waar een koper een request met een budget plaatst en creators die daarvoor kiezen een offer doen. Niemand is verplicht te reageren of te accepteren. ByRequest is voor de btw de verkoper van de dienst en het aanspreekpunt voor kopers.",
        "3. Alleen online. ByRequest is voor content die online geleverd wordt. Afspreken in het echt, seksuele diensten in het echt aanbieden of vragen, buiten ByRequest betalen en contactgegevens delen zijn niet toegestaan. Wie dat doet, verliest de bescherming van controle, terugbetaling en support.",
        "4. Prijzen en betaling. Prijzen worden getoond inclusief btw. De koper betaalt via onze betaalpartner, die het geld vasthoudt tot de levering. De creator wordt betaald nadat de levering de controle en de bezwaartermijn doorstaan heeft, of eerder als de koper de betaling vrijgeeft. De afschrijving verschijnt als BRQ DIGITAL.",
        "5. Herroepingsrecht. Content wordt op bestelling gemaakt en digitaal geleverd. Wanneer je een offer accepteert, vraag je de creator meteen te beginnen en erken je dat je het herroepingsrecht van 14 dagen verliest zodra de content in je vault staat. Je rechten als een levering niet overeenkomt met het offer blijven behouden.",
        "6. Verboden. Content met minderjarigen of iemand die als minderjarige wordt voorgesteld, met iemand die geen toestemming gaf, niet consensuele of illegale handelingen, echt of gesimuleerd geweld, incest, bestialiteit, bedwelming, of alles wat de wet of de regels van kaartnetwerken overtreedt. Iemand anders onder druk zetten, uitbuiten of controleren is verboden en wordt gemeld aan de politie.",
        "7. Bezwaar. Een koper kan binnen 24 uur nadat de content beschikbaar is bezwaar maken. Een mens vergelijkt het bestand met het geaccepteerde offer. Klopt het niet, dan wordt de koper volledig terugbetaald. Klopt het wel, dan wordt de creator betaald. Eén bezwaar sluit nooit een account af; herhaald misbruik wel.",
        "8. Meldingen. Iedereen kan een profiel, request, chat of content melden via /report, met of zonder account. Een vermoeden van uitbuiting, mensenhandel of een minderjarige wordt zonder uitstel aan de politie doorgegeven. Wie in content voorkomt, kan verwijdering vragen via /removal.",
        "9. Maatregelen en beroep. Als we content of een account beperken, krijg je een motivering: wat we beslisten, waarom, hoe ver het reikt en of het automatisch gebeurde. Je kan in de app in beroep gaan; iemand die de eerste beslissing niet nam, bekijkt het opnieuw. Je kan ook naar een erkende buitengerechtelijke geschillenbeslechting of naar de rechter.",
        "10. Grenzen van de bescherming. Downloaden en doorsturen zijn uitgeschakeld en elke weergave draagt een zichtbaar en een onzichtbaar watermerk, maar geen enkele technologie kan kopiëren volledig voorkomen, bijvoorbeeld door een scherm te filmen.",
        "11. Contact. Overheden, gebruikers en organisaties bereiken ons contactpunt via /legal/contact.",
        "12. Wijzigingen. We kondigen wijzigingen vooraf aan. Voor belangrijke wijzigingen vragen we opnieuw je akkoord.",
      ],
    },
    privacy: {
      title: "Privacyverklaring",
      summary: ["Alleen je gebruikersnaam en avatar worden ooit getoond.", "We vragen je uitdrukkelijke toestemming, omdat requests en content iets over je seksleven kunnen zeggen.", "De leeftijdscheck geeft ons een ja of nee, nooit je identiteitskaart.", "In Instellingen kan je je gegevens downloaden of je account verwijderen."],
      body: [
        "1. Wie we zijn. ByRequest LLC, een vennootschap met beperkte aansprakelijkheid naar het recht van Delaware, Verenigde Staten, is verantwoordelijke voor de gegevens die hier beschreven staan. Contact: privacy@byrequest.me. Onze functionaris voor gegevensbescherming is op hetzelfde adres bereikbaar.",
        "2. Wat anderen zien. Je gebruikersnaam, je avatar, en bij creators de profielgegevens die ze zelf willen tonen. Nooit je naam, e-mail of locatie.",
        "3. Gevoelige gegevens. Requests, deals, chats en content kunnen iets zeggen over je seksleven. We verwerken dit alleen met je uitdrukkelijke toestemming (AVG art. 9(2)(a)), gegeven bij het aanmelden, en alleen om de dienst te leveren. Je trekt ze in door je account te verwijderen.",
        "4. Leeftijdscheck voor kopers. Onze verificatiepartner controleert dat je 18 jaar of ouder bent. We ontvangen alleen het resultaat en de datum. We ontvangen of bewaren geen identiteitsbewijs, naam of geboortedatum uit deze check.",
        "5. Identiteitsverificatie van creators. Een gespecialiseerde aanbieder controleert het identiteitsbewijs, dat het bij de persoon hoort (bijvoorbeeld met een live selfie) en de minimumleeftijd. We bewaren het resultaat, een referentie, en de wettelijke naam, geboortedatum en land in versleutelde vorm. Zelf bewaren we geen scans van identiteitsbewijzen of biometrische gegevens.",
        "6. Fiscale gegevens van creators. Europese regels (DAC7) verplichten ons om gegevens en inkomsten van verkopers één keer per jaar te melden aan de belastingdienst van hun land. We bewaren deze gegevens versleuteld en gebruiken ze alleen voor die melding.",
        "7. Betalingen. Kaart- en bankgegevens gaan naar de betaalpartner. Wij bewaren referenties, bedragen en statussen voor de boekhouding.",
        "8. Berichten. Chats zijn end to end versleuteld. ByRequest kan ze niet lezen. Een waarschuwing over contactgegevens draait alleen op je eigen toestel. Meld je een chat, dan kies je zelf wat je deelt.",
        "9. Watermerken. Elke weergave in de vault draagt zichtbaar je gebruikersnaam en een onzichtbaar merkteken, om lekken naar een account te herleiden. Dat is in het belang van creators en van iedereen die in beeld komt.",
        "10. Bewaartermijnen. Versleutelde chats worden 12 maanden na het einde van een deal verwijderd, meldingen na 12 maanden, contactgegevens van een afgesloten melding na 12 maanden. Betalings-, fiscale en verificatiegegevens bewaren we zo lang als de wet vereist. Meldingen en beslissingen bewaren we zo lang als nodig voor de veiligheid en voor juridische claims.",
        "11. Je rechten. Inzage, een kopie van je gegevens (Instellingen, Download je gegevens), correctie, verwijdering (Instellingen, Verwijder je account), beperking en bezwaar. Je kan klacht indienen bij de toezichthouder: in België de Gegevensbeschermingsautoriteit, in Nederland de Autoriteit Persoonsgegevens.",
        "12. Geen verkoop van gegevens. We verkopen geen persoonsgegevens. Marketingberichten alleen met aparte, vrijwillige toestemming, die je op elk moment kan uitzetten.",
      ],
    },
  },
  "nl|2026-11-draft-1": {
    participant_consent: {
      title: "Toestemming om in beeld te komen",
      summary: ["Je bent volwassen en komt vrijwillig in beeld.", "Je gaat akkoord dat deze levering beschikbaar wordt voor één koper, in zijn privé vault.", "Je kan op elk moment intrekken; dan wordt ze uit de vault verwijderd."],
      body: [
        "1. Ik bevestig dat ik minstens 18 jaar ben en mijn identiteit heb geverifieerd via de verificatiepartner van ByRequest.",
        "2. Ik kom vrijwillig in deze content voor en werd niet onder druk gezet.",
        "3. Ik geef toestemming dat deze specifieke levering beschikbaar wordt voor één koper, om privé te bekijken in zijn ByRequest vault, voor de periode uit het offer.",
        "4. Elk ander gebruik is niet toegestaan, tenzij ik daar apart toestemming voor geef.",
        "5. Ik kan deze toestemming op elk moment intrekken via mijn persoonlijke link of via /removal. De levering wordt dan uit de vault verwijderd.",
      ],
    },
  },
  "fr|2026-11-draft-2": {
    terms: {
      title: "Conditions d'utilisation",
      summary: ["ByRequest est réservé aux adultes, et les acheteurs confirment leur âge une fois avant de payer.", "Les créateurs décident librement de répondre. Personne ne peut faire pression sur personne.", "Chat, paiement et livraison restent sur ByRequest. Pas de rencontre en personne.", "Chaque mesure que nous prenons est motivée et peut faire l'objet d'un recours."],
      body: [
        "1. Qui peut utiliser ByRequest. Tu dois avoir 18 ans ou plus et être autorisé à utiliser des services pour adultes là où tu vis. Les acheteurs confirment leur âge une fois auprès de notre partenaire de vérification avant de payer ou d'ouvrir leur coffre. Les créateurs vérifient leur identité et leur âge avant leur première offre.",
        "2. Ce qu'est ByRequest. Une place de marché où un acheteur publie une demande avec un budget et où les créateurs qui le souhaitent font une offre. Personne n'est obligé de répondre ni d'accepter. Pour la TVA, ByRequest est le vendeur du service et le point de contact des acheteurs.",
        "3. Uniquement en ligne. ByRequest est destiné à du contenu livré en ligne. Se rencontrer en personne, proposer ou demander des services sexuels en personne, payer en dehors de ByRequest et partager ses coordonnées est interdit. Le faire met fin à la protection du contrôle, du remboursement et du support.",
        "4. Prix et paiement. Les prix sont affichés TVA comprise. L'acheteur paie via notre partenaire de paiement, qui conserve l'argent jusqu'à la livraison. Le créateur est payé une fois que la livraison a passé le contrôle et le délai d'objection, ou plus tôt si l'acheteur libère le paiement. Le débit apparaît sous le nom BRQ DIGITAL.",
        "5. Droit de rétractation. Le contenu est réalisé sur commande et livré numériquement. En acceptant une offre, tu demandes au créateur de commencer immédiatement et tu reconnais perdre le droit de rétractation de 14 jours dès que le contenu est livré dans ton coffre. Tes droits si une livraison ne correspond pas à l'offre restent intacts.",
        "6. Interdit. Tout contenu impliquant des mineurs ou une personne présentée comme mineure, une personne qui n'a pas consenti, des actes non consentis ou illégaux, de la violence réelle ou simulée, l'inceste, la zoophilie, l'intoxication, ou tout ce qui enfreint la loi ou les règles des réseaux de cartes. Faire pression sur une autre personne, l'exploiter ou la contrôler est interdit et signalé à la police.",
        "7. Objections. Un acheteur peut contester dans les 24 heures après la mise à disposition du contenu. Une personne compare le fichier à l'offre acceptée. S'il ne correspond pas, l'acheteur est remboursé intégralement. S'il correspond, le créateur est payé. Une seule objection ne ferme jamais un compte ; une mauvaise foi répétée, si.",
        "8. Signalements. Tout le monde peut signaler un profil, une demande, un chat ou un contenu via /report, avec ou sans compte. Toute suspicion d'exploitation, de traite des êtres humains ou de mineur est transmise sans délai à la police. Toute personne qui apparaît dans un contenu peut en demander le retrait via /removal.",
        "9. Mesures et recours. Si nous restreignons un contenu ou un compte, tu reçois une motivation : ce que nous avons décidé, pourquoi, sa portée et si la décision était automatisée. Tu peux faire appel dans l'app ; une personne qui n'a pas pris la première décision la réexamine. Tu peux aussi t'adresser à un organe agréé de règlement extrajudiciaire des litiges ou au tribunal.",
        "10. Limites de la protection. Le téléchargement et le transfert sont désactivés et chaque affichage porte un filigrane visible et un filigrane invisible, mais aucune technologie ne peut empêcher totalement la copie, par exemple en filmant un écran.",
        "11. Contact. Les autorités, les utilisateurs et les organisations peuvent joindre notre point de contact via /legal/contact.",
        "12. Modifications. Nous annonçons les modifications à l'avance. Les modifications importantes nécessitent ton nouvel accord.",
      ],
    },
    privacy: {
      title: "Déclaration de confidentialité",
      summary: ["Seuls ton nom d'utilisateur et ton avatar sont affichés.", "Nous demandons ton consentement explicite, car les demandes et les contenus peuvent révéler quelque chose de ta vie sexuelle.", "La vérification d'âge nous donne un oui ou un non, jamais ta pièce d'identité.", "Tu peux télécharger tes données ou supprimer ton compte dans Réglages."],
      body: [
        "1. Qui nous sommes. ByRequest est responsable du traitement des données décrites ici. Contact : privacy@byrequest.me. Notre délégué à la protection des données est joignable à la même adresse.",
        "2. Ce que les autres voient. Ton nom d'utilisateur, ton avatar et, pour les créateurs, les informations de profil qu'ils choisissent d'afficher. Jamais ton nom, ton e-mail ou ta localisation.",
        "3. Données sensibles. Les demandes, deals, chats et contenus peuvent révéler quelque chose de ta vie sexuelle. Nous ne les traitons qu'avec ton consentement explicite (RGPD art. 9(2)(a)), donné à l'inscription, et uniquement pour faire fonctionner le service. Tu le retires en supprimant ton compte.",
        "4. Vérification d'âge des acheteurs. Notre partenaire de vérification contrôle que tu as 18 ans ou plus. Nous ne recevons que le résultat et la date. Nous ne recevons ni ne conservons ta pièce d'identité, ton nom ou ta date de naissance issus de ce contrôle.",
        "5. Vérification d'identité des créateurs. Un prestataire spécialisé contrôle la pièce d'identité, qu'elle appartient bien à la personne (par exemple avec un selfie en direct) et l'âge minimum. Nous conservons le résultat, une référence, ainsi que le nom légal, la date de naissance et le pays sous forme chiffrée. Nous ne stockons nous mêmes ni copies de pièces d'identité ni données biométriques.",
        "6. Données fiscales des créateurs. Les règles européennes (DAC7) nous obligent à déclarer une fois par an les données et revenus des vendeurs à l'administration fiscale de leur pays. Nous conservons ces données chiffrées et ne les utilisons que pour cette déclaration.",
        "7. Paiements. Les données de carte et bancaires vont au partenaire de paiement. Nous conservons les références, montants et statuts pour la comptabilité.",
        "8. Messages. Les chats sont chiffrés de bout en bout. ByRequest ne peut pas les lire. Un avertissement sur les coordonnées fonctionne uniquement sur ton appareil. Si tu signales un chat, tu choisis ce que tu partages.",
        "9. Filigranes. Chaque affichage dans le coffre porte visiblement ton nom d'utilisateur et une marque invisible, pour remonter jusqu'au compte en cas de fuite. C'est dans l'intérêt des créateurs et de toutes les personnes qui apparaissent.",
        "10. Conservation. Les chats chiffrés sont supprimés 12 mois après la fin d'un deal, les notifications après 12 mois, les coordonnées d'un signalement clôturé après 12 mois. Les données de paiement, fiscales et de vérification sont conservées pendant la durée exigée par la loi. Les signalements et décisions sont conservés aussi longtemps que nécessaire pour la sécurité et les recours juridiques.",
        "11. Tes droits. Accès, copie de tes données (Réglages, Télécharger tes données), rectification, suppression (Réglages, Supprimer ton compte), limitation et opposition. Tu peux porter plainte auprès de l'autorité de protection des données : en Belgique l'Autorité de protection des données, aux Pays Bas l'Autoriteit Persoonsgegevens.",
        "12. Pas de vente de données. Nous ne vendons pas de données personnelles. Messages marketing uniquement avec un consentement distinct et facultatif, que tu peux désactiver à tout moment.",
      ],
    },
    creator_agreement: {
      title: "Contrat créateur",
      summary: [
        "Tu participes librement et choisis chaque demande toi même.",
        "Uniquement du contenu légal et autorisé. Toute personne qui apparaît est adulte, vérifiée et a donné son consentement.",
        "Tu gardes tes droits. L'acheteur reçoit une licence personnelle pour le voir dans son coffre privé pendant la période convenue.",
        "Tu gagnes 80% de la valeur du deal, versés via le partenaire de paiement après le contrôle et le délai d'objection de 24 heures.",
        "Chaque livraison est contrôlée avant d'être mise à disposition. Plaintes, retraits et objections suivent une procédure équitable.",
        "La protection contre la copie réduit le risque de fuite mais ne peut pas l'empêcher complètement.",
      ],
      body: [
        "1. Participation volontaire. Tu décides librement à quelles demandes tu réponds et tu peux refuser ou retirer une offre tant qu'elle n'est pas acceptée. Personne ne peut faire pression sur toi, et tu peux arrêter de créer à tout moment.",
        "2. Contenu autorisé. Tu ne livres que du contenu légal là où tu vis et dans le pays de l'acheteur, conforme à nos conditions et aux règles de nos partenaires de paiement. Est notamment interdit tout ce qui implique des mineurs, une personne n'ayant pas consenti, des actes non consentis ou illégaux, la violence, l'inceste, la zoophilie et l'intoxication.",
        "3. Tes droits sur les fichiers. Tu confirmes avoir créé le contenu ou détenir tous les droits nécessaires pour le livrer, y compris pour la musique, les images et les lieux.",
        "4. Toute personne qui apparaît. Tu apparais toi même dans le contenu tel que vérifié. Toute autre personne qui apparaît doit être vérifiée comme adulte via ByRequest et consentir à être montrée et à cette livraison précise avant sa mise à disposition. Ta propre déclaration ne remplace pas leur vérification ni leur consentement.",
        "5. Licence, pas de cession. Tu restes propriétaire de ton contenu. Pour chaque deal accepté, tu accordes à l'acheteur une licence personnelle, non transférable et non commerciale pour voir la livraison dans son coffre ByRequest privé, pendant la durée de coffre indiquée dans ton offre. Tu n'accordes à ByRequest que les droits nécessaires pour stocker, contrôler, filigraner et montrer le contenu à cet acheteur. Il n'y a pas de cession de tous les droits.",
        "6. Rémunération et versements. Tu gagnes 80% de la valeur du deal. L'acheteur paie des frais de service séparés. Le paiement est traité et versé par le partenaire de paiement de ByRequest sur le compte de versement que tu as configuré chez lui, après que la livraison a passé le contrôle et le délai d'objection de 24 heures, ou plus tôt si l'acheteur libère le paiement. Les versements nécessitent une validation active auprès du prestataire.",
        "7. Contrôle et modération. Chaque livraison passe une vérification automatique du fichier et un contrôle du contenu avant d'être mise à disposition. Une validation technique n'est pas une validation du contenu. Nous pouvons refuser ou retirer un contenu qui enfreint ces règles.",
        "8. Plaintes, retrait et objection. Les acheteurs peuvent contester dans les 24 heures. Une personne compare le fichier à l'offre acceptée. Si l'objection est fondée, l'acheteur est remboursé et le créateur n'est pas payé. Si elle ne l'est pas, le créateur est payé. Un seul litige ne ferme jamais un compte. Toute personne qui apparaît peut demander le retrait. Tu peux contester nos décisions via le support.",
        "9. Limites de la protection contre la copie. Le téléchargement et le transfert sont désactivés et chaque affichage porte un filigrane visible et un filigrane invisible. Cela réduit le risque et aide à retrouver les fuites, mais ne peut pas empêcher la copie avec un autre appareil. Nous agissons contre les fuites que nous trouvons, sans pouvoir garantir leur suppression.",
        "10. Identité et vie privée. Ton nom légal et ta pièce d'identité ne sont pas affichés sur ton profil. La vérification est nécessaire pour les paiements et la sécurité et est assurée par un prestataire spécialisé.",
        "11. Impôts. Tu es responsable de tes propres impôts. Les règles européennes (DAC7) obligent ByRequest à déclarer une fois par an tes données et revenus à l'administration fiscale. Les versements attendent que tu aies fourni tes données fiscales.",
        "12. Uniquement en ligne, sans pression. Rencontrer des acheteurs en personne, proposer des services sexuels en personne, payer ou discuter en dehors de ByRequest est interdit. Les organisations d'aide reconnues pour les créateurs et les travailleurs du sexe peuvent te contacter via ByRequest ; leurs messages portent leur nom. Si quelqu'un fait pression sur toi ou te contrôle, signale le via /report ou appelle le 112.",
        "13. Mesures et recours. Si nous restreignons ton compte ou refusons une livraison, tu reçois les raisons et tu peux faire appel.",
        "14. Résiliation. Tu peux fermer ton compte à tout moment. Les licences déjà accordées pour des deals terminés restent valables pendant leur période convenue.",
      ],
    },
  },
  "fr|2026-11-draft-3": {
    terms: {
      title: "Conditions d'utilisation",
      summary: ["ByRequest est réservé aux adultes, et les acheteurs confirment leur âge une fois avant de payer.", "Les créateurs décident librement de répondre. Personne ne peut faire pression sur personne.", "Chat, paiement et livraison restent sur ByRequest. Pas de rencontre en personne.", "Chaque mesure que nous prenons est motivée et peut faire l'objet d'un recours."],
      body: [
        "1. Qui peut utiliser ByRequest. Tu dois avoir 18 ans ou plus et être autorisé à utiliser des services pour adultes là où tu vis. Les acheteurs confirment leur âge une fois auprès de notre partenaire de vérification avant de payer ou d'ouvrir leur coffre. Les créateurs vérifient leur identité et leur âge avant leur première offre.",
        "2. Qui nous sommes et ce qu'est ByRequest. ByRequest est exploité par ByRequest LLC, société à responsabilité limitée de droit du Delaware, États Unis. C'est une place de marché où un acheteur publie une demande avec un budget et où les créateurs qui le souhaitent font une offre. Personne n'est obligé de répondre ni d'accepter. Pour la TVA, ByRequest est le vendeur du service et le point de contact des acheteurs.",
        "3. Uniquement en ligne. ByRequest est destiné à du contenu livré en ligne. Se rencontrer en personne, proposer ou demander des services sexuels en personne, payer en dehors de ByRequest et partager ses coordonnées est interdit. Le faire met fin à la protection du contrôle, du remboursement et du support.",
        "4. Prix et paiement. Les prix sont affichés TVA comprise. L'acheteur paie via notre partenaire de paiement, qui conserve l'argent jusqu'à la livraison. Le créateur est payé une fois que la livraison a passé le contrôle et le délai d'objection, ou plus tôt si l'acheteur libère le paiement. Le débit apparaît sous le nom BRQ DIGITAL.",
        "5. Droit de rétractation. Le contenu est réalisé sur commande et livré numériquement. En acceptant une offre, tu demandes au créateur de commencer immédiatement et tu reconnais perdre le droit de rétractation de 14 jours dès que le contenu est livré dans ton coffre. Tes droits si une livraison ne correspond pas à l'offre restent intacts.",
        "6. Interdit. Tout contenu impliquant des mineurs ou une personne présentée comme mineure, une personne qui n'a pas consenti, des actes non consentis ou illégaux, de la violence réelle ou simulée, l'inceste, la zoophilie, l'intoxication, ou tout ce qui enfreint la loi ou les règles des réseaux de cartes. Faire pression sur une autre personne, l'exploiter ou la contrôler est interdit et signalé à la police.",
        "7. Objections. Un acheteur peut contester dans les 24 heures après la mise à disposition du contenu. Une personne compare le fichier à l'offre acceptée. S'il ne correspond pas, l'acheteur est remboursé intégralement. S'il correspond, le créateur est payé. Une seule objection ne ferme jamais un compte ; une mauvaise foi répétée, si.",
        "8. Signalements. Tout le monde peut signaler un profil, une demande, un chat ou un contenu via /report, avec ou sans compte. Toute suspicion d'exploitation, de traite des êtres humains ou de mineur est transmise sans délai à la police. Toute personne qui apparaît dans un contenu peut en demander le retrait via /removal.",
        "9. Mesures et recours. Si nous restreignons un contenu ou un compte, tu reçois une motivation : ce que nous avons décidé, pourquoi, sa portée et si la décision était automatisée. Tu peux faire appel dans l'app ; une personne qui n'a pas pris la première décision la réexamine. Tu peux aussi t'adresser à un organe agréé de règlement extrajudiciaire des litiges ou au tribunal.",
        "10. Limites de la protection. Le téléchargement et le transfert sont désactivés et chaque affichage porte un filigrane visible et un filigrane invisible, mais aucune technologie ne peut empêcher totalement la copie, par exemple en filmant un écran.",
        "11. Contact. Les autorités, les utilisateurs et les organisations peuvent joindre notre point de contact via /legal/contact.",
        "12. Modifications. Nous annonçons les modifications à l'avance. Les modifications importantes nécessitent ton nouvel accord.",
      ],
    },
    privacy: {
      title: "Déclaration de confidentialité",
      summary: ["Seuls ton nom d'utilisateur et ton avatar sont affichés.", "Nous demandons ton consentement explicite, car les demandes et les contenus peuvent révéler quelque chose de ta vie sexuelle.", "La vérification d'âge nous donne un oui ou un non, jamais ta pièce d'identité.", "Tu peux télécharger tes données ou supprimer ton compte dans Réglages."],
      body: [
        "1. Qui nous sommes. ByRequest LLC, société à responsabilité limitée de droit du Delaware, États Unis, est responsable du traitement des données décrites ici. Contact : privacy@byrequest.me. Notre délégué à la protection des données est joignable à la même adresse.",
        "2. Ce que les autres voient. Ton nom d'utilisateur, ton avatar et, pour les créateurs, les informations de profil qu'ils choisissent d'afficher. Jamais ton nom, ton e-mail ou ta localisation.",
        "3. Données sensibles. Les demandes, deals, chats et contenus peuvent révéler quelque chose de ta vie sexuelle. Nous ne les traitons qu'avec ton consentement explicite (RGPD art. 9(2)(a)), donné à l'inscription, et uniquement pour faire fonctionner le service. Tu le retires en supprimant ton compte.",
        "4. Vérification d'âge des acheteurs. Notre partenaire de vérification contrôle que tu as 18 ans ou plus. Nous ne recevons que le résultat et la date. Nous ne recevons ni ne conservons ta pièce d'identité, ton nom ou ta date de naissance issus de ce contrôle.",
        "5. Vérification d'identité des créateurs. Un prestataire spécialisé contrôle la pièce d'identité, qu'elle appartient bien à la personne (par exemple avec un selfie en direct) et l'âge minimum. Nous conservons le résultat, une référence, ainsi que le nom légal, la date de naissance et le pays sous forme chiffrée. Nous ne stockons nous mêmes ni copies de pièces d'identité ni données biométriques.",
        "6. Données fiscales des créateurs. Les règles européennes (DAC7) nous obligent à déclarer une fois par an les données et revenus des vendeurs à l'administration fiscale de leur pays. Nous conservons ces données chiffrées et ne les utilisons que pour cette déclaration.",
        "7. Paiements. Les données de carte et bancaires vont au partenaire de paiement. Nous conservons les références, montants et statuts pour la comptabilité.",
        "8. Messages. Les chats sont chiffrés de bout en bout. ByRequest ne peut pas les lire. Un avertissement sur les coordonnées fonctionne uniquement sur ton appareil. Si tu signales un chat, tu choisis ce que tu partages.",
        "9. Filigranes. Chaque affichage dans le coffre porte visiblement ton nom d'utilisateur et une marque invisible, pour remonter jusqu'au compte en cas de fuite. C'est dans l'intérêt des créateurs et de toutes les personnes qui apparaissent.",
        "10. Conservation. Les chats chiffrés sont supprimés 12 mois après la fin d'un deal, les notifications après 12 mois, les coordonnées d'un signalement clôturé après 12 mois. Les données de paiement, fiscales et de vérification sont conservées pendant la durée exigée par la loi. Les signalements et décisions sont conservés aussi longtemps que nécessaire pour la sécurité et les recours juridiques.",
        "11. Tes droits. Accès, copie de tes données (Réglages, Télécharger tes données), rectification, suppression (Réglages, Supprimer ton compte), limitation et opposition. Tu peux porter plainte auprès de l'autorité de protection des données : en Belgique l'Autorité de protection des données, aux Pays Bas l'Autoriteit Persoonsgegevens.",
        "12. Pas de vente de données. Nous ne vendons pas de données personnelles. Messages marketing uniquement avec un consentement distinct et facultatif, que tu peux désactiver à tout moment.",
      ],
    },
  },
  "fr|2026-11-draft-1": {
    participant_consent: {
      title: "Consentement à apparaître",
      summary: ["Tu es adulte et tu apparais de ton plein gré.", "Tu acceptes que cette livraison soit mise à disposition d'un seul acheteur, dans son coffre privé.", "Tu peux retirer ton accord à tout moment ; la livraison est alors retirée du coffre."],
      body: [
        "1. Je confirme avoir au moins 18 ans et avoir vérifié mon identité via le partenaire de vérification de ByRequest.",
        "2. J'apparais dans ce contenu de mon plein gré et sans pression.",
        "3. Je consens à ce que cette livraison précise soit mise à disposition d'un seul acheteur, pour un visionnage privé dans son coffre ByRequest, pendant la période indiquée dans l'offre.",
        "4. Toute autre utilisation est interdite sauf consentement séparé de ma part.",
        "5. Je peux retirer ce consentement à tout moment via mon lien personnel ou via /removal. La livraison est alors retirée du coffre.",
      ],
    },
  },
};

export const DRAFT_NOTE = { nl: NL_DRAFT, fr: FR_DRAFT } as const;

/* The translation for a stored document, or null when the reader's language is English or no
   translation exists for that exact version. */
/* Versions whose wording only changed in English details (such as a contact address already updated
   in the translations above) reuse the translation of the version before. */
const SAME_AS: Record<string, string> = { "privacy|2026-11-draft-4": "2026-11-draft-3" };
export function legalIn(locale: string, kind: Kind, version: string): Tr | null {
  return LEGAL_TR[`${locale}|${SAME_AS[`${kind}|${version}`] ?? version}`]?.[kind] ?? null;
}

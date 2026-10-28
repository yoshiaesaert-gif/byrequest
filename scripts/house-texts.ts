/* Hand written titles and details of the team requests in all three languages, so a visitor on the
   Dutch site reads Dutch without waiting for machine translation. The persona's own language is the
   original; the other two are stored as manual translations. Suggestive, never explicit. */
type T = [title: string, details: string];
export const TEXTS: Record<string, { nl: T; en: T; fr: T }> = {
  jeroen_gent: {
    nl: ["na de fitness, shirt mag uit", "Film hoe je thuiskomt na de training, nog bezweet, shirt langzaam uit en zo de douche in. Niks geacteerd, gewoon jij en die blik in de spiegel."],
    en: ["after the gym, shirt can come off", "Film yourself getting home from training, still sweaty, shirt slowly off and into the shower. Nothing acted, just you and that look in the mirror."],
    fr: ["après la salle, le t-shirt peut tomber", "Filme ton retour de l'entraînement, encore en sueur, t-shirt qui tombe doucement et direction la douche. Rien de joué, juste toi et ce regard dans le miroir."],
  },
  "lucie.bxl": {
    nl: ["Fluister me in slaap", "Een zachte, warme stem vlak bij de microfoon. Zeg mijn naam, Lucie, en vertel wat je zou doen als je nu naast me lag. Langzaam, een beetje ondeugend."],
    en: ["Whisper me to sleep", "A soft, warm voice close to the mic. Say my name, Lucie, and tell me what you would do if you were lying next to me right now. Slow, a little naughty."],
    fr: ["Chuchote moi jusqu'au sommeil", "Une voix douce et chaude tout près du micro. Dis mon prénom, Lucie, et raconte ce que tu ferais si tu étais allongé à côté de moi maintenant. Lentement, un peu coquin."],
  },
  tomvdb: {
    nl: ["welk setje voor zaterdag?", "Zaterdag een feest en ik kan niet kiezen. Stuur 6 fotos van outfits die jij zou dragen, en het laatste mag het setje eronder zijn. Spiegel in je slaapkamer is perfect."],
    en: ["which set for saturday?", "Party on saturday and I can't choose. Send 6 photos of outfits you would wear, and the last one can be the set underneath. A mirror in your bedroom is perfect."],
    fr: ["quel ensemble pour samedi ?", "Soirée samedi et je n'arrive pas à choisir. Envoie 6 photos de tenues que tu porterais, et la dernière peut être l'ensemble en dessous. Le miroir de ta chambre, c'est parfait."],
  },
  mark_r: {
    nl: ["Hotelkamer, deur op slot", "5 minuten in een hotelkamer of iets wat erop lijkt. Badjas, gedimd licht, je kijkt in de camera alsof ik net binnenkom. Laat de badjas maar langzaam zakken."],
    en: ["Hotel room, door locked", "5 minutes in a hotel room or something like it. Bathrobe, dimmed light, you look into the camera as if I just walked in. Let the robe slip slowly."],
    fr: ["Chambre d'hôtel, porte fermée", "5 minutes dans une chambre d'hôtel ou quelque chose qui y ressemble. Peignoir, lumière tamisée, tu regardes la caméra comme si je venais d'entrer. Laisse glisser le peignoir doucement."],
  },
  "stijn.antwerpen": {
    nl: ["Verras me, durf wat", "Ik laat het aan jou over, maar maak het spannend. Wat zou jij maken als niemand meekeek? Hoe gewaagder, hoe liever. Het budget is serieus bedoeld."],
    en: ["Surprise me, be bold", "I leave it to you, but make it exciting. What would you make if nobody was watching? The bolder, the better. The budget is meant seriously."],
    fr: ["Surprends moi, ose", "Je te laisse carte blanche, mais rends ça excitant. Que ferais tu si personne ne regardait ? Plus c'est osé, mieux c'est. Le budget est sérieux."],
  },
  pieterjan: {
    nl: ["Wakker worden met jouw stem", "2 minuten, je ligt nog in bed onder de lakens en je vertelt hoe je me wakker zou maken. Hees en zacht. Vlaams accent is een plus."],
    en: ["Wake up to your voice", "2 minutes, you're still in bed under the sheets telling me how you would wake me up. Husky and soft. A Flemish accent is a plus."],
    fr: ["Me réveiller avec ta voix", "2 minutes, tu es encore au lit sous les draps et tu me racontes comment tu me réveillerais. Voix rauque et douce. Un accent flamand, c'est un plus."],
  },
  julien_lg: {
    nl: ["Thuistraining, alleen in short", "Je workout thuis in alleen een short. Pushups, planken, het zweet dat begint te glanzen. Gsm op statief en dichtbij. Gezicht hoeft niet."],
    en: ["Home workout, shorts only", "Your home workout in nothing but shorts. Push ups, planks, the sweat starting to shine. Phone on a tripod and close. No face needed."],
    fr: ["Séance à la maison, en short seulement", "Ta séance à la maison, juste en short. Pompes, gainage, la sueur qui commence à briller. Téléphone sur trépied et de près. Visage pas nécessaire."],
  },
  dennis1987: {
    nl: ["zondag, alleen een groot hemd", "10 fotos van een luie zondag in alleen een groot hemd. Lakens, blote benen, die blik over je schouder. Plagend mag, sfeer staat voorop."],
    en: ["sunday, just a big shirt", "10 photos of a lazy sunday in nothing but a big shirt. Sheets, bare legs, that look over your shoulder. Teasing is welcome, mood comes first."],
    fr: ["dimanche, juste une grande chemise", "10 photos d'un dimanche paresseux avec seulement une grande chemise. Draps, jambes nues, ce regard par dessus l'épaule. Taquin bienvenu, l'ambiance avant tout."],
  },
  "alex.w": {
    nl: ["lees me iets ondeugends voor", "Een diepe stem die 5 minuten iets prikkelends voorleest. Een spannend verhaal, jouw keuze. Laat de pauzes maar duren."],
    en: ["read me something naughty", "A deep voice reading something teasing for 5 minutes. A steamy story, your pick. Let the pauses last."],
    fr: ["lis moi quelque chose de coquin", "Une voix grave qui lit quelque chose d'excitant pendant 5 minutes. Une histoire torride, ton choix. Fais durer les silences."],
  },
  kevin_hasselt: {
    nl: ["douche na een lange dag", "12 minuten, stoom, warm licht, de camera net buiten de douche. Geen haast, laat het water het werk doen. Deadline een week, ik betaal voor kwaliteit."],
    en: ["shower after a long day", "12 minutes, steam, warm light, the camera just outside the shower. No rush, let the water do the work. Deadline is a week, I pay for quality."],
    fr: ["douche après une longue journée", "12 minutes, vapeur, lumière chaude, la caméra juste à l'extérieur de la douche. Sans te presser, laisse l'eau faire le travail. Une semaine de délai, je paie pour la qualité."],
  },
  "noa.utrecht": {
    nl: ["Na het hardlopen, nog nahijgen", "Net terug van het lopen, shirt uit, druppels op je huid, nog nahijgen tegen de muur. Langzaam en echt. Gezicht hoeft niet."],
    en: ["After the run, still breathless", "Just back from a run, shirt off, drops on your skin, still catching your breath against the wall. Slow and real. No face needed."],
    fr: ["Après le footing, encore essoufflé", "De retour du footing, t-shirt enlevé, gouttes sur la peau, encore essoufflé contre le mur. Lent et vrai. Visage pas nécessaire."],
  },
  seb_namur: {
    nl: ["Voor je uitgaat, 8 fotos", "8 fotos terwijl je je klaarmaakt om uit te gaan. Kousen aan, jurk nog open, gedimd licht voor de spiegel. Een klein briefje erbij en ik smelt."],
    en: ["Before you go out, 8 photos", "8 photos while you get ready to go out. Stockings on, dress still open, dim light in front of the mirror. Add a little note and I melt."],
    fr: ["Avant de sortir, 8 photos", "8 photos pendant que tu te prépares pour sortir. Bas enfilés, robe encore ouverte, lumière tamisée devant le miroir. Si tu ajoutes un petit mot, je fonds."],
  },
  bart_k: {
    nl: ["Een verjaardagscadeau, alleen voor mij", "Ik word 41 en wil iets wat niemand anders ziet. 5 minuten, je fluistert gelukkige verjaardag Bart en pakt jezelf daarna langzaam uit. De rest laat ik aan jou."],
    en: ["A birthday present, just for me", "I'm turning 41 and want something nobody else sees. 5 minutes, you whisper happy birthday Bart and then slowly unwrap yourself. The rest is up to you."],
    fr: ["Un cadeau d'anniversaire, rien que pour moi", "J'ai 41 ans et je veux quelque chose que personne d'autre ne verra. 5 minutes, tu chuchotes joyeux anniversaire Bart puis tu te déballes lentement. Le reste, c'est toi qui choisis."],
  },
  "ryan.ams": {
    nl: ["kleedkamer, na de pomp", "12 fotos voor de spiegel na het trainen, shirt uit, broek laag op de heupen. Die pomp is de bedoeling. Gezicht optioneel."],
    en: ["locker room, after the pump", "12 pics in front of the mirror after training, shirt off, shorts low on the hips. The pump is the point. Face optional."],
    fr: ["vestiaire, après l'effort", "12 photos devant le miroir après l'entraînement, torse nu, short bas sur les hanches. C'est le gonflement qui compte. Visage optionnel."],
  },
  wout: {
    nl: ["vertel wat je aanhebt", "Een voice note van 4 minuten alsof we samenwonen en je net thuiskomt. Vertel wat je aanhebt en wat je straks wil doen. Laat me raden."],
    en: ["tell me what you're wearing", "A 4 minute voice note as if we live together and you just got home. Tell me what you're wearing and what you want to do later. Let me guess."],
    fr: ["dis moi ce que tu portes", "Un message vocal de 4 minutes comme si on vivait ensemble et que tu rentrais. Dis moi ce que tu portes et ce que tu veux faire tout à l'heure. Laisse moi deviner."],
  },
  "maxime.c": {
    nl: ["Avondritueel, bij kaarslicht", "Je avondritueel bij kaarslicht. Bad, olie op je huid, zijden pyjama die nog openhangt. 10 minuten, alsof ik in de kamer ben. Niet geacteerd aub."],
    en: ["Evening ritual, by candlelight", "Your evening ritual by candlelight. Bath, oil on your skin, a silk pyjama still hanging open. 10 minutes, as if I'm in the room. Not acted please."],
    fr: ["Rituel du soir, à la bougie", "Ton rituel du soir à la lueur des bougies. Bain, huile sur la peau, pyjama en soie encore ouvert. 10 minutes, comme si j'étais dans la pièce. Pas de mise en scène svp."],
  },
  thomas_lv: {
    nl: ["korte flex, zonder shirt", "3 minuten flexen na je training, zonder shirt, lampje van opzij voor de schaduwen. Snel nodig, vandaag of morgen."],
    en: ["quick flex, no shirt", "3 minutes flexing after your workout, no shirt, a lamp from the side for the shadows. Need it fast, today or tomorrow."],
    fr: ["flex rapide, sans t-shirt", "3 minutes de flex après l'entraînement, sans t-shirt, une lampe sur le côté pour les ombres. Besoin rapide, aujourd'hui ou demain."],
  },
  dave_eindhoven: {
    nl: ["Benen, kousen en hakken", "5 fotos van je benen in zwarte kousen en hakken, op de rand van het bed. Geen gezicht nodig. Ja, ik weet wat ik wil."],
    en: ["Legs, stockings and heels", "5 photos of your legs in black stockings and heels, on the edge of the bed. No face needed. Yes, I know what I want."],
    fr: ["Jambes, bas et talons", "5 photos de tes jambes en bas noirs et talons, sur le bord du lit. Visage pas nécessaire. Oui, je sais ce que je veux."],
  },
  olivier: {
    nl: ["een lange avond, op jouw manier", "Schenk een glas wijn in, zet muziek op en neem me 10 minuten mee. Dansen, plagen, iets uittrekken als het goed voelt. Neem je tijd, ik betaal voor kwaliteit."],
    en: ["a slow evening, your way", "Pour a glass of wine, put on music and take me along for 10 minutes. Dance, tease, take something off if it feels right. Take your time, I'm paying for quality."],
    fr: ["une longue soirée, à ta façon", "Sers toi un verre de vin, mets de la musique et emmène moi pendant 10 minutes. Danse, taquine, enlève quelque chose si ça te semble juste. Prends ton temps, je paie pour la qualité."],
  },
  "robbe.leuven": {
    nl: ["fluister wat je zou doen", "Een fluisterbericht van 3 minuten, vlak voor het slapen. Zeg mijn naam, Robbe, en vertel wat je zou doen als ik nu binnenkwam."],
    en: ["whisper what you would do", "A 3 minute whispered message, right before sleep. Say my name, Robbe, and tell me what you would do if I walked in now."],
    fr: ["chuchote ce que tu ferais", "Un message chuchoté de 3 minutes, juste avant de dormir. Dis mon prénom, Robbe, et raconte ce que tu ferais si j'entrais maintenant."],
  },
  nico_bx: {
    nl: ["Na middernacht, overhemd open", "Je komt laat thuis van een feest, overhemd open, das los, je laat je op de bank vallen en praat tegen me. 6 minuten. Een beetje dronken van de avond mag."],
    en: ["After midnight, shirt open", "You get home late from a party, shirt open, tie loose, you drop onto the couch and talk to me. 6 minutes. A little tipsy from the night is fine."],
    fr: ["Après minuit, chemise ouverte", "Tu rentres tard d'une soirée, chemise ouverte, cravate desserrée, tu te laisses tomber sur le canapé et tu me parles. 6 minutes. Un peu éméché de la soirée, c'est permis."],
  },
  jasper_r: {
    nl: ["werkoutfit, laag voor laag uit", "8 fotos van je net thuis na het werk, terwijl je je werkkleding uittrekt, laag voor laag. Uniform (kok, zorg, bouw) is nog beter."],
    en: ["work outfit, off layer by layer", "8 photos of you just home from work, taking off your work clothes layer by layer. A uniform (chef, care, construction) is even better."],
    fr: ["tenue de travail, couche par couche", "8 photos de toi rentré du travail, en enlevant ta tenue couche par couche. Un uniforme (cuisine, soins, chantier), c'est encore mieux."],
  },
  ben_ghent: {
    nl: ["lange douche, geen haast", "15 minuten. Warm licht, stoom, de deur op een kier. Geen woorden nodig, alleen het water en jij. Ik wacht graag een week op iets wat goed gedaan is."],
    en: ["long shower, no rush", "15 minutes. Warm light, steam, the door ajar. No words needed, just the water and you. Happy to wait a week for something done properly."],
    fr: ["longue douche, sans te presser", "15 minutes. Lumière chaude, vapeur, la porte entrouverte. Pas besoin de parler, juste l'eau et toi. J'attends volontiers une semaine pour quelque chose de bien fait."],
  },
  koen_brugge: {
    nl: ["Kook voor me, alleen een schort", "Film jezelf terwijl je kookt in alleen een schort, en praat tegen me alsof ik aan tafel zit. 6 minuten. Draai je af en toe om ;)"],
    en: ["Cook for me, apron only", "Film yourself cooking in nothing but an apron, and talk to me as if I'm sitting at the table. 6 minutes. Turn around now and then ;)"],
    fr: ["Cuisine pour moi, juste un tablier", "Filme toi en train de cuisiner avec juste un tablier, et parle moi comme si j'étais à table. 6 minutes. Retourne toi de temps en temps ;)"],
  },
  antoine_l: {
    nl: ["Je stem, nog warm van het bed", "Een voice note van 5 minuten met je hese ochtendstem, nog onder de lakens. Vertel wat je droomde, hoe spannender hoe beter. Ik ben gek op accenten."],
    en: ["Your voice, still warm from bed", "A 5 minute voice note in your husky morning voice, still under the sheets. Tell me what you dreamt, the steamier the better. I love accents."],
    fr: ["Ta voix, encore chaude du lit", "Un message vocal de 5 minutes avec ta voix rauque du matin, encore sous les draps. Raconte ton rêve, plus il est chaud mieux c'est. J'adore les accents."],
  },
  sven: {
    nl: ["Stretchen in strakke sportkleding", "8 minuten stretchen in je woonkamer, strakke sportkleding, camera laag. Langzaam, diep ademen, af en toe een blik naar de lens. Praten hoeft niet."],
    en: ["Stretching in tight activewear", "8 minutes of stretching in your living room, tight activewear, camera low. Slow, deep breaths, a glance at the lens now and then. No talking needed."],
    fr: ["Étirements en tenue moulante", "8 minutes d'étirements dans ton salon, tenue de sport moulante, caméra basse. Lentement, respiration profonde, un regard vers l'objectif de temps en temps. Pas besoin de parler."],
  },
  mike_tilburg: {
    nl: ["net uit de douche, alleen een handdoek", "6 fotos net na het douchen, handdoek laag om de heupen, druppels op je borst, beslagen spiegel. Geen gezicht nodig."],
    en: ["fresh out of the shower, towel only", "6 photos right after the shower, towel low on the hips, drops on your chest, a fogged up mirror. No face needed."],
    fr: ["tout juste sorti de la douche, juste une serviette", "6 photos juste après la douche, serviette basse sur les hanches, gouttes sur le torse, miroir embué. Visage pas nécessaire."],
  },
  lars: {
    nl: ["na de wedstrijd, in de kleedkamer", "Net gespeeld? 5 minuten in je tenue in de kleedkamer, modder mag, en dan richting de douche. Voetbal, rugby, hockey, maakt niet uit."],
    en: ["post game, in the locker room", "Just played? 5 minutes in your kit in the locker room, mud is fine, then heading for the shower. Football, rugby, hockey, whatever."],
    fr: ["après le match, au vestiaire", "Tu viens de jouer ? 5 minutes en tenue au vestiaire, la boue c'est permis, puis direction la douche. Foot, rugby, hockey, peu importe."],
  },
  "yannick.charleroi": {
    nl: ["Een plagerig filmpje, alleen voor mij", "Ik woon even alleen en wil een filmpje dat alleen voor mij is. 5 minuten, plagerig, een beetje uitdagend. Lingerie mag. Alvast merci."],
    en: ["A teasing video, just for me", "I'm living alone for now and want a video that's only for me. 5 minutes, teasing, a little provocative. Lingerie is welcome. Thanks in advance."],
    fr: ["Une vidéo taquine, rien que pour moi", "Je vis seul en ce moment et je voudrais une vidéo rien que pour moi. 5 minutes, taquine, un peu provocante. La lingerie est bienvenue. Merci d'avance."],
  },
  "joris.nl": {
    nl: ["zeg wat je aan me zou doen", "Rotweek gehad. 2 minuten een lage stem die me vertelt wat je met me zou doen om me te laten ontspannen. Rustig, dichtbij, geen haast."],
    en: ["tell me what you'd do to me", "Had a rough week. 2 minutes of a low voice telling me what you would do to help me unwind. Calm, close, no rush."],
    fr: ["dis moi ce que tu me ferais", "Semaine pourrie. 2 minutes d'une voix grave qui me dit ce que tu me ferais pour me détendre. Calme, proche, sans te presser."],
  },
};

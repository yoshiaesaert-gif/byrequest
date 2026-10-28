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
    nl: ["Lingerie try on, 6 sets", "6 foto's in 6 verschillende sets lingerie, voor de spiegel. Zeg bij elke foto welke jouw favoriet is en waarom. Hoe gewaagder hoe beter."],
    en: ["Lingerie try on, 6 sets", "6 pics in 6 different lingerie sets, in front of the mirror. Tell me with each one which is your favourite and why. The bolder the better."],
    fr: ["Essayage lingerie, 6 ensembles", "6 photos dans 6 ensembles de lingerie différents, devant le miroir. Dis moi pour chacune laquelle tu préfères et pourquoi. Plus c'est osé, mieux c'est."],
  },
  mark_r: {
    nl: ["Hotelkamer, deur op slot", "5 minuten in een hotelkamer of iets wat erop lijkt. Badjas, gedimd licht, je kijkt in de camera alsof ik net binnenkom. Laat de badjas maar langzaam zakken."],
    en: ["Hotel room, door locked", "5 minutes in a hotel room or something like it. Bathrobe, dimmed light, you look into the camera as if I just walked in. Let the robe slip slowly."],
    fr: ["Chambre d'hôtel, porte fermée", "5 minutes dans une chambre d'hôtel ou quelque chose qui y ressemble. Peignoir, lumière tamisée, tu regardes la caméra comme si je venais d'entrer. Laisse glisser le peignoir doucement."],
  },
  "stijn.antwerpen": {
    nl: ["Alpha God: zet me op mijn plaats", "Zoek een zelfzekere straight gast die me op mijn plaats zet. Praat neer op me, laat me je aandacht verdienen, zeg wat ik waard ben. Dominant, verbaal, geen genade. Gezicht mag, hoeft niet."],
    en: ["Alpha God: show me where I belong", "Looking for a confident straight guy who shows me where I belong. Talk down to me, make me earn your attention, tell me what I'm worth. Dominant, verbal, no mercy. Face optional."],
    fr: ["Alpha God : remets moi à ma place", "Je cherche un hétéro sûr de lui qui me remet à ma place. Parle moi de haut, fais moi mériter ton attention, dis moi ce que je vaux. Dominant, verbal, sans pitié. Visage facultatif."],
  },
  pieterjan: {
    nl: ["Hijgend wakker worden, 2 minuten", "Voice note van 2 minuten, net wakker, nog onder de lakens. Adem zwaar en vertel wat je nu het liefst zou doen. Vlaams accent is een plus."],
    en: ["Breathless good morning, 2 minutes", "A 2 minute voice note, just woken up, still under the sheets. Breathe heavy and tell me what you'd most like to do right now."],
    fr: ["Bonjour haletant, 2 minutes", "Un vocal de 2 minutes, à peine réveillée, encore sous les draps. Respire fort et dis moi ce que tu aimerais faire là, tout de suite."],
  },
  julien_lg: {
    nl: ["Thuistraining, alleen in short", "Je workout thuis in alleen een short. Pushups, planken, het zweet dat begint te glanzen. Gsm op statief en dichtbij. Gezicht hoeft niet."],
    en: ["Home workout, shorts only", "Your home workout in nothing but shorts. Push ups, planks, the sweat starting to shine. Phone on a tripod and close. No face needed."],
    fr: ["Séance à la maison, en short seulement", "Ta séance à la maison, juste en short. Pompes, gainage, la sueur qui commence à briller. Téléphone sur trépied et de près. Visage pas nécessaire."],
  },
  dennis1987: {
    nl: ["Zondag in bed, niets eronder", "10 foto's van een luie zondag in bed. Alleen een laken of een groot shirt, en niets eronder. Hoe meer je laat zien, hoe beter."],
    en: ["Sunday in bed, nothing underneath", "10 pics of a lazy Sunday in bed. Just a sheet or a big shirt, and nothing underneath. The more you show, the better."],
    fr: ["Dimanche au lit, rien dessous", "10 photos d'un dimanche paresseux au lit. Juste un drap ou un grand t-shirt, et rien dessous. Plus tu en montres, mieux c'est."],
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
    nl: ["Lingerie onder je jurk, 8 foto's", "8 foto's: eerst in je jurk, dan laat je stap voor stap zien wat eronder zit. Spiegel, gedimd licht."],
    en: ["Lingerie under the dress, 8 pics", "8 pics: first in your dress, then show me step by step what's underneath. Mirror, dim light."],
    fr: ["Lingerie sous la robe, 8 photos", "8 photos : d'abord en robe, puis montre moi pas à pas ce qu'il y a dessous. Miroir, lumière tamisée."],
  },
  bart_k: {
    nl: ["Trage striptease, alleen voor mij", "5 minuten, muziek die jij goed vindt, stuk voor stuk uit. Laat me wachten. Kijk af en toe in de camera alsof je weet dat ik kijk."],
    en: ["Slow strip tease, just for me", "5 minutes, music you like, one piece at a time. Make me wait. Look into the camera now and then like you know I'm watching."],
    fr: ["Strip tease lent, rien que pour moi", "5 minutes, une musique que tu aimes, pièce par pièce. Fais moi attendre. Regarde la caméra de temps en temps comme si tu savais que je regarde."],
  },
  "ryan.ams": {
    nl: ["Alpha in de kleedkamer, 12 foto's", "12 foto's na je training, nog gepompt. Dominante poses, die grijns, alsof ik blij mag zijn dat ik mag kijken. Shirt uit, broek laag. Gezicht optioneel."],
    en: ["Alpha in the locker room, 12 pics", "12 pics after training, still pumped. Dominant poses, that smirk, like I should be grateful to look. Shirt off, shorts low. Face optional."],
    fr: ["Alpha au vestiaire, 12 photos", "12 photos après l'entraînement, encore gonflé. Poses dominantes, ce sourire en coin, comme si je devais être reconnaissant de regarder. Torse nu, short bas. Visage facultatif."],
  },
  wout: {
    nl: ["vertel wat je aanhebt", "Een voice note van 4 minuten alsof we samenwonen en je net thuiskomt. Vertel wat je aanhebt en wat je straks wil doen. Laat me raden."],
    en: ["tell me what you're wearing", "A 4 minute voice note as if we live together and you just got home. Tell me what you're wearing and what you want to do later. Let me guess."],
    fr: ["dis moi ce que tu portes", "Un message vocal de 4 minutes comme si on vivait ensemble et que tu rentrais. Dis moi ce que tu portes et ce que tu veux faire tout à l'heure. Laisse moi deviner."],
  },
  "maxime.c": {
    nl: ["Insmeren met olie, heel traag", "10 minuten, gedimd licht, olie op je huid. Neem je tijd, overal, en kijk af en toe in de camera."],
    en: ["Oiling up, really slowly", "10 minutes, dim light, oil on your skin. Take your time, everywhere, and look into the camera now and then."],
    fr: ["Huile sur la peau, très lentement", "10 minutes, lumière tamisée, huile sur ta peau. Prends ton temps, partout, et regarde la caméra de temps en temps."],
  },
  thomas_lv: {
    nl: ["Jerk off video, 3 minuten, geen gezicht", "Solo, alleen jij. Neem je tijd, bouw het rustig op en maak het af op camera. Geen gezicht nodig. Liefst vandaag of morgen."],
    en: ["Jerk off video, 3 minutes, no face", "Solo, just you. Take your time, build it up slowly and finish on camera. No face needed. Today or tomorrow if you can."],
    fr: ["Vidéo de branlette, 3 minutes, sans visage", "En solo, juste toi. Prends ton temps, monte doucement et termine face caméra. Pas besoin de visage. Aujourd'hui ou demain si possible."],
  },
  dave_eindhoven: {
    nl: ["Benen, kousen en hakken", "5 fotos van je benen in zwarte kousen en hakken, op de rand van het bed. Geen gezicht nodig. Ja, ik weet wat ik wil."],
    en: ["Legs, stockings and heels", "5 photos of your legs in black stockings and heels, on the edge of the bed. No face needed. Yes, I know what I want."],
    fr: ["Jambes, bas et talons", "5 photos de tes jambes en bas noirs et talons, sur le bord du lit. Visage pas nécessaire. Oui, je sais ce que je veux."],
  },
  olivier: {
    nl: ["Dirty talk, recht in de camera", "10 minuten. Kijk me aan en vertel precies wat je met me zou doen. Traag, zelfzeker, geen script. Ik betaal voor kwaliteit, niet voor snelheid."],
    en: ["Dirty talk, straight into the camera", "10 minutes. Look at me and tell me exactly what you would do to me. Slow, confident, no script. I'm paying for quality, not speed."],
    fr: ["Dirty talk, droit dans la caméra", "10 minutes. Regarde moi et dis moi exactement ce que tu me ferais. Lent, sûr de toi, sans script. Je paie pour la qualité, pas pour la vitesse."],
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
    nl: ["Alpha God: jij bent de baas", "Straight, gespierd, nul geduld. Commandeer me, laat me je bedanken dat ik mag kijken. Het betalen hoort erbij, dat is net het punt. 6 minuten, recht in de camera."],
    en: ["Alpha God: you're the boss", "Straight, built, zero patience. Order me around and make me thank you for the privilege of watching. Paying is part of it, that's the whole point. 6 minutes, straight into the camera."],
    fr: ["Alpha God : c'est toi le patron", "Hétéro, musclé, zéro patience. Donne moi des ordres et fais moi te remercier d'avoir le droit de regarder. Payer fait partie du jeu, c'est tout l'intérêt. 6 minutes, droit dans la caméra."],
  },
  antoine_l: {
    nl: ["Je stem, nog warm van het bed", "Een voice note van 5 minuten met je hese ochtendstem, nog onder de lakens. Vertel wat je droomde, hoe spannender hoe beter. Ik ben gek op accenten."],
    en: ["Your voice, still warm from bed", "A 5 minute voice note in your husky morning voice, still under the sheets. Tell me what you dreamt, the steamier the better. I love accents."],
    fr: ["Ta voix, encore chaude du lit", "Un message vocal de 5 minutes avec ta voix rauque du matin, encore sous les draps. Raconte ton rêve, plus il est chaud mieux c'est. J'adore les accents."],
  },
  sven: {
    nl: ["Ondergoed try on, draai je om", "8 minuten, 5 slipjes of strings na elkaar. Traag aantrekken, voor de spiegel, en draai je telkens langzaam om voor me."],
    en: ["Underwear try on, turn around", "8 minutes, 5 pairs one after the other. Put them on slowly in front of the mirror and turn around for me every time."],
    fr: ["Essayage de culottes, retourne toi", "8 minutes, 5 culottes l'une après l'autre. Enfile les lentement devant le miroir et retourne toi doucement pour moi à chaque fois."],
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
    nl: ["Kreun mijn naam, 2 minuten", "Voice note van 2 minuten, dicht bij de microfoon. Adem, kreun, en zeg af en toe mijn naam: Joris. Hoe echter hoe beter."],
    en: ["Moan my name, 2 minutes", "A 2 minute voice note, close to the mic. Breathe, moan, and say my name now and then: Joris. The more real the better."],
    fr: ["Gémis mon prénom, 2 minutes", "Un vocal de 2 minutes, tout près du micro. Respire, gémis, et dis mon prénom de temps en temps : Joris. Plus c'est vrai, mieux c'est."],
  },
};

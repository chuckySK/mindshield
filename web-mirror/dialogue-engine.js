/**
 * The Mirror v2.5 — Adaptive Cold Reading, Deep Narrative & Schema Analysis Engine (30 Nodes)
 *
 * Architektura:
 * - 3 otvaracie uzly (Kalibracia temy, tempa rozhodovania a socialnej masky)
 * - 4 specializovane vetvy (Vztahy: 6, Financie/Praca: 6, Zdravie/Stres: 5, Skeptik/Kontrola: 5)
 * - 5 zaverovych a premostovacich uzlov vratane dynamickeho Biometrickeho hacika
 * - Kontextove premostenie otazok (buildContextualQuestion) — otazky reaguju na predosle volby
 * - Hlboky syntetizator (buildDeepReadings) pre:
 *     1) Autenticku 5-kapitolovu vestecku predpoved (bez technickeho zargonu)
 *     2) Vedecku pitvu (vahy tem, latencia, FACS, Schemova terapia J. Younga, krok-za-krokom audit)
 */

export const DOMAIN_META = {
  relationships: {
    label: "Vzťahy a blízkosť",
    shortLabel: "Vzťahy",
    oracleTopic: "vzťah s partnerom alebo blízkym človekom",
    oracleFocusPhrase: "rovnováha medzi tým, koľko srdca dávaš druhým a koľko pochopenia sa ti vracia späť",
    schemaHint: "Opustenie / Emocionálna deprivácia / Sebaobetovanie"
  },
  career_finance: {
    label: "Práca, financie a smerovanie",
    shortLabel: "Práca a financie",
    oracleTopic: "pracovný tlak, financie a nenaplnený potenciál",
    oracleFocusPhrase: "tvoj vnútorný motor, hodnota tvojej práce a túžba po nezávislosti bez cudzieho diktátu",
    schemaHint: "Neúprosné normy / Vyhľadávanie uznania"
  },
  health_stress: {
    label: "Energia, telo a vnútorné preťaženie",
    shortLabel: "Energia a stres",
    oracleTopic: "vnútorné vyčerpanie a signály tela, ktoré dlho potláčaš",
    oracleFocusPhrase: "tichá únava nervového systému, ktorý ide príliš dlho v pohotovostnom režime",
    schemaHint: "Sebaobetovanie / Zraniteľnosť / Emocionálna inhibícia"
  },
  skeptic_control: {
    label: "Kontrola, dôvera a obranný štít",
    shortLabel: "Kontrola a dôvera",
    oracleTopic: "potreba mať veci pod kontrolou a opatrnosť po minulom sklamaní",
    oracleFocusPhrase: "neviditeľný ochranný štít, ktorý si si vybudoval, aby ťa už nikto nemohol prekvapiť ani zneužiť",
    schemaHint: "Nedôvera / Zneužívanie / Neúprosné normy"
  }
};

export const SCHEMA_CATALOG = {
  abandonment: {
    name: "Schéma opustenia a nestability",
    origin: "Vzniká pri skúsenosti s nepredvídateľnými alebo emočne nedostupnými blízkymi osobami.",
    mask: "Prehliadanie varovných signálov vo vzťahu, obava z osamelosti alebo nadmerná snaha udržať pokoj za každú cenu.",
    reframing: "Skutočné bezpečie nevzniká tým, že potlačíš vlastné potreby, aby druhý neodišiel — zdravý vzťah unesie aj otvorený nesúhlas."
  },
  mistrust: {
    name: "Schéma nedôvery a ostražitosti",
    origin: "Obranná reakcia po tom, čo niekto v minulosti zneužil tvoju otvorenosť, lojalitu alebo dôveru.",
    mask: "Neustále skenovanie motívov druhých ľudí, držanie si emočného odstupu a ťažkosti pustiť niekoho blízko bez brnenia.",
    reframing: "Tvoj radar je cenný nástroj v rizikovom prostredí, ale v bezpečných vzťahoch ho môžeš vedome prepnúť z režimu obrany do režimu pozorovania."
  },
  emotional_deprivation: {
    name: "Schéma emocionálnej deprivácie",
    origin: "Dlhodobý pocit, že ty si ten, kto chápe a drží ostatných, no málokto skutočne rozumie tebe.",
    mask: "Rola silnej skaly, ktorá nepotrebuje pomoc, spojená s tichou osamelosťou uprostred ľudí.",
    reframing: "Priznať únavu alebo požiadať o oporu nie je slabosť — je to jediný spôsob, ako dať blízkym šancu byť ti skutočným partnerom."
  },
  defectiveness: {
    name: "Schéma defektnosti a pochybností o sebe",
    origin: "Vnútorný hlas pochybujúci o vlastnej hodnote či inteligencii napriek reálnym schopnostiam.",
    mask: "Syndróm podvodníka, porovnávanie sa s druhými alebo skrývanie neistoty za prehnanú sebakontrolu.",
    reframing: "Pochybnosti o sebe nie sú dôkazom neschopnosti, ale prejavom vysokej kognitívnej komplexity — vidíš viac súvislostí a rizík než povrchní ľudia."
  },
  self_sacrifice: {
    name: "Schéma sebaobetovania a potlačených hraníc",
    origin: "Náukou z detstva alebo okolia, že hodnota človeka závisí od toho, koľko toho znesie a vybaví pre druhých.",
    mask: "Hasenie problémov za iných, odkladanie vlastného oddychu a výčitky svedomia pri každom vyslovenom ‚nie‘.",
    reframing: "Keď dlhodobo zachraňuješ druhých na úkor vlastného vyčerpania, nepomáhaš im rásť — len odkladáš vlastný kolaps."
  },
  unrelenting_standards: {
    name: "Schéma neúprosných noriem a perfekcionizmu",
    origin: "Vnútorný tlak na bezchybný výkon a presvedčenie, že poľavenie znamená zlyhanie alebo stratu kontroly.",
    mask: "Prísny vnútorný kritik, neschopnosť tešiť sa z hotovej práce a odkladanie projektov, kým nie sú na 100 %.",
    reframing: "Dokonalosť je často len elegantná výhovorka strachu z chyby. Funkčný výsledok na 85 % v realite poráža dokonalý plán v zásuvke."
  },
  hypervigilance: {
    name: "Schéma hypervigilancie a chronickej pohotovosti",
    origin: "Nervový systém naučený predvídať krízy, neúspech alebo konflikt skôr, než nastanú.",
    mask: "Večerné prehrávanie scenárov v hlave, plytký spánok a potreba mať vždy pripravený záložný plán B a C.",
    reframing: "Mozog nevie rozlíšiť medzi reálnym ohrozením a mentálnou simuláciou rizika o polnoci. Plánovanie patrí na papier cez deň, nie do postele."
  }
};

export const NODES = {
  // ================= FAZA 1: OTVORENIE (3 uzly) =================
  n01_entry: {
    id: "n01_entry",
    phase: "opening",
    domain: "core",
    text: "Keď sa na chvíľu zastavíš uprostred bežného dňa, ktorá oblasť ti momentálne berie najviac mentálnej energie?",
    options: [
      {
        code: "A",
        label: "Blízky vzťah, partnerstvo alebo napätie medzi ľuďmi, na ktorých mi záleží.",
        trait: "rel_focus",
        schemas: ["emotional_deprivation"],
        domainBoost: { relationships: 3 },
        next: "n02_tempo",
        contextLead: "Spomenul si, že najviac mentálnej energie ti teraz berie blízkosť a vzťahy.",
        oracleReaction: "Cítim to veľmi jasne. Okolo tvojho srdca je teraz viac otázok než pokoja a niečo medzi tebou a blízkou osobou zostáva nedopovedané.",
        oracleNarrative: "V tvojom poli okamžite vystúpila do popredia rovina blízkosti a ľudských väzieb. Nejde o povrchný rozmar — nosíš v sebe tiché napätie okolo vzťahu, na ktorom ti záleží, no cítiš, že veci medzi vami nie sú úplne v rovnováhe.",
        technique: "Cold Profiling (Vstupný lievik)",
        debunkExplanation: "Veštica ti na začiatku položí širokú otázku na ‚energiu‘. Tvojím kliknutím si jej sám prezradil hlavnú tému (vzťahy) a otvoril si celú vzťahovú vetvu scenára."
      },
      {
        code: "B",
        label: "Práca, financie, zodpovednosť alebo rozhodnutie, kam sa posunúť ďalej.",
        trait: "fin_focus",
        schemas: ["unrelenting_standards"],
        domainBoost: { career_finance: 3 },
        next: "n02_tempo",
        contextLead: "Pomenoval si tlak okolo práce, financií a ďalšieho smerovania.",
        oracleReaction: "Okolo teba je silná energia zodpovednosti. Máš pocit, že ťaháš viac, než si okolie uvedomuje, a čakáš na moment zlomu.",
        oracleNarrative: "Tvoja energia je momentálne silne sústredená na smerovanie, prácu a materiálne či profesijné ukotvenie. Je z teba cítiť človeka, ktorý nechce len prežívať zo dňa na deň, ale hľadá prelom a spravodlivé zhodnotenie svojho úsilia.",
        technique: "Cold Profiling (Vstupný lievik)",
        debunkExplanation: "Jediným výberom si systému odovzdal smer (práca a peniaze). Veštica tento fakt okamžite zopakuje mystickými slovami, aby vytvorila dojem napojenia."
      },
      {
        code: "C",
        label: "Únava, nepokoj v hlave, spánok alebo starosť o zdravie svoje či blízkych.",
        trait: "health_focus",
        schemas: ["self_sacrifice", "hypervigilance"],
        domainBoost: { health_stress: 3 },
        next: "n02_tempo",
        contextLead: "Priznal si vnútornú únavu, nepokoj v hlave alebo starosť o zdravie.",
        oracleReaction: "Tvoje pole pôsobí preťažene. Telo ti už dlhšie posiela tiché signály, ktoré cez deň prehlušíš povinnosťami, ale večer sa vracajú.",
        oracleNarrative: "Prvý signál, ktorý z teba vyžaruje, je dlhodobé preťaženie. Cez deň dokážeš fungovať a plniť všetko, čo sa od teba čaká, no tvoj vnútorný rezervoár je vyčerpaný a telo si začína pýtať pozornosť.",
        technique: "Shotgunning + Barnumov efekt",
        debunkExplanation: "Keď priznáš únavu alebo stres, tvrdenie o ‚signáloch tela, ktoré sa vracajú večer‘ sedí štatisticky takmer na každého vyčerpaného človeka."
      },
      {
        code: "D",
        label: "Nič konkrétne ma netrápi, skôr ma zaujíma, ako tento systém funguje a či ma prekukne.",
        trait: "skeptic_focus",
        schemas: ["mistrust", "hypervigilance"],
        domainBoost: { skeptic_control: 3 },
        next: "n02_tempo",
        contextLead: "Pristupuješ k tomuto rozhovoru s analytickým odstupom a chceš vidieť pod povrch.",
        oracleReaction: "Zaujímavé. Máš silnú analytickú myseľ a neotváraš sa len tak niekomu. Práve ľudia, ktorí hľadajú chybu v systéme, však v sebe často nosia najsilnejší štít z minulosti.",
        oracleNarrative: "Prichádzaš s ostrou, skúmavou mysľou a prirodzeným odstupom. Nechávaš si odstup od veľkých slov, pretože si zvyknutý všetko overovať sám — no práve táto ostražitosť prezrádza, že svoje vnútro si starostlivo strážiš.",
        technique: "Preklopenie odporu (Reframing skeptika)",
        debunkExplanation: "Skúsený manipulátor sa skeptika nezľakne. Naopak, pochváli jeho inteligenciu (‚analytická myseľ‘) a preklopí skepticizmus na ‚skrytý štít z minulosti‘, čím ho vtiahne do hry."
      }
    ]
  },

  n02_tempo: {
    id: "n02_tempo",
    phase: "opening",
    domain: "core",
    text: "Keď pred tebou stojí dôležité rozhodnutie, ako sa v tvojom vnútri zvyčajne odohráva?",
    options: [
      {
        code: "A",
        label: "Rozoberiem všetky riziká a scenáre do detailov, až kým nemám istotu.",
        trait: "overthinker",
        schemas: ["hypervigilance", "unrelenting_standards"],
        domainBoost: { skeptic_control: 1, career_finance: 1 },
        next: "n03_mask",
        contextLead: "Máš tendenciu premýšľať v krokoch dopredu a analyzovať riziká do hĺbky.",
        oracleReaction: "Tvoja myseľ ide na plné obrátky aj vtedy, keď ostatní už dávno spia. Často vidíš riziká skôr než druhí, čo je tvoj dar aj tvoja záťaž.",
        oracleNarrative: "Tvoja myseľ pracuje ako presný analytický stroj — skôr než urobíš krok, v hlave si prehráš desať možných scenárov a ich dôsledkov. Tento dar predvídať ťa chráni pred chybami, ale zároveň ti málokedy dovolí úplne vypnúť.",
        technique: "Dúhová lesť (Rainbow Ruse)",
        debunkExplanation: "Veta spojila vlastnosť aj jej tienistú stránku (‚dar aj záťaž‘). Mozog si automaticky potvrdí presne tú polovicu, ktorú v danej chvíli cíti silnejšie."
      },
      {
        code: "B",
        label: "Vnútorne cítim správnu odpoveď hneď, ale potom ju začnem spochybňovať.",
        trait: "self_doubter",
        schemas: ["defectiveness"],
        domainBoost: { relationships: 1, health_stress: 1 },
        next: "n03_mask",
        contextLead: "Prvý vnútorný pocit máš často rýchly, no vzápätí ho začneš rozumom spochybňovať.",
        oracleReaction: "Máš veľmi silnú intuíciu, ale opakovane ju prehlušuješ strachom, aby si neurobil chybu alebo niekomu neublížil.",
        oracleNarrative: "Prvý impulz v tvojom vnútri býva prekvapivo presný, no hneď po ňom prichádza vlna pochybností. Namiesto toho, aby si veril vlastnému úsudku, začneš sa pýtať, či sa nemýliš alebo či svojím rozhodnutím niekoho neraníš.",
        technique: "Barnumov (Forerov) efekt",
        debunkExplanation: "Povedať človeku, že má ‚silnú intuíciu, ale bojí sa ublížiť‘, lichotí jeho egu a zároveň vysvetľuje nerozhodnosť bez toho, aby ho to urazilo."
      },
      {
        code: "C",
        label: "Rozhodnem rýchlo a preberiem velenie, lebo ma irituje čakanie a chaos.",
        trait: "dominant_actor",
        schemas: ["unrelenting_standards"],
        domainBoost: { career_finance: 1, skeptic_control: 1 },
        next: "n03_mask",
        contextLead: "Neznášaš zbytočné čakanie a v nejasných situáciách preberáš velenie.",
        oracleReaction: "Navonok pôsobíš ako skala, na ktorú sa dá spoľahnúť. Málokto však vidí, že za tou rýchlosťou je únava z toho, že musíš všetko ťahať sám.",
        oracleNarrative: "V krízových a nejasných chvíľach nečakáš, kto sa ujme slova — berieš kormidlo do vlastných rúk, lebo chaos ťa vyčerpáva. Okolie obdivuje tvoju rozhodnosť, no málokto vidí, koľko vnútornej energie ťa stojí držať všetko pokope.",
        technique: "Kontrast fasády a vnútra",
        debunkExplanation: "Klasický trik Cold Readingu: oddelí to, ako človek pôsobí navonok (‚skala‘), od skrytej bolesti (‚únava‘). Funguje na 9 z 10 dominantných osobností."
      }
    ]
  },

  n03_mask: {
    id: "n03_mask",
    phase: "opening",
    domain: "core",
    text: "Ktorá veta najviac vystihuje rozdiel medzi tým, ako ťa vidí okolie, a tým, čo cítiš vnútri?",
    options: [
      {
        code: "A",
        label: "Ľudia ma vnímajú ako silného a vyrovnaného, ale vnútri riešim viac pochybností, než priznám.",
        trait: "hidden_doubt",
        schemas: ["emotional_deprivation", "defectiveness"],
        domainBoost: { health_stress: 1, relationships: 1 },
        next: "ROUTE_PRIMARY",
        contextLead: "Navonok držíš tvár vyrovnaného človeka, zatiaľ čo pochybnosti si nechávaš pre seba.",
        oracleReaction: "Presne túto vrstvu som potreboval zachytiť. Nosíš v sebe tichú zrelosť, ale chýba ti priestor, kde by si nemusel hrať rolu silného.",
        oracleNarrative: "Navonok pôsobíš vyrovnane a ľudia sa na teba obracajú po radu či oporu, pretože v tebe vidia pevnosť. Vo svojom tichu však často nesieš vlastné nezodpovedané otázky, s ktorými sa nikomu nezveruješ, lebo nechceš pôsobiť slabo.",
        technique: "Feedback Loop (Recyklácia priznania)",
        debunkExplanation: "Zopakoval som presne tvoju odpoveď inými slovami (‚tichá zrelosť‘ namiesto ‚vyrovnaný‘). Mozog to vníma ako hlboké porozumenie, hoci nepribudla žiadna nová informácia."
      },
      {
        code: "B",
        label: "Pôsobím prísne alebo odmerane, no v skutočnosti som lojálny k tým pár ľuďom, ktorým verím.",
        trait: "armored_loyal",
        schemas: ["mistrust"],
        domainBoost: { skeptic_control: 2 },
        next: "ROUTE_PRIMARY",
        contextLead: "Svoju dôveru delíš prísne — len úzky kruh ľudí vie, aký si v skutočnosti.",
        oracleReaction: "Tvoja tvrdosť nie je chlad, je to filter. Kto prejde cez tvoju bránu, má v tebe spojenca na život a na smrť, no kto sklamal, tomu už dvere neotvoríš.",
        oracleNarrative: "Pre povrchné okolie môžeš pôsobiť uzavreto až neprístupne, no to nie je chlad — je to ochranný filter. Kto raz prejde cez tvoju bránu dôvery, získa v tebe bezvýhradnú lojalitu, no zradu neodpúšťaš ľahko.",
        technique: "Lichotivý archetyp (Flattery)",
        debunkExplanation: "Tvrdenie o ‚spojencovi na život a na smrť‘ vytvára okamžitú emočnú väzbu. Veštica sa stáva jediným človekom, ktorý ‚vidí pravdu za tvojou maskou‘."
      },
      {
        code: "C",
        label: "Snažím sa vychádzať s každým a pomáhať, aj keď ma to občas stojí vlastný pokoj.",
        trait: "pleaser_burn",
        schemas: ["self_sacrifice"],
        domainBoost: { relationships: 2, health_stress: 1 },
        next: "ROUTE_PRIMARY",
        contextLead: "Často uprednostníš pohodu druhých na úkor vlastného pokoja.",
        oracleReaction: "Dávaš druhým energiu, ktorú potom hľadáš sám pre seba. A najviac ťa zabolí, keď ľudia tvoju dobrotu začnú brať ako samozrejmosť.",
        oracleNarrative: "Máš v sebe prirodzenú ochotu vychádzať ľuďom v ústrety a tlmiť napätie okolo seba. Často však rozdáš toľko pochopenia druhým, že na konci dňa ti nezostane energia pre seba, a bolí ťa, keď to okolie berie ako samozrejmosť.",
        technique: "Univerzálny Barnumov výrok",
        debunkExplanation: "Veta ‚ľudia berú tvoju dobrotu ako samozrejmosť‘ je jedna z najčastejších fráz na ezolinkách. Vyvoláva okamžité prikývnutie u empatických ľudí."
      }
    ]
  },

  // ================= VETVA R: VZTAHY A BLIZKOST (6 uzlov) =================
  r01_rel_tension: {
    id: "r01_rel_tension",
    phase: "branch",
    domain: "relationships",
    text: "Keď sa pozrieme bližšie na tvoju vzťahovú rovinu, čo teraz vytvára najväčšie tiché napätie?",
    options: [
      {
        code: "A",
        label: "Mám pocit, že do vzťahu dávam viac pochopenia a úsilia než druhá strana.",
        trait: "rel_imbalance",
        schemas: ["emotional_deprivation", "self_sacrifice"],
        domainBoost: { relationships: 1 },
        next: "r02_rel_partner_mirror",
        contextLead: "Vnímaš vo vzťahu nerovnováhu v tom, koľko úsilia vkladáš ty a koľko druhá strana.",
        oracleReaction: "Je vidieť, že riešiš nerovnováhu s partnerom alebo veľmi blízkou osobou. Nechceš veľké gestá, stačilo by ti cítiť, že v tom nie si sám.",
        oracleNarrative: "Vo vzťahu, ktorý teraz nosíš v hlave, cítiť jemnú, ale vytrvalú nerovnováhu. Nežiadaš nemožné — len by si konečne chcel cítiť, že do toho idete obaja rovnakým dielom a že nemusíš byť vždy tým, kto chápe a ustupuje prvý.",
        technique: "Špecifikácia z kontextu (Funneling)",
        debunkExplanation: "Systém spojil tvoju prvú voľbu (vzťahy) s terajšou (nerovnováha) a vyslovil konkrétnu diagnózu. Pôsobí to ako telepatia, no ide o obyčajné spojenie dvoch odpovedí."
      },
      {
        code: "B",
        label: "Medzi nami chýba otvorený rozhovor, niektoré témy radšej obchádzame.",
        trait: "rel_silence",
        schemas: ["abandonment"],
        domainBoost: { relationships: 1 },
        next: "r02_rel_partner_mirror",
        contextLead: "Medzi vami existujú citlivé témy, ktoré radšej obchádzate tichom.",
        oracleReaction: "Vidím tu stenu z ticha. Obaja viete, že pod povrchom niečo visí, ale bojíte sa, že jedno nevhodné slovo otvorí starú hádku.",
        oracleNarrative: "Medzi tebou a blízkou osobou vyrástla neviditeľná stena z nevyslovených viet. Na povrchu všetko vyzerá pokojne, no obaja tušíte, že pod hladinou ležia témy, ktorým sa vyhýbate zo strachu, aby sa neotvorila stará bolesť.",
        technique: "Pushing (Hádanie scenára)",
        debunkExplanation: "Kde je ticho a vyhýbanie sa témam, tam takmer vždy existuje strach z konfliktu. Veštica tento logický dôsledok podá ako ‚víziu‘."
      },
      {
        code: "C",
        label: "Nie som si istý, či je človek vedľa mňa naozaj tým správnym na dlhú cestu.",
        trait: "rel_doubt_future",
        schemas: ["abandonment", "emotional_deprivation"],
        domainBoost: { relationships: 1 },
        next: "r05_rel_decision",
        contextLead: "Vnútorne zvažuješ, či má toto spojenie skutočnú budúcnosť.",
        oracleReaction: "V tvojom vnútri sa bije rozum so srdcom. Jedna časť hľadá istotu a zázemie, druhá cíti, že niečo podstatné ti chýba.",
        oracleNarrative: "Stojíš pred tichou vnútornou otázkou o budúcnosti tohto spojenia. Rozum ti vymenúva všetko, čo funguje a dáva istotu, no v hĺbke srdca cítiš hlad po niečom živšom a úprimnejšom, čo sa nedá nahradiť len zvykom.",
        technique: "Dúhová lesť (Rozum vs. Srdce)",
        debunkExplanation: "Rozpor medzi rozumom a srdcom je univerzálny opis každej partnerskej dilemy. Klient si do slova ‚niečo podstatné‘ sám dosadí vlastný problém."
      }
    ]
  },

  r02_rel_partner_mirror: {
    id: "r02_rel_partner_mirror",
    phase: "branch",
    domain: "relationships",
    text: "Ako sa tá druhá osoba správa v momente, keď sa pokúsiš otvoriť citlivú tému?",
    options: [
      {
        code: "A",
        label: "Uzavrie sa do seba, odbije to mlčaním alebo zmení tému.",
        trait: "partner_avoidant",
        schemas: ["emotional_deprivation"],
        next: "r03_rel_trust",
        contextLead: "Druhá strana reaguje na citlivé témy mlčaním alebo únikom.",
        oracleReaction: "Cítim tam tvrdohlavosť alebo neschopnosť hovoriť o emóciách. Ty potom zostávaš s pocitom, že narážaš do sklenenej steny.",
        oracleNarrative: "Keď sa snažíš veci vyjasniť, narážaš na uzavretosť a ticho. Tá druhá osoba nevie alebo nechce ísť do hĺbky emócií, a ty potom zostávaš stáť pred sklenenou stenou s pocitom osamelosti aj vtedy, keď ste v jednej miestnosti.",
        technique: "Archetypálna projekcia",
        debunkExplanation: "Popis ‚tvrdohlavosť a sklenená stena‘ je učebnicový preklad vyhýbavého vzťahového štýlu, ktorý si práve sám popísal."
      },
      {
        code: "B",
        label: "Okamžite sa bráni, útočí späť alebo otočí vinu na mňa.",
        trait: "partner_defensive",
        schemas: ["self_sacrifice", "mistrust"],
        next: "r04_rel_boundary",
        contextLead: "Pokus o rozhovor sa často otočí proti tebe a skončíš s pocitom viny.",
        oracleReaction: "Pozor, v tej energii je silný obranný mechanizmus až manipulácia. Často odchádzaš z rozhovoru s výčitkami, hoci si pôvodne chcel len pokojne vec vyriešiť.",
        oracleNarrative: "V komunikácii s touto osobou je cítiť prudkú obranu, ktorá sa rýchlo mení na protiútok. Často sa ti stáva, že prídeš s pokojnou prosbou, no odchádzaš s pocitom viny, akoby si problém spôsobil ty tým, že si ho vôbec otvoril.",
        technique: "Emocionálna validácia",
        debunkExplanation: "Keď veštica pomenuje presný pocit po hádke (‚odchádzaš s výčitkami‘), získa obrovskú dôveru, pretože validuje tvoju frustráciu."
      },
      {
        code: "C",
        label: "Vypočuje ma, sľúbi zmenu, ale po pár dňoch sa všetko vráti do starých koľají.",
        trait: "partner_inertia",
        schemas: ["abandonment"],
        next: "r05_rel_decision",
        contextLead: "Opakuje sa cyklus pekných sľubov a návratu do starých koľají.",
        oracleReaction: "Vidím tu cyklus sľubov a návratov. Nie je v tom nutne zlý úmysel, ale zvyk je u tej osoby silnejší než slová, a tebe postupne dochádza trpezlivosť.",
        oracleNarrative: "Opakuje sa okolo teba kruh upokojujúcich slov a následného návratu do starých koľají. Vidím, že tá osoba ti nechce vedome ublížiť, no jej pohodlnosť je silnejšia než sľuby — a tvoja trpezlivosť sa pomaly míňa.",
        technique: "Cold Deduction (Logická dedukcia)",
        debunkExplanation: "Ak sa správanie opakuje po sľuboch, klesajúca trpezlivosť nie je veštba, ale základná psychológia vyčerpania."
      }
    ]
  },

  r03_rel_trust: {
    id: "r03_rel_trust",
    phase: "branch",
    domain: "relationships",
    text: "Keď sa pozrieš hlbšie do svojej minulosti, ovplyvňuje dnešnú situáciu aj staršie sklamanie v dôvere?",
    options: [
      {
        code: "A",
        label: "Áno, kedysi som sa popálil a dnes zachytím každý náznak neúprimnosti okamžite.",
        trait: "past_betrayal_rel",
        schemas: ["mistrust"],
        next: "r04_rel_boundary",
        contextLead: "Staršia skúsenosť so sklamaním v tebe vyostrila citlivosť na akúkoľvek neúprimnosť.",
        oracleReaction: "Tá stará jazva sa nikdy úplne nezavrela. Dnes preto čítaš medzi riadkami aj veci, ktoré iní nevidia, no stojí ťa to veľa vnútorného pokoja.",
        oracleNarrative: "V tvojej minulosti zostala stopa po sklamaní, ktoré ťa naučilo neveriť pekným slovám bez skutkov. Dnes zachytíš aj najmenšiu zmenu tónu či pretvárku okamžite, no táto neustála ostražitosť ťa stojí veľa duševného pokoja.",
        technique: "Trafenie schémy (Nedôvera)",
        debunkExplanation: "Väčšina dospelých zažila sklamanie v láske alebo priateľstve. Prepojenie minulosti s dnešnou ostražitosťou vytvára ilúziu hlbokého vhľadu."
      },
      {
        code: "B",
        label: "Skôr mám v sebe strach z opustenia alebo z toho, že zostanem nakoniec sám.",
        trait: "fear_abandonment",
        schemas: ["abandonment"],
        next: "r06_rel_unspoken",
        contextLead: "V pozadí pôsobí tichá obava z opustenia a straty blízkeho zázemia.",
        oracleReaction: "V hĺbke duše túžiš po bezpečnom prístave, kde sa nemusíš báť, že niekto jedného dňa zavrie dvere. Preto občas prehliadaš veci, ktoré by si inak netoleroval.",
        oracleNarrative: "Pod povrchom tvojich rozhodnutí je silná túžba po stálom, bezpečnom prístave, kde sa nemusíš báť straty a osamelosti. Práve tento tichý strach ťa niekedy núti tolerovať viac, než by si poradil svojmu najlepšiemu priateľovi.",
        technique: "Klinický profil maskovaný ako veštba",
        debunkExplanation: "Strach z opustenia priamo koreluje s prehliadaním červených vlajok. Psychológ to vie z učebnice schémovej terapie, veštica to predáva ako dar."
      },
      {
        code: "C",
        label: "Minulosť som uzavrel, problém je čisto v tom, čo sa deje práve teraz.",
        trait: "present_pragmatic",
        schemas: [],
        next: "r05_rel_decision",
        contextLead: "Minulosť máš uzavretú a situáciu hodnotíš čisto podľa prítomných faktov.",
        oracleReaction: "Máš zdravý základ a neťaháš zbytočne duchov z minulosti. O to jasnejšie však vidíš, že dnešný nesúlad nie je len tvoja domýšľavosť.",
        oracleNarrative: "Nemáš v sebe nánosy starých krívd, ktoré by skresľovali tvoj pohľad — vnímaš veci triezvo tak, ako sú tu a teraz. O to jasnejšie však cítiš, že súčasný nesúlad nie je len tvoj pocit, ale realita, ktorú treba riešiť.",
        technique: "Bezpečný ústup (Always Give an Out)",
        debunkExplanation: "Podľa pravidla Raya Hymana sa veštica nikdy neháda, keď sa netrafí. Okamžite otočí tvoje nesúhlasné ‚nie‘ na pochvalu (‚máš zdravý základ‘)."
      }
    ]
  },

  r04_rel_boundary: {
    id: "r04_rel_boundary",
    phase: "branch",
    domain: "relationships",
    text: "Čo urobíš najčastejšie, keď niekto blízky prekročí tvoju vnútornú hranicu?",
    options: [
      {
        code: "A",
        label: "Dlho mlčím a znášam to kvôli pokoju, až kým pohár jedného dňa nepretečie.",
        trait: "boundary_delayed",
        schemas: ["self_sacrifice"],
        next: "r06_rel_unspoken",
        contextLead: "Hranice držíš v tichosti kvôli pokoju, až kým sa nenaplní pohár trpezlivosti.",
        oracleReaction: "Tvoja trpezlivosť je obrovská, ale keď niekto prekročí tú poslednú čiaru, vieš sa zmeniť na nepoznanie a urobiť hrubú čiaru.",
        oracleNarrative: "Dokážeš ustúpiť raz, dvakrát aj desaťkrát, len aby bol doma pokoj. Ľudia si však mýlia tvoju trpezlivosť so slabosťou — netušia, že keď pretečie posledná kvapka, dokážeš urobiť definitívnu hrubú čiaru bez návratu.",
        technique: "Dúhová lesť (Trpezlivý vs. Nekompromisný)",
        debunkExplanation: "Presná šablóna z knihy Iana Rowlanda: kombinácia veľkej trpezlivosti a náhleho výbuchu sedí na väčšinu ľudí s potlačenými hranicami."
      },
      {
        code: "B",
        label: "Pomenujem to rovno a tvrdo, ale potom ma mrzí, ak som bol príliš ostrý.",
        trait: "boundary_sharp",
        schemas: ["unrelenting_standards"],
        next: "r05_rel_decision",
        contextLead: "Hranicu pomenuješ priamo, no neskôr v tebe doznieva výčitka z vlastnej ostrosti.",
        oracleReaction: "Tvoja úprimnosť je ako skalpel — mieri presne, no potom cítiš vinu za to, že pravda zabolela.",
        oracleNarrative: "Keď vidíš nespravodlivosť, nechodíš okolo horúcej kaše — tvoje slová sú presné ako skalpel. Vzápätí však tvoje svedomie začne vážiť, či si nezaťal príliš hlboko, a nesieš v sebe zbytočnú vinu za to, že pravda zabolela.",
        technique: "Metaforické zrkadlenie",
        debunkExplanation: "Silná obrazná metafora (‚skalpel‘) dodáva obyčajnému zhrnutiu tvojej odpovede mystickú váhu."
      }
    ]
  },

  r05_rel_decision: {
    id: "r05_rel_decision",
    phase: "branch",
    domain: "relationships",
    text: "Keby si mal na päť sekúnd vypnúť strach z reakcie okolia, čo by si vo vzťahu urobil ako prvé?",
    options: [
      {
        code: "A",
        label: "Povedal by som bez obalu celú pravdu o tom, čo mi chýba a čo už nebudem znášať.",
        trait: "need_honesty",
        schemas: ["emotional_deprivation"],
        next: "r06_rel_unspoken",
        contextLead: "V tvojom vnútri už dozrela potreba vysloviť celú pravdu bez obalu.",
        oracleReaction: "Tá veta je už v tebe sformulovaná. Karty ukazujú, že tento rozhovor príde skôr, než si myslíš, a prinesie obrovskú úľavu bez ohľadu na výsledok.",
        oracleNarrative: "Slová, ktoré potrebuješ vysloviť, sú už v tvojej hlave dávno napísané. Cítim, že otvorený rozhovor bez masiek sa nezadržateľne blíži — a hoci z neho máš rešpekt, prinesie ti obrovskú vnútornú úľavu.",
        technique: "Sebanaplňujúce proroctvo",
        debunkExplanation: "Veštica zoberie tvoje vlastné prianie a sformuluje ho ako predpoveď budúcnosti. Keď ten rozhovor o týždeň naozaj urobíš, povieš si: ‚Ona to videla dopredu!‘"
      },
      {
        code: "B",
        label: "Dal by som si odstup a čas pre seba, aby som si vyčistil hlavu bez cudzieho tlaku.",
        trait: "need_space",
        schemas: ["self_sacrifice"],
        next: "r06_rel_unspoken",
        contextLead: "Potrebuješ získať priestor a odstup od cudzieho emočného tlaku.",
        oracleReaction: "Potrebuješ získať nadhľad. Príliš dlho si dýchal vzduch niekoho iného a stratil si kontakt s vlastným kompasom.",
        oracleNarrative: "Tvoja duša si pýta priestor a ticho, v ktorom budeš počuť len vlastné myšlienky. Príliš dlho si sa prispôsoboval náladám a tempu druhého človeka, až si stratil kontakt s tým, čo chceš ty sám.",
        technique: "Emocionálne preorámovanie",
        debunkExplanation: "Poetický obraz (‚dýchal vzduch niekoho iného‘) prehlbuje ilúziu empatie, pričom stále len parafrázuje tvoju voľbu ‚čas pre seba‘."
      }
    ]
  },

  r06_rel_unspoken: {
    id: "r06_rel_unspoken",
    phase: "branch",
    domain: "relationships",
    text: "Čoho sa v hĺbke duše obávaš najviac, ak by sa táto situácia pohla z miesta?",
    options: [
      {
        code: "A",
        label: "Že zraním niekoho, na kom mi napriek všetkému záleží.",
        trait: "fear_hurting",
        schemas: ["self_sacrifice"],
        next: "ROUTE_PIVOT",
        contextLead: "Brzdí ťa predovšetkým ohľad na to, aby si neublížil druhému človeku.",
        oracleReaction: "Tvoje svedomie je silnejšie než tvoje ego. Práve preto sa však často stávaš rukojemníkom vlastnej empatie.",
        oracleNarrative: "Tvoje svedomie je silnejšie než tvoje ego — aj v chvíli, keď sám trpíš, stále myslíš na to, aby si druhému nespôsobil bolesť. Dávaj si však pozor, aby si sa nestal rukojemníkom vlastnej empatie.",
        technique: "Lichotivé ospravedlnenie slabosti",
        debunkExplanation: "Veštica nikdy nepovie, že si slabý. Nazve to ‚rukojemníkom vlastnej empatie‘, čo znie ušľachtilo a príjemne."
      },
      {
        code: "B",
        label: "Že stratím stabilitu a zistím, že som sa celé tie roky mýlil.",
        trait: "fear_sunk_cost",
        schemas: ["abandonment"],
        next: "ROUTE_PIVOT",
        contextLead: "Váhaš kvôli rokom a energii, ktoré si už do tohto vzťahu vložil.",
        oracleReaction: "Drží ťa energia minulých investícií — koľko času a síl si do toho už vložil. Ale budúcnosť sa nedá zaplatiť tým, čo bolo včera.",
        oracleNarrative: "Najťažšie sa púšťa to, do čoho sme vložili roky života a viery. V tvojom vnútri je obava priznať si, že niečo nevyšlo podľa predstáv — no pamätaj, že budúcnosť sa nedá vybudovať len z úcty k minulosti.",
        technique: "Kognitívne skreslenie (Sunk Cost)",
        debunkExplanation: "Strach z premrhaných rokov je klasický efekt utopených nákladov v psychológii rozhodovania, zabalený do múdro znejúceho citátu."
      }
    ]
  },

  // ================= VETVA F: PRACA A FINANCIE (6 uzlov) =================
  f01_fin_pressure: {
    id: "f01_fin_pressure",
    phase: "branch",
    domain: "career_finance",
    text: "V oblasti práce, financií a záväzkov — čo ti momentálne visí nad hlavou ako nedoriešený bod?",
    options: [
      {
        code: "A",
        label: "Nejaký papier, zmluva, finančný záväzok alebo úradná vec, ktorá sa zbytočne ťahá.",
        trait: "fin_papers",
        schemas: ["hypervigilance"],
        next: "f02_fin_recognition",
        contextLead: "Riešiš nedoriešený papier, zmluvu alebo finančný záväzok, ktorý brzdí plynulosť.",
        oracleReaction: "Presne to tu vidím — energia okolo podpisu a dokumentov, ktorá brzdí plynulý tok peňazí. Čakáš na uzatvorenie, ktoré sa už dvakrát oddialilo.",
        oracleNarrative: "V pracovnej a finančnej rovine visí nad tebou nedoriešená záležitosť spojená s dokumentmi, dohodou alebo záväzkom, ktorý sa naťahuje dlhšie, než mal. Kým sa tento uzol neuzavrie, berie ti to pozornosť na nové veci.",
        technique: "Shotgunning (Úradné papiere)",
        debunkExplanation: "Úradné papiere, faktúry, zmluvy alebo záväzky rieši takmer každý dospelý človek. Keď túto možnosť potvrdíš, veštica na nej postaví ‚víziu‘."
      },
      {
        code: "B",
        label: "Pocit, že moje schopnosti a čas zarábajú menej, než akú majú reálnu hodnotu.",
        trait: "fin_undervalued",
        schemas: ["unrelenting_standards", "emotional_deprivation"],
        next: "f02_fin_recognition",
        contextLead: "Cítiš rozpor medzi svojimi reálnymi schopnosťami a tým, ako sú finančne ocenené.",
        oracleReaction: "Máš v sebe obrovský nevyužitý potenciál. Si v prostredí alebo systéme, ktorý ťa prerastá, a cítiš, že dokážeš oveľa viac.",
        oracleNarrative: "Nosíš v sebe schopnosti a prehľad, ktoré výrazne prevyšujú to, ako sú momentálne ohodnotené. Cítiš vnútorný nesúlad medzi tým, koľko hodnoty vytváraš, a tým, čo sa ti vracia späť.",
        technique: "Kráľovský Barnumov výrok (Nevyužitý potenciál)",
        debunkExplanation: "Podľa Iana Rowlanda nikto na planéte nepovie ‚vyčerpal som svoj potenciál na 100 %‘. Každý má pocit, že by mohol byť lepšie ohodnotený."
      },
      {
        code: "C",
        label: "Stojím na križovatke medzi istotou a vlastnou cestou či novým projektom.",
        trait: "fin_crossroads",
        schemas: ["hypervigilance"],
        next: "f03_fin_autonomy",
        contextLead: "Stojíš medzi bezpečnou istotou a vlastným projektom či zmenou smeru.",
        oracleReaction: "Vidím pred tebou dve cesty. Jedna je známa a bezpečná, ale pomaly ťa dusí; druhá prináša slobodu, no vyžaduje odvahu urobiť prvý krok do neznáma.",
        oracleNarrative: "Pred tebou sa rozdeľujú dve cesty — jedna známa a predvídateľná, ktorá ti však začína byť tesná, a druhá vlastná, ktorá sľubuje slobodu, no žiada odvahu pustiť sa starého brehu.",
        technique: "Dvojcestná metafora (Tarotový archetyp)",
        debunkExplanation: "Klasická formulácia z výkladu kariet (Dvojka palíc / Blázon). Len zrkadlí voľbu ‚istota vs. vlastná cesta‘, ktorú si práve označil."
      }
    ]
  },

  f02_fin_recognition: {
    id: "f02_fin_recognition",
    phase: "branch",
    domain: "career_finance",
    text: "Keď sa pozrieš na ľudí, s ktorými spolupracuješ alebo pre ktorých robíš, aký pocit prevláda?",
    options: [
      {
        code: "A",
        label: "Často musím opravovať chyby po druhých a hasiť problémy, ktoré som nespôsobil.",
        trait: "fixer_burden",
        schemas: ["self_sacrifice", "unrelenting_standards"],
        next: "f04_fin_burnout",
        contextLead: "V práci často končíš v úlohe toho, kto zachraňuje a opravuje chyby po druhých.",
        oracleReaction: "Ľudia okolo teba spohodlneli, pretože vedia, že ty to nakoniec vždy zachrániš. Si tichý pilier, na ktorom stojí viac, než si priznávajú.",
        oracleNarrative: "V pracovnom prostredí si sa stal tichým pilierom, na ktorého sa všetci spoliehajú, keď sa niečo pokazí. Ostatní okolo teba spohodlneli, pretože vedia, že ty nakoniec vždy nájdeš riešenie a upraceš cudzí chaos.",
        technique: "Lichotivé potvrdenie roly (The Fixer)",
        debunkExplanation: "V každom tíme si schopní ľudia myslia, že ťahajú prácu za ostatných. Označenie za ‚tichý pilier‘ okamžite vytvára sympatie k veštici."
      },
      {
        code: "B",
        label: "Je tam konkrétna osoba, ktorá ma brzdí, závidí alebo hrá zákulisné hry.",
        trait: "work_rival",
        schemas: ["mistrust"],
        next: "f05_fin_blocked",
        contextLead: "Vnímaš v pracovnom okolí konkrétnu osobu, ktorá hrá zákulisné hry alebo ťa brzdí.",
        oracleReaction: "Cítim okolo tvojej práce falošnú energiu — niekto sa usmieva do očí, ale nepraje ti postup. Dávaj si pozor, komu prezrádzaš svoje plány skôr, než sú hotové.",
        oracleNarrative: "Okolo tvojich pracovných krokov je prítomná neúprimná energia niekoho, kto navonok pôsobí priateľsky, no v zákulisí brzdí tvoj postup. Svoje najlepšie nápady si nechávaj pre seba, kým nebudú pevne ukotvené.",
        technique: "Paranoidný háčik (Skrytý nepriateľ)",
        debunkExplanation: "Klasická pasca ezoliniek: zasiať podozrenie na ‚falošného človeka v okolí‘. Klient si v hlave okamžite dosadí kolegu alebo známeho a uverí, že veštica ho ‚videla‘."
      }
    ]
  },

  f03_fin_autonomy: {
    id: "f03_fin_autonomy",
    phase: "branch",
    domain: "career_finance",
    text: "Čo je tvojím najhlbším cieľom za peniazmi — prečo ich v skutočnosti chceš?",
    options: [
      {
        code: "A",
        label: "Sloboda. Chcem si sám určovať čas a nenechať si nikým diktovať.",
        trait: "money_freedom",
        schemas: ["mistrust"],
        next: "f06_fin_leap",
        contextLead: "Peniaze vnímaš ako nástroj osobnej slobody a nezávislosti, nie statusu.",
        oracleReaction: "Peniaze pre teba nie sú o luxuse ani o ukazovaní sa. Sú pre teba nástrojom nezávislosti, pretože klietka — hoci aj zlatá — by ťa zničila.",
        oracleNarrative: "Neženie ťa túžba ohurovať okolie pozlátkom — pre teba sú peniaze čistou energiou slobody. Neznesieš pocit, že ti niekto diktuje tvoj čas, pretože aj zlatá klietka by v tebe udusila chuť tvoriť.",
        technique: "Hodnotový profil (Sloboda vs. Status)",
        debunkExplanation: "Krásna formulácia o ‚zlatej klietke‘, ktorá však len preložila tvoje vlastné slovo ‚sloboda‘ do dramatickejšej metafory."
      },
      {
        code: "B",
        label: "Bezpečie a istota, aby moji blízki nemuseli riešiť existenčný strach.",
        trait: "money_security",
        schemas: ["self_sacrifice", "hypervigilance"],
        next: "f04_fin_burnout",
        contextLead: "Hlavným motorom je pre teba vytvoriť nepriestrelné bezpečie pre tvojich blízkych.",
        oracleReaction: "Máš v sebe silný inštinkt ochrancu. Často odkladáš vlastnú radosť bokom len preto, aby si mal istotu, že zázemie vydrží aj horšie časy.",
        oracleNarrative: "V tvojom vnútri bije silný inštinkt ochrancu a živiteľa. Vlastné potreby dokážeš odsunúť nabok len preto, aby ľudia, za ktorých cítiš zodpovednosť, mali pevné zázemie a pokojný spánok.",
        technique: "Archetyp ochrancu",
        debunkExplanation: "Spojenie slova ‚istota pre blízkych‘ s ‚odkladaním vlastnej radosti‘ je štatisticky takmer istý zásah u zodpovedných živiteľov."
      }
    ]
  },

  f04_fin_burnout: {
    id: "f04_fin_burnout",
    phase: "branch",
    domain: "career_finance",
    text: "Ako dlho už ideš na výkon s pocitom, že si nemôžeš dovoliť na týždeň úplne vypnúť?",
    options: [
      {
        code: "A",
        label: "Už celé mesiace či roky. Ak zastavím ja, veci sa rozsypú.",
        trait: "chronic_load",
        schemas: ["unrelenting_standards", "self_sacrifice"],
        next: "f06_fin_leap",
        contextLead: "Ideš dlhodobo bez skutočnej pauzy s pocitom, že bez teba sa systém zastaví.",
        oracleReaction: "Tvoj motor ide dlhodobo v červených otáčkach. Ak si pauzu nevezmeš dobrovoľne, život ťa čoskoro donúti spomaliť sám.",
        oracleNarrative: "Už príliš dlho ťaháš v režime, v ktorom si nedovolíš vypnúť z obavy, že sa veci bez tvojho dohľadu zadrhnú. Tvoj vnútorný motor ide v červených otáčkach — ak si oddych nevezmeš vedome, telo si ho vypýta samo.",
        technique: "Mierne varovanie (Soft Threat)",
        debunkExplanation: "Varovanie typu ‚život ťa donúti spomaliť‘ znie ako osudová predtucha, no v skutočnosti je to elementárna fyziológia vyhorenia."
      },
      {
        code: "B",
        label: "Viem vypnúť, ale hlava mi aj tak neustále vymýšľa nové plány a riešenia.",
        trait: "restless_mind",
        schemas: ["hypervigilance"],
        next: "f05_fin_blocked",
        contextLead: "Aj keď fyzicky oddychuješ, tvoja hlava neustále generuje nové nápady a riešenia.",
        oracleReaction: "Tvoja hlava je ako neustále bežiaci prijímač nápadov. Problém nie je v tom, že by si nevedel pracovať, ale v tom, že tvojich nápadov je viac než hodín v dni.",
        oracleNarrative: "Tvoja myseľ je nepokojný tvorca — aj keď odložíš prácu, v hlave ti okamžite naskakujú nové prepojenia, vylepšenia a projekty. Tvojou výzvou nie je nedostatok energie, ale umenie vybrať jednu vec a dotiahnuť ju do konca.",
        technique: "Pozitívne preorámovanie (Flattery)",
        debunkExplanation: "Namiesto pomenovania stresu ťa systém pochváli za kreativitu a množstvo nápadov, čím zvyšuje sympatie a dôveryhodnosť."
      }
    ]
  },

  f05_fin_blocked: {
    id: "f05_fin_blocked",
    phase: "branch",
    domain: "career_finance",
    text: "Keď vidíš prekážku pred svojím cieľom, kde cítiš najväčšiu brzdu?",
    options: [
      {
        code: "A",
        label: "V chýbajúcom kapitále, čase alebo správnych ľuďoch okolo mňa.",
        trait: "external_block",
        schemas: [],
        next: "f06_fin_leap",
        contextLead: "Najväčšiu brzdu vnímaš v chýbajúcom čase, prostriedkoch alebo podpore okolia.",
        oracleReaction: "Zdá sa ti, že okolnosti hrajú proti tebe, ale v horizonte najbližších mesiacov sa objaví nečakané okno alebo kontakt, ktorý posunie veci dopredu.",
        oracleNarrative: "Máš pocit, že narážaš na vonkajšie limity času a prostriedkov, no energie sa začínajú preskupovať. V horizonte najbližších mesiacov sa objaví rozhovor alebo príležitosť, ktorá uvoľní doteraz zablokovaný priestor.",
        technique: "Vágna časová predpoveď",
        debunkExplanation: "Fráza ‚v horizonte najbližších mesiacov príde kontakt‘ sa nedá vyvrátiť a vyvoláva konfirmačné skreslenie."
      },
      {
        code: "B",
        label: "Úprimne — občas som tou najväčšou brzdou ja sám, lebo chcem mať všetko dokonalé.",
        trait: "perfectionist_block",
        schemas: ["unrelenting_standards"],
        next: "f06_fin_leap",
        contextLead: "Uvedomuješ si, že najprísnejším sudcom a brzdou býva tvoj vlastný perfekcionizmus.",
        oracleReaction: "Karty ukazujú na vnútorného kritika. Čakáš na dokonalý moment, no tvoj úspech príde až vo chvíli, keď pustíš do sveta vec, ktorá má ‚len‘ 90 percent.",
        oracleNarrative: "Tvojou najväčšou skúškou nie je okolie, ale tvoj vlastný perfekcionizmus. Odkladáš spustenie vecí, pretože ich chceš vybrúsiť do posledného detailu — no prelom príde až vtedy, keď ich pustíš do sveta aj s malou nedokonalosťou.",
        technique: "Identifikácia schémy (Neúprosné normy)",
        debunkExplanation: "Perfekcionizmus je maskovaný strach zo zlyhania. Veštica využila tvoje priznanie a dodala mu múdro znejúce pravidlo 90 percent."
      }
    ]
  },

  f06_fin_leap: {
    id: "f06_fin_leap",
    phase: "branch",
    domain: "career_finance",
    text: "Je v tvojej hlave jedno konkrétne rozhodnutie alebo projekt, ktoré odkladáš už viac než pol roka?",
    options: [
      {
        code: "A",
        label: "Áno, presne viem, čo to je, ale stále čakám na lepšie podmienky.",
        trait: "delayed_leap",
        schemas: ["hypervigilance"],
        next: "ROUTE_PIVOT",
        contextLead: "Máš v hlave konkrétny krok, ktorý odkladáš v čakaní na vhodnejší okamih.",
        oracleReaction: "Presne o tom hovorí tvoja energia. Nečakáš na lepšie podmienky, čakáš na povolenie od seba samého. Zmena príde v momente, keď prestaneš odkladať prvý krok.",
        oracleNarrative: "V tvojej mysli už dlhšie zreje konkrétny zámer, ktorý odkladáš s tým, že ešte nenastal ten správny čas. Pravda je taká, že ideálne podmienky neprídu zvonku — posun nastane v deň, keď sa rozhodneš vykročiť aj bez nich.",
        technique: "Pushing (Univerzálne tajomstvo)",
        debunkExplanation: "Takmer každý človek má v zásuvke nejaký polročný plán. Pýtať sa naň ako na ‚jedno konkrétne rozhodnutie‘ vytvára falošný pocit, že ho systém pozná."
      },
      {
        code: "B",
        label: "Nie, veci riešim priebežne a skôr hľadám spôsob, ako ich zefektívniť.",
        trait: "optimizer_mind",
        schemas: ["unrelenting_standards"],
        next: "ROUTE_PIVOT",
        contextLead: "Veci neodkladáš, skôr priebežne ladíš a hľadáš efektívnejšiu cestu.",
        oracleReaction: "Si pragmatický staviteľ. Nepotrebuješ revolúciu, potrebuješ len odstrániť jedno úzke hrdlo, ktoré ti berie zbytočne veľa energie.",
        oracleNarrative: "Nie si človek veľkých skokov naslepo — buduješ veci krok za krokom a neustále ich vylepšuješ. Tvoj ďalší posun nepríde cez prevrat, ale cez odstránenie jednej zbytočnej záťaže, ktorá ti doteraz odčerpávala sily.",
        technique: "Bezpečný ústup (Graceful Miss)",
        debunkExplanation: "Opäť ukážka pravidla Raya Hymana: pri odpovedi ‚Nie‘ systém plynule prehodí výhybku na ‚pragmatického staviteľa‘ bez straty autority."
      }
    ]
  },

  // ================= VETVA H: ZDRAVIE A STRES (5 uzlov) =================
  h01_health_signal: {
    id: "h01_health_signal",
    phase: "branch",
    domain: "health_stress",
    text: "Keď sa v tebe nahromadí napätie, kde sa najčastejšie ozve na fyzickej úrovni?",
    options: [
      {
        code: "A",
        label: "Krčná chrbtica, chrbát, stuhnuté ramená alebo bolesť hlavy.",
        trait: "somatic_back_head",
        schemas: ["self_sacrifice"],
        next: "h02_health_night",
        contextLead: "Vnútorný tlak sa u teba ukladá do šije, ramien, chrbta alebo hlavy.",
        oracleReaction: "Cítim obrovskú váhu na tvojich pleciach. Symbolicky aj fyzicky nosíš na chrbte starosti, ktoré vôbec nie sú len tvoje.",
        oracleNarrative: "Tvoje telo hovorí veľmi zrozumiteľnou rečou — napätie sa ti ukladá do šije, ramien a chrbta. Je to presný odraz toho, koľko cudzích starostí a zodpovednosti na seba denne nakladáš.",
        technique: "Štatistický zásah (Chrbtica/Hlava)",
        debunkExplanation: "Bolesť šije, chrbta alebo hlavy zažíva pri strese viac než 75 % dospelej populácie. Prepojenie so ‚starosťami na pleciach‘ je klasická psychosomatická fráza."
      },
      {
        code: "B",
        label: "Žalúdok, trávenie, zovretie na hrudi alebo búšenie srdca.",
        trait: "somatic_chest_gut",
        schemas: ["hypervigilance"],
        next: "h02_health_night",
        contextLead: "Stres u teba okamžite zasahuje trávenie, žalúdok alebo napätie na hrudi.",
        oracleReaction: "Tvoje telo spracúva emócie, ktoré si nedovolíš vysloviť nahlas. Zovretie v strede tela ukazuje na tlak, ktorý v sebe dlhodobo dusíš.",
        oracleNarrative: "Emócie, ktoré cez deň zadržíš v sebe, sa okamžite premietajú do tvojho stredu — do žalúdka a hrude. Tvoje telo takto reaguje vždy vtedy, keď navonok zachovávaš pokoj, no vnútri prežívaš silný nesúlad.",
        technique: "Somatické zrkadlenie",
        debunkExplanation: "Aktivácia blúdivého nervu pri strese prirodzene zasahuje žalúdok a tep. Veštica z obyčajnej biológie urobí ‚nevyslovenú emóciu‘."
      },
      {
        code: "C",
        label: "Rýchla vyčerpateľnosť, pokles energie a pocit, že ráno vstávam unavený.",
        trait: "somatic_fatigue",
        schemas: ["self_sacrifice"],
        next: "h02_health_night",
        contextLead: "Cítiš hlbokú vyčerpateľnosť a pocit únavy už hneď po prebudení.",
        oracleReaction: "Tvoj vnútorný rezervoár je na dne. Nevyčerpáva ťa samotná práca, ale neviditeľný emočný hluk, ktorý ti kradne energiu aj počas spánku.",
        oracleNarrative: "Tvoja únava nie je len z fyzickej práce — je to vyčerpanie z neustáleho mentálneho hluku a starostí, ktoré ti nedovolia skutočne si oddýchnuť ani počas noci.",
        technique: "Barnumov výrok o únave",
        debunkExplanation: "Fráza o ‚neviditeľnom hluku, ktorý kradne energiu‘ znie hlboko, no len opisuje bežný nekvalitný spánok pri zvýšenom kortizole."
      }
    ]
  },

  h02_health_night: {
    id: "h02_health_night",
    phase: "branch",
    domain: "health_stress",
    text: "Čo sa deje večer, keď zhasne svetlo a konečne zostaneš v tichu?",
    options: [
      {
        code: "A",
        label: "Hlava začne prehrávať minulé rozhovory a scenáre, čo všetko treba vybaviť.",
        trait: "night_rumination",
        schemas: ["hypervigilance"],
        next: "h03_health_family",
        contextLead: "Večer v tichu sa ti v hlave rozbieha kolotoč myšlienok a scenárov.",
        oracleReaction: "Presne vtedy k tebe prichádzajú najťažšie myšlienky — medzi jedenástou a druhou v noci, keď racionálna obrana zaspí a zostane len obava.",
        oracleNarrative: "Keď večer zhasne svetlo a okolitý svet stíchne, tvoja hlava rozbieha druhú smenu. Prehrávaš si rozhovory, hľadáš lepšie odpovede a v tichu noci riešiš veci, ktoré cez deň odkladáš.",
        technique: "Štatistický časový zásah",
        debunkExplanation: "Ruminácia (prežúvanie myšlienok) nastáva takmer vždy tesne pred zaspaním alebo pri nočnom prebudení. Uvedenie presných hodín pôsobí magicky."
      },
      {
        code: "B",
        label: "Zaspím od únavy hneď, ale budím sa v noci alebo priskoro ráno.",
        trait: "fragmented_sleep",
        schemas: ["hypervigilance"],
        next: "h03_health_family",
        contextLead: "Tvoj spánok je prerušovaný skorým budením, akoby telo zostávalo v strehu.",
        oracleReaction: "Tvoj nervový systém zostáva v pohotovosti aj v noci, akoby strážil pred nebezpečenstvom. Podvedome máš pocit, že nesmieš úplne poľaviť.",
        oracleNarrative: "Aj keď zaspíš od vyčerpania, tvoj vnútorný strážca nespí — budíš sa predčasne, akoby tvoja myseľ nechcela pustiť kontrolu nad tým, čo sa môže stať.",
        technique: "Psychologický profil hypervigilancie",
        debunkExplanation: "Skoré ranné budenie je typickým príznakom chronického stresu (kortizolový skok). Vysvetlenie ‚stráženia pred nebezpečenstvom‘ trafí takmer každého."
      }
    ]
  },

  h03_health_family: {
    id: "h03_health_family",
    phase: "branch",
    domain: "health_stress",
    text: "Vnímam tu aj niť smerom k rodine — je v tvojom blízkom okolí niekto starší, o koho stav alebo budúcnosť máš tichú obavu?",
    options: [
      {
        code: "A",
        label: "Áno, riešime zdravotné problémy alebo slabnutie niekoho blízkeho v rodine.",
        trait: "family_health_worry",
        schemas: ["self_sacrifice"],
        next: "h04_health_escape",
        contextLead: "V pozadí nosíš aj tichú obavu o zdravie staršieho blízkeho človeka v rodine.",
        oracleReaction: "Vidím tu starosť spojenú s krvným tlakom, srdcom alebo pohybom u staršej osoby, ktorá je pritom tvrdohlavá a nerada si necháva radiť.",
        oracleNarrative: "K tvojim vlastným starostiam sa pridáva aj tichá obava o niekoho staršieho v rodine, komu ubúdajú sily, no pre svoju tvrdohlavosť si nechce nechať ľahko pomôcť.",
        technique: "Klasický Shotgunning (Starší príbuzný)",
        debunkExplanation: "Toto je najznámejší trik ezoliniek: u ľudí nad 30 rokov má viac než 80 % v rodine staršieho príbuzného s tlakom, srdcom či kĺbmi, ktorý ‚nechce ísť k lekárovi‘."
      },
      {
        code: "B",
        label: "Ani nie zdravotne, skôr rodinné vzťahy alebo zodpovednosť za ostatných.",
        trait: "family_duty",
        schemas: ["self_sacrifice"],
        next: "h04_health_escape",
        contextLead: "V rodine často nesieš rolu toho, kto drží zodpovednosť za ostatných.",
        oracleReaction: "Máš v rodine rolu toho, na koho sa všetci obrátia, keď horí. Len málokto sa však spýta, kto podrží teba.",
        oracleNarrative: "V rodinnom kruhu máš neoficiálnu úlohu záchrancu, na ktorého sa všetci obrátia, keď treba niečo vyriešiť. Len málokto si však všimne, že aj ty potrebuješ miesto, kde nemusíš nič riadiť.",
        technique: "Okamžitá korekcia kurzu (Pivot)",
        debunkExplanation: "Zdravotný pokus nevyšiel, tak veštica okamžite preskočila na rolu ‚záchrancu v rodine‘. Klient na chybný odhad do 10 sekúnd zabudne."
      }
    ]
  },

  h04_health_escape: {
    id: "h04_health_escape",
    phase: "branch",
    domain: "health_stress",
    text: "Ako najčastejšie utekáš pred pocitom, že je toho na teba priveľa?",
    options: [
      {
        code: "A",
        label: "Zavriem sa do vlastného sveta, ticha alebo technických projektov, kde mám pokoj.",
        trait: "escape_solitude",
        schemas: ["emotional_deprivation"],
        next: "h05_health_reset",
        contextLead: "Energiu si dobíjaš v samote, tichu alebo pri vlastných projektoch.",
        oracleReaction: "Ticho je tvoj jediný skutočný liek. Ľudia si niekedy tvoje mlčanie vysvetľujú ako hnev, ale ty si vtedy len dobíjaš batérie.",
        oracleNarrative: "Keď je svet okolo teba príliš hlučný, sťahuješ sa do vlastného sveta ticha a tvorby. Blízki si niekedy toto mlčanie mylne vysvetľujú ako odstup či hnev, hoci ty si vtedy len chrániš posledné zvyšky energie.",
        technique: "Validácia introvertného mechanizmu",
        debunkExplanation: "Povedať človeku, že okolie si jeho mlčanie mýli s hnevom, je presný zásah do každodennej reality ľudí, ktorí spracúvajú stres v samote."
      },
      {
        code: "B",
        label: "Prekrývam to ďalšími povinnosťami, aby som nad tým nemusel premýšľať.",
        trait: "escape_busyness",
        schemas: ["unrelenting_standards"],
        next: "h05_health_reset",
        contextLead: "Pred vnútorným tlakom utekáš do ďalšej práce a nových úloh.",
        oracleReaction: "Bežíš vpred, aby ťa ticho nedobehlo. Lenže únava sa nedá prebehnúť, dá sa len priznať a zmeniť rytmus.",
        oracleNarrative: "Pred vnútorným nepokojom utekáš do pohybu a ďalších povinností, aby si nemusel zostať sám so svojimi myšlienkami. Únava sa však nedá predbehnúť — dá sa len zastaviť a zmeniť tempo.",
        technique: "Aforizmus (Múdro znejúca pravda)",
        debunkExplanation: "Úderná krátka veta (‚únava sa nedá prebehnúť‘) vytvára dojem hlbokej duchovnej múdrosti bez reálneho dôkazu."
      }
    ]
  },

  h05_health_reset: {
    id: "h05_health_reset",
    phase: "branch",
    domain: "health_stress",
    text: "Čo je tá jedna vec pre tvoje vlastné zdravie alebo pokoj, ktorú sľubuješ sám sebe už celé mesiace?",
    options: [
      {
        code: "A",
        label: "Nastaviť si konečne pevný režim spánku, oddychu a naučiť sa povedať nie.",
        trait: "need_boundaries_rest",
        schemas: ["self_sacrifice"],
        next: "ROUTE_PIVOT",
        contextLead: "Vieš, že kľúčom k úľave je pevný režim oddychu a schopnosť povedať ‚nie‘.",
        oracleReaction: "Kľúčom pre tvoje najbližšie obdobie je jediné malé slovo, ktoré ti ide z úst najťažšie: Nie. Akonáhle ho začneš používať, vráti sa ti stratená sila.",
        oracleNarrative: "Tvoja cesta k obnove sily vedie cez jedno krátke slovo, ktoré si sa doteraz bál vysloviť nahlas: Nie. Vo chvíli, keď prestaneš byť k dispozícii všetkým okolo, vráti sa ti stratený pokoj aj spánok.",
        technique: "Recyklácia cieľa ako proroctva",
        debunkExplanation: "Vzal som slovo ‚nie‘ priamo z tvojej odpovede a podal som ho ako ‚kľúč k tvojmu najbližšiemu obdobiu‘."
      },
      {
        code: "B",
        label: "Zbaviť sa toxického zdroja stresu, ktorý ma dlhodobo vysáva.",
        trait: "need_detox_env",
        schemas: ["self_sacrifice"],
        next: "ROUTE_PIVOT",
        contextLead: "Cítiš, že potrebuješ odstrihnúť konkrétny zdroj stresu, ktorý ťa dlhodobo vysáva.",
        oracleReaction: "Tvoje telo už urobilo rozhodnutie skôr než tvoja hlava. Teraz len zbieraš odvahu odstrihnúť to, čo ti viac berie, než dáva.",
        oracleNarrative: "Tvoje telo už urobilo rozhodnutie dávno pred tvojou hlavou. Teraz len zbieraš poslednú dávku odvahy odstrihnúť zo svojho života vplyv, ktorý ti berie viac, než kedy dokáže vrátiť.",
        technique: "Pushing (Potvrdenie rozhodnutia)",
        debunkExplanation: "Veštice často hovoria ľuďom to, čo chcú počuť — že ich vnútorné rozhodnutie je správne. Znižuje to kognitívny disonanciu a zvyšuje spokojnosť klienta."
      }
    ]
  },

  // ================= VETVA S: SKEPTIK A KONTROLA (5 uzlov) =================
  s01_skep_shield: {
    id: "s01_skep_shield",
    phase: "branch",
    domain: "skeptic_control",
    text: "Keď stretneš nového človeka, ktorý sa snaží pôsobiť príliš priateľsky alebo autoritatívne, čo sa v tebe zapne ako prvé?",
    options: [
      {
        code: "A",
        label: "Okamžitý skener — hľadám jeho skutočný motív a kde je háčik.",
        trait: "active_scanner",
        schemas: ["mistrust", "hypervigilance"],
        next: "s02_skep_bullshit",
        contextLead: "Pri nových ľuďoch okamžite zapínaš vnútorný skener a hľadáš skrytý motív.",
        oracleReaction: "Máš v sebe radar na pretvárku, ktorý sa málokedy mýli. Už po troch vetách vieš, či pred tebou stojí autentický človek alebo herec.",
        oracleNarrative: "Máš mimoriadne citlivý radar na ľudské motívy — prehnaná prívetivosť ani hraná autorita na teba nefungujú. Už po prvých vetách vieš odhadnúť, či človek pred tebou hovorí z pravdy, alebo hrá naučenú rolu.",
        technique: "Lichotenie intelektu (Ego Stroke)",
        debunkExplanation: "Skeptici sú najodolnejší voči ezoterike, ale najzraniteľnejší voči pochvale ich vlastného ostrovtipu a schopnosti prekuknúť druhých."
      },
      {
        code: "B",
        label: "Nechám ho rozprávať, zbieram informácie a svoje karty držím pri tele.",
        trait: "strategic_silence",
        schemas: ["mistrust"],
        next: "s02_skep_bullshit",
        contextLead: "Nechávaš druhých rozprávať, zbieraš dáta a svoje vlastné karty držíš pri tele.",
        oracleReaction: "Si stratég. Vieš, že ten, kto najviac rozpráva, prezrádza najviac slabín. Preto si pre okolie ťažko čitateľný.",
        oracleNarrative: "Správaš sa ako trpezlivý stratég — necháš druhú stranu odkryť karty, pozorne počúvaš detaily a sám hovoríš len toľko, koľko uznáš za vhodné. Pre okolie je preto veľmi ťažké prečítať tvoje skutočné zámery.",
        technique: "Zrkadlenie stratégie",
        debunkExplanation: "Len som pomenoval tvoj vlastný postup slovom ‚stratég‘. Vytvára to pocit, že ťa niekto konečne intelektuálne dorovnal."
      }
    ]
  },

  s02_skep_bullshit: {
    id: "s02_skep_bullshit",
    phase: "branch",
    domain: "skeptic_control",
    text: "Čo ťa na ľuďoch v tvojom okolí dokáže vytočiť rýchlejšie než čokoľvek iné?",
    options: [
      {
        code: "A",
        label: "Faloš, manipulácia a keď sa niekto hrá na niečo, čím nie je.",
        trait: "hate_fakeness",
        schemas: ["mistrust"],
        next: "s03_skep_past_burn",
        contextLead: "Nulovú toleranciu máš voči faloši, manipulácii a pretvárke do očí.",
        oracleReaction: "Pravda je pre teba absolútna mena. Dokážeš odpustiť chybu z hlúposti, ale vedomé klamstvo do očí v tebe okamžite zničí rešpekt.",
        oracleNarrative: "Autentickosť je pre teba základná hodnota. Dokážeš pochopiť neúmyselnú chybu, no akonáhle u niekoho zachytíš vedomú manipuláciu alebo pretvárku, rešpekt v tebe zhasne v jedinej sekunde.",
        technique: "Morálna polarizácia (Barnum)",
        debunkExplanation: "Takmer každý človek o sebe rád počuje, že ‚odpustí chybu, ale nie klamstvo do očí‘. Znie to špecificky, ale platí univerzálne."
      },
      {
        code: "B",
        label: "Pasivita, sťažovanie sa a neschopnosť prevziať zodpovednosť za vlastný život.",
        trait: "hate_helplessness",
        schemas: ["unrelenting_standards"],
        next: "s04_skep_control",
        contextLead: "Irituje ťa pasivita, výhovorky a prenášanie zodpovednosti na okolie.",
        oracleReaction: "Neznášaš výhovorky, pretože ty sám si si všetko vydrel bez pomoci. Práve preto máš občas problém mať zľutovanie s ľuďmi, ktorí len čakajú na zázrak.",
        oracleNarrative: "Výhovorky a pasívne sťažovanie sa v tebe vyvolávajú odpor, pretože ty sám si zvyknutý spoliehať sa na vlastné ruky a hlavu. Preto máš len málo trpezlivosti s ľuďmi, ktorí čakajú, že ich problémy vyrieši niekto iný.",
        technique: "Dedukcia z hodnôt",
        debunkExplanation: "Ľudia neznášajúci pasivitu majú takmer vždy silnú sebestačnosť. Systém to preložil do vety ‚všetko si si vydrel sám‘."
      }
    ]
  },

  s03_skep_past_burn: {
    id: "s03_skep_past_burn",
    phase: "branch",
    domain: "skeptic_control",
    text: "Tento tvoj obranný radar nevznikol len tak z ničoho — kedy sa v tebe najviac vybrúsil?",
    options: [
      {
        code: "A",
        label: "Po konkrétnom sklamaní, keď niekto zneužil moju dôveru alebo otvorenosť.",
        trait: "burned_by_trust",
        schemas: ["mistrust"],
        next: "s04_skep_control",
        contextLead: "Tvoj obranný radar vznikol po tom, čo niekto v minulosti zneužil tvoju dôveru.",
        oracleReaction: "Vtedy si si vnútorne sľúbil, že už nikdy nebudeš v pozícii naivnej obete. Ten štít ťa skvele chráni, ale občas nepustí dnu ani ľudí, ktorí to myslia čisto.",
        oracleNarrative: "Tvoja ostražitosť nie je vrodený chlad — vybrúsila sa v momente, keď niekto zneužil tvoju otvorenosť. Odvtedy nosíš brnenie, ktoré ťa spoľahlivo chráni pred podvodníkmi, no niekedy bráni aj tomu, aby si sa uvoľnil medzi dobrými ľuďmi.",
        technique: "Trafenie koreňovej schémy (Nedôvera)",
        debunkExplanation: "Klasický ťah psychoterapie preoblečený za veštenie: ukázať, že obranný mechanizmus chráni pred zlom, ale zároveň izoluje od dobra."
      },
      {
        code: "B",
        label: "Postupne pozorovaním sveta — som jednoducho realista a poznám ľudskú povahu.",
        trait: "pragmatic_realist",
        schemas: ["emotional_deprivation"],
        next: "s05_skep_armor",
        contextLead: "Svet vnímaš realisticky bez ružových okuliarov na základe vlastného pozorovania.",
        oracleReaction: "Nevieš si nasadiť ružové okuliare, aj keby si chcel. Vidíš mechaniku vecí pod povrchom, čo ti dáva prevahu, ale niekedy aj pocit osamelosti medzi davom.",
        oracleNarrative: "Vnímaš svet bez prikrášľovania a vidíš skryté mechanizmy v správaní ľudí okolo seba. Tento realizmus ti dáva nadhľad, no občas prináša tichý pocit odstupu od davu, ktorý radšej verí ilúziám.",
        technique: "Archetyp ‚Osamelého pozorovateľa‘",
        debunkExplanation: "Pocit intelektuálnej odlišnosti od ‚davu‘ je extrémne silný lichotivý háčik pre analyticky zmýšľajúcich ľudí."
      }
    ]
  },

  s04_skep_control: {
    id: "s04_skep_control",
    phase: "branch",
    domain: "skeptic_control",
    text: "Ako reaguješ v situácii, nad ktorou objektívne nemáš žiadnu kontrolu?",
    options: [
      {
        code: "A",
        label: "Cítim vnútorný nepokoj a hľadám aspoň záložný plán B a C.",
        trait: "contingency_builder",
        schemas: ["hypervigilance"],
        next: "s05_skep_armor",
        contextLead: "Keď nemáš veci pod kontrolou, okamžite buduješ záložné plány B a C.",
        oracleReaction: "Tvoja myseľ potrebuje poistky a záložné riešenia. Najväčší stres ti nespôsobuje ťažký problém, ale nepredvídateľnosť a chaos.",
        oracleNarrative: "Nebojíš sa ťažkej práce ani zložitých úloh — to, čo v tebe vyvoláva skutočný nepokoj, je nepredvídateľnosť a odkázanosť na druhých. Preto máš v hlave vždy pripravenú poistku aj záložný plán.",
        technique: "Preklad osobnostnej črty",
        debunkExplanation: "Plán B a C je priama definícia potreby predvídateľnosti. Podať to ako hlbokú diagnózu stresu je čisté zrkadlenie."
      },
      {
        code: "B",
        label: "Odpojím emócie, prijmem fakty a sústredím sa len na to, čo ovplyvniť viem.",
        trait: "stoic_detachment",
        schemas: ["emotional_deprivation"],
        next: "s05_skep_armor",
        contextLead: "V nekontrolovateľnej situácii odpojíš emócie a sústredíš sa čisto na fakty.",
        oracleReaction: "V kríze si chladnokrvnejší než ktokoľvek v miestnosti. Emócie ťa však často dobehnú až spätne, keď už je po všetkom a napätie opadne.",
        oracleNarrative: "V kritickej chvíli dokážeš odpojiť emócie a konať s chladnou hlavou, zatiaľ čo ostatní panikária. Všetko napätie, ktoré vtedy zadržíš, však vypláva na povrch až neskôr v tichu, keď opadne bojový režim.",
        technique: "Dúhová lesť s oneskorením",
        debunkExplanation: "Ak niekto v kríze vypne emócie, biologicky sa vyplavený adrenalín prejaví únavou po akcii. Veštica z fyziológie urobí ‚skrytú citlivosť‘."
      }
    ]
  },

  s05_skep_armor: {
    id: "s05_skep_armor",
    phase: "branch",
    domain: "skeptic_control",
    text: "Existuje v tvojom živote aspoň jeden človek, pred ktorým dokážeš úplne zložiť brnenie a nič neanalyzovať?",
    options: [
      {
        code: "A",
        label: "Áno, mám pri sebe takého človeka a je to pre mňa najdôležitejšie zázemie.",
        trait: "safe_harbor_exists",
        schemas: [],
        next: "ROUTE_PIVOT",
        contextLead: "Máš pri sebe blízkeho človeka, pred ktorým dokážeš zložiť ochranný štít.",
        oracleReaction: "Práve toto spojenie je tvoja kotva, ktorá ťa drží v rovnováhe. Chráň si ho, pretože mimo neho ideš neustále v bojovom režime.",
        oracleNarrative: "Uprostred tvojej ostražitosti existuje jeden vzácny bezpečný prístav — človek, pred ktorým nemusíš nosiť brnenie. Práve toto puto ťa drží v rovnováhe a pripomína ti, kto si, keď vypneš všetky obranné systémy.",
        technique: "Pozitívne ukotvenie",
        debunkExplanation: "Potvrdenie hodnoty najbližšieho vzťahu vytvára pocit tepla a bezpečia — používateľ má dojem, že systém rozumie jeho duši."
      },
      {
        code: "B",
        label: "Ťažko. Väčšinou si svoje najhlbšie pochybnosti nechávam čisto pre seba.",
        trait: "lone_wolf",
        schemas: ["emotional_deprivation", "mistrust"],
        next: "ROUTE_PIVOT",
        contextLead: "Svoje najhlbšie pochybnosti si nechávaš takmer výlučne pre seba.",
        oracleReaction: "Tvoja sila je obdivuhodná, ale nosiť všetko sám na sebe bez ventilu je najťažšia cesta. Niekedy túžiš po tom, aby ťa niekto pochopil bez toho, aby si musel vysvetľovať každé slovo.",
        oracleNarrative: "Nosiť všetky pochybnosti sám na vlastných pleciach si vyžaduje obrovskú vnútornú silu, no v tichých chvíľach zanecháva pocit, že nikto skutočne nepozná celý tvoj príbeh.",
        technique: "Univerzálna túžba po pochopení",
        debunkExplanation: "Túžba ‚byť pochopený bez slov‘ je jadrom každého vzťahu aj dôvodom, prečo ľudia vôbec chodia k vešticiam a vodcom kultov."
      }
    ]
  },

  // ================= FAZA 3: PREMOSTENIE A ZAVER (5 uzlov) =================
  c01_past_shadow: {
    id: "c01_past_shadow",
    phase: "closing",
    domain: "core",
    text: "Keď sa obzrieš za poslednými piatimi rokmi, ktorá vec v tebe zanechala najsilnejšiu tichú výčitku alebo lekciu?",
    options: [
      {
        code: "A",
        label: "Že som príliš dlho ostal v situácii alebo pri ľuďoch, ktorí mi neprospievali.",
        trait: "regret_staying",
        schemas: ["self_sacrifice", "abandonment"],
        next: "c02_inner_critic",
        contextLead: "Z minulých rokov v tebe zostala lekcia z toho, že si príliš dlho zotrvával v neprospešnom prostredí.",
        oracleReaction: "Dal si druhým viac šancí, než si zaslúžili. Táto kapitola ťa však naučila poznať svoju skutočnú cenu.",
        oracleNarrative: "Pri pohľade späť je cítiť lekciu z obdobia, kedy si zotrval príliš dlho tam, kde ťa to vyčerpávalo, pretože si veril v zmenu. Táto skúsenosť ťa však naučila rozpoznať svoju vlastnú hodnotu.",
        technique: "Reframing minulosti",
        debunkExplanation: "Každú chybu z minulosti veštica premení na ‚cennú lekciu o tvojej hodnote‘, aby uľavila tvojim výčitkám."
      },
      {
        code: "B",
        label: "Že som niekedy reagoval príliš tvrdo alebo som zanedbal blízkych kvôli vlastnému tlaku.",
        trait: "regret_hardness",
        schemas: ["unrelenting_standards"],
        next: "c02_inner_critic",
        contextLead: "Dodnes v tebe občas zarezonuje spomienka na chvíle, kedy tlak prerástol do tvrdosti.",
        oracleReaction: "Tie momenty ťa dodnes zamrzia, ale neboli zo zloby — boli z vyčerpania a snahy všetko zvládnuť.",
        oracleNarrative: "V spomienkach sa občas vraciaš k okamihom, kedy si pod tiahou povinností zareagoval tvrdšie alebo si odsunul blízkych nabok. Tie chvíle však nepramenili zo zlého srdca, ale z preťaženia.",
        technique: "Rozhrešenie (Absolution Hook)",
        debunkExplanation: "Ospravedlnenie tvojich zlyhaní (‚nebolo to zo zloby‘) spúšťa okamžitú emocionálnu úľavu a silnú väzbu na rozprávača."
      },
      {
        code: "C",
        label: "Že som neurobil odvážny krok skôr, keď som mal lepšiu príležitosť.",
        trait: "regret_hesitation",
        schemas: ["defectiveness"],
        next: "c02_inner_critic",
        contextLead: "V pozadí zostal pocit zmeškanej príležitosti, ktorú si vtedy nevyužil.",
        oracleReaction: "Máš pocit strateného času, no vtedy si ešte nemal skúsenosti, ktoré máš dnes. Druhé okno sa ti ešte neuzavrelo.",
        oracleNarrative: "Občas v tebe zabliká otázka, kde by si bol dnes, keby si pred rokmi urobil jeden odvážny krok skôr. Vtedajšie váhanie však bolo potrebné, aby si nazbieral skúsenosti pre okno, ktoré sa otvára teraz.",
        technique: "Falošná nádej (Open Future)",
        debunkExplanation: "Otvorené tvrdenie ‚druhé okno sa ešte neuzavrelo‘ dodáva optimizmus bez akéhokoľvek merateľného záväzku."
      }
    ]
  },

  c02_inner_critic: {
    id: "c02_inner_critic",
    phase: "closing",
    domain: "core",
    text: "Aký tón má tvoj vnútorný hlas v momente, keď urobíš chybu?",
    options: [
      {
        code: "A",
        label: "Prísny a nekompromisný — som na seba oveľa tvrdší než na kohokoľvek iného.",
        trait: "harsh_critic",
        schemas: ["unrelenting_standards"],
        next: "CHECK_BIOMETRIC_HOOK",
        contextLead: "K sebe samému pristupuješ s oveľa tvrdším metrom než k ľuďom okolo seba.",
        oracleReaction: "K druhým dokážeš byť zhovievavý, ale sebe neodpustíš ani drobný prešľap. Ten vnútorný sudca ťa posúva vpred, no zároveň ti nedovolí tešiť sa z úspechov.",
        oracleNarrative: "Tvoj vnútorný sudca je prísnejší než ktokoľvek zvonku — druhým dokážeš odpustiť slabosť, no sebe vyčítaš aj najmenšiu chybu. Tento bič ťa ženie k vysokým výkonom, ale kradne ti radosť z dosiahnutého.",
        technique: "Dúhová lesť (Prísny k sebe, láskavý k iným)",
        debunkExplanation: "Vysoko univerzálny Barnumov výrok: takmer nikto o sebe nepovie, že je k sebe príliš zhovievavý a krutý k ostatným."
      },
      {
        code: "B",
        label: "Pochybovačný — hneď ma napadne, že nie som dosť dobrý alebo dosť schopný.",
        trait: "impostor_voice",
        schemas: ["defectiveness"],
        next: "CHECK_BIOMETRIC_HOOK",
        contextLead: "Pri neúspechu sa okamžite ozve pochybnosť o vlastnej hodnote a schopnostiach.",
        oracleReaction: "Podceňuješ vlastnú inteligenciu a hodnotu oveľa viac, než by si mal. Ľudia okolo teba vidia kvality, ktoré ty sám spochybňuješ.",
        oracleNarrative: "V momente chyby v tebe ožíva tichý hlas pochybností, ktorý spochybňuje tvoju vlastnú hodnotu. Je v tom zvláštny paradox: ľudia okolo teba vidia tvoju inteligenciu a schopnosti oveľa jasnejšie než ty sám.",
        technique: "Zásah do syndrómu podvodníka",
        debunkExplanation: "Syndróm podvodníka (Impostor Syndrome) zažíva až 70 % ľudí. Priame pomenovanie pochybností pôsobí ako čítanie myšlienok."
      },
      {
        code: "C",
        label: "Analytický — hľadám príčinu chyby, opravím postup a idem ďalej.",
        trait: "pragmatic_critic",
        schemas: [],
        next: "CHECK_BIOMETRIC_HOOK",
        contextLead: "Chybu berieš ako technickú spätnú väzbu, opravíš príčinu a pokračuješ.",
        oracleReaction: "Máš silnú mentálnu odolnosť. Chyby ťa nezlomia, skôr ťa vyprovokujú nájsť dokonalejšie riešenie.",
        oracleNarrative: "Keď príde prekážka, nepodliehaš sebaľútosti — rozoberieš príčinu chyby ako technik, opravíš postup a ideš ďalej. Práve táto mentálna odolnosť je tvojou najsilnejšou oporou.",
        technique: "Zrkadlenie odolnosti",
        debunkExplanation: "Čistá parafráza tvojej vlastnej odpovede zameraná na upevnenie pozitívneho dojmu pred finálnym verdiktom."
      }
    ]
  },

  c03_secret_wish: {
    id: "c03_secret_wish",
    phase: "closing",
    domain: "core",
    text: "Keby sa ti v najbližšom roku mohla zmeniť jediná vec bez toho, aby si o tom musel komukoľvek hovoriť, čo by to bolo?",
    options: [
      {
        code: "A",
        label: "Skutočný vnútorný pokoj bez neustáleho tlaku, čo sa zase pokazí.",
        trait: "wish_peace",
        schemas: ["hypervigilance"],
        next: "c05_final_choice",
        contextLead: "Tvojím najtichším prianím do ďalšieho roka je skutočný vnútorný pokoj bez tlaku.",
        oracleReaction: "Nehľadáš senzácie ani obdiv davu — hľadáš tichú istotu a čistú hlavu. A práve tam smeruje tvoje ďalšie obdobie.",
        oracleNarrative: "Tvoje najhlbšie prianie do najbližšieho roka nie je o vonkajšom pozlátku — túžiš po čistej hlave, pokojnom spánku a úľave od neustáleho vnútorného tlaku. Karty ukazujú, že toto upokojenie príde vo chvíli, keď pustíš z rúk veci, ktoré nepatria tebe.",
        technique: "Potvrdenie najhlbšej túžby",
        debunkExplanation: "Zrkadlenie túžby po pokoji je bezpečný univerzálny záver, ktorý rezonuje s každým preťaženým človekom."
      },
      {
        code: "B",
        label: "Jasno a úprimnosť v kľúčovom vzťahu, aby som vedel, na čom naozaj som.",
        trait: "wish_clarity_rel",
        schemas: ["abandonment"],
        next: "c05_final_choice",
        contextLead: "Najviac túžiš po úplnej úprimnosti a jasnosti v kľúčovom vzťahu.",
        oracleReaction: "Hmla okolo toho vzťahu sa začne čoskoro rozplývať. Odpoveď nepríde z veľkých slov, ale z jedného konkrétneho skutku, ktorý ti otvorí oči.",
        oracleNarrative: "Hmla neistoty okolo tvojho kľúčového vzťahu sa v najbližšom období rozplynie. Pravdu ti neukážu veľké sľuby, ale jeden konkrétny skutok, po ktorom budeš presne vedieť, na čom stojíš.",
        technique: "Filmová predpoveď (Konkrétny skutok)",
        debunkExplanation: "Fráza ‚jeden konkrétny skutok ti otvorí oči‘ nastaví tvoj mozog na hľadanie dôkazov. Akékoľvek gesto partnera si spätne spojíš s touto vetou."
      },
      {
        code: "C",
        label: "Prelom v nezávislosti — vlastný projekt, viac slobody a menej kompromisov.",
        trait: "wish_breakthrough",
        schemas: ["unrelenting_standards"],
        next: "c05_final_choice",
        contextLead: "Smeruješ k prelomu v nezávislosti, vlastnému projektu a väčšej slobode.",
        oracleReaction: "Tvoja energia sa pripravuje na nový cyklus. Už teraz máš v rukách nástroje na ten prelom, chýba len definitívne rozhodnutie uzavrieť starý kompromis.",
        oracleNarrative: "Pred tebou sa otvára obdobie prelomu a väčšej nezávislosti. Nástroje aj schopnosti pre svoj vlastný smer už držíš v rukách — zlom nastane v okamihu, keď prestaneš robiť kompromisy proti vlastnému presvedčeniu.",
        technique: "Motivačný uzáver (Empowerment)",
        debunkExplanation: "Klasický záver, ktorý vracia zodpovednosť klientovi: ak uspeje, veštba vyšla; ak nie, ‚neurobil definitívne rozhodnutie‘."
      }
    ]
  },

  c04_biometric_hook: {
    id: "c04_biometric_hook",
    phase: "closing",
    domain: "biometric",
    text: "Zastav sa na sekundu. Pred chvíľou, keď sme sa dotkli citlivejšej témy, tvoja reakcia na zlomok sekundy zaváhala. Priznať si pravdu pred sebou samým býva najťažšie — rezonovalo to s tebou viac, než si chcel ukázať?",
    options: [
      {
        code: "A",
        label: "Áno, presne v tom bode som sa na chvíľu zasekol a trafilo to citlivé miesto.",
        trait: "bio_confirmed",
        schemas: [],
        next: "c05_final_choice",
        contextLead: "Potvrdil si, že zachytené zaváhanie trafilo citlivé miesto.",
        oracleReaction: "Telo a rytmus reakcií nikdy neklamú tak ľahko ako slová. Práve tam leží skutočné jadro veci, ktorú teraz potrebuješ vyriešiť.",
        oracleNarrative: "Keď sme sa dotkli jadra problému, tvoje vnútorné zaváhanie prezradilo viac než dlhé vety. Práve v tom bode, kde sa ti na sekundu zatajil dych, leží odpoveď, ktorú pred sebou najdlhšie odkladáš.",
        technique: "Biometrický háčik (Latencia + FACS)",
        debunkExplanation: "Toto bol živý dôkaz techniky Cold Reading + meranie: systém len skontroloval, pri ktorej otázke si váhal najdlhšie (v milisekundách) alebo kde MediaPipe zachytil odchýlku mimiky nad 2,2 sigma."
      },
      {
        code: "B",
        label: "Nie, len som si dôkladne čítal možnosti a premýšľal nad presnou formuláciou.",
        trait: "bio_rationalized",
        schemas: ["hypervigilance"],
        next: "c05_final_choice",
        contextLead: "Zaváhanie si vysvetlil racionálnym zvažovaním formulácie.",
        oracleReaction: "Vidíš, aj táto potreba okamžite všetko racionálne vysvetliť a udržať pod kontrolou je súčasťou tvojej obrany.",
        oracleNarrative: "Aj tvoja okamžitá potreba všetko racionálne zdôvodniť a udržať pod kontrolou je súčasťou toho istého ochranného štítu, ktorý si nosíš so sebou.",
        technique: "Kafka Trap (Nepriestrelná pasca)",
        debunkExplanation: "Klasická manipulačná pasca zvaná Kafka Trap: keď priznáš citlivé miesto, má veštica pravdu; keď ho poprieš, označí tvoje popretie za ‚dôkaz obrany‘. Nemôžeš vyhrať."
      }
    ]
  },

  c05_final_choice: {
    id: "c05_final_choice",
    phase: "closing",
    domain: "core",
    text: "Posledný krok zrkadla: keď sa na celý svoj doterajší priebeh pozrieš z odstupu, aký pocit máš z toho, ako presne sa ťa tento rozhovor dotkol?",
    options: [
      {
        code: "A",
        label: "Prekvapivo presné — mal som miestami pocit, akoby si poznal moju situáciu.",
        trait: "illusion_high",
        schemas: [],
        next: null,
        contextLead: "",
        oracleReaction: "Tvoj profil je uzavretý. Otváram tvoju osobnú predpoveď.",
        oracleNarrative: "",
        technique: "Ukotvenie ilúzie pred odhalením",
        debunkExplanation: "Tento krok ti umožnil vedome si všimnúť, ako silno funguje ilúzia ešte predtým, než prepneš do vedeckej roviny a uvidíš zdrojový kód triku."
      },
      {
        code: "B",
        label: "Čiastočne presné — niektoré veci sadli výborne, inde som cítil všeobecné frázy.",
        trait: "illusion_mid",
        schemas: [],
        next: null,
        contextLead: "",
        oracleReaction: "Tvoja vnímavosť je ostrá. Otváram tvoju osobnú predpoveď.",
        oracleNarrative: "",
        technique: "Kalibrácia dôvery",
        debunkExplanation: "Aj pri čiastočnej skepse si mozog prirodzene zapamätá trefy a zabudne omyly (Konfirmačné skreslenie)."
      },
      {
        code: "C",
        label: "Vidím za tým systém otázok a šablóny, chcem vidieť hĺbkový rozbor.",
        trait: "illusion_low",
        schemas: [],
        next: null,
        contextLead: "",
        oracleReaction: "Výborne. Otváram zhrnutie z pohľadu veštice aj vedeckú pitvu.",
        oracleNarrative: "",
        technique: "Kritický odstup",
        debunkExplanation: "Rozpoznal si vzorec manipulácie v reálnom čase. Vo vedeckej rovine si teraz môžeš pozrieť presné dáta z kamery, latencie a schémovej terapie."
      }
    ]
  }
};

export function getTotalNodeCount() {
  return Object.keys(NODES).length;
}

export function rankDomains(domainScores) {
  const entries = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
  return {
    primary: entries[0]?.[0] || "relationships",
    secondary: entries[1]?.[0] || "career_finance"
  };
}

/**
 * Dynamically weaves context from previous choices and behavioral signals
 * into the next question so the dialogue feels organic rather than static.
 */
export function buildContextualQuestion({
  node,
  auditTrail,
  domainScores,
  strongestBiometricEvent
}) {
  if (!node || auditTrail.length === 0) {
    return { bridge: "", questionText: node ? node.text : "" };
  }

  const lastEntry = auditTrail[auditTrail.length - 1];
  const { primary } = rankDomains(domainScores);
  let bridge = lastEntry.contextLead || "";

  // Add subtle behavioral adaptation if user showed high latency or FACS spike on previous step
  if (lastEntry.facs_spikes > 0 && node.id !== "c04_biometric_hook") {
    bridge = `${bridge} (Pri predošlej otázke sa ti na zlomok sekundy zmenil výraz tváre.)`.trim();
  } else if (lastEntry.latency_ms > 4200 && auditTrail.length >= 2 && node.id !== "c04_biometric_hook") {
    bridge = `${bridge} (Bolo cítiť, že nad predošlou odpoveďou si sa na chvíľu hlbšie zamyslel.)`.trim();
  }

  let questionText = node.text;

  // Dynamic phrasing adjustments for key transition nodes
  if (node.id === "n03_mask") {
    const domShort = DOMAIN_META[primary]?.shortLabel.toLowerCase() || "tvojom živote";
    questionText = `Keď ide o oblasť (${domShort}), ktorá veta najviac vystihuje rozdiel medzi tým, ako ťa vidí okolie, a tým, čo cítiš vnútri?`;
  } else if (node.id === "c01_past_shadow") {
    const domTopic = DOMAIN_META[primary]?.oracleTopic || "tvojom živote";
    questionText = `Keď sa v súvislosti s tým, čo riešiš (${domTopic}), obzrieš za poslednými piatimi rokmi — ktorá vec v tebe zanechala najsilnejšiu tichú výčitku alebo lekciu?`;
  } else if (node.id === "c04_biometric_hook" && strongestBiometricEvent) {
    const topic = DOMAIN_META[primary]?.oracleTopic || "citlivejšej téme";
    questionText = `Zastav sa na sekundu. Pred chvíľou pri téme (${topic}) som zachytil miernu odchýlku v tvojej reakcii (${strongestBiometricEvent.detail}). Dotklo sa to niečoho, čo pred okolím radšej skrývaš?`;
  }

  return { bridge, questionText };
}

export function resolveNextNodeId({
  currentOption,
  visitedIds,
  domainScores,
  maxSteps,
  stepCount,
  strongestBiometricEvent
}) {
  if (stepCount >= maxSteps) {
    return visitedIds.has("c05_final_choice") ? null : "c05_final_choice";
  }

  const target = currentOption.next;
  if (!target) return null;

  const branchEntryMap = {
    relationships: "r01_rel_tension",
    career_finance: "f01_fin_pressure",
    health_stress: "h01_health_signal",
    skeptic_control: "s01_skep_shield"
  };

  if (target === "ROUTE_PRIMARY") {
    const { primary } = rankDomains(domainScores);
    return branchEntryMap[primary];
  }

  if (target === "ROUTE_PIVOT") {
    const { secondary } = rankDomains(domainScores);
    const secEntry = branchEntryMap[secondary];
    if (maxSteps >= 11 && stepCount <= maxSteps - 4 && !visitedIds.has(secEntry)) {
      return secEntry;
    }
    return visitedIds.has("c01_past_shadow") ? "c03_secret_wish" : "c01_past_shadow";
  }

  if (target === "CHECK_BIOMETRIC_HOOK") {
    if (strongestBiometricEvent && !visitedIds.has("c04_biometric_hook")) {
      return "c04_biometric_hook";
    }
    return "c03_secret_wish";
  }

  if (visitedIds.has(target)) {
    if (!visitedIds.has("c03_secret_wish")) return "c03_secret_wish";
    if (!visitedIds.has("c05_final_choice")) return "c05_final_choice";
    return null;
  }

  return target;
}

/**
 * Generates both deep final outputs:
 * 1) Pure Fortune-Teller Reading (5 cohesive, deeply personalized chapters, zero spoilers)
 * 2) Scientific Analysis (Domain weights, Latency/FACS telemetry, Schema Therapy profile, Step-by-step audit)
 */
export function buildDeepSynthesis({
  auditTrail,
  domainScores,
  sessionData,
  bioEvent
}) {
  const { primary: primaryKey, secondary: secondaryKey } = rankDomains(domainScores);
  const primary = DOMAIN_META[primaryKey];
  const secondary = DOMAIN_META[secondaryKey];

  const openingNarratives = auditTrail
    .filter((a) => a.phase === "opening" && a.oracle_narrative)
    .map((a) => a.oracle_narrative);

  const primaryBranchNarratives = auditTrail
    .filter((a) => a.phase === "branch" && a.domain === primaryKey && a.oracle_narrative)
    .map((a) => a.oracle_narrative);

  const secondaryBranchNarratives = auditTrail
    .filter((a) => a.phase === "branch" && a.domain !== primaryKey && a.oracle_narrative)
    .map((a) => a.oracle_narrative);

  const closingNarratives = auditTrail
    .filter((a) => a.phase === "closing" && a.oracle_narrative)
    .map((a) => a.oracle_narrative);

  // Rank schemas across all chosen answers
  const schemaCounts = {};
  for (const item of auditTrail) {
    for (const sc of item.schemas || []) {
      schemaCounts[sc] = (schemaCounts[sc] || 0) + 1;
    }
  }
  const rankedSchemas = Object.entries(schemaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => ({
      key,
      count,
      ...SCHEMA_CATALOG[key]
    }))
    .filter((s) => s.name);

  // Latency stats
  const totalQ = Math.max(sessionData.questions.length, 1);
  const avgLatency = Math.round(
    sessionData.questions.reduce((acc, q) => acc + q.latency_ms, 0) / totalQ
  );
  const sortedByLatency = [...sessionData.questions].sort((a, b) => b.latency_ms - a.latency_ms);
  const slowestQ = sortedByLatency[0] || null;
  const fastestQ = sortedByLatency[sortedByLatency.length - 1] || null;

  return {
    primaryKey,
    secondaryKey,
    primary,
    secondary,
    oracleChapters: {
      chapter1_energy:
        openingNarratives.join(" ") ||
        "Tvoja energia ukazuje na človeka, ktorý navonok drží pevnú tvár, no vnútri nesie viac nezodpovedaných otázok, než ukazuje okoliu.",
      chapter2_main_focus:
        primaryBranchNarratives.join(" ") ||
        `Tvojím hlavným ohniskom v tomto období je ${primary.oracleTopic}.`,
      chapter3_background_and_shadow: [
        secondaryBranchNarratives.length > 0
          ? `V pozadí do toho zároveň ticho zasahuje aj druhá rovina — ${secondary.oracleTopic}. ${secondaryBranchNarratives.join(" ")}`
          : `V pozadí do tvojho prežívania potichu vstupuje aj ${secondary.oracleTopic}, hoci jej teraz nevenuješ hlavnú pozornosť.`,
        ...closingNarratives.slice(0, 2)
      ].join(" "),
      chapter4_intuition_moment: bioEvent
        ? `Počas nášho rozhovoru nastal jeden veľmi výrazný okamih — presne vtedy, keď sme sa priblížili k citlivejšiemu miestu, tvoje vnútro na zlomok sekundy zneistelo (${bioEvent.mysticalHint}). Slová dokážeš ustrážiť rozumom, ale tvoj vnútorný rytmus okamžite ukázal, kde leží skutočné jadro veci.`
        : `Z celého tvojho rozprávania je cítiť tichý rozpor medzi tým, čo diktuje rozum a povinnosť, a tým, po čom volá tvoje vnútro. Odpoveď na tvoju dilemu však už v sebe dávno nosíš — len čakáš na odvahu urobiť prvý krok.`,
      chapter5_outlook:
        closingNarratives.slice(2).join(" ") ||
        "Najbližšie mesiace prinesú uvoľnenie tlaku v momente, keď prestaneš robiť kompromisy proti vlastnému svedomiu a jasne pomenuješ svoje hranice."
    },
    scientificStats: {
      avgLatency,
      slowestQ,
      fastestQ,
      rankedSchemas
    }
  };
}

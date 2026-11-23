/**
 * The Mirror — Adaptive Cold Reading & Debunk Graph (30 Nodes)
 *
 * Architektura:
 * - 3 otvaracie uzly (Kalibracia temy, tempa a socialnej masky)
 * - 4 specializovane vetvy (Vztahy: 6, Financie/Praca: 6, Zdravie/Stres: 5, Skeptik/Kontrola: 5)
 * - 5 zaverovych a premostovacich uzlov vratane dynamickeho Biometrickeho hacika
 * Spolu: 30 unikatnych uzlov, z ktorych sa pre pouzivatela dynamicky posklada
 * 8-krokove (Rychle zrkadlo) alebo 12-krokove (Hlboky rozbor) interaktivne sedenie.
 */

export const DOMAIN_META = {
  relationships: {
    label: "Vzťahy a blízkosť",
    oracleTopic: "vzťah s partnerom alebo blízkym človekom",
    schemaHint: "Opustenie / Emocionálna deprivácia / Sebaobetovanie"
  },
  career_finance: {
    label: "Práca, financie a smerovanie",
    oracleTopic: "pracovný tlak, financie a nenaplnený potenciál",
    schemaHint: "Neúprosné normy / Vyhľadávanie uznania"
  },
  health_stress: {
    label: "Energia, telo a vnútorné preťaženie",
    oracleTopic: "vnútorné vyčerpanie a signály tela, ktoré dlho potláčaš",
    schemaHint: "Sebaobetovanie / Zraniteľnosť / Emocionálna inhibícia"
  },
  skeptic_control: {
    label: "Kontrola, dôvera a obranný štít",
    oracleTopic: "potreba mať veci pod kontrolou a opatrnosť po minulom sklamaní",
    schemaHint: "Nedôvera / Zneužívanie / Neúprosné normy"
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
        domainBoost: { relationships: 3 },
        next: "n02_tempo",
        oracleReaction: "Cítim to veľmi jasne. Okolo tvojho srdca je teraz viac otázok než pokoja a niečo medzi tebou a blízkou osobou zostáva nedopovedané.",
        technique: "Cold Profiling (Vstupný lievik)",
        debunkExplanation: "Veštica ti na začiatku položí širokú otázku na 'energiu'. Tvojím kliknutím si jej sám prezradil hlavnú tému (vzťahy) a otvoril si celú vzťahovú vetvu scenára."
      },
      {
        code: "B",
        label: "Práca, financie, zodpovednosť alebo rozhodnutie, kam sa posunúť ďalej.",
        trait: "fin_focus",
        domainBoost: { career_finance: 3 },
        next: "n02_tempo",
        oracleReaction: "Okolo teba je silná energia zodpovednosti. Máš pocit, že ťaháš viac, než si okolie uvedomuje, a čakáš na moment zlomu.",
        technique: "Cold Profiling (Vstupný lievik)",
        debunkExplanation: "Jediným výberom si systému odovzdal smer (práca a peniaze). Veštica tento fakt okamžite zopakuje mystickými slovami, aby vytvorila dojem napojenia."
      },
      {
        code: "C",
        label: "Únava, nepokoj v hlave, spánok alebo starosť o zdravie svoje či blízkych.",
        trait: "health_focus",
        domainBoost: { health_stress: 3 },
        next: "n02_tempo",
        oracleReaction: "Tvoje pole pôsobí preťažene. Telo ti už dlhšie posiela tiché signály, ktoré cez deň prehlušíš povinnosťami, ale večer sa vracajú.",
        technique: "Shotgunning + Barnumov efekt",
        debunkExplanation: "Keď priznáš únavu alebo stres, tvrdenie o 'signáloch tela, ktoré sa vracajú večer' sedí štatisticky takmer na každého vyčerpaného človeka."
      },
      {
        code: "D",
        label: "Nič konkrétne ma netrápi, skôr ma zaujíma, ako tento systém funguje a či ma prekukne.",
        trait: "skeptic_focus",
        domainBoost: { skeptic_control: 3 },
        next: "n02_tempo",
        oracleReaction: "Zaujímavé. Máš silnú analytickú myseľ a neotváraš sa len tak niekomu. Práve ľudia, ktorí hľadajú chybu v systéme, však v sebe často nosia najsilnejší štít z minulosti.",
        technique: "Preklopenie odporu (Reframing skeptika)",
        debunkExplanation: "Skúsený manipulátor sa skeptika nezľakne. Naopak, pochváli jeho inteligenciu ('analytická myseľ') a preklopí skepticizmus na 'skrytý štít z minulosti', čím ho vtiahne do hry."
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
        domainBoost: { skeptic_control: 1, career_finance: 1 },
        next: "n03_mask",
        oracleReaction: "Tvoja myseľ ide na plné obrátky aj vtedy, keď ostatní už dávno spia. Často vidíš riziká skôr než druhí, čo je tvoj dar aj tvoja záťaž.",
        technique: "Dúhová lesť (Rainbow Ruse)",
        debunkExplanation: "Veta spojila vlastnosť aj jej tienistú stránku ('dar aj záťaž'). Mozog si automaticky potvrdí presne tú polovicu, ktorú v danej chvíli cíti silnejšie."
      },
      {
        code: "B",
        label: "Vnútorne cítim správnu odpoveď hneď, ale potom ju začnem spochybňovať.",
        trait: "self_doubter",
        domainBoost: { relationships: 1, health_stress: 1 },
        next: "n03_mask",
        oracleReaction: "Máš veľmi silnú intuíciu, ale opakovane ju prehlušuješ strachom, aby si neurobil chybu alebo niekomu neublížil.",
        technique: "Barnumov (Forerov) efekt",
        debunkExplanation: "Povedať človeku, že má 'silnú intuíciu, ale bojí sa ublížiť', lichotí jeho egu a zároveň vysvetľuje nerozhodnosť bez toho, aby ho to urazilo."
      },
      {
        code: "C",
        label: "Rozhodnem rýchlo a preberiem velenie, lebo ma irituje čakanie a chaos.",
        trait: "dominant_actor",
        domainBoost: { career_finance: 1, skeptic_control: 1 },
        next: "n03_mask",
        oracleReaction: "Navonok pôsobíš ako skala, na ktorú sa dá spoľahnúť. Málokto však vidí, že za tou rýchlosťou je únava z toho, že musíš všetko ťahať sám.",
        technique: "Kontrast fasády a vnútra",
        debunkExplanation: "Klasický trik Cold Readingu: oddelí to, ako človek pôsobí navonok ('skala'), od skrytej bolesti ('únava'). Funguje na 9 z 10 dominantných osobností."
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
        domainBoost: { health_stress: 1, relationships: 1 },
        next: "ROUTE_PRIMARY",
        oracleReaction: "Presne túto vrstvu som potreboval zachytiť. Nosíš v sebe tichú zrelosť, ale chýba ti priestor, kde by si nemusel hrať rolu silného.",
        technique: "Feedback Loop (Recyklácia priznania)",
        debunkExplanation: "Zopakoval som presne tvoju odpoveď inými slovami ('tichá zrelosť' namiesto 'vyrovnaný'). Mozog to vníma ako hlboké porozumenie, hoci nepribudla žiadna nová informácia."
      },
      {
        code: "B",
        label: "Pôsobím prísne alebo odmerane, no v skutočnosti som lojálny k tým pár ľuďom, ktorým verím.",
        trait: "armored_loyal",
        domainBoost: { skeptic_control: 2 },
        next: "ROUTE_PRIMARY",
        oracleReaction: "Tvoja tvrdosť nie je chlad, je to filter. Kto prejde cez tvoju bránu, má v tebe spojenca na život a na smrť, no kto sklamal, tomu už dvere neotvoríš.",
        technique: "Lichotivý archetyp (Flattery)",
        debunkExplanation: "Tvrdenie o 'spojencovi na život a na smrť' vytvára okamžitú emočnú väzbu. Veštica sa stáva jediným človekom, ktorý 'vidí pravdu za tvojou maskou'."
      },
      {
        code: "C",
        label: "Snažím sa vychádzať s každým a pomáhať, aj keď ma to občas stojí vlastný pokoj.",
        trait: "pleaser_burn",
        domainBoost: { relationships: 2, health_stress: 1 },
        next: "ROUTE_PRIMARY",
        oracleReaction: "Dávaš druhým energiu, ktorú potom hľadáš sám pre seba. A najviac ťa zabolí, keď ľudia tvoju dobrotu začnú brať ako samozrejmosť.",
        technique: "Univerzálny Barnumov výrok",
        debunkExplanation: "Veta 'ľudia berú tvoju dobrotu ako samozrejmosť' je jedna z najčastejších fráz na ezolinkách. Vyvoláva okamžité prikývnutie u empatických ľudí."
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
        domainBoost: { relationships: 1 },
        next: "r02_rel_partner_mirror",
        oracleReaction: "Je vidieť, že riešiš nerovnováhu s partnerom alebo veľmi blízkou osobou. Nechceš veľké gestá, stačilo by ti cítiť, že v tom nie si sám.",
        technique: "Špecifikácia z kontextu (Funneling)",
        debunkExplanation: "Systém spojil tvoju prvú voľbu (vzťahy) s terajšou (nerovnováha) a vyslovil konkrétnu diagnózu. Pôsobí to ako telepatia, no ide o obyčajné spojenie dvoch odpovedí."
      },
      {
        code: "B",
        label: "Medzi nami chýba otvorený rozhovor, niektoré témy radšej obchádzame.",
        trait: "rel_silence",
        domainBoost: { relationships: 1 },
        next: "r02_rel_partner_mirror",
        oracleReaction: "Vidím tu stenu z ticha. Obaja viete, že pod povrchom niečo visí, ale bojíte sa, že jedno nevhodné slovo otvorí starú hádku.",
        technique: "Pushing (Hádanie scenára)",
        debunkExplanation: "Kde je ticho a vyhýbanie sa témam, tam takmer vždy existuje strach z konfliktu. Veštica tento logický dôsledok podá ako 'víziu'."
      },
      {
        code: "C",
        label: "Nie som si istý, či je človek vedľa mňa naozaj tým správnym na dlhú cestu.",
        trait: "rel_doubt_future",
        domainBoost: { relationships: 1 },
        next: "r05_rel_decision",
        oracleReaction: "V tvojom vnútri sa bije rozum so srdcom. Jedna časť hľadá istotu a zázemie, druhá cíti, že niečo podstatné ti chýba.",
        technique: "Dúhová lesť (Rozum vs. Srdce)",
        debunkExplanation: "Rozpor medzi rozumom a srdcom je univerzálny opis každej partnerskej dilemy. Klient si do slova 'niečo podstatné' sám dosadí vlastný problém (vášeň, rešpekt, bezpečie)."
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
        next: "r03_rel_trust",
        oracleReaction: "Cítim tam tvrdohlavosť alebo neschopnosť hovoriť o emóciách. Ty potom zostávaš s pocitom, že narážaš do sklenenej steny.",
        technique: "Archetypálna projekcia",
        debunkExplanation: "Popis 'tvrdohlavosť a sklenená stena' je učebnicový preklad vyhýbavého vzťahového štýlu, ktorý si práve sám popísal."
      },
      {
        code: "B",
        label: "Okamžite sa bráni, útočí späť alebo otočí vinu na mňa.",
        trait: "partner_defensive",
        next: "r04_rel_boundary",
        oracleReaction: "Pozor, v tej energii je silný obranný mechanizmus až manipulácia. Často odchádzaš z rozhovoru s výčitkami, hoci si pôvodne chcel len pokojne vec vyriešiť.",
        technique: "Emocionálna validácia",
        debunkExplanation: "Keď veštica pomenuje presný pocit po hádke ('odchádzaš s výčitkami'), získa obrovskú dôveru, pretože validuje tvoju frustráciu."
      },
      {
        code: "C",
        label: "Vypočuje ma, sľúbi zmenu, ale po pár dňoch sa všetko vráti do starých koľají.",
        trait: "partner_inertia",
        next: "r05_rel_decision",
        oracleReaction: "Vidím tu cyklus sľubov a návratov. Nie je v tom nutne zlý úmysel, ale zvyk je u tej osoby silnejší než slová, a tebe postupne dochádza trpezlivosť.",
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
        next: "r04_rel_boundary",
        oracleReaction: "Tá stará jazva sa nikdy úplne nezavrela. Dnes preto čítaš medzi riadkami aj veci, ktoré iní nevidia, no stojí ťa to veľa vnútorného pokoja.",
        technique: "Trafenie schémy (Nedôvera)",
        debunkExplanation: "Väčšina dospelých zažila sklamanie v láske alebo priateľstve. Prepojenie minulosti s dnešnou ostražitosťou vytvára ilúziu hlbokého vhľadu."
      },
      {
        code: "B",
        label: "Skôr mám v sebe strach z opustenia alebo z toho, že zostanem nakoniec sám.",
        trait: "fear_abandonment",
        next: "r06_rel_unspoken",
        oracleReaction: "V hĺbke duše túžiš po bezpečnom prístave, kde sa nemusíš báť, že niekto jedného dňa zavrie dvere. Preto občas prehliadaš veci, ktoré by si inak netoleroval.",
        technique: "Klinický profil maskovaný ako veštba",
        debunkExplanation: "Strach z opustenia priamo koreluje s prehliadaním červených vlajok. Psychológ to vie z učebnice schémovej terapie, veštica to predáva ako dar."
      },
      {
        code: "C",
        label: "Minulosť som uzavrel, problém je čisto v tom, čo sa deje práve teraz.",
        trait: "present_pragmatic",
        next: "r05_rel_decision",
        oracleReaction: "Máš zdravý základ a neťaháš zbytočne duchov z minulosti. O to jasnejšie však vidíš, že dnešný nesúlad nie je len tvoja domýšľavosť.",
        technique: "Bezpečný ústup (Always Give an Out)",
        debunkExplanation: "Podľa pravidla Raya Hymana sa veštica nikdy neháda, keď sa netrafí. Okamžite otočí tvoje nesúhlasné 'nie' na pochvalu ('máš zdravý základ')."
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
        next: "r06_rel_unspoken",
        oracleReaction: "Tvoja trpezlivosť je obrovská, ale keď niekto prekročí tú poslednú čiaru, vieš sa zmeniť na nepoznanie a urobiť hrubú čiaru.",
        technique: "Dúhová lesť (Trpezlivý vs. Nekompromisný)",
        debunkExplanation: "Presná šablóna z knihy Iana Rowlanda: kombinácia veľkej trpezlivosti a náhleho výbuchu sedí na väčšinu ľudí s potlačenými hranicami."
      },
      {
        code: "B",
        label: "Pomenujem to rovno a tvrdo, ale potom ma mrzí, ak som bol príliš ostrý.",
        trait: "boundary_sharp",
        next: "r05_rel_decision",
        oracleReaction: "Tvoja úprimnosť je ako skalpel — mieri presne, no potom cítiš vinu za to, že pravda zabolela.",
        technique: "Metaforické zrkadlenie",
        debunkExplanation: "Silná obrazná metafora ('skalpel') dodáva obyčajnému zhrnutiu tvojej odpovede mystickú váhu."
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
        next: "r06_rel_unspoken",
        oracleReaction: "Tá veta je už v tebe sformulovaná. Karty ukazujú, že tento rozhovor príde skôr, než si myslíš, a prinesie obrovskú úľavu bez ohľadu na výsledok.",
        technique: "Sebanaplňujúce proroctvo",
        debunkExplanation: "Veštica zoberie tvoje vlastné prianie a sformuluje ho ako predpoveď budúcnosti. Keď ten rozhovor o týždeň naozaj urobíš, povieš si: 'Ona to videla dopredu!'"
      },
      {
        code: "B",
        label: "Dal by som si odstup a čas pre seba, aby som si vyčistil hlavu bez cudzieho tlaku.",
        trait: "need_space",
        next: "r06_rel_unspoken",
        oracleReaction: "Potrebuješ získať nadhľad. Príliš dlho si dýchal vzduch niekoho iného a stratil si kontakt s vlastným kompasom.",
        technique: "Emocionálne preorámovanie",
        debunkExplanation: "Poetický obraz ('dýchal vzduch niekoho iného') prehlbuje ilúziu empatie, pričom stále len parafrázuje tvoju voľbu 'čas pre seba'."
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
        next: "ROUTE_PIVOT",
        oracleReaction: "Tvoje svedomie je silnejšie než tvoje ego. Práve preto sa však často stávaš rukojemníkom vlastnej empatie.",
        technique: "Lichotivé ospravedlnenie slabosti",
        debunkExplanation: "Veštica nikdy nepovie, že si slabý. Nazve to 'rukojemníkom vlastnej empatie', čo znie ušľachtilo a príjemne."
      },
      {
        code: "B",
        label: "Že stratím stabilitu a zistím, že som sa celé tie roky mýlil.",
        trait: "fear_sunk_cost",
        next: "ROUTE_PIVOT",
        oracleReaction: "Drží ťa energia minulých investícií — koľko času a síl si do toho už vložil. Ale budúcnosť sa nedá zaplatiť tým, čo bolo včera.",
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
        next: "f02_fin_recognition",
        oracleReaction: "Presne to tu vidím — energia okolo podpisu a dokumentov, ktorá brzdí plynulý tok peňazí. Čakáš na uzatvorenie, ktoré sa už dvakrát oddialilo.",
        technique: "Shotgunning (Úradné papiere)",
        debunkExplanation: "Úradné papiere, faktúry, zmluvy alebo záväzky rieši takmer každý dospelý človek. Keď túto možnosť potvrdíš, veštica na nej postaví 'víziu'."
      },
      {
        code: "B",
        label: "Pocit, že moje schopnosti a čas zarábajú menej, než akú majú reálnu hodnotu.",
        trait: "fin_undervalued",
        next: "f02_fin_recognition",
        oracleReaction: "Máš v sebe obrovský nevyužitý potenciál. Si v prostredí alebo systéme, ktorý ťa prerastá, a cítiš, že dokážeš oveľa viac.",
        technique: "Kráľovský Barnumov výrok (Nevyužitý potenciál)",
        debunkExplanation: "Podľa Iana Rowlanda nikto na planéte nepovie 'vyčerpal som svoj potenciál na 100 %'. Každý má pocit, že by mohol byť lepšie ohodnotený."
      },
      {
        code: "C",
        label: "Stojím na križovatke medzi istotou a vlastnou cestou či novým projektom.",
        trait: "fin_crossroads",
        next: "f03_fin_autonomy",
        oracleReaction: "Vidím pred tebou dve cesty. Jedna je známa a bezpečná, ale pomaly ťa dusí; druhá prináša slobodu, no vyžaduje odvahu urobiť prvý krok do neznáma.",
        technique: "Dvojcestná metafora (Tarotový archetyp)",
        debunkExplanation: "Klasická formulácia z výkladu kariet (Dvojka palíc / Blázon). Len zrkadlí voľbu 'istota vs. vlastná cesta', ktorú si práve označil."
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
        next: "f04_fin_burnout",
        oracleReaction: "Ľudia okolo teba spohodlneli, pretože vedia, že ty to nakoniec vždy zachrániš. Si tichý pilier, na ktorom stojí viac, než si priznávajú.",
        technique: "Lichotivé potvrdenie roly (The Fixer)",
        debunkExplanation: "V každom tíme si schopní ľudia myslia, že ťahajú prácu za ostatných. Označenie za 'tichý pilier' okamžite vytvára sympatie k veštici."
      },
      {
        code: "B",
        label: "Je tam konkrétna osoba, ktorá ma brzdí, závidí alebo hrá zákulisné hry.",
        trait: "work_rival",
        next: "f05_fin_blocked",
        oracleReaction: "Cítim okolo tvojej práce falošnú energiu — niekto sa usmieva do očí, ale nepraje ti postup. Dávaj si pozor, komu prezrádzaš svoje plány skôr, než sú hotové.",
        technique: "Paranoidný háčik (Skrytý nepriateľ)",
        debunkExplanation: "Klasická pasca ezoliniek: zasiať podozrenie na 'falošného človeka v okolí'. Klient si v hlave okamžite dosadí kolegu alebo známeho a uverí, že veštica ho 'videla'."
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
        next: "f06_fin_leap",
        oracleReaction: "Peniaze pre teba nie sú o luxuse ani o ukazovaní sa. Sú pre teba nástrojom nezávislosti, pretože klietka — hoci aj zlatá — by ťa zničila.",
        technique: "Hodnotový profil (Sloboda vs. Status)",
        debunkExplanation: "Krásna formulácia o 'zlatej klietke', ktorá však len preložila tvoje vlastné slovo 'sloboda' do dramatickejšej metafory."
      },
      {
        code: "B",
        label: "Bezpečie a istota, aby moji blízki nemuseli riešiť existenčný strach.",
        trait: "money_security",
        next: "f04_fin_burnout",
        oracleReaction: "Máš v sebe silný inštinkt ochrancu. Často odkladáš vlastnú radosť bokom len preto, aby si mal istotu, že zázemie vydrží aj horšie časy.",
        technique: "Archetyp ochrancu",
        debunkExplanation: "Spojenie slova 'istota pre blízkych' s 'odkladaním vlastnej radosti' je štatisticky takmer istý zásah u zodpovedných živiteľov."
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
        next: "f06_fin_leap",
        oracleReaction: "Tvoj motor ide dlhodobo v červených otáčkach. Ak si pauzu nevezmeš dobrovoľne, život ťa čoskoro donúti spomaliť sám.",
        technique: "Mierne varovanie (Soft Threat)",
        debunkExplanation: "Varovanie typu 'život ťa donúti spomaliť' znie ako osudová predtucha, no v skutočnosti je to elementárna fyziológia vyhorenia."
      },
      {
        code: "B",
        label: "Viem vypnúť, ale hlava mi aj tak neustále vymýšľa nové plány a riešenia.",
        trait: "restless_mind",
        next: "f05_fin_blocked",
        oracleReaction: "Tvoja hlava je ako neustále bežiaci prijímač nápadov. Problém nie je v tom, že by si nevedel pracovať, ale v tom, že tvojich nápadov je viac než hodín v dni.",
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
        next: "f06_fin_leap",
        oracleReaction: "Zdá sa ti, že okolnosti hrajú proti tebe, ale v horizonte najbližších mesiacov sa objaví nečakané okno alebo kontakt, ktorý posunie veci dopredu.",
        technique: "Vágna časová predpoveď",
        debunkExplanation: "Fráza 'v horizonte najbližších mesiacov príde kontakt' sa nedá vyvrátiť a vyvoláva konfirmačné skreslenie — prvú dobrú správu o dva mesiace pripíšeš veštbe."
      },
      {
        code: "B",
        label: "Úprimne — občas som tou najväčšou brzdou ja sám, lebo chcem mať všetko dokonalé.",
        trait: "perfectionist_block",
        next: "f06_fin_leap",
        oracleReaction: "Karty ukazujú na vnútorného kritika. Čakáš na dokonalý moment, no tvoj úspech príde až vo chvíli, keď pustíš do sveta vec, ktorá má 'len' 90 percent.",
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
        next: "ROUTE_PIVOT",
        oracleReaction: "Presne o tom hovorí tvoja energia. Nečakáš na lepšie podmienky, čakáš na povolenie od seba samého. Zmena príde v momente, keď prestaneš odkladať prvý krok.",
        technique: "Pushing (Univerzálne tajomstvo)",
        debunkExplanation: "Takmer každý človek má v zásuvke nejaký polročný plán. Pýtať sa naň ako na 'jedno konkrétne rozhodnutie' vytvára falošný pocit, že ho systém pozná."
      },
      {
        code: "B",
        label: "Nie, veci riešim priebežne a skôr hľadám spôsob, ako ich zefektívniť.",
        trait: "optimizer_mind",
        next: "ROUTE_PIVOT",
        oracleReaction: "Si pragmatický staviteľ. Nepotrebuješ revolúciu, potrebuješ len odstrániť jedno úzke hrdlo, ktoré ti berie zbytočne veľa energie.",
        technique: "Bezpečný ústup (Graceful Miss)",
        debunkExplanation: "Opäť ukážka pravidla Raya Hymana: pri odpovedi 'Nie' systém plynule prehodí výhybku na 'pragmatického staviteľa' bez straty autority."
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
        next: "h02_health_night",
        oracleReaction: "Cítim obrovskú váhu na tvojich pleciach. Symbolicky aj fyzicky nosíš na chrbte starosti, ktoré vôbec nie sú len tvoje.",
        technique: "Štatistický zásah (Chrbtica/Hlava)",
        debunkExplanation: "Bolesť šije, chrbta alebo hlavy zažíva pri strese viac než 75 % dospelej populácie. Prepojenie so 'starosťami na pleciach' je klasická psychosomatická fráza."
      },
      {
        code: "B",
        label: "Žalúdok, trávenie, zovretie na hrudi alebo búšenie srdca.",
        trait: "somatic_chest_gut",
        next: "h02_health_night",
        oracleReaction: "Tvoje telo spracúva emócie, ktoré si nedovolíš vysloviť nahlas. Zovretie v strede tela ukazuje na tlak, ktorý v sebe dlhodobo dusíš.",
        technique: "Somatické zrkadlenie",
        debunkExplanation: "Aktivácia blúdivého nervu pri strese prirodzene zasahuje žalúdok a tep. Veštica z obyčajnej biológie urobí 'nevyslovenú emóciu'."
      },
      {
        code: "C",
        label: "Rýchla vyčerpateľnosť, pokles energie a pocit, že ráno vstávam unavený.",
        trait: "somatic_fatigue",
        next: "h02_health_night",
        oracleReaction: "Tvoj vnútorný rezervoár je na dne. Nevyčerpáva ťa samotná práca, ale neviditeľný emočný hluk, ktorý ti kradne energiu aj počas spánku.",
        technique: "Barnumov výrok o únave",
        debunkExplanation: "Fráza o 'neviditeľnom hluku, ktorý kradne energiu' znie hlboko, no len opisuje bežný nekvalitný spánok pri zvýšenom kortizole."
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
        next: "h03_health_family",
        oracleReaction: "Presne vtedy k tebe prichádzajú najťažšie myšlienky — medzi jedenástou a druhou v noci, keď racionálna obrana zaspí a zostane len obava.",
        technique: "Štatistický časový zásah",
        debunkExplanation: "Ruminácia (prežúvanie myšlienok) nastáva takmer vždy tesne pred zaspaním alebo pri nočnom prebudení. Uvedenie presných hodín pôsobí magicky."
      },
      {
        code: "B",
        label: "Zaspím od únavy hneď, ale budím sa v noci alebo priskoro ráno.",
        trait: "fragmented_sleep",
        next: "h03_health_family",
        oracleReaction: "Tvoj nervový systém zostáva v pohotovosti aj v noci, akoby strážil pred nebezpečenstvom. Podvedome máš pocit, že nesmieš úplne poľaviť.",
        technique: "Psychologický profil hypervigilancie",
        debunkExplanation: "Skoré ranné budenie je typickým príznakom chronického stresu (kortizolový skok). Vysvetlenie 'stráženia pred nebezpečenstvom' trafí takmer každého."
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
        next: "h04_health_escape",
        oracleReaction: "Vidím tu starosť spojenú s krvným tlakom, srdcom alebo pohybom u staršej osoby, ktorá je pritom tvrdohlavá a nerada si necháva radiť.",
        technique: "Klasický Shotgunning (Starší príbuzný)",
        debunkExplanation: "Toto je najznámejší trik ezoliniek: u ľudí nad 30 rokov má viac než 80 % v rodine staršieho príbuzného s tlakom, srdcom či kĺbmi, ktorý 'nechce ísť k lekárovi'."
      },
      {
        code: "B",
        label: "Ani nie zdravotne, skôr rodinné vzťahy alebo zodpovednosť za ostatných.",
        trait: "family_duty",
        next: "h04_health_escape",
        oracleReaction: "Máš v rodine rolu toho, na koho sa všetci obrátia, keď horí. Len málokto sa však spýta, kto podrží teba.",
        technique: "Okamžitá korekcia kurzu (Pivot)",
        debunkExplanation: "Zdravotný pokus nevyšiel, tak veštica okamžite preskočila na rolu 'záchrancu v rodine'. Klient na chybný odhad do 10 sekúnd zabudne."
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
        next: "h05_health_reset",
        oracleReaction: "Ticho je tvoj jediný skutočný liek. Ľudia si niekedy tvoje mlčanie vysvetľujú ako hnev, ale ty si vtedy len dobíjaš batérie.",
        technique: "Validácia introvertného mechanizmu",
        debunkExplanation: "Povedať človeku, že okolie si jeho mlčanie mýli s hnevom, je presný zásah do každodennej reality ľudí, ktorí spracúvajú stres v samote."
      },
      {
        code: "B",
        label: "Prekrývam to ďalšími povinnosťami, aby som nad tým nemusel premýšľať.",
        trait: "escape_busyness",
        next: "h05_health_reset",
        oracleReaction: "Bežíš vpred, aby ťa ticho nedobehlo. Lenže únava sa nedá prebehnúť, dá sa len priznať a zmeniť rytmus.",
        technique: "Aforizmus (Múdro znejúca pravda)",
        debunkExplanation: "Úderná krátka veta ('únava sa nedá prebehnúť') vytvára dojem hlbokej duchovnej múdrosti bez reálneho dôkazu."
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
        next: "ROUTE_PIVOT",
        oracleReaction: "Kľúčom pre tvoje najbližšie obdobie je jediné malé slovo, ktoré ti ide z úst najťažšie: Nie. Akonáhle ho začneš používať, vráti sa ti stratená sila.",
        technique: "Recyklácia cieľa ako proroctva",
        debunkExplanation: "Vzal som slovo 'nie' priamo z tvojej odpovede a podal som ho ako 'kľúč k tvojmu najbližšiemu obdobiu'."
      },
      {
        code: "B",
        label: "Zbaviť sa toxického zdroja stresu, ktorý ma dlhodobo vysáva.",
        trait: "need_detox_env",
        next: "ROUTE_PIVOT",
        oracleReaction: "Tvoje telo už urobilo rozhodnutie skôr než tvoja hlava. Teraz len zbieraš odvahu odstrihnúť to, čo ti viac berie, než dáva.",
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
        next: "s02_skep_bullshit",
        oracleReaction: "Máš v sebe radar na pretvárku, ktorý sa málokedy mýli. Už po troch vetách vieš, či pred tebou stojí autentický človek alebo herec.",
        technique: "Lichotenie intelektu (Ego Stroke)",
        debunkExplanation: "Skeptici sú najodolnejší voči ezoterike, ale najzraniteľnejší voči pochvale ich vlastného ostrovtipu a schopnosti prekuknúť druhých."
      },
      {
        code: "B",
        label: "Nechám ho rozprávať, zbieram informácie a svoje karty držím pri tele.",
        trait: "strategic_silence",
        next: "s02_skep_bullshit",
        oracleReaction: "Si stratég. Vieš, že ten, kto najviac rozpráva, prezrádza najviac slabín. Preto si pre okolie ťažko čitateľný.",
        technique: "Zrkadlenie stratégie",
        debunkExplanation: "Len som pomenoval tvoj vlastný postup slovom 'stratég'. Vytvára to pocit, že ťa niekto konečne intelektuálne dorovnal."
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
        next: "s03_skep_past_burn",
        oracleReaction: "Pravda je pre teba absolútna mena. Dokážeš odpustiť chybu z hlúposti, ale vedomé klamstvo do očí v tebe okamžite zničí rešpekt.",
        technique: "Morálna polarizácia (Barnum)",
        debunkExplanation: "Takmer každý človek o sebe rád počuje, že 'odpustí chybu, ale nie klamstvo do očí'. Znie to špecificky, ale platí univerzálne."
      },
      {
        code: "B",
        label: "Pasivita, sťažovanie sa a neschopnosť prevziať zodpovednosť za vlastný život.",
        trait: "hate_helplessness",
        next: "s04_skep_control",
        oracleReaction: "Neznášaš výhovorky, pretože ty sám si si všetko vydrel bez pomoci. Práve preto máš občas problém mať zľutovanie s ľuďmi, ktorí len čakajú na zázrak.",
        technique: "Dedukcia z hodnôt",
        debunkExplanation: "Ľudia neznášajúci pasivitu majú takmer vždy silnú sebestačnosť. Systém to preložil do vety 'všetko si si vydrel sám'."
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
        next: "s04_skep_control",
        oracleReaction: "Vtedy si si vnútorne sľúbil, že už nikdy nebudeš v pozícii naivnej obete. Ten štít ťa skvele chráni, ale občas nepustí dnu ani ľudí, ktorí to myslia čisto.",
        technique: "Trafenie koreňovej schémy (Nedôvera)",
        debunkExplanation: "Klasický ťah psychoterapie preoblečený za veštenie: ukázať, že obranný mechanizmus chráni pred zlom, ale zároveň izoluje od dobra."
      },
      {
        code: "B",
        label: "Postupne pozorovaním sveta — som jednoducho realista a poznám ľudskú povahu.",
        trait: "pragmatic_realist",
        next: "s05_skep_armor",
        oracleReaction: "Nevieš si nasadiť ružové okuliare, aj keby si chcel. Vidíš mechaniku vecí pod povrchom, čo ti dáva prevahu, ale niekedy aj pocit osamelosti medzi davom.",
        technique: "Archetyp 'Osamelého pozorovateľa'",
        debunkExplanation: "Pocit intelektuálnej odlišnosti od 'davu' je extrémne silný lichotivý háčik pre analyticky zmýšľajúcich ľudí."
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
        next: "s05_skep_armor",
        oracleReaction: "Tvoja myseľ potrebuje poistky a záložné riešenia. Najväčší stres ti nespôsobuje ťažký problém, ale nepredvídateľnosť a chaos.",
        technique: "Preklad osobnostnej črty",
        debunkExplanation: "Plán B a C je priama definícia potreby predvídateľnosti. Podať to ako hlbokú diagnózu stresu je čisté zrkadlenie."
      },
      {
        code: "B",
        label: "Odpojím emócie, prijmem fakty a sústredím sa len na to, čo ovplyvniť viem.",
        trait: "stoic_detachment",
        next: "s05_skep_armor",
        oracleReaction: "V kríze si chladnokrvnejší než ktokoľvek v miestnosti. Emócie ťa však často dobehnú až spätne, keď už je po všetkom a napätie opadne.",
        technique: "Dúhová lesť s oneskorením",
        debunkExplanation: "Ak niekto v kríze vypne emócie, biologicky sa vyplavený adrenalín prejaví únavou po akcii. Veštica z fyziológie urobí 'skrytú citlivosť'."
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
        next: "ROUTE_PIVOT",
        oracleReaction: "Práve toto spojenie je tvoja kotva, ktorá ťa drží v rovnováhe. Chráň si ho, pretože mimo neho ideš neustále v bojovom režime.",
        technique: "Pozitívne ukotvenie",
        debunkExplanation: "Potvrdenie hodnoty najbližšieho vzťahu vytvára pocit tepla a bezpečia — používateľ má dojem, že systém rozumie jeho duši."
      },
      {
        code: "B",
        label: "Ťažko. Väčšinou si svoje najhlbšie pochybnosti nechávam čisto pre seba.",
        trait: "lone_wolf",
        next: "ROUTE_PIVOT",
        oracleReaction: "Tvoja sila je obdivuhodná, ale nosiť všetko sám na sebe bez ventilu je najťažšia cesta. Niekedy túžiš po tom, aby ťa niekto pochopil bez toho, aby si musel vysvetľovať každé slovo.",
        technique: "Univerzálna túžba po pochopení",
        debunkExplanation: "Túžba 'byť pochopený bez slov' je jadrom každého vzťahu aj dôvodom, prečo ľudia vôbec chodia k vešticiam a vodcom kultov."
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
        next: "c02_inner_critic",
        oracleReaction: "Dal si druhým viac šancí, než si zaslúžili. Táto kapitola ťa však naučila poznať svoju skutočnú cenu.",
        technique: "Reframing minulosti",
        debunkExplanation: "Každú chybu z minulosti veštica premení na 'cennú lekciu o tvojej hodnote', aby uľavila tvojim výčitkám."
      },
      {
        code: "B",
        label: "Že som niekedy reagoval príliš tvrdo alebo som zanedbal blízkych kvôli vlastnému tlaku.",
        trait: "regret_hardness",
        next: "c02_inner_critic",
        oracleReaction: "Tie momenty ťa dodnes zamrzia, ale neboli zo zloby — boli z vyčerpania a snahy všetko zvládnuť.",
        technique: "Rozhrešenie (Absolution Hook)",
        debunkExplanation: "Ospravedlnenie tvojich zlyhaní ('nebolo to zo zloby') spúšťa okamžitú emocionálnu úľavu a silnú väzbu na rozprávača."
      },
      {
        code: "C",
        label: "Že som neurobil odvážny krok skôr, keď som mal lepšiu príležitosť.",
        trait: "regret_hesitation",
        next: "c02_inner_critic",
        oracleReaction: "Máš pocit strateného času, no vtedy si ešte nemal skúsenosti, ktoré máš dnes. Druhé okno sa ti ešte neuzavrelo.",
        technique: "Falošná nádej (Open Future)",
        debunkExplanation: "Otvorené tvrdenie 'druhé okno sa ešte neuzavrelo' dodáva optimizmus bez akéhokoľvek merateľného záväzku."
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
        next: "CHECK_BIOMETRIC_HOOK",
        oracleReaction: "K druhým dokážeš byť zhovievavý, ale sebe neodpustíš ani drobný prešľap. Ten vnútorný sudca ťa posúva vpred, no zároveň ti nedovolí tešiť sa z úspechov.",
        technique: "Dúhová lesť (Prísny k sebe, láskavý k iným)",
        debunkExplanation: "Vysoko univerzálny Barnumov výrok: takmer nikto o sebe nepovie, že je k sebe príliš zhovievavý a krutý k ostatným."
      },
      {
        code: "B",
        label: "Pochybovačný — hneď ma napadne, že nie som dosť dobrý alebo dosť schopný.",
        trait: "impostor_voice",
        next: "CHECK_BIOMETRIC_HOOK",
        oracleReaction: "Podceňuješ vlastnú inteligenciu a hodnotu oveľa viac, než by si mal. Ľudia okolo teba vidia kvality, ktoré ty sám spochybňuješ.",
        technique: "Zásah do syndrómu podvodníka",
        debunkExplanation: "Syndróm podvodníka (Impostor Syndrome) zažíva až 70 % ľudí. Priame pomenovanie pochybností pôsobí ako čítanie myšlienok."
      },
      {
        code: "C",
        label: "Analytický — hľadám príčinu chyby, opravím postup a idem ďalej.",
        trait: "pragmatic_critic",
        next: "CHECK_BIOMETRIC_HOOK",
        oracleReaction: "Máš silnú mentálnu odolnosť. Chyby ťa nezlomia, skôr ťa vyprovokujú nájsť dokonalejšie riešenie.",
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
        next: "c05_final_choice",
        oracleReaction: "Nehľadáš senzácie ani obdiv davu — hľadáš tichú istotu a čistú hlavu. A práve tam smeruje tvoje ďalšie obdobie.",
        technique: "Potvrdenie najhlbšej túžby",
        debunkExplanation: "Zrkadlenie túžby po pokoji je bezpečný univerzálny záver, ktorý rezonuje s každým preťaženým človekom."
      },
      {
        code: "B",
        label: "Jasno a úprimnosť v kľúčovom vzťahu, aby som vedel, na čom naozaj som.",
        trait: "wish_clarity_rel",
        next: "c05_final_choice",
        oracleReaction: "Hmla okolo toho vzťahu sa začne čoskoro rozplývať. Odpoveď nepríde z veľkých slov, ale z jedného konkrétneho skutku, ktorý ti otvorí oči.",
        technique: "Filmová predpoveď (Konkrétny skutok)",
        debunkExplanation: "Fráza 'jeden konkrétny skutok ti otvorí oči' nastaví tvoj mozog na hľadanie dôkazov. Akékoľvek gesto partnera si spätne spojíš s touto vetou."
      },
      {
        code: "C",
        label: "Prelom v nezávislosti — vlastný projekt, viac slobody a menej kompromisov.",
        trait: "wish_breakthrough",
        next: "c05_final_choice",
        oracleReaction: "Tvoja energia sa pripravuje na nový cyklus. Už teraz máš v rukách nástroje na ten prelom, chýba len definitívne rozhodnutie uzavrieť starý kompromis.",
        technique: "Motivačný uzáver (Empowerment)",
        debunkExplanation: "Klasický záver, ktorý vracia zodpovednosť klientovi: ak uspeje, veštba vyšla; ak nie, 'neurobil definitívne rozhodnutie'."
      }
    ]
  },

  // Dynamicky upravovany uzol v app.js podla zachytenej latencie alebo FACS spike!
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
        next: "c05_final_choice",
        oracleReaction: "Telo a rytmus reakcií nikdy neklamú tak ľahko ako slová. Práve tam leží skutočné jadro veci, ktorú teraz potrebuješ vyriešiť.",
        technique: "Biometrický háčik (Latencia + FACS)",
        debunkExplanation: "Toto bol živý dôkaz techniky Cold Reading + meranie: systém len skontroloval, pri ktorej otázke si váhal najdlhšie (v milisekundách) alebo kde MediaPipe zachytil odchýlku mimiky nad 2,2 sigma."
      },
      {
        code: "B",
        label: "Nie, len som si dôkladne čítal možnosti a premýšľal nad presnou formuláciou.",
        trait: "bio_rationalized",
        next: "c05_final_choice",
        oracleReaction: "Vidíš, aj táto potreba okamžite všetko racionálne vysvetliť a udržať pod kontrolou je súčasťou tvojej obrany.",
        technique: "Kafka Trap (Nepriestrelná pasca)",
        debunkExplanation: "Klasická manipulačná pasca zvaná Kafka Trap: keď priznáš citlivé miesto, má veštica pravdu; keď ho poprieš, označí tvoje popretie za 'dôkaz obrany'. Nemôžeš vyhrať."
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
        next: null,
        oracleReaction: "Tvoj profil je uzavretý. Otváram výsledok tvojho zrkadla.",
        technique: "Ukotvenie ilúzie pred odhalením",
        debunkExplanation: "Tento krok ti umožnil vedome si všimnúť, ako silno funguje ilúzia ešte predtým, než prepneš na FLIP MODE a uvidíš zdrojový kód triku."
      },
      {
        code: "B",
        label: "Čiastočne presné — niektoré veci sadli výborne, inde som cítil všeobecné frázy.",
        trait: "illusion_mid",
        next: null,
        oracleReaction: "Tvoja vnímavosť je ostrá. Poďme sa pozrieť na celý tvoj obraz.",
        technique: "Kalibrácia dôvery",
        debunkExplanation: "Aj pri čiastočnej skepse si mozog prirodzene zapamätá trefy a zabudne omyly (Konfirmačné skreslenie)."
      },
      {
        code: "C",
        label: "Vidím za tým systém otázok a šablóny, chcem vidieť presnú pitvu dát.",
        trait: "illusion_low",
        next: null,
        oracleReaction: "Výborne. Prepnime z ilúzie priamo do faktov a dát.",
        technique: "Kritický odstup",
        debunkExplanation: "Rozpoznal si vzorec manipulácie v reálnom čase. Vo FLIP MODE si teraz môžeš pozrieť presné dáta z kamery, latencie a vetvenia."
      }
    ]
  }
};

/**
 * Vrati pocet uzlov v grafe (diagnostika).
 */
export function getTotalNodeCount() {
  return Object.keys(NODES).length;
}

/**
 * Urci primarnu a sekundarnu oblast na zaklade nazbieranych vah.
 */
export function rankDomains(domainScores) {
  const entries = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
  return {
    primary: entries[0]?.[0] || "relationships",
    secondary: entries[1]?.[0] || "career_finance"
  };
}

/**
 * Dynamicky router dalsieho uzla na zaklade historie, hlbky sedenia a biometrie.
 */
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
    // Pri hlbokom rozbore (12 krokov) este otvorime kratku sekundarnu vetvu, ak mame priestor
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

  // Ochrana proti slucke (ak uz bol uzol navstiveny)
  if (visitedIds.has(target)) {
    if (!visitedIds.has("c03_secret_wish")) return "c03_secret_wish";
    if (!visitedIds.has("c05_final_choice")) return "c05_final_choice";
    return null;
  }

  return target;
}

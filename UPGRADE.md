# FlowApp servisni i mjeriteljski centar

FlowApp objedinjuje servisni centar, benzinske stanice, opremu, radne naloge,
dokumentaciju, rokove, skladište, preventivno održavanje, komercijalu i klijentski portal.

Centralni dokumentni centar omogućuje pretragu po klijentu, stanici, vrsti i statusu
valjanosti, čuva povijest verzija te automatski povezuje dokumente s rokovima.
Obavijesti za aktivne rokove pojavljuju se na pragovima 60, 30, 15 i 7 dana prije isteka.

Dispatch servisera daje tjedni pregled termina po tehničaru, evidenciju godišnjih
odmora, bolovanja i edukacija te automatski sprječava dvostruku rezervaciju servisera.

Detalj radnog naloga sadrži vremensku crtu promjena: kreiranje naloga, raspored i
dodjelu servisera, terenske zapise, aktivnosti, materijal, checklistu i završetak.
Pregled je zaštićen zasebnom permisijom `view_work_order_history`.

SLA servisnih zahtjeva računa ugovorne rokove prvog odziva i rješavanja, automatski
eskalira prekoračenja te zaustavlja SLA sat dok je zahtjev u statusu „Čeka klijenta”.
Voditelji imaju pregled SLA rezultata, rizika i odgovorne osobe u upravljačkom centru.

Mobilni serviserski portal prikazuje dodijeljene naloge, navigaciju, dolazak, početak
i završetak rada te terenske bilješke. PWA može se instalirati na mobitel, a događaji
se offline spremaju na uređaj i idempotentno sinkroniziraju nakon povratka veze.

Servisni PDF zapisnik generira se na backendu iz pohranjenih podataka naloga. Svako
generiranje stvara numeriranu, nepromjenjivu verziju dokumenta, sprema je među priloge
vidljive klijentu i bilježi događaj u audit povijesti radnog naloga.

E-mail centar priprema potvrde zahtjeva, dodjele i podsjetnike naloga, SLA eskalacije,
PDF zapisnike te podsjetnike na dokumente i ovjere. Poruke prolaze kroz pouzdani red
slanja s retry pravilima, evidencijom pokušaja i podesivim skupinama primatelja.

Preventivno održavanje podržava kalendarske, radne i hibridne cikluse. Sustav vodi
očitanja opreme, automatski generira naloge u definiranom horizontu, čuva povijest
svakog ciklusa te nakon završetka naloga računa novi datum i novo ciljno očitanje.

Mjeriteljski centar povezuje ovjere, kalibracije i inspekcije s opremom i radnim
nalozima. Vodi mjerne točke, tolerancije, automatski rezultat prolaz/pad, rok sljedeće
ovjere te generira verzionirane PDF certifikate dostupne u dokumentaciji klijenta.

Predmeti mjeriteljske inspekcije prate zakonski slijed zahtjev → radni nalog →
izvještaj → certifikat inspekcije → certifikat verifikacije. AMN sonda je obavezno
vezana uz jedan rezervoar; jedan aparat može imati više volumetara, ali jednu
verifikacijsku markicu i plombu. Posebne mjerne tablice primjenjuju se na AMN,
volumetre, mjerne letve i rezervoare.

Registar opreme benzinske stanice izravno je povezan s mjeriteljskim centrom.
Hijerarhija stanice vodi aparate s pripadajućim volumetrima te rezervoare s
pripadajućim AMN sondama; mjeriteljski predmet može odabrati isključivo opremu
odabrane stanice. Svaki volumetar, AMN sonda, rezervoar i mjerna letva imaju
zaseban status uključen/isključen, interval ovjere i datum naredne kalibracije.

Mjeriteljski izvještaji koriste posebne službene obrasce ZA-19.01, ZA-19.02,
ZA-19.03 i ZA-19.04. Unos prati izvorne tablice: Qmin/Qsr/Qmax za volumetre,
tri usporedna mjerenja za AMN sondu, točke A/B/E i linearnost mjerne letve te
provjeru pokretnog volumetra i volumetrijsku tablicu punjenja rezervoara.

Službeni zahtjevi, radni nalozi, izvještaji i certifikati generiraju se iz
izvornih predložaka s njihovim logotipima, akreditacijskim oznakama, oznakama
dokumenta, revizijama i rasporedom stranica. Jedan AMN izvještaj obuhvaća sve
sonde predmeta, jedan izvještaj volumetara sve odabrane volumetre, a jedan
izvještaj mjernih letvi sve odabrane letve. Svaki rezervoar dobiva zaseban
šestostranični izvještaj.

Modul voznog parka vodi vozila, registracije, osiguranja, tehničke preglede,
servise po datumu i kilometraži, PP aparate, gume, troškove i nadolazeće rokove.
Svaka evidencija obavezno sadrži opis izvedenih radova i može imati priložen
račun, zapisnik ili drugi dokument. Rokovi u idućih 30 dana automatski ulaze
u e-mail centar za dodijeljenog korisnika i rukovodstvo.

Loyalty centar vodi program za svakog klijenta, članove, stanje i promet bodova,
nagrade te marketinške promocije u aplikaciji i/ili e-mail kanalu. Klijentske
role vide samo vlastiti program i trenutno aktivne ili zakazane promocije.

Za klijenta kojem je uključena opcija **samo Loyalty portal**, svi njegovi
korisnici nakon prijave automatski se preusmjeravaju na osobni pregled bodova.
Portal može koristiti lokalni FlowApp program, vanjski JSON API ili demo podatke.

### Loyalty portal lokalno

Za prikaz stvarnih podataka iz FlowApp baze u `backend/.env` postaviti:

```env
LOYALTY_PORTAL_SOURCE=local
LOYALTY_DEMO_MODE=false
```

Korisnik mora biti povezan s aktivnim članom Loyalty programa. Povezivanje se
radi odabirom korisničkog računa pri dodavanju člana u Loyalty centru. Portal
zatim prikazuje stvarno stanje bodova, zadnjih 50 transakcija, trenutno važeće
nagrade i aktivne promocije za razinu člana.

Za prezentacijski prikaz bez unosa članova može se koristiti:

```env
LOYALTY_PORTAL_SOURCE=demo
```

Postojeća postavka `LOYALTY_DEMO_MODE=true` ostaje podržana radi kompatibilnosti
i ima prednost nad `LOYALTY_PORTAL_SOURCE`.

### Napredni Loyalty paket

Migracija `023_loyalty_experience_audit.sql` dodaje:

- automatski portal-only pristup za sve korisnike role `client_user`
- digitalnu člansku karticu s jedinstvenim QR i Code 128 barkodom
- konfigurabilne Bronze, Silver, Gold i Platinum razine s prikazom napretka
- aktiviranje nagrada i generiranje kupona uz atomsko skidanje bodova
- digitalne račune povezane s kupnjom i transakcijom bodova
- promocije ciljane prema razini članstva
- administratorsku analitiku članova, bodova, kupona i mjesečnog prometa
- sigurnosni audit svake promjene bodova sa stanjem prije i poslije promjene

Nakon nadogradnje pokrenuti `npm run migrate` u backend direktoriju. Postojeći
programi automatski dobivaju četiri početne razine koje administrator može
prilagoditi u Loyalty centru.

Migracija `026_loyalty_portal_branding.sql` omogućuje zaseban vizualni identitet
za svakog klijenta. `client_admin` preko gumba **Prilagodi izgled** može podesiti
naziv i slogan brenda te primarnu, sekundarnu, naglasnu, pozadinsku, površinsku
i tekstualne boje. Editor prikazuje pregled uživo, a logo se automatski preuzima
iz podataka klijenta. Ovlast ne omogućuje mijenjanje bodova, nagrada ni pravila
programa.

### Vanjski Loyalty sustav

Za dohvat podataka od vanjskog dobavljača postaviti:

```env
LOYALTY_PORTAL_SOURCE=external
LOYALTY_DEMO_MODE=false
LOYALTY_EXTERNAL_API_URL=https://stvarna-domena-dobavljaca/api/customer-summary
LOYALTY_EXTERNAL_REDEEM_URL=https://stvarna-domena-dobavljaca/api/rewards/redeem
LOYALTY_EXTERNAL_API_KEY=stvarni-tajni-api-kljuc
LOYALTY_EXTERNAL_API_TIMEOUT_MS=10000
```

### Sigurnosne postavke API-ja

Backend dodaje request ID, sigurnosne HTTP headere, strogu obradu JSON grešaka,
opće ograničenje API zahtjeva i strože ograničenje pokušaja prijave. Produkcijski
reverse proxy treba imati `TRUST_PROXY=true`; lokalno ostaje `false`.

```env
TRUST_PROXY=false
JSON_BODY_LIMIT=2mb
FORM_BODY_LIMIT=1mb
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=30
AUTH_ACCOUNT_RATE_LIMIT_MAX=10
```

Zaštita prijave primjenjuje odvojene limite po IP adresi i po računu. Migracija
`027_auth_security_audit.sql` bilježi uspješne i neuspješne prijave, request ID,
IP i user-agent. E-mail se sprema isključivo kao SHA-256 sažetak.

Sigurnosni testovi pokreću se iz `backend` direktorija naredbom `npm test`.

`LOYALTY_EXTERNAL_API_URL`, `LOYALTY_EXTERNAL_REDEEM_URL` i ključ daje dobavljač vanjskog Loyalty sustava.
FlowApp šalje identifikatore kao query parametre `external_id`, `email` i
`client_id`, a autentikaciju kao `Authorization: Bearer <API_KEY>`. Nakon
dobivanja stvarnog primjera JSON odgovora adapter treba uskladiti s točnom
strukturom dobavljača. API ključ se nikada ne unosi u frontend.

## Pokretanje

Backend koristi `backend/.env`:

```env
DATABASE_URI=postgresql://...
JWT_SECRET=...
PORT=5000
CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=korisnik
SMTP_PASS=lozinka
SMTP_FROM="FlowApp servis <servis@example.com>"
LOYALTY_PORTAL_SOURCE=local
LOYALTY_DEMO_MODE=false
# Vanjski sustav:
# LOYALTY_EXTERNAL_API_URL=https://loyalty.example.com/api/customer-summary
# LOYALTY_EXTERNAL_REDEEM_URL=https://loyalty.example.com/api/rewards/redeem
# LOYALTY_EXTERNAL_API_KEY=secret-api-key
LOYALTY_EXTERNAL_API_TIMEOUT_MS=10000
```

```powershell
cd backend
npm run migrate
npm start
```

Za novu ili nenadograđenu bazu može se izvršiti objedinjena skripta:

`backend/database/FLOWAPP_FULL_DATABASE_UPGRADE.sql`

Frontend po potrebi koristi:

```env
REACT_APP_API_URL=http://localhost:5000/api-v1
```

```powershell
cd frontend
npm start
```

## Role

- `admin` — puni pristup sustavu
- `project_manager` — postojeća operativna upravljačka rola
- `service_manager` — servisni zahtjevi, raspored, nalozi i dokumentacija
- `technician` — izvršenje naloga, checkliste, materijal, potpis i zapisnik
- `warehouse_manager` — artikli, skladišta i kretanje zaliha
- `metrology` — oprema, rokovi, dokumenti, QR oznake i inspekcije
- `client_admin` — pregled podataka vlastite tvrtke i servisnih zahtjeva
- `client_user` — osnovni klijentski pregled i otvaranje zahtjeva

Permisije se uređuju u aplikaciji kroz **Administracija → Role i permisije**.
Backend svaku permisiju provjerava izravno u bazi, pa opoziv prava vrijedi odmah.

## Važne napomene

- Tablica `projects` i dalje predstavlja benzinske stanice radi kompatibilnosti postojećih podataka.
- Stare tablice `sonda`, `volumeters`, `rezervoar` i `mjerna_letva` ostaju aktivne.
- Javno samostalno registriranje korisnika je isključeno. Korisnike kreira administrator.
- Novi korisnik dobiva nasumičnu privremenu lozinku koja se prikazuje samo pri kreiranju.
- Prije ručnih SQL nadogradnji uvijek napraviti backup PostgreSQL baze.

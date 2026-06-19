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

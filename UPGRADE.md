# FlowApp servisni i mjeriteljski centar

Ova grana uvodi prvu funkcionalnu fazu nadogradnje postojećeg FlowApp sustava.

## Što je dodano

- operativni dashboard sa stvarnim podacima
- pregled benzinskih stanica i ukupne opreme
- servisni zahtjevi / help desk s prioritetima i statusima
- klijentsko ograničenje podataka preko `users.client_id`
- temelj registra opreme po stanici
- dokumenti s valjanošću i vidljivošću klijentu
- rokovi umjeravanja, ovjera, pregleda i dokumentacije
- audit log važnih korisničkih akcija
- priprema veze između servisnog zahtjeva i radnog naloga
- sigurniji dohvat korisnika bez vraćanja password hasha

Postojeća tablica `projects` privremeno ostaje fizička tablica za benzinske stanice.
Novi API i UI koriste poslovni naziv "benzinske stanice", tako da se postojeći podaci
ne moraju seliti ili ručno prepisivati.

## Pokretanje

Backend koristi varijable iz `backend/.env`:

```env
DATABASE_URI=postgresql://...
JWT_SECRET=...
PORT=8000
CORS_ORIGIN=http://localhost:3000
```

Prije prvog pokretanja nove verzije napraviti backup PostgreSQL baze, zatim:

```powershell
cd backend
npm run migrate
npm start
```

Frontend po potrebi može koristiti:

```env
REACT_APP_API_URL=http://localhost:8000/api-v1
```

Zatim:

```powershell
cd frontend
npm start
```

Nakon migracije korisnici se trebaju ponovno prijaviti kako bi JWT sadržavao nove
dozvole i, za klijentske korisnike, `client_id`.

## Uloge

- Interni korisnici bez `client_id` vide sve klijente i stanice dopuštene svojom ulogom.
- Klijentski korisnik s postavljenim `users.client_id` vidi samo podatke svoje tvrtke.
- Migracija nove read/create dozvole dodjeljuje ulogama koje već imaju
  `view_dashboard` ili `view_clients`.
- Manage dozvole dobivaju uloge koje već imaju `update_clients` ili
  `update_work_orders`.

## Predložene sljedeće faze

1. Detaljna kartica benzinske stanice: sva oprema, servisna povijest, dokumenti i rokovi.
2. Radni nalog za servisera: mobilni prikaz, checklista, fotografije, utrošeni dijelovi,
   potpis klijenta i završni PDF zapisnik.
3. Dokumentni centar: upload, verzije, predlošci i generiranje certifikata/zapisnika.
4. Automatske obavijesti 60/30/15/7 dana prije isteka.
5. Raspored servisera i kalendar terenskih intervencija.
6. Klijentski portal s downloadom dokumentacije i praćenjem statusa zahtjeva.
7. Izvještaji rukovodstva: SLA, opterećenje servisera, troškovi, učestalost kvarova.
8. Migracija frontenda s Create React Appa na Vite i code splitting.

## Napomena o postojećoj opremi

Stare tablice `sonda`, `volumeters`, `rezervoar` i `mjerna_letva` ostaju aktivne.
Dashboard ih uključuje u ukupni broj opreme. Novi `equipment_assets` registar omogućuje
vezanje uređaja direktno na stanicu; sljedeća faza treba sadržavati kontroliranu
migraciju stare opreme u taj registar.

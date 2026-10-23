# Mjeriteljski postupak

Zahtjevi i predmeti prate zaprimanje zahtjeva, pripremu terena, unos po vrsti usluge, provjeru, izdavanje dokumenata i zaključenje.

1. Otvorite predmet i pripremite e-mail klijentu. Zahtjev se prilaže kao PDF. Slanje je ručna radnja korisnika; uspjeh, neuspjeh i primatelj evidentiraju se u povijesti. Ponovno slanje mora biti izričito odabrano.
2. Priložite vraćeni zahtjev (prihvaća se i primitak drugim putem).
3. Dodijelite inspektore, mjerila i etalone te ispunite procjenu rizika i preispitivanje zahtjeva. Izradite terenski paket: radni nalog, obrazac rezultata prema usluzi, popratni obrasci, potpuni popis mjerila i anketa.
4. Unesite mjerenja, provjere i zaključak za svako mjerilo. Pošaljite na provjeru. Prazna ili neispravna obavezna mjerenja nisu prihvaćena.
5. Korisnik s pravom approve_metrology_inspections provjerava i odobrava predmet. Odobravanje zaključava podatke i računa sljedeći rok verifikacije.
6. Izradite završni paket. Rezervoari imaju zasebne izvještaje. Svako mjerilo ima vlastiti certifikat inspekcije. Certifikati verifikacije izrađuju se za sukladne volumetre i AMN sonde. Potpuni rezultati i zaključci prilažu se bez ograničenja na broj redaka izvornog predloška.
7. Nakon pregleda dokumentacije zaključite predmet. Podaci i generiranje novih dokumenata su zaključani; postojeći PDF-ovi ostaju dostupni za preuzimanje, kopiranje teksta i ispis. Sve ranije verzije paketa zadržavaju se u arhivi.

## Konfiguracija

SMTP koristi postojeće varijable SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_SECURE te po potrebi SMTP_USER i SMTP_PASS. Bez konfiguracije sučelje jasno prikazuje da slanje nije dostupno. Lozinke se ne pohranjuju u predmet.

Nova tablica metrology_case_workflow stvara se pri prvom pristupu. PostgreSQL migracija je 028_metrology_case_workflow.sql. Podržani su MySQL i PostgreSQL; ispravljeni su MySQL upiti i izgubljene zadane vrijednosti prenesenih tablica u ovom modulu.

PDF dokumenti izrađuju se iz stvarnih podataka. Statični PDF-ovi s ugrađenim primjerima ne koriste se u ovom postupku. Raspored čistih PDF-ova razlikuje se od izvornih desktop Word predložaka.

## Provjere

Pokrenite npm test u backend mapi. Integracijski testovi pokreću se s METROLOGY_DB_TEST=1 i zahtijevaju postojeći klijent, korisnika i ovlaštenu ulogu. Sve testne zapise poništavaju transakcijom; testni PDF privici se uklanjaju, a e-mailovi se šalju isključivo lokalnom testnom SMTP poslužitelju. Testovi mogu potrošiti vrijednosti auto-increment brojača bez ostavljanja zapisa.

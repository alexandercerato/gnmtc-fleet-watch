# GNMTC Fleet Watch

Private monitor of the fixed 18-vessel GNMTC fleet, in Italian. Destinations, confirmed last arrivals and waiting-for-orders fields are explicitly distinct. Source check time is not presented as AIS observation time. No paid AIS provider or real-time feed is connected.

## Runtime

Vinext/Cloudflare Worker with Sites authentication and D1. Keep this Site owner-private: shared write endpoints rely on Sites' owner/service access boundary and reject cross-origin browser POSTs. Do not change the audience without first adding application-level write authorization.

Schema-only migration: `drizzle/0000_motionless_changeling.sql`. Initial research is in `lib/fleet-seed.json`; runtime updates are persisted in D1 and do not require a deployment.

## Scheduled update contract

`GET /api/fleet` reads the fixed IMO list and latest observations. `GET /api/update-guide` returns the current research and writing instructions from `lib/update-guide.ts`. `POST /api/updates` validates observations, preserves data on failed checks, ignores older observations, deduplicates runs and records destination changes. `POST /api/schedule` records the metadata of the verified linked automation.

Source and runtime access must be tested independently. An unattended task obtains the existing supported service access from Sites `get_site` and sends it only to the same Site. Tokens never belong in source, files, logs or task prompts. The task checks public sources via available search/open tools, follows `/api/update-guide`, posts verified observations or failures, and reads back the result. A token does not give access to connected apps, which are not required here.

The browser's reload button and periodic polling load the latest saved register. They do not pretend to fetch a live AIS signal. CSV export is spreadsheet-formula-safe; PDF uses browser print with a landscape layout.


## GitHub e collegamenti MarineTraffic

Repository del progetto: https://github.com/alexandercerato/gnmtc-fleet-watch (privato).

Il nome di ogni nave apre MarineTraffic in una nuova scheda usando il numero IMO. I collegamenti sono presenti nel registro desktop, nella vista mobile, nelle destinazioni e nella scheda di dettaglio. Le fonti dei riscontri rimangono indicate separatamente.

### Versione per GitHub Pages

`pnpm run build:pages` genera la versione statica in `docs/`. Sono mantenuti grafica, ricerca, filtri, dettaglio nave ed esportazione. Gli asset usano percorsi relativi, compatibili con il sottopercorso del repository.

La versione statica legge `docs/data/fleet.json`; il timestamp di ogni riscontro rimane quello della fonte. Il pulsante di ricarica rilegge l’istantanea pubblicata e non interroga un’API AIS. Gli aggiornamenti automatici del server esistente continuano sul sito attuale; la sincronizzazione dell’istantanea GitHub è da attivare al completamento della migrazione.

Per pubblicare da questo repository selezionare GitHub Pages, `Deploy from a branch`, branch `main`, cartella `/docs`. Il piano GitHub attuale richiede che il repository sia pubblico oppure un aggiornamento del piano. Il repository resta privato finché il proprietario non autorizza la visibilità pubblica del codice e dei dati.

Nessuna credenziale o chiave di servizio è inclusa nel repository. Il runtime originale con database e API resta separato dalla versione statica.

# Giama – menu online

Sito statico che mostra il menu della pizzeria, con un pannello `/admin` da cui il gestore lo modifica senza toccare codice.

- **Nessun backend**: il sito è HTML/CSS/JS servito da GitHub Pages, i dati sono file JSON nel repository.
- **Pannello di gestione**: [Sveltia CMS](https://sveltiacms.app/), che salva le modifiche come commit su GitHub. Pages ripubblica il sito in circa un minuto.
- **Login**: un piccolo worker Cloudflare gratuito ([sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)) gestisce solo l'accesso con GitHub.

## Struttura

```
index.html          pagina pubblica del menu
assets/app.js       legge i JSON e costruisce la pagina
assets/style.css    stile (mobile-first)
content/menu.json   categorie e piatti
content/info.json   nome, orari, contatti, avvisi
images/             foto caricate dal pannello
admin/index.html    pannello di gestione (Sveltia CMS)
admin/config.yml    campi modificabili dal pannello
docs/GUIDA-GESTORE.md  istruzioni per il gestore
```

Allergeni ed etichette sono definiti in due punti che vanno tenuti allineati: le opzioni in `admin/config.yml` e le mappe `ALLERGENI` / `ETICHETTE` in `assets/app.js`.

## Sviluppo in locale

La pagina carica i JSON con `fetch`, quindi va servita da un server (aprire `index.html` con doppio clic non funziona):

```bash
npx serve -l 8080 .
```

- Sito: http://localhost:8080/
- Pannello: http://localhost:8080/admin/ → **Work with Local Repository** → scegli la cartella del progetto. Funziona solo con Chrome/Edge e modifica direttamente i file locali: poi si fa commit a mano.

## Messa online (da fare una volta sola)

### 1. GitHub Pages

1. Il repository è **privato**: GitHub Pages su repository privati richiede GitHub Pro. Il menu non contiene dati riservati, quindi la strada gratuita è renderlo **pubblico** (Settings → General → Danger Zone → Change visibility).
2. Settings → Pages → *Build and deployment* → Source: **Deploy from a branch**, branch `main`, cartella `/ (root)`.
3. Il sito sarà su `https://cirou.github.io/giama-menu/`. Se usi un dominio personalizzato, aggiorna `site_url` e `display_url` in `admin/config.yml`.

### 2. Login del gestore (worker Cloudflare)

Segui il README di [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth). In breve:

1. **Worker**: crea un account Cloudflare (piano Free, nessuna carta richiesta) e pubblica il worker con il pulsante *Deploy to Cloudflare Workers* del README. Annota l'URL, del tipo `https://sveltia-cms-auth.<sottodominio>.workers.dev`.
2. **GitHub App**: dal link precompilato nel README registra una GitHub App sul tuo account:
   - Redirect / Callback URL: `<URL del worker>/callback`
   - Permessi repository: *Contents: Read and write*, *Metadata: Read-only*, *Pull requests: Read and write*
   - copia il **Client ID** e genera un **Client secret**
   - *Install App* → installala solo sul repository `giama-menu`
3. **Variabili del worker** (Cloudflare → worker → Settings → Variables and secrets):
   - `GITHUB_CLIENT_ID` = Client ID
   - `GITHUB_CLIENT_SECRET` = Client secret (tipo *Secret*)
   - `ALLOWED_DOMAINS` = `cirou.github.io` (più l'eventuale dominio personalizzato, separati da virgola)
4. In `admin/config.yml` sostituisci `CAMBIA-QUI` in `base_url` con il sottodominio del worker, poi fai commit.

### 3. Accesso del gestore

1. Il gestore crea un account GitHub gratuito.
2. Repository → Settings → Collaborators → **Add people** → il suo username (accesso in scrittura). Lui accetta l'invito ricevuto via email.
3. Da quel momento entra da `https://cirou.github.io/giama-menu/admin/` con **Accedi con GitHub**.

Ogni salvataggio è un commit firmato con il suo utente: lo storico del repository mostra chi ha cambiato cosa, e qualsiasi modifica si può annullare.

### 4. QR code per i tavoli

Genera un QR code che punti a `https://cirou.github.io/giama-menu/`. Il link resta lo stesso anche quando il menu cambia, quindi i QR stampati non vanno mai rifatti.

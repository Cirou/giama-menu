// Legge i dati del menu da content/*.json e costruisce la pagina.
// Le chiavi di ALLERGENI ed ETICHETTE devono coincidere con le opzioni in admin/config.yml.

const ALLERGENI = {
  glutine: "Glutine",
  crostacei: "Crostacei",
  uova: "Uova",
  pesce: "Pesce",
  arachidi: "Arachidi",
  soia: "Soia",
  latte: "Latte",
  frutta_a_guscio: "Frutta a guscio",
  sedano: "Sedano",
  senape: "Senape",
  sesamo: "Sesamo",
  solfiti: "Solfiti",
  lupini: "Lupini",
  molluschi: "Molluschi",
};

const ETICHETTE = {
  consigliata: "Consigliata",
  novita: "Novità",
  vegetariana: "Vegetariana",
  vegana: "Vegana",
  piccante: "Piccante",
};

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === "") continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function slug(text, index) {
  const base = String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `cat-${base || index}`;
}

function prezzo(valore) {
  const n = Number(valore);
  return Number.isFinite(n) && valore !== "" && valore !== null ? euro.format(n) : "";
}

// Il CMS salva i percorsi delle foto come "/images/x.jpg": li rendiamo relativi
// così funzionano anche quando il sito è servito da una sottocartella (GitHub Pages).
function percorsoFoto(src) {
  if (!src) return "";
  if (/^(https?:)?\/\//.test(src)) return src;
  return src.replace(/^\/+/, "");
}

async function carica(percorso) {
  const risposta = await fetch(percorso, { cache: "no-cache" });
  if (!risposta.ok) throw new Error(`${percorso}: HTTP ${risposta.status}`);
  return risposta.json();
}

function renderPiatto(piatto) {
  const disponibile = piatto.disponibile !== false;
  const varianti = (piatto.varianti || []).filter((v) => v && v.nome);
  const allergeni = (piatto.allergeni || []).map((a) => ALLERGENI[a] || a);
  const etichette = (piatto.etichette || []).filter((e) => ETICHETTE[e]);

  const prezzoPrincipale = varianti.length ? null : el("span", { class: "prezzo" }, prezzo(piatto.prezzo));

  return el(
    "article",
    { class: `piatto${disponibile ? "" : " esaurito"}` },
    piatto.foto
      ? el("img", { class: "foto", src: percorsoFoto(piatto.foto), alt: "", loading: "lazy" })
      : null,
    el(
      "div",
      { class: "piatto-corpo" },
      el("div", { class: "piatto-testa" }, el("h3", {}, piatto.nome), prezzoPrincipale),
      etichette.length
        ? el(
            "ul",
            { class: "etichette" },
            etichette.map((e) => el("li", { class: `etichetta etichetta-${e}` }, ETICHETTE[e]))
          )
        : null,
      piatto.ingredienti ? el("p", { class: "ingredienti" }, piatto.ingredienti) : null,
      varianti.length
        ? el(
            "ul",
            { class: "varianti" },
            varianti.map((v) => el("li", {}, el("span", {}, v.nome), el("span", { class: "prezzo" }, prezzo(v.prezzo))))
          )
        : null,
      allergeni.length ? el("p", { class: "allergeni" }, `Allergeni: ${allergeni.join(", ")}`) : null,
      disponibile ? null : el("p", { class: "nota-esaurito" }, "Momentaneamente non disponibile")
    )
  );
}

function renderMenu(menu) {
  const contenitore = document.getElementById("menu");
  const nav = document.getElementById("nav-categorie");
  contenitore.replaceChildren();
  nav.replaceChildren();

  const categorie = (menu.categorie || []).filter((c) => c && c.nome && (c.piatti || []).length);
  if (!categorie.length) {
    contenitore.append(el("p", { class: "stato" }, "Il menu è in aggiornamento. Torna a trovarci tra poco!"));
    return;
  }

  categorie.forEach((categoria, i) => {
    const id = slug(categoria.nome, i);
    nav.append(el("a", { href: `#${id}` }, categoria.nome));
    contenitore.append(
      el(
        "section",
        { class: "categoria", id, "aria-labelledby": `${id}-titolo` },
        el("h2", { id: `${id}-titolo` }, categoria.nome),
        categoria.descrizione ? el("p", { class: "categoria-descrizione" }, categoria.descrizione) : null,
        el("div", { class: "piatti" }, categoria.piatti.filter((p) => p && p.nome).map(renderPiatto))
      )
    );
  });

  evidenziaCategoriaAttiva(nav);
}

function renderInfo(info) {
  if (info.nome) {
    document.getElementById("nome-locale").textContent = info.nome;
    document.title = `Menu – ${info.nome}`;
  }
  document.getElementById("sottotitolo").textContent = info.sottotitolo || "";

  const avviso = document.getElementById("avviso");
  avviso.textContent = info.avviso || "";
  avviso.hidden = !info.avviso;

  const orari = (info.orari || []).filter((o) => o && o.giorni);
  const telefono = (info.telefono || "").trim();
  document.getElementById("info-locale").replaceChildren(
    info.note ? el("p", { class: "note" }, info.note) : "",
    orari.length
      ? el(
          "dl",
          { class: "orari" },
          orari.map((o) => [el("dt", {}, o.giorni), el("dd", {}, o.orario || "")])
        )
      : "",
    info.indirizzo ? el("p", {}, info.indirizzo) : "",
    telefono ? el("p", {}, el("a", { href: `tel:${telefono.replace(/[^\d+]/g, "")}` }, telefono)) : ""
  );
}

// Evidenzia nella barra la categoria che si sta guardando.
function evidenziaCategoriaAttiva(nav) {
  if (!("IntersectionObserver" in window)) return;
  const link = new Map([...nav.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const observer = new IntersectionObserver(
    (voci) => {
      for (const voce of voci) {
        if (!voce.isIntersecting) continue;
        link.forEach((a) => a.classList.remove("attiva"));
        const attivo = link.get(voce.target.id);
        if (attivo) {
          attivo.classList.add("attiva");
          // Scorre solo la barra in orizzontale, senza muovere la pagina.
          nav.scrollTo({
            left: attivo.offsetLeft - (nav.clientWidth - attivo.clientWidth) / 2,
            behavior: "smooth",
          });
        }
      }
    },
    { rootMargin: "-30% 0px -65% 0px" }
  );
  document.querySelectorAll(".categoria").forEach((s) => observer.observe(s));
}

async function avvia() {
  const [menu, info] = await Promise.allSettled([carica("content/menu.json"), carica("content/info.json")]);

  if (info.status === "fulfilled") renderInfo(info.value);
  else console.error(info.reason);

  if (menu.status === "fulfilled") renderMenu(menu.value);
  else {
    console.error(menu.reason);
    document
      .getElementById("menu")
      .replaceChildren(el("p", { class: "stato" }, "Non è stato possibile caricare il menu. Riprova tra qualche istante."));
  }
}

avvia();

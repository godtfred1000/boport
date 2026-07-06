const tabButtons = document.querySelectorAll(".tab-button");
const searchButton = document.querySelector(".search-button");
const propertyGrid = document.querySelector(".property-grid");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");

    const type = button.dataset.type;
    searchButton.textContent = type === "Selge" ? "Start salget" : `Søk ${type.toLowerCase()}`;
  });
});

function setupFavoriteButtons() {
  const favoriteButtons = document.querySelectorAll(".favorite-button");

  favoriteButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.toggle("saved");
      button.textContent = button.classList.contains("saved") ? "♥" : "♡";
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(property) {
  const formatter = new Intl.NumberFormat("nb-NO");

  if (property.listing_type === "rent" && property.monthly_rent) {
    return `${formatter.format(property.monthly_rent)} kr/mnd`;
  }

  if (property.price) {
    return `${formatter.format(property.price)} kr`;
  }

  return property.listing_type === "rent" ? "Pris etter avtale" : "Prisantydning kommer";
}

function getListingLabel(property) {
  return property.listing_type === "rent" ? "Leie" : "Salg";
}

function getPropertyImage(property, index) {
  if (property.image_url) {
    return `style="background-image: url('${escapeHtml(property.image_url)}')"`;
  }

  const photoClass = `photo-${(index % 3) + 1}`;
  return `class="property-photo ${photoClass}"`;
}

function createPropertyCard(property, index) {
  const bedrooms = property.bedrooms ?? "-";
  const size = property.size_m2 ? `${property.size_m2} m²` : "-";
  const location = [property.city, property.postal_code].filter(Boolean).join(", ");
  const imageMarkup = property.image_url
    ? `<div class="property-photo" ${getPropertyImage(property, index)}>`
    : `<div ${getPropertyImage(property, index)}>`;

  return `
    <a class="property-card property-card-link" href="bolig.html?id=${encodeURIComponent(property.id)}">
      ${imageMarkup}
        <button class="favorite-button" type="button" aria-label="Lagre bolig">♡</button>
      </div>
      <div class="property-info">
        <p class="property-price">${escapeHtml(formatPrice(property))}</p>
        <h3>${escapeHtml(property.title)}</h3>
        <p>${escapeHtml(location || property.address || "Norge")}</p>
        <dl>
          <div><dt>Soverom</dt><dd>${escapeHtml(bedrooms)}</dd></div>
          <div><dt>Areal</dt><dd>${escapeHtml(size)}</dd></div>
          <div><dt>Type</dt><dd>${escapeHtml(getListingLabel(property))}</dd></div>
        </dl>
      </div>
    </a>
  `;
}

async function getImagesForProperties(client, properties) {
  const ids = properties.map((property) => property.id);

  if (!ids.length) {
    return {};
  }

  const { data, error } = await client
    .from("property_images")
    .select("property_id, image_url, sort_order, is_hero")
    .in("property_id", ids)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente bilder:", error);
    return {};
  }

  return data.reduce((images, image) => {
    if (!image.image_url) {
      return images;
    }

    if (!images[image.property_id] || image.is_hero) {
      images[image.property_id] = image.image_url;
    }

    return images;
  }, {});
}

async function loadApprovedProperties() {
  if (!propertyGrid) {
    return;
  }

  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    propertyGrid.innerHTML = `
      <article class="property-card">
        <div class="property-info">
          <p class="property-price">Kunne ikke hente annonser</p>
          <h3>Supabase-tilkoblingen mangler</h3>
          <p>Sjekk at konfigurasjonen er lagt inn riktig.</p>
        </div>
      </article>
    `;
    return;
  }

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

  const { data, error } = await client
    .from("properties")
    .select("id, title, listing_type, property_type, city, postal_code, address, price, monthly_rent, size_m2, bedrooms, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kunne ikke hente annonser:", error);
    propertyGrid.innerHTML = `
      <article class="property-card">
        <div class="property-info">
          <p class="property-price">Kunne ikke hente annonser</p>
          <h3>Prøv igjen om litt</h3>
          <p>Godkjente annonser vises her når tilkoblingen svarer.</p>
        </div>
      </article>
    `;
    return;
  }

  if (!data.length) {
    propertyGrid.innerHTML = `
      <article class="property-card">
        <div class="property-info">
          <p class="property-price">Ingen godkjente annonser ennå</p>
          <h3>Send inn første boligannonse</h3>
          <p>Når en annonse blir godkjent, vises den her på forsiden.</p>
        </div>
      </article>
    `;
    return;
  }

  const images = await getImagesForProperties(client, data);
  const properties = data.map((property) => ({
    ...property,
    image_url: images[property.id]
  }));

  propertyGrid.innerHTML = properties.map(createPropertyCard).join("");
  setupFavoriteButtons();
}

loadApprovedProperties();
function boportMakeSectionSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "del";
}

function boportEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function boportTextToParagraphs(value) {
  const text = String(value || "").trim();

  if (!text) {
    return `<p class="description-text">Ingen tekst er lagt inn ennå.</p>`;
  }

  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p class="description-text">${boportEscapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function boportParseDescriptionSections(description) {
  const text = String(description || "").trim();

  if (!text) {
    return { intro: "", sections: [] };
  }

  const lines = text.split(/\r?\n/);
  const introLines = [];
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    const heading = line.match(/^\s{0,3}#{1,3}\s+(.+?)\s*$/);

    if (heading) {
      if (current) {
        sections.push(current);
      }

      current = { title: heading[1].trim(), lines: [] };
      return;
    }

    if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  });

  if (current) {
    sections.push(current);
  }

  return {
    intro: introLines.join("\n").trim(),
    sections: sections
      .map((section, index) => ({
        id: `seksjon-${boportMakeSectionSlug(section.title)}-${index + 1}`,
        title: section.title,
        text: section.lines.join("\n").trim()
      }))
      .filter((section) => section.title)
  };
}

function boportRenderSectionedDescription(description, options = {}) {
  const parsed = boportParseDescriptionSections(description);
  const intro = parsed.intro || options.emptyIntro || "Velg en del av eiendommen i menyen for å lese mer.";

  return {
    introHtml: boportTextToParagraphs(intro),
    navItems: parsed.sections.map((section) => ({
      href: `#${section.id}`,
      label: section.title
    })),
    sectionsHtml: parsed.sections.map((section) => `
      <section class="showcase-section property-unit-section" id="${boportEscapeHtml(section.id)}">
        <p class="section-eyebrow">Del av eiendommen</p>
        <h2>${boportEscapeHtml(section.title)}</h2>
        <div class="content-panel">
          ${boportTextToParagraphs(section.text)}
        </div>
      </section>
    `).join("")
  };
}

function boportApplySectionedDescription(description, settings = {}) {
  const result = boportRenderSectionedDescription(description, {
    emptyIntro: settings.emptyIntro
  });
  const descriptionTarget = document.querySelector(settings.descriptionSelector || "[data-boport-description]");
  const sectionTarget = document.querySelector(settings.sectionTargetSelector || "[data-boport-sections]");
  const navTarget = document.querySelector(settings.navSelector || ".listing-nav-links");

  if (descriptionTarget) {
    descriptionTarget.innerHTML = result.introHtml;
  }

  if (sectionTarget) {
    sectionTarget.innerHTML = result.sectionsHtml;
  }

  if (navTarget && result.navItems.length) {
    const fixedLinks = [
      { href: "#beskrivelse", label: "Beskrivelse" },
      ...result.navItems,
      { href: "#boliginfo", label: "Boliginfo" },
      { href: "#bilder", label: "Bilder" },
      { href: "#kart", label: "Kart" },
      { href: "#kontakt", label: "Kontakt" },
      { href: "index.html", label: "Forside" }
    ];

    navTarget.innerHTML = fixedLinks
      .map((link) => `<a href="${boportEscapeHtml(link.href)}">${boportEscapeHtml(link.label)}</a>`)
      .join("");
  }

  return result;
}
function boportEnhanceSectionedDescriptionFromPage() {
  const descriptionSection = document.getElementById("beskrivelse");
  const descriptionText = descriptionSection?.querySelector(".description-text");

  if (!descriptionSection || !descriptionText || descriptionSection.dataset.boportSectionsReady === "true") {
    return false;
  }

  const description = descriptionText.textContent || "";
  const rendered = boportRenderSectionedDescription(description, {
    emptyIntro: "Se delene av boligen under."
  });

  if (!rendered.sections.length) {
    return false;
  }

  descriptionText.innerHTML = rendered.introHtml;

  const sectionWrapper = document.createElement("div");
  sectionWrapper.innerHTML = rendered.sectionsHtml;
  descriptionSection.after(...sectionWrapper.children);

  const navTarget = document.querySelector(".listing-nav-links");

  if (navTarget) {
    rendered.sections.forEach((section) => {
      const link = document.createElement("a");
      link.href = `#${section.id}`;
      link.textContent = section.title;
      navTarget.insertBefore(link, navTarget.querySelector('a[href="#kart"]') || navTarget.lastElementChild);
    });
  }

  descriptionSection.dataset.boportSectionsReady = "true";
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  if (boportEnhanceSectionedDescriptionFromPage()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (boportEnhanceSectionedDescriptionFromPage()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setTimeout(() => observer.disconnect(), 10000);
});

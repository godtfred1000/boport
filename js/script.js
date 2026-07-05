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
    .select("property_id, image_url")
    .in("property_id", ids);

  if (error) {
    console.error("Kunne ikke hente bilder:", error);
    return {};
  }

  return data.reduce((images, image) => {
    if (!images[image.property_id]) {
      images[image.property_id] = image.image_url;
    }

    return images;
  }, {});
}

async function loadApprovedProperties() {
  if (!propertyGrid || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    setupFavoriteButtons();
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
    setupFavoriteButtons();
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

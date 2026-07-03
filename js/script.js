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
    button.addEventListener("click", () => {
      button.classList.toggle("saved");
      button.textContent = button.classList.contains("saved") ? "♥" : "♡";
    });
  });
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

function createPropertyCard(property, index) {
  const photoClass = `photo-${(index % 3) + 1}`;
  const bedrooms = property.bedrooms ?? "-";
  const size = property.size_m2 ? `${property.size_m2} m²` : "-";
  const location = [property.city, property.postal_code].filter(Boolean).join(", ");

  return `
    <article class="property-card">
      <div class="property-photo ${photoClass}">
        <button class="favorite-button" type="button" aria-label="Lagre bolig">♡</button>
      </div>
      <div class="property-info">
        <p class="property-price">${formatPrice(property)}</p>
        <h3>${property.title}</h3>
        <p>${location || property.address || "Norge"}</p>
        <dl>
          <div><dt>Soverom</dt><dd>${bedrooms}</dd></div>
          <div><dt>Areal</dt><dd>${size}</dd></div>
          <div><dt>Type</dt><dd>${getListingLabel(property)}</dd></div>
        </dl>
      </div>
    </article>
  `;
}

async function loadApprovedProperties() {
  if (!propertyGrid || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    setupFavoriteButtons();
    return;
  }

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

  const { data, error } = await client
    .from("properties")
    .select("title, listing_type, property_type, city, postal_code, address, price, monthly_rent, size_m2, bedrooms, created_at")
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

  propertyGrid.innerHTML = data.map(createPropertyCard).join("");
  setupFavoriteButtons();
}

loadApprovedProperties();

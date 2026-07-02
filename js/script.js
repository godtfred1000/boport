const tabButtons = document.querySelectorAll(".tab-button");
const searchButton = document.querySelector(".search-button");
const favoriteButtons = document.querySelectorAll(".favorite-button");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");

    const type = button.dataset.type;
    searchButton.textContent = type === "Selge" ? "Start salget" : `Søk ${type.toLowerCase()}`;
  });
});

favoriteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("saved");
    button.textContent = button.classList.contains("saved") ? "♥" : "♡";
  });
});

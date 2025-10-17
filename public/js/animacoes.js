window.addEventListener("scroll", function() {
  const header = document.querySelector(".header");
  if (window.scrollY > 50) { // começa a aplicar após 50px de rolagem
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});
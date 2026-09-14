const menuToggle = document.querySelector(".menu-toggle");
const mobileNavigation = document.querySelector("#mobile-navigation");
const orderTriggers = document.querySelectorAll(".order-trigger");
const orderStatus = document.querySelector(".order-status");
const orderUrl = document.documentElement.dataset.orderUrl?.trim();

function closeMenu({ returnFocus = false } = {}) {
  if (!menuToggle || !mobileNavigation) return;

  menuToggle.setAttribute("aria-expanded", "false");
  mobileNavigation.hidden = true;

  if (returnFocus) menuToggle.focus();
}

function openMenu() {
  if (!menuToggle || !mobileNavigation) return;

  menuToggle.setAttribute("aria-expanded", "true");
  mobileNavigation.hidden = false;
  mobileNavigation.querySelector("a, button")?.focus();
}

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  isOpen ? closeMenu() : openMenu();
});

mobileNavigation?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    closeMenu({ returnFocus: true });
  }
});

document.addEventListener("pointerdown", (event) => {
  if (
    menuToggle?.getAttribute("aria-expanded") === "true" &&
    !mobileNavigation?.contains(event.target) &&
    !menuToggle.contains(event.target)
  ) {
    closeMenu();
  }
});

orderTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (orderUrl) {
      window.open(orderUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const localOrderStatus =
      trigger.closest(".hero__action-group, .combo-info")?.querySelector(".order-status") ?? orderStatus;

    if (localOrderStatus) {
      localOrderStatus.textContent = "Link de pedidos ainda não informado.";
    }

    closeMenu();
  });
});

window.addEventListener("resize", () => {
  if (window.matchMedia("(min-width: 50.0625rem)").matches) closeMenu();
});

const comboSection = document.querySelector("[data-combo-section]");
const comboCoverflow = comboSection?.querySelector("[data-coverflow]");
const comboViewport = comboCoverflow?.querySelector("[data-coverflow-viewport]");
const comboSlides = comboViewport ? [...comboViewport.querySelectorAll("[data-combo-slide]")] : [];
const comboPrevious = comboCoverflow?.querySelector("[data-combo-previous]");
const comboNext = comboCoverflow?.querySelector("[data-combo-next]");
const comboDots = comboCoverflow ? [...comboCoverflow.querySelectorAll("[data-combo-dot]")] : [];
const comboInfo = comboSection?.querySelector("[data-combo-info]");
const comboCurrent = comboInfo?.querySelector("[data-combo-current]");
const comboNameOutput = comboInfo?.querySelector("[data-combo-name-output]");
const comboPriceOutput = comboInfo?.querySelector("[data-combo-price-output]");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let activeComboIndex = 1;
let comboAnimationFrame = 0;
let comboInfoTimer = 0;
let isDraggingCombos = false;
let comboDragStartX = 0;
let comboDragStartScroll = 0;
let comboTouchStartX = 0;

function wrapComboIndex(index) {
  return (index + comboSlides.length) % comboSlides.length;
}

function comboTargetScroll(index) {
  const slide = comboSlides[index];
  if (!comboViewport || !slide) return 0;
  const trackOffset = slide.parentElement?.offsetLeft ?? 0;
  return trackOffset + slide.offsetLeft + slide.offsetWidth / 2 - comboViewport.clientWidth / 2;
}

function updateComboInfo(index, { immediate = false } = {}) {
  const slide = comboSlides[index];
  if (!slide || !comboInfo || !comboCurrent || !comboNameOutput || !comboPriceOutput) return;

  window.clearTimeout(comboInfoTimer);

  const commit = () => {
    comboCurrent.textContent = String(index + 1).padStart(2, "0");
    comboNameOutput.textContent = slide.dataset.comboName;
    comboPriceOutput.textContent = slide.dataset.comboPrice;
    comboInfo.classList.remove("is-changing");
  };

  if (immediate || reducedMotionQuery.matches) {
    commit();
    return;
  }

  comboInfo.classList.add("is-changing");
  comboInfoTimer = window.setTimeout(commit, 110);
}

function setActiveCombo(index, options) {
  if (!comboSlides.length || index === activeComboIndex) return;

  activeComboIndex = index;
  comboSlides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === index;
    slide.classList.toggle("is-active", isActive);
    if (isActive) slide.setAttribute("aria-current", "true");
    else slide.removeAttribute("aria-current");
  });

  comboDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === index;
    dot.classList.toggle("is-active", isActive);
    if (isActive) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });

  updateComboInfo(index, options);
}

function renderComboCoverflow() {
  if (!comboViewport || !comboSlides.length) return;

  const viewportRect = comboViewport.getBoundingClientRect();
  const viewportCenter = viewportRect.left + viewportRect.width / 2;
  let nearestIndex = activeComboIndex;
  let nearestDistance = Number.POSITIVE_INFINITY;

  comboSlides.forEach((slide, index) => {
    const slideRect = slide.getBoundingClientRect();
    const slideCenter = slideRect.left + slideRect.width / 2;
    const signedDistance = (slideCenter - viewportCenter) / slideRect.width;
    const distance = Math.min(Math.abs(signedDistance), 1);
    const scale = 1 - distance * 0.24;
    const rotation = Math.max(-18, Math.min(18, signedDistance * -18));
    const opacity = 1 - distance * 0.38;
    const lift = distance * 16 - (1 - distance) * 3;
    const pull = -signedDistance * Math.min(viewportRect.width * 0.18, 90);

    slide.style.setProperty("--combo-scale", scale.toFixed(3));
    slide.style.setProperty("--combo-rotation", `${rotation.toFixed(2)}deg`);
    slide.style.setProperty("--combo-opacity", opacity.toFixed(3));
    slide.style.setProperty("--combo-lift", `${lift.toFixed(2)}px`);
    slide.style.setProperty("--combo-pull", `${pull.toFixed(2)}px`);
    slide.style.zIndex = String(10 - Math.round(distance * 5));

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  setActiveCombo(nearestIndex);
}

function scheduleComboRender() {
  window.cancelAnimationFrame(comboAnimationFrame);
  comboAnimationFrame = window.requestAnimationFrame(renderComboCoverflow);
}

function scrollToCombo(index, behavior = reducedMotionQuery.matches ? "auto" : "smooth") {
  if (!comboViewport || !comboSlides[index]) return;
  comboViewport.scrollTo({ left: comboTargetScroll(index), behavior });
  setActiveCombo(index);
}

function jumpToCombo(index) {
  if (!comboViewport || !comboSlides[index]) return;
  comboViewport.style.scrollSnapType = "none";
  comboViewport.scrollTo({ left: comboTargetScroll(index), behavior: "auto" });
  setActiveCombo(index);
  renderComboCoverflow();
  window.requestAnimationFrame(() => comboViewport.style.removeProperty("scroll-snap-type"));
}

function stepCombo(direction) {
  const nextIndex = wrapComboIndex(activeComboIndex + direction);
  const crossedBoundary =
    (direction > 0 && activeComboIndex === comboSlides.length - 1) ||
    (direction < 0 && activeComboIndex === 0);
  if (crossedBoundary) jumpToCombo(nextIndex);
  else scrollToCombo(nextIndex);
}

comboPrevious?.addEventListener("click", () => stepCombo(-1));
comboNext?.addEventListener("click", () => stepCombo(1));

comboDots.forEach((dot, index) => {
  dot.addEventListener("click", () => scrollToCombo(index));
});

comboViewport?.addEventListener("scroll", scheduleComboRender, { passive: true });

comboViewport?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  stepCombo(direction);
});

comboViewport?.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") {
    comboTouchStartX = event.clientX;
    return;
  }

  if (event.pointerType !== "mouse" || event.button !== 0) return;
  isDraggingCombos = true;
  comboDragStartX = event.clientX;
  comboDragStartScroll = comboViewport.scrollLeft;
  comboViewport.setPointerCapture(event.pointerId);
});

comboViewport?.addEventListener("pointermove", (event) => {
  if (!isDraggingCombos) return;
  comboViewport.scrollLeft = comboDragStartScroll - (event.clientX - comboDragStartX);
});

function finishComboDrag(event) {
  if (event.pointerType === "touch") {
    const swipeDistance = event.clientX - comboTouchStartX;
    const swipedPastFirst = activeComboIndex === 0 && swipeDistance > 32;
    const swipedPastLast = activeComboIndex === comboSlides.length - 1 && swipeDistance < -32;

    if (swipedPastFirst) jumpToCombo(comboSlides.length - 1);
    if (swipedPastLast) jumpToCombo(0);
    return;
  }

  if (!isDraggingCombos) return;
  isDraggingCombos = false;
  if (comboViewport?.hasPointerCapture(event.pointerId)) comboViewport.releasePointerCapture(event.pointerId);
  scrollToCombo(activeComboIndex);
}

comboViewport?.addEventListener("pointerup", finishComboDrag);
comboViewport?.addEventListener("pointercancel", finishComboDrag);

window.addEventListener("resize", () => {
  if (!comboViewport || !comboSlides.length) return;
  scrollToCombo(activeComboIndex, "auto");
  scheduleComboRender();
});

if (comboSection && !reducedMotionQuery.matches) {
  comboSection.classList.add("has-entry-motion");
  const comboEntryObserver = new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting) return;
      comboSection.classList.add("is-in-view");
      observer.disconnect();
    },
    { threshold: 0.14 },
  );
  comboEntryObserver.observe(comboSection);
} else {
  comboSection?.classList.add("is-in-view");
}

if (comboViewport && comboSlides.length) {
  window.requestAnimationFrame(() => {
    comboViewport.scrollTo({ left: comboTargetScroll(activeComboIndex), behavior: "auto" });
    comboSlides[activeComboIndex].setAttribute("aria-current", "true");
    renderComboCoverflow();
  });
}

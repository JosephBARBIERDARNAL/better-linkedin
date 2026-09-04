const hiddenAttribute = "data-better-linkedin-hidden";

const knownPostSelectors = [
  "main article",
  "main .occludable-update",
  "main .feed-shared-update-v2",
  "main [data-finite-scroll-hotkey-item]",
  'main [data-urn^="urn:li:activity:"]',
  'main [data-id^="urn:li:activity:"]',
];

let blocking = false;
let scheduled = false;

function isFeedPage() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "" || path === "/feed";
}

function isProfilePage() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/in";
}

function hasComposer(element) {
  const label =
    `${element.getAttribute("aria-label") || ""} ${element.innerText || ""}`.toLowerCase();
  return /start a post|create a post|share a post/.test(label);
}

function normalizedText(element) {
  return (element.innerText || element.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hideNavigationItem(text) {
  for (const element of document.querySelectorAll(
    "a, button, [role='link'], [role='button']",
  )) {
    if (normalizedText(element) !== text) continue;
    const target =
      element.closest("a, button, [role='link'], [role='button']") || element;
    target.setAttribute(hiddenAttribute, "");
  }
}

function hideCardWithHeading(text) {
  const heading = [
    ...document.querySelectorAll("h1, h2, h3, h4, [role='heading'], div, span"),
  ].find((element) => normalizedText(element) === text);
  if (!heading) return;

  let card = null;
  for (
    let element = heading.parentElement;
    element && element !== document.body;
    element = element.parentElement
  ) {
    const box = element.getBoundingClientRect();
    if (
      box.width >= 260 &&
      box.width <= 520 &&
      box.height >= 120 &&
      box.height <= 900
    ) {
      card = element;
      break;
    }
  }

  (card || heading.parentElement).setAttribute(hiddenAttribute, "");
}

function hideExtras() {
  hideNavigationItem("for business");
  hideNavigationItem("try premium for €0");

  if (isFeedPage()) {
    hideCardWithHeading("today's puzzles");
    hideCardWithHeading("add to your feed");
  }

  if (isProfilePage()) {
    hideCardWithHeading("who your viewers also viewed");
    hideCardWithHeading("people you may know");
  }
}

function findFeedColumn() {
  const minWidth = Math.min(380, window.innerWidth * 0.9);
  const maxWidth = Math.max(760, Math.min(window.innerWidth * 0.8, 1400));
  const chrome = document.querySelector(
    "header, nav, [role='banner'], [role='navigation']",
  );
  let best = null;
  let bestScore = 0;

  for (const element of document.querySelectorAll("div, main, section")) {
    const box = element.getBoundingClientRect();
    if (box.width < minWidth || box.width > maxWidth || box.height < 400)
      continue;
    if ((element.innerText || "").length < 500) continue;
    if (chrome && element.contains(chrome)) continue;

    const score = element.children.length;
    if (
      score > bestScore ||
      (score === bestScore &&
        best &&
        box.width < best.getBoundingClientRect().width)
    ) {
      best = element;
      bestScore = score;
    }
  }

  return best;
}

function hideFeed() {
  for (const post of document.querySelectorAll(knownPostSelectors.join(","))) {
    if (!hasComposer(post)) post.setAttribute(hiddenAttribute, "");
  }

  const feed = findFeedColumn();
  if (!feed) return;

  for (const child of feed.children) {
    if (!hasComposer(child)) child.setAttribute(hiddenAttribute, "");
  }
}

function showFeed() {
  document
    .querySelectorAll(`[${hiddenAttribute}]`)
    .forEach((element) => element.removeAttribute(hiddenAttribute));
}

function update() {
  hideExtras();

  if (!isFeedPage()) {
    if (blocking) {
      showFeed();
      hideExtras();
    }
    blocking = false;
    return;
  }

  hideFeed();
  blocking = true;
}

function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    update();
  });
}

const observer = new MutationObserver(scheduleUpdate);
observer.observe(document.documentElement || document, {
  childList: true,
  subtree: true,
});

for (const method of ["pushState", "replaceState"]) {
  const original = history[method];
  history[method] = function (...args) {
    const result = original.apply(this, args);
    scheduleUpdate();
    return result;
  };
}

window.addEventListener("popstate", scheduleUpdate);
window.addEventListener("resize", scheduleUpdate);
setInterval(update, 1200);
update();

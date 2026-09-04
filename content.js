const hiddenClass = "linkedin-feed-blocker-hidden";

const feedPostSelectors = [
  "main article",
  "main .occludable-update",
  "main .feed-shared-update-v2",
  "main .feed-shared-article",
  "main .feed-shared-sponsored-update",
  "main .update-components-update-v2",
  "main [data-finite-scroll-hotkey-item]",
  "main [data-urn^=\"urn:li:activity:\"]",
  "main [data-id^=\"urn:li:activity:\"]"
];

let isBlocking = false;

function isFeedPage() {
  return /^\/feed(?:\/|$)/.test(window.location.pathname);
}

function hideFeedPosts() {
  document
    .querySelectorAll(feedPostSelectors.join(","))
    .forEach((post) => post.classList.add(hiddenClass));
}

function showFeedPosts() {
  document
    .querySelectorAll(`.${hiddenClass}`)
    .forEach((post) => post.classList.remove(hiddenClass));
}

function update() {
  const shouldBlock = isFeedPage();

  if (shouldBlock) {
    hideFeedPosts();
  } else if (isBlocking) {
    showFeedPosts();
  }

  isBlocking = shouldBlock;
}

const observer = new MutationObserver(update);
observer.observe(document.documentElement, { childList: true, subtree: true });

for (const method of ["pushState", "replaceState"]) {
  const original = history[method];
  history[method] = function (...args) {
    const result = original.apply(this, args);
    window.dispatchEvent(new Event("linkedin-feed-blocker-navigation"));
    return result;
  };
}

window.addEventListener("popstate", update);
window.addEventListener("linkedin-feed-blocker-navigation", update);
update();

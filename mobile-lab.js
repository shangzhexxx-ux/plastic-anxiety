const mobileLabMedia = window.matchMedia("(max-width: 768px)");
const mobilePanelTabs = [...document.querySelectorAll(".panel-tab")];
const mobileMaterialPanel = document.querySelector(".material-panel");
const mobileStylePanel = document.querySelector(".style-panel");
const mobilePanelBackdrop = document.querySelector(".mobile-panel-backdrop");
const mobileMaterialTitle = mobileMaterialPanel?.querySelector(".panel-title > span");
const mobileMaterialSubtitle = mobileMaterialPanel?.querySelector(".panel-title > small");

let mobileOpenPanel = null;

function closeMobilePanel() {
  mobileOpenPanel = null;
  document.body.classList.remove(
    "mobile-panel-open",
    "mobile-panel-material",
    "mobile-panel-style",
    "mobile-panel-layers",
  );
  mobilePanelBackdrop?.setAttribute("hidden", "");
  mobilePanelTabs.forEach((tab) => {
    tab.classList.remove("active");
    tab.setAttribute("aria-selected", "false");
  });
  mobileMaterialPanel?.classList.remove("active-tab");
  mobileStylePanel?.classList.remove("active-tab");
}

function openMobilePanel(target) {
  mobileOpenPanel = target;
  document.body.classList.remove(
    "mobile-panel-material",
    "mobile-panel-style",
    "mobile-panel-layers",
  );
  document.body.classList.add("mobile-panel-open", `mobile-panel-${target}`);
  mobilePanelBackdrop?.removeAttribute("hidden");

  mobilePanelTabs.forEach((tab) => {
    const active = tab.dataset.tab === target;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  const useMaterialPanel = target === "material" || target === "layers";
  mobileMaterialPanel?.classList.toggle("active-tab", useMaterialPanel);
  mobileStylePanel?.classList.toggle("active-tab", target === "style");

  if (mobileMaterialPanel && useMaterialPanel) {
    mobileMaterialPanel.dataset.tabMode = target === "layers" ? "layers" : "material";
    if (mobileMaterialTitle) {
      mobileMaterialTitle.textContent = target === "layers" ? "Layers" : "Material Library";
    }
    if (mobileMaterialSubtitle) {
      mobileMaterialSubtitle.textContent =
        target === "layers" ? "Top objects appear first" : "Labels / papers / decorations";
    }
    mobileMaterialPanel.querySelector(".panel-body")?.scrollTo({ top: 0 });
  }

  if (target === "style") {
    mobileStylePanel?.querySelector(".panel-body")?.scrollTo({ top: 0 });
  }
}

function resetMobileLab() {
  if (mobileLabMedia.matches) {
    closeMobilePanel();
  } else {
    document.body.classList.remove(
      "mobile-panel-open",
      "mobile-panel-material",
      "mobile-panel-style",
      "mobile-panel-layers",
    );
    mobilePanelBackdrop?.setAttribute("hidden", "");
    mobilePanelTabs.forEach((tab, index) => {
      const active = index === 0;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    mobileMaterialPanel?.classList.add("active-tab");
    mobileStylePanel?.classList.remove("active-tab");
    if (mobileMaterialPanel) mobileMaterialPanel.dataset.tabMode = "material";
    if (mobileMaterialTitle) mobileMaterialTitle.textContent = "Material Library";
    if (mobileMaterialSubtitle) {
      mobileMaterialSubtitle.textContent = "Labels / papers / decorations";
    }
  }
}

document.addEventListener(
  "click",
  (event) => {
    if (!mobileLabMedia.matches) return;
    const tab = event.target.closest(".panel-tab");
    if (!tab) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = tab.dataset.tab;
    if (mobileOpenPanel === target) closeMobilePanel();
    else openMobilePanel(target);
  },
  true,
);

mobilePanelBackdrop?.addEventListener("click", closeMobilePanel);

document.querySelectorAll(".panel-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    if (mobileLabMedia.matches) closeMobilePanel();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileLabMedia.matches && mobileOpenPanel) {
    closeMobilePanel();
  }
});

mobileLabMedia.addEventListener?.("change", resetMobileLab);
resetMobileLab();

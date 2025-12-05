// @ts-check
// @ts-ignore
window.AlohaThemeManager = (() => {
    const LOCAL_STORAGE_COLOR_SCHEME_KEY = "color-scheme";
    const BOOTSTRAP_COLOR_SCHEME_ATTRIBUTE = "data-bs-theme";

    const LOCAL_STORAGE_COLORBLIND_MODE_KEY = "preferred-colorblind-mode";
    const BOOTSTRAP_BASE_DATASET_KEY = "alohaBaseHref";
    const OVERRIDES_BASE_DATASET_KEY = "alohaOverridesBaseHref";


    function readSavedColorScheme() {
        const storedValue = localStorage.getItem(LOCAL_STORAGE_COLOR_SCHEME_KEY);
        return storedValue === "dark" ? "dark" : "light";
    }

    /** @param {"light" | "dark"} nextScheme */
    function changeColorScheme(nextScheme) {
        localStorage.setItem(LOCAL_STORAGE_COLOR_SCHEME_KEY, nextScheme);
        document.documentElement.setAttribute(
            BOOTSTRAP_COLOR_SCHEME_ATTRIBUTE,
            nextScheme
        );
    }

    function setupColorScheme() {
        const preferredScheme = readSavedColorScheme();
        changeColorScheme(preferredScheme);
        return preferredScheme;
    }

    function toggleColorScheme() {
        const previousScheme = readSavedColorScheme();
        const nextScheme = previousScheme === "dark" ? "light" : "dark";
        changeColorScheme(nextScheme);
        return nextScheme;
    }

    /** @param {string | null} font */
    function isValidFontName(font) {
        return (
            font === "times" ||
            font === "opendyslexic" ||
            font === "arial" ||
            font === "dmsans" ||
            font === "verdana"
        );
    }

    function getPreferredFont() {
        const font = localStorage.getItem("preferred-font");
        if (!isValidFontName(font)) {
            return "dmsans";
        }

        return font;
    }

    /**
     * @param {("times" | "opendyslexic" | "arial" | "dmsans" | "verdana")} font
     */
    function changeFont(font) {
        if (!isValidFontName(font)) {
            font = "dmsans";
        }

        document.documentElement.setAttribute("data-font", font);
        localStorage.setItem("preferred-font", font);
    }

    function setupFont() {
        const font = getPreferredFont();
        document.documentElement.setAttribute("data-font", font);
    }

    /** @param {string | null} mode */
    function isValidColorblindMode(mode) {
        return (
            mode === "achromatopsia" ||
            mode === "achromatomaly" ||
            mode === "deuteranomaly" ||
            mode === "deuteranopia" ||
            mode === "protanomaly" ||
            mode === "protanopia" ||
            mode === "tritanomaly" ||
            mode === "tritanopia"
        );
    }

    function findBootstrapLink() {
        /** @type {HTMLLinkElement | null} */
        let link = null;

        link = /** @type {HTMLLinkElement | null} */ (
            document.getElementById("aloha-bootstrap-link")
        );
        if (link) {
            return link;
        }

        link = /** @type {HTMLLinkElement | null} */ (
            document.querySelector(
                'link[rel="stylesheet"][href^="/api/branding/css/bootstrap"]'
            )
        );
        if (link) {
            return link;
        }

        const candidates = Array.from(
            document.querySelectorAll(
                'link[rel="stylesheet"][href*="bootstrap"]'
            )
        );

        const nonBlazor = candidates.find(
            (l) => /** @type {HTMLLinkElement} */ (l).href.includes("Blazor.Bootstrap") === false
        );
        if (nonBlazor) {
            return /** @type {HTMLLinkElement} */ (nonBlazor);
        }

        if (candidates.length > 0) {
            return /** @type {HTMLLinkElement} */ (candidates[0]);
        }

        return null;
    }

    function findOverridesLink() {
        /** @type {HTMLLinkElement | null} */
        let link = null;

        link = /** @type {HTMLLinkElement | null} */ (
            document.getElementById("aloha-overrides-link")
        );
        if (link) {
            return link;
        }

        link = /** @type {HTMLLinkElement | null} */ (
            document.querySelector(
                'link[rel="stylesheet"][href^="/api/branding/css/custom-overrides"]'
            )
        );
        if (link) {
            return link;
        }

        const candidates = Array.from(
            document.querySelectorAll(
                'link[rel="stylesheet"][href*="aloha-css-overrides"], ' +
                'link[rel="stylesheet"][href*="aloha-additional"], ' +
                'link[rel="stylesheet"][href*="additional.css"]'
            )
        );

        if (candidates.length > 0) {
            return /** @type {HTMLLinkElement} */ (candidates[0]);
        }

        return null;
    }

    function getBootstrapBaseHref() {
        const link = findBootstrapLink();
        if (!link) return null;

        const hrefAttr = link.getAttribute("href") || "";

        try {
            const url = new URL(hrefAttr, window.location.origin);
            url.searchParams.delete("mode");
            let base = url.pathname + url.search;

            if (!base || base === "") {
                const attr = link.getAttribute("data-aloha-base-href");
                base =
                    (attr && attr.trim().length > 0)
                        ? attr.trim()
                        : "/api/branding/css/bootstrap";
            }

            link.dataset[BOOTSTRAP_BASE_DATASET_KEY] = base;
            return base;
        } catch (e) {
            const attr = link.getAttribute("data-aloha-base-href");
            const fallback =
                (attr && attr.trim().length > 0)
                    ? attr.trim()
                    : "/api/branding/css/bootstrap";

            link.dataset[BOOTSTRAP_BASE_DATASET_KEY] = fallback;
            return fallback;
        }
    }

    function getOverridesBaseHref() {
        const link = findOverridesLink();
        if (!link) return null;

        const hrefAttr = link.getAttribute("href") || "";

        try {
            const url = new URL(hrefAttr, window.location.origin);
            url.searchParams.delete("mode");
            let base = url.pathname + url.search;

            if (!base || base === "") {
                const attr = link.getAttribute("data-aloha-overrides-base-href");
                base =
                    (attr && attr.trim().length > 0)
                        ? attr.trim()
                        : "/api/branding/css/custom-overrides";
            }

            link.dataset[OVERRIDES_BASE_DATASET_KEY] = base;
            return base;
        } catch (e) {
            const attr = link.getAttribute("data-aloha-overrides-base-href");
            const fallback =
                (attr && attr.trim().length > 0)
                    ? attr.trim()
                    : "/api/branding/css/custom-overrides";

            link.dataset[OVERRIDES_BASE_DATASET_KEY] = fallback;
            return fallback;
        }
    }

    /**
     * Build a href for the given base + mode.
     * Uses a ?mode= query param instead of filename munging.
     *
     * Examples:
     *   baseHref: /api/branding/css/bootstrap?v=123
     *   mode:     deuteranopia
     *   result:   /api/branding/css/bootstrap?v=123&mode=deuteranopia
     *
     * @param {string} baseHref
     * @param {string | null} mode
     */
    function buildHrefForMode(baseHref, mode) {
        try {
            const url = new URL(baseHref, window.location.origin);

            if (!mode) {
                // reset: remove the mode param only
                url.searchParams.delete("mode");
            } else {
                url.searchParams.set("mode", mode);
            }

            const href = url.pathname + url.search;
            return href;
        } catch (e) {
            return baseHref;
        }
    }

    /**
     * Apply the colorblind mode to the two main aloha stylesheets.
     * If mode is null, resets to the original base hrefs (no mode param).
     *
     * @param {string | null} mode
     */
    function applyColorblindModeToStylesheets(mode) {
        const bootstrapLink = findBootstrapLink();
        const overridesLink = findOverridesLink();

        const bootstrapBase = getBootstrapBaseHref();
        const overridesBase = getOverridesBaseHref();

        if (!bootstrapLink && !overridesLink) {
            return;
        }

        if (bootstrapLink && bootstrapBase) {
            const nextHref = buildHrefForMode(bootstrapBase, mode);
            if (bootstrapLink.href !== new URL(nextHref, window.location.origin).href) {
                bootstrapLink.href = nextHref;
            }
        }

        if (overridesLink && overridesBase) {
            const nextHref = buildHrefForMode(overridesBase, mode);
            if (overridesLink.href !== new URL(nextHref, window.location.origin).href) {
                overridesLink.href = nextHref;
            }
        }
    }

    function getColorblindMode() {
        const mode = localStorage.getItem(LOCAL_STORAGE_COLORBLIND_MODE_KEY);
        if (!isValidColorblindMode(mode)) {
            return null;
        }
        return /** @type {string | null} */ (mode);
    }

    /**
     * @param {string | null} mode
     */
    function setColorblindMode(mode) {
        if (mode == null || mode === "") {
            localStorage.removeItem(LOCAL_STORAGE_COLORBLIND_MODE_KEY);
            applyColorblindModeToStylesheets(null);
            document.documentElement.removeAttribute("data-colorblind-mode");
            return;
        }

        if (!isValidColorblindMode(mode)) {
            return;
        }

        localStorage.setItem(LOCAL_STORAGE_COLORBLIND_MODE_KEY, mode);
        applyColorblindModeToStylesheets(mode);
        document.documentElement.setAttribute("data-colorblind-mode", mode);
    }

    /**
     * Call this on startup (same place as setupFont/setupColorScheme).
     * It reads the stored mode and applies the corresponding stylesheets.
     */
    function setupColorblindMode() {
        const mode = getColorblindMode();
        applyColorblindModeToStylesheets(mode);

        if (mode && isValidColorblindMode(mode)) {
            document.documentElement.setAttribute("data-colorblind-mode", mode);
        } else {
            document.documentElement.removeAttribute("data-colorblind-mode");
        }
    }

    return {
        setupFont,
        changeFont,
        getPreferredFont,
        setupColorScheme,
        toggleColorScheme,
        readSavedColorScheme,
        changeColorScheme,

        // colorblind exports
        setupColorblindMode,
        setColorblindMode,
        getColorblindMode
    };
})();
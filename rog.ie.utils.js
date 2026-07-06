class Cache {
  constructor(prefix = "cache_") {
    this.prefix = prefix;
    this.ttlPrefix = "ttl_";
  }

  // Set a value with optional TTL (time-to-live in milliseconds)
  set(key, value, ttl = null) {
    const fullKey = this.prefix + key;
    const data = {
      value: value,
      timestamp: Date.now(),
      ttl: ttl,
    };

    localStorage.setItem(fullKey, JSON.stringify(data));

    // If TTL is provided, store the expiration time
    if (ttl) {
      const ttlKey = this.ttlPrefix + key;
      const expirationTime = Date.now() + ttl;
      localStorage.setItem(ttlKey, expirationTime.toString());
    }
  }

  // Get a value, returns null if expired or not found
  get(key) {
    const fullKey = this.prefix + key;
    const ttlKey = this.ttlPrefix + key;

    // Check if item exists
    const item = localStorage.getItem(fullKey);
    if (!item) return null;

    // Check TTL
    const ttlValue = localStorage.getItem(ttlKey);
    if (ttlValue) {
      const expirationTime = parseInt(ttlValue);
      if (Date.now() > expirationTime) {
        this.remove(key);
        return null;
      }
    }

    try {
      const data = JSON.parse(item);
      return data.value;
    } catch (e) {
      return null;
    }
  }

  // Remove a specific key
  remove(key) {
    const fullKey = this.prefix + key;
    const ttlKey = this.ttlPrefix + key;

    localStorage.removeItem(fullKey);
    localStorage.removeItem(ttlKey);
  }

  // Clear all cached items
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix) || key.startsWith(this.ttlPrefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Get the number of cached items
  size() {
    const keys = Object.keys(localStorage);
    return keys.filter((key) => key.startsWith(this.prefix)).length;
  }

  // Get all cache keys
  keys() {
    const keys = Object.keys(localStorage);
    return keys
      .filter((key) => key.startsWith(this.prefix))
      .map((key) => key.substring(this.prefix.length));
  }

  // Get all cache values
  values() {
    return this.keys()
      .map((key) => this.get(key))
      .filter((value) => value !== null);
  }

  // Set TTL for a specific key
  setTTL(key, ttl) {
    const ttlKey = this.ttlPrefix + key;
    const expirationTime = Date.now() + ttl;
    localStorage.setItem(ttlKey, expirationTime.toString());
  }

  // Get remaining TTL for a key (returns milliseconds remaining, or null if no TTL)
  getTTL(key) {
    const ttlKey = this.ttlPrefix + key;
    const ttlValue = localStorage.getItem(ttlKey);

    if (!ttlValue) return null;

    const expirationTime = parseInt(ttlValue);
    const remaining = expirationTime - Date.now();

    return remaining > 0 ? remaining : null;
  }

  // Remove expired items
  removeExpired() {
    const keys = this.keys();
    keys.forEach((key) => {
      if (this.getTTL(key) === null && this.get(key) === null) {
        this.remove(key);
      }
    });
  }

  // Clear all expired items
  clearExpired() {
    const keys = this.keys();
    keys.forEach((key) => {
      const ttl = this.getTTL(key);
      if (ttl !== null && ttl <= 0) {
        this.remove(key);
      }
    });
  }

  // Get size of non-expired items
  sizeValid() {
    this.clearExpired();
    return this.size();
  }

  // Get all valid (non-expired) keys
  keysValid() {
    this.clearExpired();
    return this.keys();
  }
}

class AudioPlayer {
  constructor(onEnded = null, onTimeUpdate = null, onPause = null) {
    this.currentUrl = null;
    this.audio = null;
    this.isPlaying = false;
    this.volume = 1;
    this.fadeOutInterval = null;
    this.fadeInInterval = null;
    this.onEnded = onEnded;
    this.onTimeUpdate = onTimeUpdate;
    this.onPause = onPause;
    this.playbackRate = 1;
    this.fadeDuration = 100;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.hasUserGesture = false;
    this.pendingPlay = false;
  }

  setFadeDuration(duration = 500) {
    this.fadeDuration = duration;
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.audio) {
      this.audio.volume = volume;
    }
  }
  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  async fadeOut() {
    if (!this.audio) return;

    // Clear any existing fade interval
    if (this.fadeOutInterval) {
      clearInterval(this.fadeOutInterval);
      this.fadeOutInterval = null;
    }

    const startVolume = this.audio.volume;
    const steps = Math.max(1, Math.floor(this.fadeDuration / 50));
    let step = 0;
    const volumeStep = startVolume / steps;

    return new Promise((resolve) => {
      this.fadeOutInterval = setInterval(() => {
        step++;
        const newVolume = Math.max(0, startVolume - volumeStep * step);
        this.audio.volume = newVolume;

        if (step >= steps || newVolume <= 0) {
          clearInterval(this.fadeOutInterval);
          this.fadeOutInterval = null;
          this.audio.pause();
          resolve();
        }
      }, this.fadeDuration / steps);
    });
  }

  async fadeIn() {
    if (!this.audio) return;

    // Clear any existing fade interval
    if (this.fadeInInterval) {
      clearInterval(this.fadeInInterval);
      this.fadeInInterval = null;
    }

    const targetVolume = this.volume;
    const steps = Math.max(1, Math.floor(this.fadeDuration / 50));
    let step = 0;
    const volumeStep = targetVolume / steps;

    this.audio.volume = 0;

    try {
      await this.audio.play();
    } catch (error) {
      console.warn("Audio play failed during fade in:", error);
      // For iOS, set volume directly and throw error up
      if (this.isIOS) {
        this.audio.volume = targetVolume;
        throw error;
      }
    }

    return new Promise((resolve) => {
      this.fadeInInterval = setInterval(() => {
        step++;
        const newVolume = Math.min(targetVolume, volumeStep * step);
        this.audio.volume = newVolume;

        if (step >= steps || newVolume >= targetVolume) {
          clearInterval(this.fadeInInterval);
          this.fadeInInterval = null;
          resolve();
        }
      }, this.fadeDuration / steps);
    });
  }

  // Initialize audio with user gesture (call this on first user interaction)
  initializeAudio() {
    if (!this.audio && this.isIOS) {
      this.audio = new Audio();
      this.audio.volume = 0;
      this.audio.playbackRate = this.playbackRate;
      this.hasUserGesture = true;

      // Set up event listeners once
      if (this.onEnded) {
        this.audio.addEventListener("ended", this.onEnded);
      }
      if (this.onTimeUpdate) {
        this.audio.addEventListener("timeupdate", this.onTimeUpdate);
      }
      if (this.onPause) {
        this.audio.addEventListener("pause", this.onPause);
      }
    }
  }

  async play(url = null) {
    // On iOS, ensure we have a user gesture
    if (this.isIOS && !this.hasUserGesture) {
      this.initializeAudio();
    }

    if (url && url !== this.currentUrl) {
      // If there's a current track playing, fade it out first
      if (this.audio && this.isPlaying) {
        await this.fadeOut();
      }

      this.currentUrl = url;

      if (!this.audio) {
        this.audio = new Audio();
        this.audio.playbackRate = this.playbackRate;

        // Set up event listeners for new audio element
        if (this.onEnded) {
          this.audio.addEventListener("ended", this.onEnded);
        }
        if (this.onTimeUpdate) {
          this.audio.addEventListener("timeupdate", this.onTimeUpdate);
        }
        if (this.onPause) {
          this.audio.addEventListener("pause", this.onPause);
        }
      }

      // Load the new URL
      this.audio.src = url;
      this.audio.volume = 0;

      try {
        // Preload on non-iOS devices
        if (!this.isIOS) {
          await this.audio.load();
        }
        await this.fadeIn();
      } catch (error) {
        console.warn("Audio playback failed:", error);
        // Fallback: try direct play for iOS
        if (this.isIOS) {
          try {
            this.audio.volume = this.volume;
            await this.audio.play();
            this.isPlaying = true;
          } catch (iosError) {
            console.error("iOS audio playback failed:", iosError);
          }
        }
      }
    } else if (this.audio) {
      if (!this.isPlaying) {
        try {
          await this.fadeIn();
        } catch (error) {
          console.warn("Resume playback failed:", error);
          // Fallback for iOS
          if (this.isIOS) {
            this.audio.volume = this.volume;
            await this.audio.play();
            this.isPlaying = true;
          }
        }
      }
    }

    this.isPlaying = true;
  }

  async pause() {
    if (this.audio && this.isPlaying) {
      await this.fadeOut();
      this.isPlaying = false;
    }
  }
}

class TMDB {
  #CACHE = new Cache("tmdb_");
  #genreMap = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
  };
  #slugify(title) {
    return title.toLowerCase().replace(/ /g, "-");
  }
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.imageBaseUrl = "https://image.tmdb.org/t/p";
    this.baseImageUrl = `${this.imageBaseUrl}/w500`;
  }
  getYoutubeUrl(videoId) {
    return encodeURI("https://www.youtube.com/watch?v=" + videoId);
  }
  getImageUrl(path, size = "w500") {
    if (!path) {
      return "";
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `${this.imageBaseUrl}/${size}${path}`;
  }

  async getMovie(id) {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${this.apiKey}`,
    );
    return response.json();
  }
  async search(query) {
    let querySlug = this.#slugify(query);
    if (this.#CACHE.get(querySlug)) {
      return this.#CACHE.get(querySlug);
    } else {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?language=en-US&api_key=${this.apiKey}&query=${query}`,
      );
      let data = await response.json();
      data.results = data.results.map((movie) => {
        if (movie.genre_ids) {
          movie.genres = movie.genre_ids.map((id) => this.#genreMap[id]);
        } else {
          movie.genres = [];
        }
        return movie;
      });

      this.#CACHE.set(querySlug, data);
      return data;
    }
  }
}

class FocusLayer {
  constructor() {
    this.activeTarget = null;
    this.activeLayer = null;
    this.activeItem = null;
    this.contentEl = null;
    this.itemRegionEl = null;
    this.payloadRegionEl = null;
    this.payloadEl = null;
    this.focusContainer = null;
    this.options = null;
    this.previousActiveElement = null;
    this.liveState = null;
    this.payloadRevealTimer = null;
    this.cloneHiddenTargetState = null;
    this.imagePolicyState = null;
    this.imageCache = new Set();
    this.boundDeclarativeTargets = new WeakSet();

    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  get isOpen() {
    return Boolean(this.activeTarget);
  }

  isTargetActive(target) {
    return this.activeTarget === target;
  }

  bind(root = document) {
    root.querySelectorAll("[data-focusable], [zoomable]").forEach((target) => {
      if (this.boundDeclarativeTargets.has(target)) {
        return;
      }
      this.boundDeclarativeTargets.add(target);
      this.prepareDeclarativeTarget(target);
      target.addEventListener("click", (event) => {
        if (this.shouldIgnoreDeclarativeEvent(event, target)) {
          return;
        }
        const shouldRestoreFocus = !target.hasAttribute("zoomable");
        if (!shouldRestoreFocus && target instanceof HTMLElement) {
          target.blur();
        }
        this.toggle(target, {
          restoreFocus: shouldRestoreFocus,
        });
      });
      target.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        if (this.shouldIgnoreDeclarativeEvent(event, target)) {
          return;
        }
        event.preventDefault();
        this.toggle(target);
      });
    });
  }

  prepareDeclarativeTarget(target) {
    if (!target.hasAttribute("zoomable")) {
      return;
    }
    if (target instanceof HTMLElement && !target.hasAttribute("tabindex")) {
      target.tabIndex = 0;
    }
    if (!target.hasAttribute("role")) {
      target.setAttribute("role", "button");
    }
  }

  shouldIgnoreDeclarativeEvent(event, target) {
    if (!(event.target instanceof Element)) {
      return false;
    }
    const interactiveTarget = event.target.closest(
      "a, button, input, select, textarea, summary, [contenteditable], [data-focus-ignore]",
    );
    return Boolean(interactiveTarget && interactiveTarget !== target);
  }

  toggle(target, options = {}) {
    if (this.isTargetActive(target)) {
      this.close();
      return;
    }
    this.open(target, options);
  }

  async open(target, options = {}) {
    if (!(target instanceof Element)) {
      return;
    }

    if (this.isOpen) {
      this.close(true);
    }

    this.options = this.resolveOptions(target, options);
    this.activeTarget = target;
    this.previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    this.createLayer();
    this.markFocusState();
    await this.applyImagePolicy(target, this.options.imagePolicy);

    if (this.options.payload) {
      this.renderPayload(this.options.payload);
    }
    this.syncLayoutRegionVars();

    if (this.options.mode === "live") {
      this.openLiveTarget();
    } else {
      this.openCloneTarget();
    }

    requestAnimationFrame(() => {
      if (this.activeLayer) {
        this.activeLayer.classList.add("is-open");
      }
    });

    if (this.payloadRevealTimer) {
      clearTimeout(this.payloadRevealTimer);
    }
    this.payloadRevealTimer = window.setTimeout(() => {
      if (this.payloadEl && this.activeLayer) {
        this.payloadEl.classList.add("is-open");
      }
    }, this.options.durationMs);

    document.addEventListener("keydown", this.handleKeyDown);
    if (this.options.closeOnScroll) {
      window.addEventListener("scroll", this.handleScroll, { passive: true });
    }
  }

  close(force = false) {
    if (!this.activeTarget) {
      return;
    }

    const target = this.activeTarget;
    const options = this.options;
    const duration = options?.durationMs ?? 260;
    const isLive = options?.mode === "live";

    if (this.activeLayer) {
      this.activeLayer.classList.remove("is-open");
    }
    if (this.payloadEl) {
      this.payloadEl.classList.remove("is-open");
    }
    if (this.payloadRevealTimer) {
      clearTimeout(this.payloadRevealTimer);
      this.payloadRevealTimer = null;
    }

    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("scroll", this.handleScroll);

    if (!force) {
      if (isLive) {
        this.closeLiveTarget(duration);
      } else {
        this.closeCloneTarget(duration);
      }
    }

    const teardown = () => {
      if (this.activeItem) {
        this.activeItem.style.willChange = "";
      }
      if (this.activeLayer) {
        this.activeLayer.remove();
      }
      this.restoreHiddenTargetForClone();
      this.restoreImagePolicy();
      this.unmarkFocusState();

      if (typeof options?.onClose === "function") {
        options.onClose(target);
      }

      if (
        options?.restoreFocus &&
        this.previousActiveElement &&
        this.previousActiveElement.focus
      ) {
        this.previousActiveElement.focus();
      }

      this.activeTarget = null;
      this.activeLayer = null;
      this.activeItem = null;
      this.contentEl = null;
      this.itemRegionEl = null;
      this.payloadRegionEl = null;
      this.payloadEl = null;
      this.options = null;
      this.liveState = null;
      this.payloadRevealTimer = null;
      this.focusContainer = null;
      this.previousActiveElement = null;
    };

    if (force) {
      teardown();
    } else {
      setTimeout(teardown, duration + 30);
    }
  }

  resolveOptions(target, options) {
    const dataset = target.dataset || {};
    const isZoomable = target.hasAttribute("zoomable");
    const mode = options.mode || dataset.focusMode || "flip";
    const scope = options.scope || dataset.focusScope || "page";
    const payloadPlacement =
      options.payloadPlacement || dataset.focusPayloadPlacement || "right";

    return {
      mode,
      scope,
      inset: Number(options.inset ?? dataset.focusInset ?? 20),
      maxWidth: Number(
        options.maxWidth ?? dataset.focusMaxWidth ?? (isZoomable ? 960 : 320),
      ),
      maxHeight: Number(
        options.maxHeight ?? dataset.focusMaxHeight ?? (isZoomable ? 860 : 780),
      ),
      closeOnScroll: options.closeOnScroll ?? true,
      durationMs: Number(options.durationMs ?? dataset.focusDuration ?? 260),
      dimOpacity: Number(options.dimOpacity ?? dataset.focusDimOpacity ?? 0.6),
      blurAmount: Number(options.blurAmount ?? dataset.focusBlurAmount ?? 8),
      payload: options.payload || null,
      imagePolicy: options.imagePolicy || null,
      payloadPlacement,
      className: options.className || "",
      onClose: options.onClose || null,
      restoreFocus: options.restoreFocus ?? true,
    };
  }

  async prefetch(target, imagePolicy = null) {
    const resolved = this.resolveImagePolicy(target, imagePolicy);
    if (!resolved?.focusUrl) {
      return;
    }
    await this.preloadImage(resolved.focusUrl);
  }

  async preloadImage(url) {
    if (!url || this.imageCache.has(url)) {
      return;
    }
    await new Promise((resolve) => {
      const image = new Image();
      image.src = url;
      image.onload = resolve;
      image.onerror = resolve;
    });
    this.imageCache.add(url);
  }

  resolveImagePolicy(target, imagePolicy) {
    if (!imagePolicy || typeof imagePolicy !== "object") {
      return null;
    }
    const getValue = (value) => {
      if (typeof value === "function") {
        return value(target);
      }
      return value || "";
    };
    const thumbUrl = getValue(imagePolicy.thumb || imagePolicy.getThumbUrl);
    const focusUrl =
      getValue(imagePolicy.focus || imagePolicy.getFocusUrl) || thumbUrl;
    if (!focusUrl && !thumbUrl) {
      return null;
    }
    return {
      thumbUrl,
      focusUrl,
      apply: imagePolicy.apply || null,
      prefetchOnOpen: imagePolicy.prefetchOnOpen ?? true,
    };
  }

  applyImageToTarget(target, imageUrl, resolver) {
    if (!target || !imageUrl) {
      return;
    }
    if (typeof resolver === "function") {
      resolver(target, imageUrl);
      return;
    }
    if (target.tagName === "IMG") {
      target.src = imageUrl;
      return;
    }
    target.style.backgroundImage = `url(${imageUrl})`;
  }

  async applyImagePolicy(target, imagePolicy) {
    const resolved = this.resolveImagePolicy(target, imagePolicy);
    if (!resolved) {
      this.imagePolicyState = null;
      return;
    }
    const { thumbUrl, focusUrl, apply, prefetchOnOpen } = resolved;
    if (prefetchOnOpen && focusUrl) {
      await this.preloadImage(focusUrl);
    }
    this.applyImageToTarget(target, focusUrl || thumbUrl, apply);
    this.imagePolicyState = {
      target,
      thumbUrl,
      apply,
    };
  }

  restoreImagePolicy() {
    if (!this.imagePolicyState) {
      return;
    }
    const { target, thumbUrl, apply } = this.imagePolicyState;
    if (target && thumbUrl) {
      this.applyImageToTarget(target, thumbUrl, apply);
    }
    this.imagePolicyState = null;
  }

  createLayer() {
    this.activeLayer = document.createElement("div");
    this.activeLayer.className = "focus-layer";
    this.activeLayer.style.setProperty(
      "--focus-layer-duration",
      `${this.options.durationMs}ms`,
    );
    this.activeLayer.style.setProperty(
      "--focus-layer-dim",
      this.options.dimOpacity,
    );
    this.activeLayer.style.setProperty(
      "--focus-layer-blur",
      `${this.options.blurAmount}px`,
    );
    this.activeLayer.style.setProperty(
      "--focus-layer-inset",
      `${this.options.inset}px`,
    );
    this.activeLayer.style.setProperty(
      "--focus-item-region-max-width",
      `${this.options.maxWidth}px`,
    );
    this.activeLayer.style.setProperty(
      "--focus-payload-region-max-width",
      "320px",
    );

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "focus-layer__backdrop";
    backdrop.setAttribute("aria-label", "Close focused view");
    backdrop.addEventListener("click", this.handleBackdropClick);

    this.activeItem = document.createElement("div");
    this.activeItem.className = "focus-layer__item";
    if (this.options.className) {
      this.activeItem.classList.add(
        ...this.options.className.split(/\s+/).filter(Boolean),
      );
    }

    this.contentEl = document.createElement("div");
    this.contentEl.className = "focus-layer__content";
    this.contentEl.setAttribute(
      "data-has-payload",
      String(Boolean(this.options.payload)),
    );

    this.itemRegionEl = document.createElement("div");
    this.itemRegionEl.className = "focus-layer__item-region";

    this.payloadRegionEl = document.createElement("div");
    this.payloadRegionEl.className = "focus-layer__payload-region";

    this.contentEl.append(this.itemRegionEl, this.payloadRegionEl);
    this.activeLayer.append(backdrop, this.contentEl, this.activeItem);
    document.body.appendChild(this.activeLayer);
  }

  markFocusState() {
    document.documentElement.classList.add("ui-focused");
    this.focusContainer = this.activeTarget.closest("[data-focus-container]");
    if (this.focusContainer) {
      this.focusContainer.setAttribute("data-ui-focused", "true");
      this.focusContainer.setAttribute("data-focus-scope", this.options.scope);
    }
    this.activeTarget.setAttribute("data-focus-selected", "true");
  }

  unmarkFocusState() {
    document.documentElement.classList.remove("ui-focused");
    if (this.focusContainer) {
      this.focusContainer.removeAttribute("data-ui-focused");
      this.focusContainer.removeAttribute("data-focus-scope");
    }
    if (this.activeTarget) {
      this.activeTarget.removeAttribute("data-focus-selected");
    }
  }

  renderPayload(payload) {
    const data = this.normalizePayload(payload);
    if (!data) {
      return;
    }

    this.payloadEl = document.createElement("aside");
    this.payloadEl.className = "focus-layer__payload";
    this.payloadEl.setAttribute(
      "data-placement",
      this.options.payloadPlacement,
    );

    if (data.image) {
      const image = document.createElement("img");
      image.className = "focus-layer__payload-image";
      image.src = data.image;
      image.alt = data.imageAlt || data.title || "";
      this.payloadEl.appendChild(image);
    }

    const content = document.createElement("div");
    content.className = "focus-layer__payload-content";

    if (data.title) {
      const title = document.createElement("h3");
      title.textContent = data.title;
      content.appendChild(title);
    }

    if (data.meta) {
      const meta = document.createElement("p");
      meta.className = "focus-layer__payload-meta";
      meta.textContent = data.meta;
      content.appendChild(meta);
    }

    if (data.overview) {
      const overview = document.createElement("p");
      overview.className = "focus-layer__payload-overview";
      overview.textContent = data.overview;
      content.appendChild(overview);
    }

    if (Array.isArray(data.actions) && data.actions.length > 0) {
      const actions = document.createElement("div");
      actions.className = "focus-layer__payload-actions";
      data.actions.forEach((action) => {
        if (!action?.label) {
          return;
        }
        const actionButton = document.createElement("fig-button");
        actionButton.className = "focus-layer__action";
        actionButton.setAttribute("type", action.href ? "link" : "button");
        actionButton.setAttribute("variant", action.variant || "secondary");
        actionButton.textContent = action.label;

        if (action.href) {
          actionButton.setAttribute("href", action.href);
          actionButton.setAttribute("target", action.target || "_self");
          if ((action.target || "_self") === "_blank") {
            actionButton.setAttribute("rel", "noopener noreferrer");
          }
          actions.appendChild(actionButton);
        } else {
          actionButton.addEventListener("click", () => {
            if (typeof action.onClick === "function") {
              action.onClick(this.activeTarget);
            }
          });
          actions.appendChild(actionButton);
        }
      });
      content.appendChild(actions);
    }

    this.payloadEl.appendChild(content);
    if (this.payloadRegionEl) {
      this.payloadRegionEl.appendChild(this.payloadEl);
    }
  }

  normalizePayload(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return {
      title: payload.title || "",
      meta: payload.meta || "",
      overview: payload.overview || "",
      image: payload.image || "",
      imageAlt: payload.imageAlt || "",
      actions: payload.actions || [],
    };
  }

  setActiveItemRect(rect) {
    if (!this.activeItem || !rect) {
      return;
    }
    this.activeItem.style.left = `${rect.left}px`;
    this.activeItem.style.top = `${rect.top}px`;
    this.activeItem.style.setProperty("--focus-item-width", `${rect.width}`);
    this.activeItem.style.setProperty("--focus-item-height", `${rect.height}`);
  }

  syncLayoutRegionVars() {
    if (this.payloadRegionEl && this.options.payloadPlacement === "right") {
      const payloadRect = this.payloadRegionEl.getBoundingClientRect();
      if (payloadRect.width > 0) {
        this.activeLayer.style.setProperty(
          "--focus-payload-width",
          `${payloadRect.width}`,
        );
      }
    }
  }

  syncCloneSizeVars(clone, fallbackRect = null) {
    if (!clone || !this.activeTarget) {
      return;
    }
    const styles = getComputedStyle(this.activeTarget);
    const sourceDisplay = styles.display;
    const sourceWidth = styles.getPropertyValue("--width").trim();
    const sourceHeight = styles.getPropertyValue("--height").trim();

    if (sourceDisplay && sourceDisplay !== "none" && sourceDisplay !== "contents") {
      clone.style.setProperty("--focus-clone-display", sourceDisplay);
    }

    if (sourceWidth) {
      clone.style.setProperty("--width", sourceWidth);
    } else if (fallbackRect?.width) {
      clone.style.setProperty("--width", `${fallbackRect.width}`);
    }

    if (sourceHeight) {
      clone.style.setProperty("--height", sourceHeight);
    } else if (fallbackRect?.height) {
      clone.style.setProperty("--height", `${fallbackRect.height}`);
    }
  }

  openCloneTarget() {
    const sourceRect = this.activeTarget.getBoundingClientRect();
    const destinationRect = this.getDestinationRect(
      sourceRect,
      Boolean(this.payloadEl),
      this.options.payloadPlacement,
    );

    const clone = this.activeTarget.cloneNode(true);
    clone.classList.add("focus-layer__clone");
    this.syncCloneSizeVars(clone, sourceRect);
    this.activeItem.appendChild(clone);
    this.syncClonedMedia(clone);
    this.hideActiveTargetForClone();
    this.syncLayoutRegionVars();
    this.setActiveItemRect(destinationRect);

    const deltaX = sourceRect.left - destinationRect.left;
    const deltaY = sourceRect.top - destinationRect.top;
    const scaleX = sourceRect.width / destinationRect.width;
    const scaleY = sourceRect.height / destinationRect.height;

    this.activeItem.style.willChange = "transform";
    this.activeItem.style.transformOrigin = "top left";
    this.activeItem.style.transition = "none";
    this.activeItem.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
    this.activeItem.getBoundingClientRect();
    this.activeItem.style.transition = "";

    requestAnimationFrame(() => {
      if (!this.activeItem) {
        return;
      }
      this.activeItem.classList.add("is-open");
      this.activeItem.style.transform = "translate(0px, 0px) scale(1, 1)";
    });
  }

  syncClonedMedia(clone) {
    if (!clone || !this.activeTarget) {
      return;
    }
    const sourceMedia = [
      ...(this.activeTarget.matches("img, video") ? [this.activeTarget] : []),
      ...this.activeTarget.querySelectorAll("img, video"),
    ];
    const clonedMedia = [
      ...(clone.matches("img, video") ? [clone] : []),
      ...clone.querySelectorAll("img, video"),
    ];

    clonedMedia.forEach((media, index) => {
      const source = sourceMedia[index] || sourceMedia[0];
      if (!source) {
        return;
      }
      if (media instanceof HTMLImageElement && source instanceof HTMLImageElement) {
        media.src = source.currentSrc || source.src;
        return;
      }
      if (!(media instanceof HTMLVideoElement) || !(source instanceof HTMLVideoElement)) {
        return;
      }
      media.muted = source.muted || media.muted;
      media.playsInline = true;
      if (source.currentSrc && !media.currentSrc) {
        media.src = source.currentSrc;
      }
      try {
        if (Number.isFinite(source.currentTime)) {
          media.currentTime = source.currentTime;
        }
      } catch {}
      if (!source.paused || media.autoplay) {
        media.play().catch(() => {});
      }
    });
  }

  closeCloneTarget() {
    if (!this.activeItem || !this.activeTarget) {
      return;
    }
    const sourceRect = this.activeTarget.getBoundingClientRect();
    const destinationRect = this.activeItem.getBoundingClientRect();
    const deltaX = sourceRect.left - destinationRect.left;
    const deltaY = sourceRect.top - destinationRect.top;
    const scaleX = sourceRect.width / destinationRect.width;
    const scaleY = sourceRect.height / destinationRect.height;

    this.activeItem.classList.remove("is-open");
    this.activeItem.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
  }

  hideActiveTargetForClone() {
    if (!this.activeTarget || this.cloneHiddenTargetState) {
      return;
    }
    this.cloneHiddenTargetState = {
      visibility: this.activeTarget.style.visibility || "",
      pointerEvents: this.activeTarget.style.pointerEvents || "",
    };
    this.activeTarget.style.visibility = "hidden";
    this.activeTarget.style.pointerEvents = "none";
  }

  restoreHiddenTargetForClone() {
    if (!this.activeTarget || !this.cloneHiddenTargetState) {
      return;
    }
    this.activeTarget.style.visibility = this.cloneHiddenTargetState.visibility;
    this.activeTarget.style.pointerEvents =
      this.cloneHiddenTargetState.pointerEvents;
    this.cloneHiddenTargetState = null;
  }

  openLiveTarget() {
    const sourceRect = this.activeTarget.getBoundingClientRect();
    const destinationRect = this.getDestinationRect(
      sourceRect,
      Boolean(this.payloadEl),
      this.options.payloadPlacement,
    );

    const deltaX = destinationRect.left - sourceRect.left;
    const deltaY = destinationRect.top - sourceRect.top;
    const scaleX = destinationRect.width / sourceRect.width;
    const scaleY = destinationRect.height / sourceRect.height;

    this.liveState = {
      transition: this.activeTarget.style.transition || "",
      transform: this.activeTarget.style.transform || "",
      transformOrigin: this.activeTarget.style.transformOrigin || "",
      position: this.activeTarget.style.position || "",
      zIndex: this.activeTarget.style.zIndex || "",
      willChange: this.activeTarget.style.willChange || "",
      pointerEvents: this.activeTarget.style.pointerEvents || "",
    };

    this.activeTarget.style.willChange = "transform";
    this.activeTarget.style.position = "relative";
    this.activeTarget.style.zIndex = "4000";
    this.activeTarget.style.transformOrigin = "top left";
    this.activeTarget.style.transition = `transform ${this.options.durationMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;

    requestAnimationFrame(() => {
      if (!this.activeTarget) {
        return;
      }
      this.activeTarget.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
    });
  }

  closeLiveTarget() {
    if (!this.activeTarget || !this.liveState) {
      return;
    }
    const target = this.activeTarget;
    target.style.transform = this.liveState.transform;

    setTimeout(() => {
      if (!target || !this.liveState) {
        return;
      }
      target.style.transition = this.liveState.transition;
      target.style.transformOrigin = this.liveState.transformOrigin;
      target.style.position = this.liveState.position;
      target.style.zIndex = this.liveState.zIndex;
      target.style.willChange = this.liveState.willChange;
      target.style.pointerEvents = this.liveState.pointerEvents;
    }, this.options.durationMs + 10);
  }

  getDestinationRect(sourceRect, hasPayload, payloadPlacement) {
    if (this.itemRegionEl) {
      const regionRect = this.itemRegionEl.getBoundingClientRect();
      if (regionRect.width > 0 && regionRect.height > 0) {
        const availableHeight = window.innerHeight - this.options.inset * 2;
        const aspectRatio = sourceRect.width / sourceRect.height || 1;
        const width = Math.min(regionRect.width, this.options.maxWidth);
        let height = width / aspectRatio;
        if (height > availableHeight) {
          height = Math.min(availableHeight, this.options.maxHeight);
        }
        const fitWidth = height * aspectRatio;
        const left = regionRect.left + (regionRect.width - fitWidth) / 2;
        const top = regionRect.top + (regionRect.height - height) / 2;
        return {
          left,
          top,
          width: fitWidth,
          height,
        };
      }
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = viewportWidth / 3;
    const height = Math.min(
      this.options.maxHeight,
      viewportHeight - this.options.inset * 2,
    );
    return {
      left: (viewportWidth - width) / 2,
      top: (viewportHeight - height) / 2,
      width,
      height,
    };
  }

  handleBackdropClick() {
    this.close();
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      this.close();
    }
  }

  handleScroll() {
    this.close();
  }
}

var Utils = (function () {
  var privateVar = "";

  function privateMethod() {
    // ...
  }

  return {
    // public interface
    hoverFx(object, move = () => {}, leave = () => {}) {
      var frameId = null;

      const frameListener = (e) => {
        animationFrameID = requestAnimationFrame(frameListener);
      };

      let active = false;

      const mouseMove = (e) => {
        active = true;
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          var data = {
            rect: object.getBoundingClientRect(),
            mouseX: e.clientX,
            mouseY: e.clientY,
          };
          data.xPercent =
            (Math.abs(data.rect.x - data.mouseX) / data.rect.width) * 100;
          data.yPercent =
            (Math.abs(data.rect.y - data.mouseY) / data.rect.height) * 100;
          if (active) {
            move(object, data, e);
          }
        });
      };
      const mouseLeave = (e) => {
        active = false;
        leave(object);
      };

      const touchMove = (e) => {
        if (e.touches.length === 0) return;

        active = true;
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          const touch = e.touches[0];
          var data = {
            rect: object.getBoundingClientRect(),
            mouseX: touch.clientX,
            mouseY: touch.clientY,
          };
          data.xPercent =
            (Math.abs(data.rect.x - data.mouseX) / data.rect.width) * 100;
          data.yPercent =
            (Math.abs(data.rect.y - data.mouseY) / data.rect.height) * 100;
          if (active) {
            move(object, data, e);
          }
        });
      };

      const touchEnd = (e) => {
        active = false;
        leave(object);
      };

      object.addEventListener("mousemove", mouseMove);
      object.addEventListener("mouseleave", mouseLeave);
      object.addEventListener("touchmove", touchMove);
      object.addEventListener("touchend", touchEnd);
      object.addEventListener("touchcancel", touchEnd);
    },
  };
})();

// export Utils and Cache
export { Utils, Cache, AudioPlayer, TMDB, FocusLayer };

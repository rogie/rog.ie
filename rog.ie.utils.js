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
    this.audio.play();

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

  async play(url = null) {
    if (url && url !== this.currentUrl) {
      // If there's a current track playing, fade it out first
      if (this.audio && this.isPlaying) {
        await this.fadeOut();
      }

      this.currentUrl = url;
      if (this.audio) {
        this.audio.pause();
      }
      this.audio = new Audio(url);
      this.audio.playbackRate = this.playbackRate;
      this.audio.volume = 0;

      // Set up ended event listener
      if (this.onEnded) {
        this.audio.addEventListener("ended", this.onEnded);
      }

      if (this.onTimeUpdate) {
        this.audio.addEventListener("timeupdate", this.onTimeUpdate);
      }

      // Set up pause event listener
      if (this.onPause) {
        this.audio.addEventListener("pause", this.onPause);
      }

      await this.fadeIn();
    } else if (this.audio) {
      if (!this.isPlaying) {
        await this.fadeIn();
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
    this.baseImageUrl = "https://image.tmdb.org/t/p/w500";
  }

  async getMovie(id) {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${this.apiKey}`
    );
    return response.json();
  }
  async search(query) {
    let querySlug = this.#slugify(query);
    if (this.#CACHE.get(querySlug)) {
      return this.#CACHE.get(querySlug);
    } else {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?language=en-US&api_key=${this.apiKey}&query=${query}`
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
      object.addEventListener("mousemove", mouseMove);
      object.addEventListener("mouseleave", mouseLeave);
    },
  };
})();

// export Utils and Cache
export { Utils, Cache, AudioPlayer, TMDB };

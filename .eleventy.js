import { readdirSync } from "node:fs";
import path from "node:path";

const thoughtMediaExtensions = new Set([
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".m4a",
  ".mp3",
  ".mp4",
  ".mov",
  ".png",
  ".svg",
  ".webm",
  ".webp",
]);

const addThoughtMediaPassthrough = (eleventyConfig) => {
  const sourceRoot = "src/thoughts";

  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const sourcePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(sourcePath);
        continue;
      }

      if (!thoughtMediaExtensions.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }

      const outputPath = path
        .join("thoughts", path.relative(sourceRoot, sourcePath))
        .replaceAll(path.sep, "/");

      eleventyConfig.addPassthroughCopy({
        [sourcePath]: outputPath,
      });
    }
  };

  walk(sourceRoot);
};

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("rog.ie.css");
  eleventyConfig.addPassthroughCopy("rog.ie.web-components.js");
  eleventyConfig.addPassthroughCopy("rog.ie.utils.js");
  eleventyConfig.addPassthroughCopy("paper-background.js");
  eleventyConfig.addPassthroughCopy("media-shader.js");

  // Keep generated or not-yet-migrated pages available in the built site.
  eleventyConfig.addPassthroughCopy({
    "noise-texture/title.svg": "noise-texture/title.svg",
  });
  eleventyConfig.addPassthroughCopy("transforms");
  eleventyConfig.addPassthroughCopy("figui3");
  eleventyConfig.addPassthroughCopy("propskit");
  eleventyConfig.addPassthroughCopy("propkit");

  eleventyConfig.addPassthroughCopy({
    "thoughts/recordings": "thoughts/recordings",
    "thoughts/update-manifest.mjs": "thoughts/update-manifest.mjs",
  });
  addThoughtMediaPassthrough(eleventyConfig);

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["html", "njk", "md"],
  };
}

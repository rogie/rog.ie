const mediaExtensions = [
  "avif",
  "gif",
  "jpg",
  "jpeg",
  "m4a",
  "mp3",
  "mp4",
  "mov",
  "pdf",
  "png",
  "svg",
  "wav",
  "webm",
  "webp",
];
const mediaGlob = `**/*.{${mediaExtensions.join(",")}}`;

export default function (eleventyConfig) {
  // Glob rules keep colocated media live: newly added files are available
  // immediately in serve mode and preserve their path in production builds.
  eleventyConfig.addPassthroughCopy(`src/${mediaGlob}`);
  eleventyConfig.addWatchTarget("src/**/*");

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("rog.ie.css");
  eleventyConfig.addPassthroughCopy("rog.ie.web-components.js");
  eleventyConfig.addPassthroughCopy("rog.ie.utils.js");
  eleventyConfig.addPassthroughCopy("paper-background.js");
  eleventyConfig.addPassthroughCopy("media-shader.js");

  // Page HTML lives in src/; colocated media still lives in these root dirs.
  for (const pageDir of [
    "noise-and-texture",
    "dither",
    "scrambler",
    "liquor-cabinet",
  ]) {
    eleventyConfig.addPassthroughCopy(`${pageDir}/${mediaGlob}`);
    eleventyConfig.addWatchTarget(`${pageDir}/**/*`);
  }

  eleventyConfig.addPassthroughCopy("transforms");
  eleventyConfig.addPassthroughCopy("figui3");
  eleventyConfig.addPassthroughCopy("propskit");
  eleventyConfig.addPassthroughCopy("propkit");

  eleventyConfig.addPassthroughCopy({
    "thoughts/recordings": "notes/recordings",
    "thoughts/update-manifest.mjs": "notes/update-manifest.mjs",
  });

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

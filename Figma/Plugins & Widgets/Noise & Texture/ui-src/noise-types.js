const NULL_IMAGE = 'data:image/png;base64'

// Images
import randomPng from "./images/random.png";
import perlinPng from "./images/perlin.png";
import perlinContourPng from "./images/perlinContour.png";
import perlinWarpPng from "./images/perlinWarp.png";
import voronoiPng from "./images/voronoi.png";
import voronoiFlatPng from "./images/voronoiFlat.png";
import cellularPng from "./images/cellular.png";
import metaballsPng from "./images/metaballs.png";
import randomLinesPng from "./images/randomLines.png";
import valuePng from "./images/value.png";
import valueGridPng from "./images/valueGrid.png";
import valueMultiPng from "./images/valueMulti.png";
import wavePng from "./images/wave.png";
import stairsPng from "./images/stairs.png";

const noiseTypes = [
    {
        value: "random", thumbnail: randomPng, label: "Random", options: {
            size: 1 / 2048,
            amount: 0.25,
            rotation: 0,
            vignette: 0,
            multicolor: false,
            randomRotation: false,
            randomOpacity: true,
            image: NULL_IMAGE,
            shape: "square"
        }
    },
    {
        value: "perlin", thumbnail: perlinPng, label: "Perlin", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            gain: 0.4,
            lacunarity: 1,
            factor: 1,
        }
    },
    {
        value: "perlinContour", thumbnail: perlinContourPng, label: "Perlin (Contour)", options: {
            size: 0.75,
            octaves: 1,
            phase: 0,
            gain: 0.4,
            lacunarity: 1,
            factor: 1,
            width: 0.1,
        }
    },
    {
        value: "perlinWarp", thumbnail: perlinWarpPng, label: "Perlin (Warp)", options: {
            size: 0.25,
            phase: 0,
            factor: 0,
            strength: -0.6,
        }
    },
    {
        value: "voronoi", thumbnail: voronoiPng, label: "Voronoi", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            gain: 1.2,
            lacunarity: 1,
            jitter: 1,
            factor: 0
        }
    },
    {
        value: "voronoiFlat", thumbnail: voronoiFlatPng, label: "Voronoi (Flat)", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            gain: 1.2,
            lacunarity: 1,
            jitter: 1,
            factor: 0
        }
    },
    {
        value: "cellular", thumbnail: cellularPng, label: "Cellular", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            gain: 1.2,
            lacunarity: 1,
            jitter: 1,
        }
    },
    {
        value: "metaBalls", thumbnail: metaballsPng, label: "Metaballs", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            gain: 1.2,
            lacunarity: 1,
            jitter: 1,
            width: 0.1,
        }
    },
    {
        value: "wave", thumbnail: wavePng, label: "Waves", options: {
            size: 0.25,
            smoothness: 0,
            gain: 0.75,
            interpolate: 0,
            width: 0.25,
        }
    },
    {
        value: "stairs", thumbnail: stairsPng, label: "Stairs", options: {
            size: 0.25,
            smoothness: 0,
            distance: 0,
            width: 0.25,
        }
    },
    {
        value: "randomLines", thumbnail: randomLinesPng, label: "Random lines", options: {
            size: 0.25,
            phase: 0,
            smoothness: 0.1,
            width: 0.1,
            jitter: 1,
            count: 1,
        }
    },
    {
        value: "value", thumbnail: valuePng, label: "Value", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            gain: 1.2,
            lacunarity: 1,
            factor: 0,
        }
    },
    {
        value: "valueGrid", thumbnail: valueGridPng, label: "Value (Grid)", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            gain: 1.2,
            lacunarity: 1,
        }
    },
    {
        value: "valueMulti", thumbnail: valueMultiPng, label: "Value (Multi)", options: {
            size: 0.25,
            octaves: 1,
            phase: 0,
            lacunarity: 1,
        }
    },
    /*{ value: "untile", thumbnail: valueMultiPng, label: "Tiled Texture", options: ["octaves", "phase", "lacunarity"] },
    { value: "wave", thumbnail: valueMultiPng, label: "Wave", options: ["octaves", "phase"] },
    { value: "fbmImage", thumbnail: valueMultiPng, label: "FBM Image", options: ["octaves", "phase", "gain", "lacunarity", "factor"] },*/
]

export default noiseTypes;
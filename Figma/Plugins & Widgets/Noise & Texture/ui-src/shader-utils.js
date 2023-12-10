import * as three from 'three'

const NULL_IMAGE = 'data:image/png;base64'

function getUniforms(fragmentShader) {
    var uniforms = [];
    var uniformRegex = /uniform\s(\w+)\s(.*);(.*)?(\/\/.*)?/gm;
    var match;

    while (match = uniformRegex.exec(fragmentShader)) {
        let nameParts = match[2].split('[')
        let name = nameParts[0]
        let arrayLength = nameParts.length > 1 ? parseInt(nameParts[1]) : null
        uniforms.push({
            type: match[1],
            name: name,
            length: arrayLength,
            meta: getUniformMetaFromString(match[3] || '')
        });
    }
    return uniforms;
}

function getUniformMetaFromString(str) {
    let meta = {}
    if (str && str.trim()) {
        let metaStr = str.trim().replace('//', '')
        let parts = metaStr.split(",")
        if (parts.length > 0) {
            parts.forEach(part => {
                let kvPair = part.split(":")
                if (kvPair.length == 2) {
                    let val = kvPair[1].trim()
                    val = !isNaN(val) ? Number(val) : val
                    val = val === "true" ? true : (val === "false" ? false : val)
                    meta[kvPair[0].trim()] = val
                }
            })
        }
    }
    return meta
}

function getMeta(fragmentShader) {
    const regex = /\/\/(description|prompt|geometry|orbitcontrols|mesh-position|mesh-scale|shader-wireframe|shader-wireframe-linewidth|geometry-args|camera-position|camera-fov|camera-near|camera-far|mesh-rotation|antialias):(.+?)\n/gi;
    const meta = {};
    let match;

    while ((match = regex.exec(fragmentShader)) !== null) {
        let name = match[1].toLowerCase()
        let value = match[2]
        try {
            meta[name] = JSON.parse(value);
        } catch (error) {
            meta[name] = value.trim()
        }
    }

    return meta;
}


function getUniform(fragmentShader, name) {
    let uniforms = getUniforms(fragmentShader, {})
    return uniforms.find(u => u.name === name)
}



function isNullImage(url) {
    return url === NULL_IMAGE
}

function isBase64Image(url) {
    return (typeof url === "string" && url.startsWith(NULL_IMAGE) && !isNullImage(url))
}

let getImageData = async (img) => {
    return new Promise((resolve, reject) => {
        // Create an empty canvas element
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        // Copy the image contents to the canvas
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        resolve(imageData);
    })
}

let base64UrlToImageData = async (b64Url) => {
    return new Promise(async (resolve, reject) => {
        let img = await base64UrlToImage(b64Url)
        let imageData = await getImageData(img)
        resolve(imageData)
    })
}

let base64UrlToImage = async (b64Url) => {
    return new Promise((resolve, reject) => {
        let img = new Image()
        img.onload = async () => {
            resolve(img)
        }
        img.src = b64Url
    })
}

let hexToRgb = (hex) => {
    const round = (number, digits = 0, base = Math.pow(10, digits)) => {
        return Math.round(base * number) / base;
    };

    if (hex[0] === "#") hex = hex.substring(1);

    if (hex.length < 6) {
        return {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16),
            a: hex.length === 4 ? round(parseInt(hex[3] + hex[3], 16) / 255, 2) : 1,
        };
    }

    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: hex.length === 8 ? round(parseInt(hex.substring(6, 8), 16) / 255, 2) : 1,
    };
}

let nearestPowerOf2 = (n) => {
    return 1 << 31 - Math.clz32(n);
}

let normalToTileableSize = (sizeNormal, resolution = 1024) => {
    return Math.ceil(Math.max(sizeNormal * resolution / 16, 1));
}

async function defaultOptionsToUniforms(options, resolution = 1024, aaPasses = 2) {
    let rgb = hexToRgb(options.color || "#FF0000");
    let glUniforms = {}

    glUniforms = {
        u_color: [rgb.r / 255, rgb.g / 255, rgb.b / 255],
        u_size: normalToTileableSize(options.size, resolution),
        u_distribution: options.amount,
        u_randomize: options.randomOpacity,
        u_random_rotation: options.randomRotation,
        u_use_image: options.shape === "image",
        u_gain: options.gain,
        u_octaves: options.octaves,
        u_lacunarity: options.lacunarity,
        u_offset: options.offset,
        u_multiplier: options.multiplier,
        u_rotation: options.rotation / 360,
        u_multicolor: options.multicolor,
        u_phase: options.phase,
        u_count: options.count,
        u_interpolate: options.interpolate,
        u_smoothness: options.smoothness,
        u_distance: options.distance,
        u_width: options.width,
        u_jitter: options.jitter,
        u_factor: options.factor,
        u_strength: options.strength,
        u_aa_passes: aaPasses,
        u_random_seed: Math.random(),
        u_vignette: options.vignette
    }

    for (var u in glUniforms) {
        if (glUniforms[u] === undefined) {
            delete glUniforms[u]
        }
    }

    // load in the texture 
    if (options.image && !isNullImage(options.image)) {
        let image = await base64UrlToImage(options.image)
        glUniforms.u_image = options.image
        glUniforms.u_image_resolution = [image.width, image.height]
    } else if (options.image && isNullImage(options.image)) {
        glUniforms.u_image = null
        glUniforms.u_image_resolution = [0, 0]
    }

    return glUniforms;
}

async function customOptionsToUniforms(fragmentShader, options) {

    const shaderUniforms = getUniforms(fragmentShader)

    const uniforms = {}

    for (var name in options) {
        let val = options[name]
        if (val !== null && val !== undefined && val.constructor) {
            if (val.constructor.name === 'String') {
                let uniform = shaderUniforms.find(u => u.name === name);
                if (uniform?.type === 'vec3') {
                    let rgb = hexToRgb(val)
                    uniforms[name] = [rgb.r / 255, rgb.g / 255, rgb.b / 255]
                } else if (uniform?.type === 'vec4') {
                    let rgb = hexToRgb(val)
                    uniforms[name] = [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a]
                } else if ((/^#[0-9a-f]{2,6}$/i).test(val)) {
                    let rgb = hexToRgb(val)
                    uniforms[name] = [rgb.r / 255, rgb.g / 255, rgb.b / 255]
                } else if ((/^#[0-9a-f]{2,8}$/i).test(val)) {
                    let rgb = hexToRgb(val)
                    uniforms[name] = [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a]
                } else if (val.startsWith(NULL_IMAGE) && !isNullImage(val)) {
                    let image = val //await base64UrlToImageData(val)
                    uniforms[name] = image
                } else if (isNullImage(val)) {
                    uniforms[name] = null
                }
            } else if (Array.isArray(val)) {
                let valArray = []
                val.forEach(v => {
                    let rgb = hexToRgb(v)
                    valArray.push([rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a])
                })
                uniforms[name] = valArray
            } else if (!isNaN(val)) {
                uniforms[name] = val
            }
        }
    }

    return uniforms
}

async function objectToThreeUniforms(o) {
    let threeUniforms = {}
    let texturePromises = []

    function valueToThreeValue(value) {
        if (Array.isArray(value)) {
            return value.map(v => {
                if (Array.isArray(v)) {
                    return v.length == 3 ? new three.Vector3(...v) : new three.Vector4(...v)
                } else {
                    return v
                }
            })
        } else {
            return value
        }
    }

    Object.keys(o).forEach((name) => {
        let value = o[name]
        if (isBase64Image(value)) {
            texturePromises.push(new Promise((resolve, reject) => {
                new three.TextureLoader().load(value, (texture) => {
                    let image = texture.source.data
                    threeUniforms[name] = { value: texture }
                    threeUniforms[`${name}_resolution`] = { value: [image.width, image.height] }
                    resolve()
                })
            }))
        } else if (isNullImage(value)) {
            threeUniforms[name] = null
        } else {
            let threeValue = valueToThreeValue(value)
            threeUniforms[name] = { value: threeValue }
        }
    })

    await Promise.all(texturePromises);
    return threeUniforms;
}

export { getUniform, getUniforms, getUniformMetaFromString, objectToThreeUniforms, defaultOptionsToUniforms, customOptionsToUniforms, isBase64Image, normalToTileableSize, isNullImage, getMeta };
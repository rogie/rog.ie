import { normalToTileableSize } from "./shader-utils";
import WebMWriter from 'webm-writer'
import compressImage from 'browser-image-compression'

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

async function resizeImageFromSrc(src, width, mimeType = 'image/png', quality = 1, compress = true) {
    return new Promise((resolve, reject) => {
        let image = new Image()
        image.crossOrigin = true
        image.src = src
        image.onload = async function () {
            resolve(await resizeImage(image, width, mimeType, quality, compress))
        }
    })
}

async function resizeImage(img, width = 64, mimeType = 'image/png', quality = 1, compress = true) {
    /*var canvas = document.createElement('canvas'),
        ctx = canvas.getContext("2d"),
        oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

    canvas.width = width; // destination canvas size
    canvas.height = canvas.width * img.height / img.width;

    var cur = {
        width: Math.floor(img.width * 0.5),
        height: Math.floor(img.height * 0.5)
    }

    oc.width = cur.width;
    oc.height = cur.height;

    octx.drawImage(img, 0, 0, cur.width, cur.height);

    while (cur.width * 0.5 > width) {
        cur = {
            width: Math.floor(cur.width * 0.5),
            height: Math.floor(cur.height * 0.5)
        };
        octx.drawImage(oc, 0, 0, cur.width * 2, cur.height * 2, 0, 0, cur.width, cur.height);
    }

    ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, canvas.width, canvas.height);*/

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = width;
    canvas.height = canvas.width * img.height / img.width;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

    let dataURL = canvas.toDataURL(mimeType)
    if (!isSafari() && compress) {
        const buffer = base64ToArrayBuffer(dataURL.replace(`data:${mimeType};base64,`, ""))
        const arrayBuffer = new Uint8Array(buffer)
        const fileBlob = new Blob([arrayBuffer], { type: mimeType })
        const compressed = await compressImage(fileBlob, {
            maxWidthOrHeight: width,
            maxIteration: 1,
            useWebWorker: true
        })
        dataURL = await compressImage.getDataUrlFromFile(compressed)
    }

    let resized = new Image()
    resized.src = dataURL

    return resized
}



function trim(c) {
    var ctx = c.getContext('2d', { willReadFrequently: true }),
        copy = document.createElement('canvas').getContext('2d', { willReadFrequently: true }),
        pixels = ctx.getImageData(0, 0, c.width, c.height),
        l = pixels.data.length,
        i,
        bound = {
            top: null,
            left: null,
            right: null,
            bottom: null
        },
        x, y;

    for (i = 0; i < l; i += 4) {
        if (pixels.data[i + 3] !== 0) {
            x = (i / 4) % c.width;
            y = ~~((i / 4) / c.width);

            if (bound.top === null) {
                bound.top = y;
            }

            if (bound.left === null) {
                bound.left = x;
            } else if (x < bound.left) {
                bound.left = x;
            }

            if (bound.right === null) {
                bound.right = x;
            } else if (bound.right < x) {
                bound.right = x;
            }

            if (bound.bottom === null) {
                bound.bottom = y;
            } else if (bound.bottom < y) {
                bound.bottom = y;
            }
        }
    }

    var trimHeight = bound.bottom - bound.top,
        trimWidth = bound.right - bound.left,
        trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    copy.putImageData(trimmed, 0, 0);

    // open new window with trimmed image:
    return copy.canvas;
}

async function exportThumbnail(canvas, type, options, size = 128, mimeType = 'image/png', quality = 1, compress = false) {
    return new Promise(async (resolve, reject) => {
        let dataURL = await exportTile(canvas, type, options, mimeType, quality, false)
        //const blob = new Blob([tileBuffer], { type: mimeType })
        //const compressed = await compressImage(blob, { maxWidthOrHeight: size, useWebWorker: true })
        const img = new Image()
        img.onload = () => {
            let resized = resizeImage(img, size, mimeType, quality, compress)
            resolve(resized)
        }
        img.src = dataURL
    })
}

function base64ToArrayBuffer(base64) {
    var binary_string = atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

async function exportTile(canvas, type, options, mimeType = 'image/png', quality = 1, arrayBuffer = true) {

    let size = canvas.width;

    let fragmentSize = normalToTileableSize(options.size, size)
    let tileSize = fragmentSize * Math.floor(size / fragmentSize)

    if (type !== "random") {
        tileSize = size
    }

    // readPixels
    //let gl = canvas.getContext('webgl')

    return new Promise(async (resolve, reject) => {
        // create new canvas
        let tileCanvas = document.createElement("canvas")
        let tileCtx = tileCanvas.getContext("2d", { willReadFrequently: true })
        tileCanvas.width = tileCanvas.height = tileSize

        // copy the glsl canvas into this canvas (from the bottom left, up)
        tileCtx?.drawImage(canvas, 0, size - tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize)

        // We have to use toDataURL vs toBlob in order to make this work in safari
        let dataURL = tileCanvas.toDataURL(mimeType, quality)

        if (arrayBuffer) {
            let buffer = base64ToArrayBuffer(dataURL.replace(`data:${mimeType};base64,`, ""))
            resolve(new Uint8Array(buffer))
        } else {
            resolve(dataURL)
        }
    })
}


async function exportVideo(canvas, duration = 5000, loop = false) {
    return new Promise((resolve, reject) => {
        const timeSlice = 1000
        const chunks = []; // here we will store our recorded media chunks (Blobs)
        const stream = canvas.captureStream(30); // grab our canvas MediaStream
        const options = {
            mimeType: 'video/webm;codecs=vp9,opus'
        };
        const rec = new MediaRecorder(stream, options); // init the recorder

        // every time the recorder has new data, we will store it in our array
        rec.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
                if (chunks.length - 1 > duration / timeSlice) {
                    if (rec.state !== "inactive") {
                        rec.stop()
                    } else {
                        resolve(new Blob(chunks, { type: 'video/webm' }))
                    }
                }
            }
        }

        // only when the recorder stops, we construct a complete Blob from all the chunks
        rec.onstop = e => {
            //resolve(new Blob(chunks, { type: 'video/webm' }));
        }

        rec.start(timeSlice);
        //setTimeout(() => rec.stop(), duration); // stop recording in 3s
    })
}

async function exportWebM(canvas, duration = 5000) {

    return new Promise(async (resolve, reject) => {

        var videoWriter = new WebMWriter({
            quality: 0.95,    // WebM image quality from 0.0 (worst) to 0.99999 (best), 1.00 (VP8L lossless) is not supported
            fileWriter: null, // FileWriter in order to stream to a file instead of buffering to memory (optional)
            fd: null,         // Node.js file handle to write to instead of buffering to memory (optional)

            // You must supply one of:
            frameRate: 60,     // Number of frames per second

            transparent: true,      // True if an alpha channel should be included in the video
            alphaQuality: undefined, // Allows you to set the quality level of the alpha channel separately.
            // If not specified this defaults to the same value as `quality`.
        });
        let timeElapsed = 0
        let interval = 100

        let intervalId = setInterval(async () => {
            timeElapsed += interval
            videoWriter.addFrame(canvas);
            if (timeElapsed > duration) {
                let webMBlob = await videoWriter.complete()
                clearInterval(intervalId)
                resolve(webMBlob)
            }
        }, interval)
    })
}

async function downloadPng(canvas, name = "texture") {
    let size = canvas.width;

    // create new canvas
    let tileCanvas = document.createElement("canvas")
    let tileCtx = tileCanvas.getContext("2d", { willReadFrequently: true })
    tileCanvas.width = tileCanvas.height = canvas.width;

    // copy the glsl canvas into this canvas (from the bottom left, up)
    tileCtx?.drawImage(canvas, 0, 0, size, size)

    tileCanvas.toBlob(async (blob) => {
        const blobURL = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('download', `${name}.png`)
        link.setAttribute('href', blobURL)
        link.click()
    })
}

function downloadVideo(blob, name = 'video') {
    const vid = document.createElement('video');
    vid.src = URL.createObjectURL(blob);
    vid.controls = true;

    const link = document.createElement('a');
    link.setAttribute('download', `${name}.webm`)
    link.setAttribute('href', vid.src)
    link.click()
}

export { exportTile, exportThumbnail, exportVideo, downloadVideo, downloadPng, exportWebM, trim, resizeImageFromSrc };
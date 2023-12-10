var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import FigmaScene from '../ui-src/figma-scene';
FigmaScene.setup();
// This file holds the main code for the plugin. It has access to the *document*.
// You can access browser APIs such as the network by creating a UI which contains
// a full browser environment (see documentation).
figma.root.setRelaunchData({ open: '' });
figma.showUI(__html__, {
    themeColors: true,
    width: 220,
    height: 520
});
let options = {
    shapeImageData: null
};
let PREVIOUS_SELECTION = [];
function getNoisePaint(node) {
    const existing = node.getPluginData("noise-paint");
    let paint;
    if (node.fills === undefined || node.strokes === undefined) {
        return paint;
    }
    for (const p of node.fills) {
        if (p.type === "IMAGE" && p.imageHash === existing) {
            paint = JSON.parse(JSON.stringify(p));
            break;
        }
    }
    for (const p of node.strokes) {
        if (p.type === "IMAGE" && p.imageHash === existing) {
            paint = JSON.parse(JSON.stringify(p));
            break;
        }
    }
    return paint;
}
function applyOptionsToNoisePaint(options, node = figma.currentPage.selection[0]) {
    const noisePaint = getNoisePaint(node);
    if (noisePaint) {
        const paint = {
            blendMode: options.blendMode,
            filters: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 },
            imageHash: noisePaint.imageHash,
            opacity: options.opacity || noisePaint.opacity,
            scaleMode: "TILE",
            scalingFactor: noisePaint.scalingFactor,
            type: "IMAGE"
        };
        const newFills = [];
        for (const p of node.fills) {
            if (p.type === "IMAGE" && p.imageHash === noisePaint.imageHash) {
            }
            else {
                newFills.push(JSON.parse(JSON.stringify(p)));
            }
        }
        newFills.push(paint);
        node.fills = newFills;
        if (options.stroke) {
            const newStrokes = [];
            for (const p of node.strokes) {
                if (p.type === "IMAGE" && p.imageHash === noisePaint.imageHash) {
                }
                else {
                    newStrokes.push(JSON.parse(JSON.stringify(p)));
                }
            }
            newStrokes.push(paint);
            if (node.strokes.length > 0) {
                node.strokes = newStrokes;
            }
        }
    }
}
function applyTile(tile, node, options) {
    const newFills = [];
    const newStrokes = [];
    const image = figma.createImage(tile);
    const existing = node.getPluginData("noise-paint");
    const noisePaint = getNoisePaint(node) || { scalingFactor: 0.5 };
    const paint = {
        blendMode: options.blendMode,
        filters: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 },
        imageHash: image.hash,
        opacity: options.opacity,
        scaleMode: "TILE",
        scalingFactor: noisePaint.scalingFactor,
        type: "IMAGE"
    };
    for (const p of node.fills) {
        if (p.type === "IMAGE" && p.imageHash === existing) {
        }
        else {
            newFills.push(JSON.parse(JSON.stringify(p)));
        }
    }
    for (const p of node.strokes) {
        if (p.type === "IMAGE" && p.imageHash === existing) {
        }
        else {
            newStrokes.push(JSON.parse(JSON.stringify(p)));
        }
    }
    newFills.push(paint);
    if (options.stroke) {
        newStrokes.push(paint);
    }
    node.setPluginData("noise-paint", image.hash);
    setNodeNoiseOptions(node, options);
    node.setRelaunchData({ edit: '' });
    node.fills = newFills;
    if (node.strokes.length > 0) {
        node.strokes = newStrokes;
    }
}
function setNodeNoiseOptions(node, options) {
    node.setPluginData("noise-options", JSON.stringify(options));
}
function getNodeNoiseOptions(node) {
    let options = node.getPluginData("noise-options");
    let noisePaint = getNoisePaint(node);
    if (options && noisePaint) {
        options = JSON.parse(options);
        if (noisePaint) {
            Object.assign(options, { scalingFactor: noisePaint.scalingFactor, opacity: noisePaint.opacity, blendMode: noisePaint.blendMode });
        }
    }
    else {
        options = null;
    }
    return options;
}
function makeSelectionIntoShapeImage() {
    return __awaiter(this, void 0, void 0, function* () {
        //get the pixels for this selection 
        let selection = figma.currentPage.selection;
        if (selection.length === 1) {
            let node = selection[0];
            // turn off the selection change listener
            figma.off("selectionchange", makeSelectionIntoShapeImage);
            // get the image data 
            let bytes = yield node.exportAsync({
                format: "PNG",
                constraint: { type: 'WIDTH', value: Math.min(128, Math.max(node.width, 64)) }
            });
            let imageBytes = Array.from(bytes);
            if (PREVIOUS_SELECTION && PREVIOUS_SELECTION.length > 0) {
                let options = PREVIOUS_SELECTION[0].getPluginData("noise-options");
                if (options) {
                    options = JSON.parse(options);
                    options.shapeImageData = imageBytes;
                    options.shape = "image";
                    PREVIOUS_SELECTION[0].setPluginData("noise-options", JSON.stringify(options));
                }
            }
            // send the image data 
            figma.ui.postMessage({
                action: "add-image",
                shapeImageData: imageBytes
            });
            figma.currentPage.selection = PREVIOUS_SELECTION;
            figma.on("selectionchange", editSelection);
        }
    });
}
function getFillableNodes(node) {
    let nodes = [];
    let fillableChildren = [];
    if (node.fills !== undefined) {
        nodes.push(node);
    }
    if (node.children) {
        node.children.forEach((child) => {
            fillableChildren.push(...getFillableNodes(child));
        });
    }
    return [...nodes, ...fillableChildren];
}
function getSelectedNodes() {
    let nodes = [];
    figma.currentPage.selection.forEach(node => {
        nodes.push({
            node: {
                id: node.id,
                name: node.name
            },
            options: getNodeNoiseOptions(node)
        });
    });
    return nodes;
}
function applyNoiseToSelection(tile, options) {
    figma.currentPage.selection.forEach(node => {
        if ('fills' in node && node.fills === undefined) {
            let fillableNodes = getFillableNodes(node);
            fillableNodes.forEach(node => {
                applyTile(tile, node, options);
            });
        }
        else {
            applyTile(tile, node, options);
        }
    });
    return getSelectedNodes();
}
// expose functions to UI
FigmaScene.getSelectedNodes = getSelectedNodes;
FigmaScene.applyNoiseToSelection = applyNoiseToSelection;
FigmaScene.setNodeNoiseOptions = setNodeNoiseOptions;
FigmaScene.getNodeNoiseOptions = getNodeNoiseOptions;
FigmaScene.applyOptionsToNoisePaint = applyOptionsToNoisePaint;
/*
figma.ui.onmessage = async (msg) => {
  let selection = figma.currentPage.selection
  switch (msg.action) {
    case "choose-texture":
      figma.notify("Choose a layer for your noise texture")
      options = msg.options
      PREVIOUS_SELECTION = selection.length ? [selection[0]] : []
      figma.off("selectionchange", editSelection)
      figma.on("selectionchange", makeSelectionIntoShapeImage)
      break;
    default:
      if (msg.tile) {
        if (msg.action === "create" && selection.length === 0) {
          let layer = figma.createRectangle()
          layer.resize(800, 600)
          layer.name = "Noise & Texture"
          layer.fills = []
          selection = figma.currentPage.selection = [layer]
          figma.viewport.scrollAndZoomIntoView(selection)
        }
        selection.forEach(node => {
          if ('fills' in node && node.fills === undefined) {
            let fillableNodes = getFillableNodes(node)
            fillableNodes.forEach(node => {
              applyTile(msg.tile, node, msg.options)
            })
          } else {
            applyTile(msg.tile, node, msg.options)
          }
        })
      }
  }
}


figma.on("selectionchange", editSelection)
editSelection()*/

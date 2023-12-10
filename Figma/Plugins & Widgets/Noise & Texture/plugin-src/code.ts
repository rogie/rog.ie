import FigmaScene from '../ui-src/figma-scene';
FigmaScene.init();

// This file holds the main code for the plugin. It has access to the *document*.
// You can access browser APIs such as the network by creating a UI which contains
// a full browser environment (see documentation).
figma.root.setRelaunchData({ open: '' })

figma.showUI(
  __html__, {
  themeColors: true,
  width: 240,
  height: 554,
});

let options = {
  shapeImageData: null
}

let PREVIOUS_SELECTION = []

const NAMESPACE = "noise-options-v2"

function getNoisePaint(node) {
  let options = getNodeNoiseOptions(node)
  options = options && options.length ? options[0] : null

  let paint
  if (options && options.imageHash) {
    if (node.fills === undefined || node.strokes === undefined) {
      return paint
    }
    for (const p of node.fills) {
      if (p.type === "IMAGE" && p.imageHash === options.imageHash) {
        paint = JSON.parse(JSON.stringify(p))
        break;
      }
    }
    for (const p of node.strokes) {
      if (p.type === "IMAGE" && p.imageHash === options.imageHash) {
        paint = JSON.parse(JSON.stringify(p))
        break;
      }
    }
  }
  return paint
}

function applyOptionsToNoisePaint(options: Object, node: SceneNode = figma.currentPage.selection[0]) {
  const noisePaint = getNoisePaint(node)
  const scaleMode = options.noise?.value === "custom" ? "FILL" : "TILE"
  if (noisePaint) {

    const paint = {
      blendMode: options.blendMode,
      filters: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 },
      imageHash: noisePaint.imageHash,
      opacity: options.opacity || noisePaint.opacity,
      scaleMode: scaleMode,
      scalingFactor: noisePaint.scalingFactor,
      type: "IMAGE"
    }
    const newFills = []
    for (const p of node.fills) {
      if (p.type === "IMAGE" && p.imageHash === noisePaint.imageHash) {
      } else {
        newFills.push(JSON.parse(JSON.stringify(p)))
      }
    }

    newFills.push(paint)
    node.fills = newFills

    if (options.stroke) {
      const newStrokes = []
      for (const p of node.strokes) {
        if (p.type === "IMAGE" && p.imageHash === noisePaint.imageHash) {
        } else {
          newStrokes.push(JSON.parse(JSON.stringify(p)))
        }
      }
      newStrokes.push(paint)
      if (node.strokes.length > 0) {
        node.strokes = newStrokes
      }
    }
  }
}

function applyTile(tile, node, options) {
  var newFills = [...node.fills]
  var newStrokes = [...node.strokes]
  const image = figma.createImage(tile)
  const noisePaint = getNoisePaint(node) || { scalingFactor: 1.0 }
  const scaleMode = options.noise?.value === "custom" ? "FILL" : "TILE"
  var foundFill = false
  var foundStroke = false

  const paint = {
    blendMode: options.blendMode,
    filters: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 },
    imageHash: image.hash,
    opacity: options.opacity,
    scaleMode: scaleMode,
    scalingFactor: noisePaint.scalingFactor,
    type: "IMAGE"
  }
  if (noisePaint && noisePaint.imageHash) {
    for (var i = 0; i < newFills.length; ++i) {
      if (newFills[i].type === "IMAGE" && newFills[i].imageHash === noisePaint.imageHash) {
        newFills[i] = paint
        foundFill = true
      }
    }
    for (var i = 0; i < newStrokes.length; ++i) {
      if (newStrokes[i].type === "IMAGE" && newStrokes[i].imageHash === noisePaint.imageHash) {
        newStrokes[i] = paint
        foundStroke = true
      }
    }
  }

  if (!foundFill) {
    newFills.push(paint)
  }
  if (node.strokes.length > 0 && options.strokes) {
    if (!foundStroke) {
      newStrokes.push(paint)
    }
  }

  options.imageHash = image.hash
  setNodeNoiseOptions(node, [options])
  node.setRelaunchData({ edit: '' })
  node.fills = newFills
  node.strokes = newStrokes

}

function setNodeNoiseOptions(node: SceneNode, options: Object) {
  node.setPluginData(NAMESPACE, JSON.stringify(options))
}

function getNodeNoiseOptions(node: SceneNode) {
  let options = node.getPluginData(NAMESPACE)
  if (options) {
    options = JSON.parse(options)
  } else {
    options = null
  }
  return options
}

function getFillableNodes(node) {
  let nodes = []
  let fillableChildren = []
  if (node.fills !== undefined) {
    nodes.push(node)
  } else {
    if (node.children) {
      node.children.forEach((child) => {
        fillableChildren.push(...getFillableNodes(child))
      })
    }
  }
  return [...nodes, ...fillableChildren]
}
function getSelectedNodes() {
  let nodes: { node: Object, options: Object }[] = []
  if (!FigmaScene.choosingLayer) {
    figma.currentPage.selection.forEach(node => {
      let fillableNodes = getFillableNodes(node)
      fillableNodes.forEach(fillable => {
        nodes.push({
          node: {
            id: fillable.id,
            name: fillable.name,
            fills: fillable.fills
          },
          options: getNodeNoiseOptions(fillable)
        })
      })
    });
  }
  return nodes
}

function applyNoiseToSelection(tile, options) {
  figma.currentPage.selection.forEach(node => {
    let fillableNodes = getFillableNodes(node)
    fillableNodes.forEach(node => {
      applyTile(tile, node, options)
    })
  })
  return getSelectedNodes()
}

function hasNoise(node: SceneNode) {
  return getNoisePaint(node)
}

// expose functions to UI
FigmaScene.getSelectedNodes = getSelectedNodes
FigmaScene.applyNoiseToSelection = applyNoiseToSelection
FigmaScene.setNodeNoiseOptions = setNodeNoiseOptions
FigmaScene.getNodeNoiseOptions = getNodeNoiseOptions
FigmaScene.applyOptionsToNoisePaint = applyOptionsToNoisePaint
FigmaScene.hasNoise = hasNoise
FigmaScene.choosingLayer = false 
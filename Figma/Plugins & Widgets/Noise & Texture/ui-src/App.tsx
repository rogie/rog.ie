import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import debounce from 'lodash.debounce';
import FigmaScene from '../ui-src/figma-scene';
FigmaScene.init();
import { getUniforms, getMeta } from "./shader-utils";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-glsl";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import blendModes from './blend-modes';
import defaultNoiseTypes from './noise-types';

import "./App.css";
import FieldRange from "./FieldRange";
import FigmaLayerImage from "./FigmaLayerImage";
import Color from "./Color";
import CustomShaderOptions from "./CustomShaderOptions";
import SaveShader from "./SaveShader";
import DeleteShader from "./DeleteShader";
import Community from "./Community";
import Dropdown from "./Dropdown";
import TextureViewer from "./TextureViewer";
import Tooltip from "./Tooltip";
import SegmentedControl from "./SegmentedControl";
import About from "./About";
import Preferences from "./Preferences";
import Export from "./Export";
import Spinner from "./Spinner";
import Welcome from "./Welcome";

// icons
import { ReactComponent as IconCode } from "./icons/code.svg";
import { ReactComponent as IconAdd } from "./icons/add.svg";
import { ReactComponent as IconBook } from "./icons/book.svg";
import { ReactComponent as IconLygia } from "./icons/lygia.svg";
import { ReactComponent as IconOverflow } from "./icons/overflow.svg";

import downloadJSON from "./download-json.js";
//import { supabase, getFeaturedTextures } from './supabase';
import gradientShaders from './featured-shaders';
import { exportThumbnail, exportTile, downloadPng } from "./canvas-export";
import { normalToTileableSize } from "./shader-utils";

let NOISE_CANVAS = null;
let supabase = {};
const DEFAULT_COLOR = "#FFFFFF";
const NULL_IMAGE = 'data:image/png;base64'

const noiseTypes = JSON.parse(JSON.stringify(defaultNoiseTypes))

const customTexture = {
  value: "custom",
  label: "New",
  options: {
    shader: `// Fragment shader

// Uniforms
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec3 u_color;
uniform float u_scale; 
    
void main() {
  vec2 st = gl_FragCoord.xy/u_resolution;
  
  //Scale from 
  st *= 1.0 + 1.0/u_scale;      
  st = fract(st);
  
  gl_FragColor = vec4(st.x,st.y,sin(u_time),1.0);
}`,
    vertex: `// Vertex shader

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
  }
}

function App() {

  const [layers, setLayers] = useState([])
  let [savedShaders, setSavedShaders] = useState([])
  let [category, setCategory] = useState('noise')
  let [preferences, setPreferences] = useState({ resolution: 1024, blend: true, opacity: true, strokes: true, onboarded: false, uses: 0 })
  let [session, setSession] = useState(null)
  let [loading, setLoading] = useState(true)
  let [fps, setFps] = useState(null)
  let [options, setOptions] = useState({
    color: document.documentElement.classList.contains("figma-light") ? "#000000" : "#FFFFFF",
    blendMode: "NORMAL",
    strokes: true,
    opacity: 1,
    noise: JSON.parse(JSON.stringify(noiseTypes[0]))
  })

  const [location, setLocation] = useState("home")
  const [showEditor, setShowEditor] = useState(false)
  const [showVertexEditor, setShowVertexEditor] = useState(false)

  const preview = useRef<HTMLDivElement>(null)
  const mainContent = useRef<HTMLDivElement>(null)
  const visualizer = useRef<HTMLDivElement>(null)
  const controlPanel = useRef<HTMLDivElement>(null)
  const noiseSwatches = useRef<HTMLDivElement>(null)
  const textureCanvas = useRef()
  const ace = useRef()


  const savePreferences = async (prefs) => {
    options.strokes = prefs.strokes
    updateOptions(options)

    await FigmaScene.setClientStorage('preferences', prefs)
    setPreferences({ ...prefs })
  }

  const resetOptions = (e) => {
    let defaultOptions = defaultNoiseTypes.find(noise => noise.value === options.noise.value)
    changeNoise(defaultOptions)
  }

  const randomizeOptions = (e) => {
    if (mainContent.current) {
      let sliders = mainContent.current.querySelectorAll('input[type=range]')
      sliders.forEach(range => {
        if (!["opacity"].includes(range.name)) {
          let min = Number(range.getAttribute("min"))
          let max = Number(range.getAttribute("max"))
          let step = Number(range.getAttribute("step")) || 0.001
          let rand = Number(Math.random() * (max - min) + min)
          rand = rand - (rand % step)
          options.noise.options[range.name] = rand
        }
      })
      updateOptions(options)
    }
  }

  const updateOptions = (newOptions, apply = true) => {
    let o = { ...newOptions }
    setOptions(o)
    if (apply) {
      debouncedApplyNoise(o)
    }
  }

  const updateSavedShaders = (shader, savedShaders) => {
    changeNoise(shader)
    setSavedShaders(savedShaders)
  }

  const onDeleteShader = (removed, all) => {
    options.noise = { ...noiseTypes[0] }
    setOptions(options)
    setSavedShaders(all)
  }

  const onOptionInput = (e) => {
    let input = e.target
    let val = input.value
    if (input.type === "checkbox") {
      val = input.checked
    } else if (input.type === "range" || input.type === "number") {
      val = Number(input.value)
    }
    if (options.hasOwnProperty(input.name)) {
      options[input.name] = val
    } else {
      options.noise.options[input.name] = val
    }
    updateOptions(options)
  }

  const changeNoise = (noise) => {
    let shaderOptions = {}
    if (noise.value === "custom") {
      shaderOptions = getShaderCodeOptions(noise.options?.shader, noise.options)
    }
    noise.options = { ...noise.options, ...shaderOptions }
    options.noise = { ...noise }

    updateOptions(options)
  }

  const onShaderCodeInput = (frag, options) => {
    updateShaderCode(frag, options)
  }

  const onVertexCodeInput = (vertex, options) => {
    updateVertexCode(vertex, options)
  }

  const getShaderCodeOptions = (code, options) => {
    let uniforms = getUniforms(code)
    let newOptions = {}
    uniforms.forEach(uniform => {
      if (!['u_resolution', 'u_time', 'u_mouse', 'shader'].includes(uniform.name)) {
        if (['float', 'sampler2D', 'vec3', 'vec4', 'bool', 'int'].includes(uniform.type)) {
          if (options.hasOwnProperty(uniform.name)) {
            newOptions[uniform.name] = options[uniform.name];
          } else {
            if (uniform.type === 'float') {
              newOptions[uniform.name] = 0.5;
            } else if (uniform.type === 'int') {
              newOptions[uniform.name] = 1;
            } else if (uniform.type === 'sampler2D') {
              newOptions[uniform.name] = 'data:image/png;base64'
            } else if (uniform.type === 'vec3') {
              if (uniform.length) {
                newOptions[uniform.name] = (new Array(uniform.length)).fill("#ff0000")
              } else {
                newOptions[uniform.name] = "#ff0000"
              }
            } else if (uniform.type === 'vec4') {
              if (uniform.length) {
                newOptions[uniform.name] = (new Array(uniform.length)).fill("#ff0000ff")
              } else {
                newOptions[uniform.name] = "#ff0000ff"
              }
            } else if (uniform.type === 'bool') {
              newOptions[uniform.name] = true
            }
          }
        }
      }
    })
    return newOptions
  }

  const getShaderMeta = (code) => {
    return getMeta(code);
  }

  const updateShaderCode = (fragment, options) => {
    let vertex = options.noise.options.vertex
    options.noise.options = getShaderCodeOptions(fragment, options.noise.options)
    options.noise.options.shader = fragment
    options.noise.options.vertex = vertex;

    updateOptions(options)
  }

  const updateVertexCode = (vertex, options) => {
    options.noise.options.vertex = vertex
    updateOptions(options)
  }

  const debouncedShaderCodeInput = useCallback(
    debounce(updateShaderCode, 100)
    , []);

  const debouncedApplyNoise = useCallback(
    debounce(applyNoise, 300)
    , []);

  async function bytesToImage(imageBytes) {
    return new Promise((resolve, reject) => {
      let img = new Image()
      img.src = URL.createObjectURL(new Blob([new Uint8Array(imageBytes)], { type: 'image/png' }));
      //img.src = "data:image/png;base64," + btoa(String.fromCharCode.apply(null, imageBytes))
      img.onload = function () {
        resolve(img)
      }
      img.onerror = function () {
        reject(new Error('Could convert shape image data'))
      }
    })
  }

  function findCategory(noiseOptions) {
    let category = 'noise'
    category = gradientShaders.find(shader => shader.data.uuid === noiseOptions?.noise?.uuid) ? 'gradient' : category
    category = savedShaders.find(shader => shader.noise.uuid === noiseOptions?.noise?.uuid) ? 'saved' : category

    if (category === "gradient" || category === "noise") {
      setShowEditor(false)
    }
    return category
  }

  async function editNoise(node: Object, apply = true) {
    let options = node.options[0]

    // Find the category
    setCategory(findCategory(options))

    //if (options.noise.value === "custom") {
    //  updateShaderCode(options.noise.options.shader, options)
    //}
    updateOptions(options, apply)
  }

  async function generateThumbnail(size = 64, mimeType = 'image/png', quality = 1, compress = true) {
    if (preview.current) {
      let canvas = preview.current?.querySelector('canvas')
      return await exportThumbnail(
        canvas,
        options.noise.value,
        { ...options.noise.options, color: options.color },
        size,
        mimeType,
        quality,
        compress
      )
    }
  }



  async function addNoise(options) {
    let nodeOptions = JSON.parse(JSON.stringify(options))
    delete nodeOptions.noise.options.shapeImage

    if (preview.current) {
      let canvas = preview.current?.querySelector('canvas')

      let tile = await exportTile(canvas, options.noise.value, { ...options.noise.options, color: options.color })
      FigmaScene.run(
        (args: {}) => {
          if (figma.currentPage.selection.length === 0) {
            let layer = figma.createRectangle()
            layer.resize(args.width, args.height)
            layer.x = Math.round(figma.viewport.center.x - layer.width / 2)
            layer.y = Math.round(figma.viewport.center.y - layer.height / 2)
            layer.name = "Noise & Texture"
            layer.fills = []
            figma.currentPage.selection = [layer]
            figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection)
          }
          return scene.applyNoiseToSelection(args.tile, args.options)
        },
        (nodes: []) => {
          setLayers(nodes)
        },
        { tile, options: nodeOptions, width: canvas.width, height: canvas.height }
      )
    }
  }

  async function applyNoise(options) {
    if (preview.current?.classList.contains("has-noise")) {

      let nodeOptions = JSON.parse(JSON.stringify(options))
      delete nodeOptions.noise.options.shapeImage

      if (preview.current) {
        let canvas = preview.current?.querySelector('canvas')
        let tile = await exportTile(canvas, options.noise.value, { ...options.noise.options, color: options.color })
        FigmaScene.run(
          (args: {}) => {
            let selection = scene.getSelectedNodes()
            if (selection.length && selection[0].options) {
              scene.applyNoiseToSelection(args.tile, args.options)
            }
            return selection
          },
          (nodes: []) => {
            setLayers(nodes)
          },
          { tile, options: nodeOptions }
        )
      }
    }
  }

  function setupCodegen() {

    FigmaScene.run(
      () => {
        // Make sure that we're in Dev Mode and running codegen
        if (figma.editorType === "dev" && figma.mode === "codegen") {

          // Register a callback to the "generate" event
          figma.codegen.on("generate", ({ node }) => {
            return [
              {
                language: "HTML",
                code:
                  `<div class="container">
          <div class="box"></div>
        </div>`,
                title: "HTML",
              },
              {
                language: "CSS",
                code:
                  `.container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .box {
            width: 100px;
            height: 100px;
            background-color: #000;
          }
        `,
                title: "CSS",
              },
            ];
          })
        }
      }
    )

  }

  // Initialization of the canvas/listeners
  useEffect(() => {

    let getNodes = () => {
      return scene.getSelectedNodes()
    }
    let setNodes = (nodes: []) => {

      setLayers(nodes)
      if (nodes.length && nodes[0].options) {
        editNoise(nodes[0], false)
        //updateOptions(nodes[0].options, false)
      }
    }
    FigmaScene.on("selectionchange", getNodes, setNodes)
    FigmaScene.run(getNodes, setNodes)

    let loadSavedShaders = async function () {

      //Get saved shaders
      let shaders = await FigmaScene.runWithPromise(
        async () => {
          let shaders = await figma.clientStorage.getAsync("saved-shaders");
          shaders = shaders || []
          return shaders
        }
      )
      setSavedShaders(shaders)
    }

    loadSavedShaders()

    // Load the preferences
    const getPrefs = async () => {
      let prefs = await FigmaScene.getClientStorage('preferences')
      if (!prefs) {
        prefs = { ...preferences }
      } else {
        prefs = { ...preferences, ...prefs }
      }
      savePreferences({ ...prefs, uses: prefs.uses + 1 })
      setLoading(false)
    }
    getPrefs()

  }, []);

  // scroll to the selected swatch only after saved shaders are loaded
  useEffect(() => {
    if (noiseSwatches.current) {
      let selectedSwatch = noiseSwatches.current.querySelector('.noise-swatch :checked')
      if (selectedSwatch) {
        selectedSwatch.click()
      }
    }
  }, [savedShaders, options.noise.value])

  // Resize plugin window based on content size
  useEffect(() => {
    if (options.noise.value !== "custom") {
      setShowEditor(false)
    }
    FigmaScene.run(
      (args: {}) => {
        figma.ui.resize(args.width, args.height)
      },
      () => { },
      { width: mainContent.current?.clientWidth, height: visualizer.current?.clientHeight }
    )
  }, [options.noise.value, options.noise.options.shader, options, location, showEditor, preferences])

  useEffect(() => {
    if (ace.current) {
      ace.current.editor.session.getUndoManager().reset()
    }
  }, [showVertexEditor])

  const onFramePerformance = (stats) => {
    if (fps === null && stats.clock.elapsedTime > 4) {
      setFps(stats.fps)
    }
  }

  const changeCategory = (category) => {
    setCategory(category)

    switch (category) {
      case 'noise':
        changeNoise(noiseTypes[0])
        setShowEditor(false)
        break;
      case 'gradient':
        changeNoise(gradientShaders[0].data)
        setShowEditor(false)
        break;
      case 'saved':
        changeNoise(savedShaders[0])
        setShowEditor(true)
        break;
    }
  }

  const hasNoise = () => {
    return layers && layers.length && layers[0] && layers[0].options
  }

  const scrollToVertical = (e) => {
    let kid = e.target.parentNode
    let dad = kid.parentNode
    dad.scrollTop = (kid.offsetTop - dad.offsetTop) - (dad.offsetHeight / 2 - kid.offsetHeight / 2)
  }

  const scrollToHorizontal = (e) => {
    let kid = e.target.parentNode
    let dad = kid.parentNode
    dad.scrollLeft = (kid.offsetLeft - dad.offsetLeft) - (dad.offsetWidth / 2 - kid.offsetWidth / 2)
  }

  const hasOption = (name) => {
    return options.noise.options.hasOwnProperty(name);
  }

  const isNullImage = (image) => {
    return image === NULL_IMAGE
  }

  const getNodeFillColor = (defaultColor = "rgba(0,0,0,0.25)") => {
    var color = defaultColor

    if (layers.length && layers[0] && layers[0].node && layers[0].node.fills && layers[0].node.fills.length) {

      let fill = layers[0].node.fills[0]
      let rgb = fill.color || (fill.gradientStops ? fill.gradientStops[0].color : null);
      let opacity = rgb ? fill.opacity : 0.1
      rgb = rgb || { r: 0, g: 0, b: 0 }
      if (rgb) {
        color = `rgba(${rgb.r * 255},${rgb.g * 255},${rgb.b * 255},${opacity})`;
      }
    }
    return color
  }

  const getNodeFills = () => {
    let fills = []
    if (layers.length && layers[0] && layers[0].node && layers[0].node.fills && layers[0].node.fills.length) {
      fills = layers[0].node.fills
    }
    return fills
  }

  const onCommunityResourceSelect = (resource) => {
    changeNoise(resource.data)
  }

  const thumbnailUrl = (resource) => {
    return resource.thumbnail_id && supabase.storageUrl ? `${supabase.storageUrl}/object/public/textures/thumbnails/${resource.thumbnail_id}.png` : resource.thumbnail
  }

  const showOnboarding = () => {
    return preferences.onboarded === false && preferences.uses > 1 && loading === false
  }

  return (
    <>{loading && <Spinner className="app-loader" />}
      <main ref={mainContent} className={`location-${location} ${showEditor ? 'show-editor' : ''} ${loading ? 'app-loading' : ''}`}>

        {showOnboarding() && <Welcome onFinish={() => savePreferences({ ...preferences, onboarded: true })} />}
        {/*<Dropdown
          className="nav-menu"
          label={<IconNav />}
          choices={[{
            label: "Your textures",
            value: "home",
            icon: <IconTextures />
          },
          {
            label: <div><span>Community textures</span> <span className="tag">beta</span></div>,
            value: "community",
            icon: <IconCommunity />
          },
          { label: "", separator: true },
          {
            label: "Support this plugin",
            href: "https://www.buymeacoffee.com/rogie",
            icon: <IconSupport />
          },
          { label: "", separator: true },
          {
            label: <Signin className="dropdown-item" supabase={supabase} onSigninOut={(session) => { setSession(session) }
            } />,
            className: "signin",
          }]}
          onChoose={onNavMenuChoose}
        />*/}


        <section className="visualizer" ref={visualizer}>
          {false &&
            <div className="section-heading">
              <h3>Fills</h3>
              <select>
                {getNodeFills().reverse().map(fill =>
                  <option>
                    {fill.type}
                  </option>
                )}
              </select>
            </div>}
          <div className={`preview ${hasNoise() ? "has-noise" : ""}`} ref={preview}>
            <TextureViewer
              width={preferences.resolution}
              height={preferences.resolution}
              viewerWidth={showEditor ? 480 : 240}
              viewerHeight={showEditor ? 480 : 240}
              opacity={options.opacity}
              ref={textureCanvas}
              onFrameEnter={onFramePerformance}
              showActions={true}
              animated={options.noise.value === "custom"}
              type={options.noise.value}
              name={options.noise.label}
              options={{ ...options.noise.options, color: options.color }}
            />
          </div>
          <div className={"control-panel"} ref={controlPanel}>
            <nav className="nav-textures" ref={noiseSwatches}>
              {/*
          <SegmentedControl
            name={"texture-category"}
            sizing={"full"}
            choices={[
              {
                label: 'Noise',
                selected: true,
                props: { onClick: () => { setLocation("home"); changeCategory('noise') } },
              },
              {
                label: 'Gradients',
                selected: false,
                props: { onClick: () => { setLocation("home"); changeCategory('gradient') } },
              },
              {
                label: 'Saved',
                selected: false,
                props: { onClick: () => { setLocation("home"); changeCategory('saved') } },
              },
              {
                label: <Tooltip align="top" text="Community"><IconCommunity /></Tooltip>,
                selected: false,
                props: { onClick: () => setLocation("community"), style: { flexGrow: 0 } },
            }
            ]} />
          */}
              <SegmentedControl
                name={"texture-category"}
                sizing={"full"}
                choices={[
                  {
                    label: 'Noise',
                    selected: category === 'noise',
                    props: { onClick: () => { changeCategory('noise') } },
                  },
                  {
                    label: 'Gradients',
                    selected: category === 'gradient',
                    props: { onClick: () => { changeCategory('gradient') } },
                  },
                  {
                    label: 'Saved',
                    selected: category === 'saved',
                    props: { onClick: () => { changeCategory('saved') } },
                  }/*,
              {
                label: <Tooltip align="top" text="Community"><IconCommunity /></Tooltip>,
                selected: false,
                props: { onClick: () => setLocation("community"), style: { flexGrow: 0 } },
              }*/
                ]} />
              <div className={`nav-texture-list ${category !== 'noise' ? 'hidden' : ''}`}>
                {noiseTypes.map(type =>
                  <Tooltip align="bottom" text={type.label}>
                    <div
                      className="noise-swatch tip-right"
                      title={type.label}
                      onClick={scrollToHorizontal}>
                      <input
                        type="radio"
                        name="type-noise"
                        onChange={() => changeNoise(type)}
                        checked={type.value === options.noise.value}
                        value={type.value} />
                      <div
                        className="noise-swatch-pattern"
                        style={{ maskImage: `url(${type.thumbnail})`, WebkitMaskImage: `url(${type.thumbnail})`, backgroundColor: options.color }} />
                    </div>
                  </Tooltip>
                )}
              </div>
              <div className={`nav-texture-list ${category !== 'saved' ? 'hidden' : ''}`}>
                <Tooltip text={customTexture.label} align="bottom">
                  <div
                    className="noise-swatch noise-swatch--custom"
                    title={customTexture.label}
                    onClick={scrollToHorizontal}>
                    <input
                      type="radio"
                      name="type-saved"
                      onChange={() => {
                        changeNoise(customTexture);
                        setShowEditor(true);
                      }}
                      checked={customTexture.value === options.noise.value && !options.noise.uuid}
                      value={customTexture.value} />
                    <div className="noise-swatch-icon">
                      <IconAdd />
                    </div>
                  </div>
                </Tooltip>
                {savedShaders.map((shader) => <Tooltip align="bottom" text={shader.label}>
                  <div
                    className="noise-swatch"
                    title={shader.noise ? shader.noise.label : shader.label}
                    onClick={scrollToHorizontal}>
                    <input
                      type="radio"
                      name="type-saved"
                      onChange={() => changeNoise(shader.noise ? shader.noise : shader)}
                      checked={shader.noise ? shader.noise.uuid === options.noise.uuid : shader.uuid === options.noise.uuid}
                      value={shader.noise ? shader.noise.uuid : shader.uuid} />
                    <div
                      className="noise-swatch-thumbnail"
                      style={{ backgroundImage: `url(${shader.noise ? shader.noise.thumbnail : shader.thumbnail})` }} />
                  </div>
                </Tooltip>
                )}
              </div>
              <div className={`nav-texture-list ${category !== 'gradient' ? 'hidden' : ''}`}>
                {gradientShaders.map((shader) => <Tooltip align="bottom" text={shader.data.label}>
                  <div
                    className="noise-swatch"
                    title={shader.data.label}
                    onClick={scrollToHorizontal}>
                    <input
                      type="radio"
                      name="type-gradient"
                      onChange={() => changeNoise(shader.data)}
                      checked={shader.data.uuid === options.noise.uuid}
                      value={shader.data.uuid} />
                    <div
                      className="noise-swatch-thumbnail"
                      style={{ backgroundImage: `url(${thumbnailUrl(shader)})` }} />
                  </div>
                </Tooltip>
                )}
              </div>

            </nav>

            <div className="options">

              {options.noise.value !== "custom" && <div>
                {hasOption("size") && <FieldRange
                  name={"size"}
                  min={0}
                  step={0.002}
                  max={1}
                  transform={(val) => { return Math.ceil(Math.max(val * preferences.resolution / 16, 1)); }}
                  units="px"
                  value={options.noise.options.size}
                  onInput={onOptionInput}
                />}
                {
                  hasOption("gain") && <FieldRange
                    name={"gain"}
                    min={0}
                    step={0.001}
                    max={2}
                    value={options.noise.options.gain}
                    onInput={onOptionInput}
                  />
                }
                {
                  hasOption("octaves") && <FieldRange
                    name={"octaves"}
                    min={1}
                    step={1}
                    max={8}
                    value={options.noise.options.octaves}
                    onInput={onOptionInput}
                  />
                }
                {
                  hasOption("lacunarity") && <FieldRange
                    name={"lacunarity"}
                    min={1}
                    step={0.001}
                    max={32}
                    disabled={options.noise.options.hasOwnProperty("octaves") && options.noise.options.octaves < 2}
                    value={options.noise.options.lacunarity}
                    onInput={onOptionInput}
                  />
                }
                {
                  hasOption("factor") && <FieldRange
                    name={"factor"}
                    min={-1}
                    step={0.001}
                    max={1}
                    disabled={options.noise.options.hasOwnProperty("octaves") && options.noise.options.octaves < 2}
                    value={options.noise.options.factor}
                    onInput={onOptionInput}
                  />
                }
                {
                  ['amount', 'vignette', 'jitter', 'smoothness', 'interpolate', 'width', 'phase', 'distance'].map(name => hasOption(name) &&
                    <FieldRange
                      name={name}
                      min={0}
                      step={0.001}
                      max={1}
                      value={options.noise.options[name]}
                      transform={(value: Number) => { return Math.floor(value * 100) }}
                      units="%"
                      onInput={onOptionInput}
                    />
                  )
                }
                {
                  hasOption("count") && <FieldRange
                    name={"count"}
                    min={1}
                    step={1}
                    max={64}
                    value={options.noise.options.count}
                    onInput={onOptionInput}
                  />
                }
                {
                  hasOption("strength") && <FieldRange
                    name={"strength"}
                    min={-1}
                    step={0.1}
                    max={1}
                    value={options.noise.options.strength}
                    onInput={onOptionInput}
                  />
                }

                {hasOption("rotation") && <FieldRange
                  name={"rotation"}
                  min={0}
                  label="Rotate"
                  max={360}
                  units="°"
                  after={<datalist id="rotation-snaps">
                    <option value="0" />
                    <option value="90" />
                    <option value="180" />
                    <option value="270" />
                    <option value="360" />
                  </datalist>}
                  before={hasOption("randomRotation") &&
                    <input type="checkbox"
                      className="disable random"
                      name="randomRotation"
                      title="Randomize rotations"
                      checked={options.noise.options.randomRotation}
                      onChange={onOptionInput}
                    />
                  }
                  list="rotation-snaps"
                  value={options.noise.options.rotation}
                  onInput={onOptionInput}
                />
                }

                {hasOption("shape") &&
                  <div className={`field field--horizontal field--radio`}>

                    <FigmaLayerImage
                      name={"image"}
                      value={options.noise.options.image}
                      onInput={onOptionInput}
                      content={<input type="checkbox"
                        className="target"
                        name="shape"
                        value="image"
                        title="Choose Figma layer for image"
                        onChange={() => options.noise.options.shape = "image"}
                        checked={options.noise.options.shape === "image"}
                      />}
                    />
                    <label>Shape</label>
                    <div className="radio-group">
                      <input type="radio"
                        name="shape"
                        value="square"
                        checked={options.noise.options.shape === "square"}
                        onChange={onOptionInput} />
                      <input type="radio"
                        name="shape"
                        value="circle"
                        checked={options.noise.options.shape === "circle"}
                        onChange={onOptionInput} />
                      <input type="radio"
                        name="shape"
                        value="triangle"
                        checked={options.noise.options.shape === "triangle"}
                        onChange={onOptionInput} />
                      <input type="radio"
                        name="shape"
                        value="diamond"
                        checked={options.noise.options.shape === "diamond"}
                        onChange={onOptionInput} />
                      <input type="radio"
                        name="shape"
                        value="line"
                        checked={options.noise.options.shape === "line"}
                        onChange={onOptionInput} />
                      {!isNullImage(options.noise.options.image) && <input type="radio"
                        name="shape"
                        value="image"
                        style={{ backgroundImage: `url(${options.noise.options.image})` }}
                        checked={options.noise.options.shape === "image"}
                        onChange={onOptionInput} />}
                    </div>
                  </div>
                }
              </div>}
              {options.noise.value === "custom" && <CustomShaderOptions
                options={options.noise.options}
                onOptionInput={onOptionInput} />}

              {options.noise.value !== "custom" &&
                <Color
                  name={"color"}
                  value={options.color}
                  before={hasOption("multicolor") &&
                    <input type="checkbox"
                      className="disable random"
                      name="multicolor"
                      title="Randomize colors"
                      checked={options.noise.options.multicolor}
                      onChange={onOptionInput}
                    />
                  }
                  disabled={options.noise.options.shape === "image"}
                  onInput={onOptionInput}
                />
              }

              {preferences.opacity && <FieldRange
                name={"opacity"}
                min={0}
                max={1}
                step={0.05}
                units="%"
                transform={(value: Number) => Math.floor(value * 100)}
                before={hasOption("randomOpacity") &&
                  <input type="checkbox"
                    className="random"
                    name="randomOpacity"
                    title="Randomize opacities"
                    checked={options.noise.options.randomOpacity}
                    onChange={onOptionInput}
                  />
                }
                value={options.opacity}
                onInput={onOptionInput}
              />}

              {preferences.blend && <div className="field field--horizontal field--blend">
                <label>Blend</label>
                <Dropdown
                  buttonClass="button button--small button--secondary"
                  menuClass="blend-modes-menu"
                  align="right"
                  direction="up"
                  onChoose={(choice) => { options.blendMode = choice.value; updateOptions(options) }}
                  label={blendModes.find(mode => options.blendMode === mode.value).label}

                  choices={blendModes.map(mode => {
                    return {
                      checked: mode.value === options.blendMode,
                      value: mode.value,
                      label:
                        <>
                          {mode.label}
                          <svg className={`blend-${mode.value.toLowerCase().replace("_", "-")}`} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="2" width="9" height="9" rx="1" fill={getNodeFillColor()} />
                            <circle cx="9.5" cy="9.5" r="4.5" fill={options.color} style={{ 'mix-blend-mode': mode.value.toLowerCase().replace("_", "-") }} />
                          </svg>
                        </>
                    }
                  })}
                />
              </div>}

            </div>
            <footer>
              <button id="apply" className={`button button--small ${hasNoise() ? "disabled" : ""}`} disabled={hasNoise()} onClick={() => { addNoise(options) }}>
                Add to {layers.length > 0 ? "layer" : "canvas"}
              </button>
              <Export canvas={preview} options={options} />
              <Dropdown
                buttonClass="button button--small button--secondary icon"
                className="actions-overflow-menu"
                showCaret={false}
                direction="up"
                align="right"
                label={<IconOverflow />}
                choices={[
                  {
                    label: <About />
                  },
                  {
                    label: <Preferences value={preferences} onChange={(prefs) => savePreferences(prefs)} />
                  },
                  {
                    separator: true
                  },
                  {
                    label: "Randomize options",
                    function: randomizeOptions
                  },
                  {
                    label: "Reset options to default",
                    function: resetOptions
                  }
                ]}
              />
            </footer>
          </div>
        </section>
        {location === "community" && <Community onSelect={onCommunityResourceSelect} onSave={updateSavedShaders} session={session} supabase={supabase} />}
        {
          location !== "community" && showEditor &&
          <section className="shader-editor">
            <div className="section-heading">
              <h3>{options.noise.label || "Shader.frag"}</h3>
              <span>
                <SegmentedControl
                  name={"shader-editor-type"}
                  choices={[
                    { label: 'Fragment', props: { onClick: () => setShowVertexEditor(false) }, selected: !showVertexEditor },
                    {
                      label: 'Vertex', props: {
                        onClick: () => {
                          setShowVertexEditor(true)
                        }
                      }, selected: showVertexEditor
                    }
                  ]} />
                {/*
                <PublishShader
                  generateThumbnail={generateThumbnail}
                  shader={options.noise}
                  session={session}
                  supabase={supabase}
                  onPublish={updateSavedShaders}
                  onSigninOut={(session) => { setSession(session) }}
              />*/
                }
                <SaveShader generateThumbnail={generateThumbnail} type={options.noise.value} shader={options.noise} onSave={updateSavedShaders} />
                <Dropdown
                  buttonClass="button button--small button--secondary"
                  className="editor-overflow-menu"
                  align="right"
                  direction="down"
                  label={<IconOverflow />}
                  choices={[{
                    label: "The book of shaders",
                    href: "https://thebookofshaders.com/?rogie",
                    icon: <IconBook />
                  }, {
                    label: "LYGIA shader library",
                    href: "https://lygia.xyz?rogie",
                    icon: <IconLygia />
                  },
                  { separator: true },
                  {
                    label: <DeleteShader className="dropdown-item" options={options} onRemove={onDeleteShader} />,
                    className: "delete"
                  },
                  {
                    label: "Download texture",
                    function: () => {
                      downloadJSON(options.noise, `${options.noise.label}.json`)
                    }
                  }]}
                />
              </span>
            </div>
            <AceEditor
              placeholder={`Shader glsl`}
              mode="glsl"
              ref={ace}
              theme="tomorrow_night_eighties"
              name="shader"
              onLoad={function (editor) {
                editor.session.getUndoManager().reset()
                editor.renderer.setPadding(8)
                editor.renderer.setScrollMargin(8)
              }}
              style={{ width: "100%", height: "100%", fontWeight: 100 }}
              height={"100%"}
              fontSize={11}
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              onChange={(code) => {
                if (showVertexEditor) {
                  onVertexCodeInput(code, options)
                } else {
                  onShaderCodeInput(code, options)
                }
              }}
              value={showVertexEditor ? options.noise.options.vertex || customTexture.options.vertex : options.noise.options.shader || ``}
              setOptions={{
                wrap: true,
                readOnly: false,
                highlightSelectedWord: true,
                showLineNumbers: true,
                tabSize: 2,
              }} />
          </section>
        }
      </main></>
  );
}

export default App;
import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import resolveLygia from './resolveLygia';
import shaders from "./default-shaders";
import FigmaScene from '../ui-src/figma-scene';
import SegmentedControl from "./SegmentedControl";
import downloadJSON from "./download-json.js";
import * as THREE from 'three'
import './Embed.css'
import { getUniforms, getMeta, objectToThreeUniforms, defaultOptionsToUniforms, customOptionsToUniforms } from "./shader-utils";

import './ExportVideo.css'
import SegmentedControl from "./SegmentedControl";

export default function (props) {

    let { texture } = props
    let [embedCode, setEmbedCode] = useState('')
    let [reactCode, setReactCode] = useState('')
    let [jsonCode, setJSONCode] = useState('')
    let [dimensions, setDimensions] = useState({
        width: 512,
        height: 512,
        widthUnits: 'px',
        heightUnits: 'px'
    })

    const reactTextarea = useRef<HTMLTextAreaElement>(null)
    const jsonTextarea = useRef<HTMLTextAreaElement>(null)
    const iframeTextarea = useRef<HTMLTextAreaElement>(null)

    const createEmbedCode = async () => {
        let dims = dimensions
        let glDims = { width: 512, height: 512 }
        let uniforms;

        let isGLSL3 = (f) => {

            return /#version 300 es|#version 330 core/.test(f)
        }

        let parseFragmentShader = (f) => {
            return f.replace(/#version 300 es|#version 330 core|#version 100/, '')
        }

        if (texture.noise.value === "custom") {
            uniforms = await customOptionsToUniforms(texture.noise.options.shader, texture.noise.options)
        } else {
            uniforms = await defaultOptionsToUniforms({ ...texture.noise.options, color: texture.color }, glDims.width)
        }

        let threeUniforms = {
            ...await objectToThreeUniforms(uniforms),
            ...{
                u_time: { value: 0.0 },
                u_mouse: { value: [0, 0] },
                u_resolution: { value: [glDims.height * window.devicePixelRatio, glDims.width * window.devicePixelRatio] },
            }
        }

        let vertexShader = texture.noise.options.vertex || `
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`
        if (vertexShader && vertexShader.search('#include "lygia') > -1) {
            vertexShader = resolveLygia(vertexShader)
        }

        let fragmentShader = ''
        if (texture.noise.value === "custom") {
            fragmentShader = texture.noise.options.shader
        } else {
            fragmentShader = shaders.getShader(texture.noise.value, texture.noise.options)
        }

        if (fragmentShader && fragmentShader.search('#include "lygia') > -1) {
            fragmentShader = resolveLygia(fragmentShader)
        }
        fragmentShader = parseFragmentShader(fragmentShader)

        let meta = getMeta(vertexShader)
        let geometryArgs = Array.isArray(meta['geometry-args']) ? meta['geometry-args'] : [glDims.width * window.devicePixelRatio, glDims.height * window.devicePixelRatio]
        let geometry = meta['geometry'] || 'plane'

        function uniformsToEmbed(uniforms) {
            let embedString = ''
            if (Array.isArray(uniforms)) {
                embedString += '[' + uniforms.map(val => {
                    if (typeof val === 'object') {
                        if (val?.constructor === THREE.Vector4) {
                            return `new THREE.Vector4(${val.x},${val.y},${val.z},${val.w})`
                        } else if (val?.constructor === THREE.Vector3) {
                            return `new THREE.Vector3(${val.x},${val.y},${val.z})`
                        } else {
                            return uniformsToEmbed(val)
                        }
                    } else {
                        return val
                    }
                }) + ']'
            } else {
                for (var key in uniforms) {
                    let val = uniforms[key]
                    if (typeof val === 'object') {
                        embedString += (embedString.trim() === "" ? "" : ",") + `${key}: ${uniformsToEmbed(val)}`
                    } else {
                        embedString += (embedString.trim() === "" ? "" : ",") + `${key}: ${JSON.stringify(val)}`
                    }
                }
                embedString = `{${embedString}}`
            }
            return embedString
        }

        let uniformString = uniformsToEmbed(threeUniforms)

        function getScript(dims) {

            return `<script type="importmap">
{
    "imports": {
        "react": "https://cdn.skypack.dev/react@18.0.2",
        "react-dom": "https://cdn.skypack.dev/react-dom@18.0.2",
        "three": "https://cdn.skypack.dev/three@0.148.0",
        "react-three/fiber": "https://cdn.skypack.dev/@react-three/fiber@7.0.24"
    }
}
</script>
<style>
    html, body{
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        border: 0;
    }
    .nt-embed{
        width: ${dims.width}${dims.widthUnits};
        height: ${dims.height}${dims.heightUnits};
    }
    .nt-embed canvas{
        width: 100%;
        height: 100%;
    }
</style>
<script type="module">
    import React, {useRef} from 'react';
    import ReactDOM from 'react-dom';
    import * as THREE from 'three';
    import {Canvas, useFrame} from 'react-three/fiber';

    let embedRoot = document.createElement('div')
    embedRoot.className = "nt-embed"
    document.body.appendChild(embedRoot)

    const TextureMesh = () => {
        const mesh = useRef(null)
        useFrame(state => {
            const { clock, mouse, gl, scene, camera } = state
            if(mesh.current){
                mesh.current.material.uniforms.u_mouse.value = [mouse.x, mouse.y]
                mesh.current.material.uniforms.u_time.value = clock.getElapsedTime()
            }
        })
        
        return React.createElement('mesh',
            {
                ref:mesh,
                position: ${JSON.stringify(meta['mesh-position'] || [0, 0, 0])},
                scale: ${meta['mesh-scale'] || 1},
                rotation: ${JSON.stringify(meta['mesh-rotation'] || [0, 0, 0])}
            },
            React.createElement('${geometry}Geometry',{args:${JSON.stringify(geometryArgs)}}), 
            React.createElement('shaderMaterial',{
                fragmentShader: \`${fragmentShader}\`,
                vertexShader: \`${vertexShader}\`,
                uniforms: ${uniformString},
                wireframe: ${meta['shader-wireframe'] || 'false'}, 
                wireframeLinewidth: ${meta['shader-wireframe-linewidth'] || 0},
                dithering: false,
                flatShading: true,
                doubleSided: true,
                glslVersion: "${isGLSL3(fragmentShader) ? '300 es' : '100'}"
            })
        );  
    }

    ReactDOM.render(React.createElement(Canvas,{
            gl: {
                preserveDrawingBuffer: true,
                premultipliedAlpha: false,
                alpha: true,
                transparent: true,
                antialias: ${meta['antialias'] || 'true'},
                precision: "highp",
                powerPreference: "high-performance"
            },
            dpr: [${window.devicePixelRatio},${window.devicePixelRatio}],
            camera: {
                fov: ${meta['camera-fov'] || 75},
                near: ${meta['camera-near'] || 0.1},
                far: ${meta['camera-far'] || 1000},
                position: ${JSON.stringify(meta['camera-position'] || [0, 0, 5])}
            },
            style:{ height: "${dims.height}${dims.heightUnits}", width: "${dims.width}${dims.widthUnits}" }
        },
        React.createElement(TextureMesh)                           
    ), embedRoot);
</script>`
        }


        function getIframeScript(dims) {
            let html = `<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        html, body{
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            border: 0;
        }
        .nt-embed{
            width: ${dims.width}${dims.widthUnits};
            height: ${dims.height}${dims.heightUnits};
        }
        .nt-embed div,
        .nt-embed div canvas{
            width: 100% !important;
            height: 100% !important;
        }
    </style>
    ${getScript({ width: 100, height: 100, widthUnits: "%", heightUnits: "%" })}
</head>
<body></body>
</html>`
            return `<iframe src="data:text/html;base64,${btoa(html)}" style="border:0;margin:0;width: ${dims.width}${dims.widthUnits};height:${dims.height}${dims.heightUnits};" />`

        }

        let iframe = getIframeScript(dims)
        let react = getScript(dims)
        let json = JSON.stringify({
            uniforms, fragmentShader, vertexShader
        }, null, 2)

        setEmbedCode(iframe)
        setReactCode(react)
        setJSONCode(json)

        return { react, iframe, json }
    }

    async function createReactEmbed() {
        let input = reactTextarea.current
        let embeds = await createEmbedCode()
        input.value = embeds.react
        copyToClipboard(input, "Copied React to clipboard")
    }

    async function createIframeEmbed() {
        let input = iframeTextarea.current
        let embeds = await createEmbedCode()
        input.value = embeds.iframe
        copyToClipboard(input, "Copied iFrame HTML to clipboard")
    }

    async function createJSONCode() {
        let input = jsonTextarea.current
        let embeds = await createEmbedCode()
        input.value = embeds.json
        copyToClipboard(input, "Copied JSON to clipboard")
    }

    async function copyToClipboard(input, message) {
        input.focus()
        input.select()
        document.execCommand('copy')
        FigmaScene.notify(message, { timeout: 1000 })
    }

    useEffect(() => {
        createEmbedCode()
    }, [])

    return ([<div className="embed-code">
        <div className="field field--horizontal">
            <label>Width</label>
            <div className="input-combo input--small">
                <input
                    type="number"
                    placeholder="Width"
                    className="input--small"
                    defaultValue={dimensions.width}
                    required
                    value={dimensions.width}
                    onInput={(e) => setDimensions({ ...dimensions, width: e.target.valueAsNumber })} />
                <SegmentedControl
                    name={"width-dimensions"}
                    className={"segmented-control--small"}
                    choices={[
                        { label: 'PX', selected: dimensions.widthUnits === 'px', props: { onClick: () => { setDimensions({ ...dimensions, widthUnits: 'px' }) } } },
                        { label: '%', selected: dimensions.widthUnits === '%', props: { onClick: () => { setDimensions({ ...dimensions, widthUnits: '%' }) } } }
                    ]} />
            </div>
        </div>
        <div className="field field--horizontal">
            <label>Height</label>
            <div className="input-combo input--small">
                <input
                    type="number"
                    placeholder="Width"
                    className="input--small"
                    defaultValue={dimensions.height}
                    required
                    value={dimensions.height}
                    onInput={(e) => setDimensions({ ...dimensions, height: e.target.valueAsNumber })} />
                <SegmentedControl
                    name={"height-dimensions"}
                    className={"segmented-control--small"}
                    choices={[
                        { label: 'PX', selected: dimensions.heightUnits === 'px', props: { onClick: () => { setDimensions({ ...dimensions, heightUnits: 'px' }) } } },
                        { label: '%', selected: dimensions.heightUnits === '%', props: { onClick: () => { setDimensions({ ...dimensions, heightUnits: '%' }) } } }
                    ]} />
            </div>
        </div>
        <div className="field field--textarea">
            <label>
                iFrame embed
                <button className="button button--link" onClick={createIframeEmbed}>Copy</button>
            </label>
            <textarea
                placeholder="Embed code"
                rows={1}
                ref={iframeTextarea}
                style={{ resize: 'none' }}
                autoFocus={true}
                className={"code"}
                onClick={createIframeEmbed}
                defaultValue={embedCode}
            ></textarea>
        </div>
        <div className="field field--textarea">
            <label>
                React
                <button className="button button--link" onClick={createReactEmbed}>Copy</button>
            </label>
            <textarea
                placeholder="Embed code"
                rows={1}
                ref={reactTextarea}
                style={{ resize: 'none' }}
                autoFocus={true}
                className={"code"}
                onClick={createReactEmbed}
                defaultValue={reactCode}
            ></textarea>
        </div>
        <div className="field field--textarea">
            <label>
                JSON
                <button className="button button--link" onClick={createJSONCode}>Copy</button>
            </label>
            <textarea
                placeholder="Embed code"
                rows={1}
                ref={jsonTextarea}
                style={{ resize: 'none' }}
                autoFocus={true}
                className={"code"}
                onClick={createJSONCode}
                defaultValue={jsonCode}
            ></textarea>
        </div>
    </div>])
}
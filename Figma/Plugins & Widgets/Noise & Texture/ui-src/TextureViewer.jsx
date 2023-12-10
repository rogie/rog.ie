import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { getUniforms, getMeta, objectToThreeUniforms, defaultOptionsToUniforms, customOptionsToUniforms, isNullImage } from "./shader-utils";
import shaders from "./default-shaders";
import './TextureViewer.css'
import { downloadPng, downloadVideo, exportVideo, exportWebM } from "./canvas-export"
import resolveLygia from './resolveLygia';
import { OrbitControls } from '@react-three/drei';
//import CCapture from 'ccapture.js'

const TextureMesh = (props) => {
    const mesh = useRef();
    const material = useRef();

    let {
        vertexShader,
        fragmentShader,
        uniforms,
        width,
        height,
        playing = true,
        meta = {},
        onFrameEnter = () => { }
    } = props

    let defaultUniforms = {
        u_time: {
            value: 0.0
        },
        u_mouse: {
            value: [0, 0]
        },
        u_resolution: {
            value: [width, height]
        }
    }

    const materialUniforms = useMemo(
        () => ({ ...defaultUniforms, ...uniforms, u_resolution: { value: [width, height] } }),
        []
    );


    /* const buffer = new THREE.WebGLRenderTarget(1, 1, {
         depthBuffer: false,
     });
     const bufferScene = new THREE.Scene();*/

    let updateUniforms = async () => {
        if (mesh.current) {
            mesh.current.material.uniforms.u_resolution = {
                value: [width, height]
            }
            for (var name in uniforms) {
                mesh.current.material.uniforms[name] = uniforms[name]
            }
        }

    }

    let then = 0;
    function fps(now) {
        const deltaTime = now - then;          // compute time since last frame
        then = now;                            // remember time for next frame
        return (1 / deltaTime) // compute frames per second
    }

    useFrame((state) => {
        const { clock, mouse, gl, scene, camera } = state;

        /* TODO: FPS 
        
        onFrameEnter({
            clock: clock,
            mouse: mouse,
            fps: fps(clock.elapsedTime)
        })
        */

        if (mesh.current) {
            mesh.current.material.uniforms.u_mouse.value = [mouse.x, mouse.y]
            if (playing) {
                mesh.current.material.uniforms.u_time.value = clock.getElapsedTime();
            }
        }
        let pos = meta['camera-position'];
        if (meta['orbitcontrols'] !== true) {
            pos = Array.isArray(pos) ? pos : [0, 0, 5]
            camera.position.set(pos[0], pos[1], pos[2]);
        }

        //camera.position.lookAt(mesh.current.position)

        /*
        // Render first scene into texture
        gl.setRenderTarget(renderTargetA);
        gl.clear();
        gl.render(scene, camera);

        gl.setRenderTarget(buffer);
        gl.clear();
        gl.render(bufferScene, camera);

        //Swap textureA and B
        var t = textureA;
        textureA = textureB;
        textureB = t;
        quad.material.map = textureB.texture;
        bufferMaterial.uniforms.bufferTexture.value = textureA.texture;

        //Update time
        mesh.current.material.uniforms.buffer.value = 

        //Finally, draw to the screen
        renderer.setRenderTarget(null);

        renderer.render(scene, camera);

        // Render full screen quad with generated texture
        // gl.setRenderTarget(null);
        //gl.clear();
        //gl.render(scene, camera);

        // Render second scene to screen
        // (using first scene as regular texture)
        gl.render(scene, camera);*/
    });

    useEffect(() => {
        updateUniforms()
        if (mesh.current) {
            mesh.current.material.fragmentShader = parseFragmentShader(fragmentShader)
            mesh.current.material.needsUpdate = true;
        }
    }, [fragmentShader, uniforms, width, height])

    let isGLSL3 = (fragmentShader) => {
        return /#version 300 es|#version 330 core/.test(fragmentShader)
    }

    let glslVersion = (fragmentShader = '') => {
        if (isGLSL3(fragmentShader)) {
            return THREE.GLSL3
        } else {
            return THREE.GLSL1
        }
    }

    let parseFragmentShader = (fragmentShader) => {
        return fragmentShader.replace(/#version 300 es|#version 330 core|#version 100/, '')
    }

    let Geometry
    let geometryArgs = Array.isArray(meta['geometry-args']) ? meta['geometry-args'] : [1, 1]
    switch (meta['geometry']) {
        case "icosahedron":
            Geometry = <icosahedronGeometry args={geometryArgs} />
            break;
        case "tetrahedron":
            Geometry = <tetrahedronGeometry args={geometryArgs} />
            break;
        case "polyhedron":
            Geometry = <polyhedronGeometry args={geometryArgs} />
            break;
        case "dodecahedron":
            Geometry = <dodecahedronGeometry args={geometryArgs} />
            break;
        case "torus":
            Geometry = <torusGeometry args={geometryArgs} />
            break;
        case "torusKnot":
            Geometry = <torusKnotGeometry args={geometryArgs} />
            break;
        case "cylinder":
            Geometry = <cylinderGeometry args={geometryArgs} />
            break;
        case "sphere":
            Geometry = <sphereGeometry args={geometryArgs} />
            break;
        case "box":
            Geometry = <boxGeometry args={geometryArgs} />
            break;
        case "plane":
            Geometry = <planeGeometry args={geometryArgs} />
            break;
        case "ring":
            Geometry = <ringGeometry args={geometryArgs} />
            break;
        case "capsule":
            Geometry = <capsuleGeometry args={geometryArgs} />
            break;
        default:
            Geometry = <planeGeometry args={[width, height]} />
            break;
    }

    return (<mesh
        ref={mesh}
        position={meta['mesh-position'] || [0, 0, 0]}
        scale={meta['mesh-scale'] || 1}
        rotation={meta['mesh-rotation'] || [0, 0, 0]}>
        {Geometry}
        <shaderMaterial
            fragmentShader={parseFragmentShader(fragmentShader)}
            vertexShader={vertexShader}
            ref={material}
            uniforms={materialUniforms}
            wireframe={meta['shader-wireframe'] || false}
            wireframeLinewidth={meta['shader-wireframe-linewidth'] || 0}
            dithering={false}
            flatShading={true}
            doubleSided={true}
            side={THREE.DoubleSide}
            glslVersion={glslVersion(fragmentShader)}
        />
    </mesh>);
}

function TextureViewer(props) {

    let {
        width = 128,
        height = 128,
        viewerWidth = 220,
        viewerHeight = 220,
        opacity = 1,
        showActions = true,
        animated = false,
        play = true,
        onFrameEnter = () => { },
        name = "texture",
        options = { u_scale: 0.5, blue: 0.5, alpha: 0.75 },
        type = "custom"
    } = props

    let [fragment, setFragment] = useState('')
    let [vertex, setVertex] = useState('')
    let [uniforms, setUniforms] = useState({})
    let [playing, setPlaying] = useState(play)
    let [meta, setMeta] = useState({})
    let canvas = useRef()
    let controls = useRef()

    function scaleToFit(objWidth, objHeight, boxWidth, boxHeight) {
        const widthRatio = boxWidth / objWidth;
        const heightRatio = boxHeight / objHeight;
        const minRatio = Math.min(widthRatio, heightRatio);
        const width = objWidth * minRatio;
        const height = objHeight * minRatio;
        return { width, height };
    }

    function getDimensions() {
        let dims = {
            width,
            height,
            viewerWidth,
            viewerHeight
        }
        /*
        if (uniforms.u_image) {
            if (uniforms.u_image_resolution && uniforms.u_image_resolution.value && uniforms.u_image_resolution.value.length && uniforms.u_image_resolution.value[0] > 0) {
                let w = uniforms.u_image_resolution.value[0]
                let h = uniforms.u_image_resolution.value[1]
                let scaled = scaleToFit(w, h, viewerWidth, viewerHeight);
            }
        }*/
        return dims
    }

    async function updateUniforms() {
        let frag = ''
        if (type === "custom") {
            frag = shaders.getShader(type, options.shader)
        } else {
            frag = shaders.getShader(type, options)
        }
        setFragment(frag)

        let vert = options.vertex || `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

        setMeta(getMeta(vert))

        if (vert.search('#include "lygia') > -1) {
            vert = resolveLygia(vert)
        }
        setVertex(vert)

        let u;
        if (type === "custom") {
            u = await customOptionsToUniforms(frag, options)
        } else {
            u = await defaultOptionsToUniforms(options, width)
        }
        let threeUniforms = await objectToThreeUniforms(u)
        setUniforms(threeUniforms)
    }

    let ViewerCanvas = <Canvas
        displayName={"Canvas"}
        gl={{
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
            alpha: true,
            transparent: true,
            antialias: meta['antialias'] || true,
            precision: "highp",
            powerPreference: "high-performance"
        }}
        ref={canvas}
        dpr={[1, 1]}
        camera={{
            fov: meta['camera-fov'] || 75,
            near: meta['camera-near'] || 0.1,
            far: meta['camera-far'] || 1000,
            position: meta['camera-position'] || [0, 0, 5]
        }}
        style={{ height: getDimensions().height, width: getDimensions().width, opacity: opacity, '--transform': `scale(${getDimensions().viewerWidth / getDimensions().width})` }}>
        <OrbitControls enabled={meta['orbitcontrols']} ref={controls} />
        {fragment && <TextureMesh
            displayName={"TextureMesh"}
            width={getDimensions().width}
            height={getDimensions().height}
            playing={playing}
            meta={meta}
            onFrameEnter={onFrameEnter}
            vertexShader={vertex}
            fragmentShader={fragment}
            uniforms={uniforms}
        />}
    </Canvas>

    useEffect(() => {
        updateUniforms()
    }, [])

    useEffect(() => {
        updateUniforms()
    }, [options])

    return (<div className="texture-viewer" style={{ width: getDimensions().viewerWidth, height: getDimensions().viewerHeight }}>
        {ViewerCanvas}
        {showActions && animated && <div className="texture-viewer-actions">
            {!playing &&
                <button className="icon tip-right button button--secondary" title="Play (u_time)" onClick={() => setPlaying(true)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M4 2.0979L4.765 2.57603L12.765 7.57602L13.4434 8.00002L12.765 8.42402L4.765 13.424L4 13.9021V13V3.00002V2.0979ZM5 3.90215V12.0979L11.5566 8.00002L5 3.90215Z" fill="currentColor" />
                    </svg>
                </button>
            }
            {playing && <button className="icon tip-right button button--secondary" title="Pause (u_time)" onClick={() => setPlaying(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3.5" y="3.5" width="9" height="9" stroke="currentColor" stroke-linecap="square" />
                </svg>
            </button>}
        </div>}

    </div>)
}

export default TextureViewer;

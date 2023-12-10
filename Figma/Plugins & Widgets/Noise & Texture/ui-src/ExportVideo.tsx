import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { exportThumbnail, exportTile, downloadPng, downloadVideo, exportVideo } from "./canvas-export";
import FieldRange from "./FieldRange";
import Toggle from "./Toggle";
import Checkbox from "./Checkbox";
import Spinner from "./Spinner";
import FigmaScene from '../ui-src/figma-scene';
import './ExportVideo.css'

export default function (props) {

    let { canvasContainer, texture } = props
    const [loop, setLoop] = useState(true)
    const [duration, setDuration] = useState(5)
    const [exporting, setExporting] = useState(false)
    const [addToCanvas, setAddToCanvas] = useState(false)

    async function exportAndDownload(e) {
        e.preventDefault()
        if (canvasContainer) {
            setExporting(true)
            let canvas = canvasContainer?.querySelector('canvas')
            let webm = await exportVideo(canvas, duration * 1000)

            if (addToCanvas) {
                // Attempt to add a video 
                FigmaScene.run(
                    async (args: {}) => {
                        let errorCreatingVideo = false
                        let video, paint
                        try {
                            video = await figma.createVideoAsync(args.webm)
                            paint = {
                                videoHash: video.hash,
                                type: "VIDEO",
                                scaleMode: "FILL"
                            }
                        } catch (error) {
                            errorCreatingVideo = true
                            figma.notify(error.toString(), { error: true })
                        }
                        if (!errorCreatingVideo) {
                            let layer = figma.createRectangle()
                            layer.resize(2048, 2048)
                            layer.x = Math.round(figma.viewport.center.x - layer.width / 2)
                            layer.y = Math.round(figma.viewport.center.y - layer.height / 2)
                            layer.fills = [paint]
                            figma.currentPage.appendChild(layer)
                            figma.currentPage.selection = [layer]
                            figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection)
                        }
                        return errorCreatingVideo
                    },
                    (error) => {
                        setExporting(false)
                        if (!error) {
                            close()
                        }
                    },
                    { webm: new Uint8Array(await webm.arrayBuffer()) }
                );
            } else {
                setExporting(false)
                downloadVideo(webm, texture.label)
            }
        }
    }

    return (
        <form className={"export-video"} onSubmit={exportAndDownload}>
            <main>
                <FieldRange
                    name={"duration"}
                    min={1}
                    step={1}
                    max={10}
                    showLabels={true}
                    units={"s"}
                    value={duration}
                    onInput={(e) => setDuration(e.target.valueAsNumber)}
                />
                {/*<Toggle
                name={"loop"}
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)} />
            */}
                <Checkbox
                    name="canvas"
                    label="Add to canvas"
                    checked={addToCanvas}
                    onChange={(e) => setAddToCanvas(e.target.checked)}
                />
            </main>
            <footer>
                {exporting && <Spinner />}
                <button type="submit" className={`button button--small`} disabled={exporting} onClick={exportAndDownload}>
                    {exporting ? 'Exporting...' : 'Export'}
                </button>
            </footer>
        </form>
    )
}
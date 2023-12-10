import React, { useCallback, useState, cloneElement } from "react"
import { capitalize } from "./utils"
import FigmaScene from './figma-scene';

const nullImage = 'data:image/png;base64'

export default function (props) {

    const [url, setUrl] = useState(props.value)
    const label = props.label || props.name.replace('u_', '')

    async function bytesToImage(imageBytes) {
        return new Promise((resolve, reject) => {
            let img = new Image()
            img.src = URL.createObjectURL(new Blob([new Uint8Array(imageBytes)], { type: 'image/png' }));
            img.onload = function () {
                resolve(img)
            }
            img.onerror = function () {
                reject(new Error('Could convert shape image data'))
            }
        })
    }

    async function bytesToBase64(imageBytes) {
        return new Promise((resolve, _) => {
            const blob = new Blob([new Uint8Array(imageBytes)], { type: 'image/png' });
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    function removeLayer() {
        setUrl(nullImage)
        props.onInput({ target: { name: props.name, type: "image", value: nullImage } })
    }

    const onInput = (b64Url) => {
        setUrl(b64Url)
        let i = new Image();
        i.src = b64Url
        props.onInput({ target: { name: props.name, type: "image", value: b64Url } })
    }

    const isNullImage = () => {
        return url === nullImage
    }

    const chooseLayer = () => {
        FigmaScene.run(
            async () => {
                return new Promise(async (resolve, reject) => {
                    let previousSelection = figma.currentPage.selection
                    scene.choosingLayer = true
                    figma.notify("Choose a Figma layer", { timeout: 1500 })
                    let choose = async () => {
                        let node = figma.currentPage.selection[0]
                        if (node) {

                            // get the image data 
                            let bytes = await node.exportAsync({
                                format: "PNG",
                                constraint: { type: 'WIDTH', value: Math.floor(Math.min(1024, node.width)) }
                            })
                            let imageBytes = Array.from(bytes)
                            figma.off("selectionchange", choose)
                            figma.currentPage.selection = []
                            resolve({ imageBytes })
                        }
                    }
                    figma.on("selectionchange", choose)
                })
            },
            async (args) => {

                let b64Url = await bytesToBase64(args.imageBytes)
                onInput(b64Url)
                FigmaScene.run(() => {
                    scene.choosingLayer = false
                    figma.notify(`Added your image`)
                }, () => {

                })
            }
        )
    }
    let Content
    if (props.content) {
        Content = cloneElement(
            props.content,
            { onClick: chooseLayer }
        );
    }

    return (Content || <div className={`field field--horizontal field--image ${props.disabled ? "disabled" : ""}`}>
        {props.before}
        <label>{capitalize(label)}</label>
        {isNullImage() && <button className="button button--small button--secondary" onClick={chooseLayer}>Choose layer</button>}
        {!isNullImage() && [<img src={url} />, <button className="button button--small button--secondary" onClick={removeLayer}>Remove</button>]}
    </div >)
}
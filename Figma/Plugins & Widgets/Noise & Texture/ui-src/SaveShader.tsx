import React, { useCallback, useState, useRef, useEffect, useImperativeHandle } from "react"
import ReactDOM from "react-dom";
import FigmaScene from './figma-scene';
import { saveShader } from './manage-saved-shaders'
import { uuidv4 } from './utils'
import { exportThumbnail } from "./canvas-export";
import DynamicDialog from "./DynamicDialog";


export default function (props) {

    let { generateThumbnail, type, shader, onSave } = props

    const [thumbnail, setThumbnail] = useState(null)
    const [shaderName, setShaderName] = useState('')
    const dialog = useRef(null)

    const getThumbnail = async (e) => {
        let thumb = await generateThumbnail(64)
        setThumbnail(thumb)
    }

    const save = async (e) => {
        e.preventDefault()
        if (!shaderName.trim()) {
            FigmaScene.notify("Please enter a name", { error: true, timeout: 2000 })
        } else {
            let texture = { ...shader }
            texture.thumbnail = thumbnail.src
            texture.label = shaderName
            texture.uuid = texture.uuid || uuidv4()
            for (var o in texture.options) {
                let opt = texture.options[o]
                if (opt !== undefined && opt !== null && (opt).constructor.name === 'String' && opt.startsWith("data:image/png;base64")) {
                    texture.options[o] = "data:image/png;base64"
                }
            }
            texture.user = await FigmaScene.getCurrentUser()

            let { saved, all } = await saveShader(texture)

            // get size
            const size = new TextEncoder().encode(JSON.stringify(saved)).length
            const kiloBytes = size / 1024;
            const megaBytes = kiloBytes / 1024;

            onSave(saved, all)
            if (dialog.current) {
                dialog.current.close()
            }
        }
    }

    const updateName = (e) => {
        setShaderName(e.target.value)
    }

    useEffect(() => {
        setShaderName(shader.label)
    }, [shader])

    return ([
        <DynamicDialog
            modal={false}
            ref={dialog}
            className={"save"}
            clickOutsideToClose={true}
            onOpen={getThumbnail}
            closeButton={true}
            title={"Save texture"}
            trigger={<button className="button button--small button--secondary">Save</button>}>
            <form onSubmit={save}>
                <main>
                    <div className="shader-list-item">
                        {thumbnail && <img src={thumbnail.src} key="thumbnail" className="shader-thumbnail" />}
                        <input type="text" placeholder="Name your texture" value={shaderName} required autoFocus={true} onInput={updateName} />
                    </div>
                </main>
                <footer>
                    <button className="button button--small" type="submit" onClick={save}>Save</button>
                </footer>
            </form>
        </DynamicDialog>])
}
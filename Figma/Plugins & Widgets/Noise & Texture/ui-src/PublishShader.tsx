import React, { useCallback, useState, useRef, useEffect } from "react"
import ReactDOM from "react-dom";
import FigmaScene from './figma-scene';
import Signin from "./Signin";
import { saveShader } from './manage-saved-shaders'
import { decode } from 'base64-arraybuffer'
import { uuidv4 } from './utils'


export default function (props) {

    let { generateThumbnail, shader, onPublish = () => { }, session, supabase, onSigninOut } = props

    const dialog = useRef<HTMLDialogElement>(null)
    const [thumbnail, setThumbnail] = useState(null)
    const [name, setName] = useState('')
    const [tags, setTags] = useState('')
    const [description, setDescription] = useState('')

    const open = async (e) => {
        let thumb = await generateThumbnail(512, 'image/png', 1, false)

        //get published
        let published
        if (shader.resource_id) {
            published = await getPublishedResource(shader.resource_id)
        }
        if (published) {
            setDescription(published.description)
            setTags(published.tags.join(","))
        }

        /*let { data, error } = await supabase
            .storage
            .from('textures')
            .getPublicUrl('thumbnails/dither.png')*/

        setThumbnail(thumb)
        if (dialog.current?.showModal) {
            dialog.current?.showModal()
        } else {
            dialog.current.setAttribute('open', '')
        }
        let empty = dialog.current?.querySelector("input:empty, textarea:empty")
        if (empty) {
            empty.focus()
        }
    }

    const isValid = () => {
        return name.trim() && description.trim()
    }

    const getPublishedResource = async (id) => {
        const { data, error } = await supabase
            .from('textures')
            .select()
            .eq('id', id)
        return data.length > 0 ? data[0] : null;
    }

    const uploadThumbnail = async (uuid, base64Src) => {
        const { data, error } = await supabase
            .storage
            .from('textures')
            .upload(`thumbnails/${uuid}.png`,
                decode(base64Src.replace(`data:image/png;base64,`, '')),
                {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: 'image/png'
                })

        if (error) {
            FigmaScene.notify(error.message, { error: true, timeout: 2000 })
        }
    }

    const publish = async () => {

        if (session && session.profile.publisher) {

            if (!isValid()) {
                FigmaScene.notify("Please enter a name and a description.", { error: true, timeout: 2000 })
            } else {

                let texture = { ...shader }
                texture.label = name
                //opts.noise.uuid = opts.noise.uuid || uuidv4()
                texture.user = await FigmaScene.getCurrentUser()
                for (var o in texture.options) {
                    let opt = texture.options[o]
                    if (opt !== undefined && opt !== null && (opt).constructor.name === 'String' && opt.startsWith("data:image/png;base64")) {
                        texture.options[o] = "data:image/png;base64"
                    }
                }
                const textureData = JSON.parse(JSON.stringify(shader))
                delete textureData.thumbnail
                const publishData = {
                    name: name,
                    description: description,
                    tags: tags.split(',').map(tag => tag.trim()),
                    data: textureData,
                    user_id: session.user.id,
                    thumbnail_id: uuidv4(),
                    updated_at: (new Date()).toISOString()
                }
                if (texture.resource_id) {
                    publishData.id = texture.resource_id
                }
                const { data, error } = await supabase
                    .from('textures')
                    .upsert(publishData)
                    .select()

                if (!error) {
                    let resource = data[0]
                    texture.resource_id = resource.id

                    await uploadThumbnail(resource.thumbnail_id, thumbnail.src)

                    let { saved, all } = await saveShader(texture)
                    onPublish(saved, all)
                    FigmaScene.notify(`Published ${name} to community textures`)
                    close()
                } else {
                    FigmaScene.notify(error.message, { error: true, timeout: 2000 })
                }
            }
        } else {
            FigmaScene.notify('You have to be a publisher', { error: true, timeout: 2000 })
        }
    }

    const close = () => {
        if (dialog.current?.close) {
            dialog.current?.close()
        } else {
            dialog.current.removeAttribute('open', '')
        }
    }

    useEffect(() => {
        setName(shader.label)
    }, [shader])

    return (
        [<button className="button button--small button--secondary" onClick={open}>
            Publish
        </button>,
        ReactDOM.createPortal(
            <dialog ref={dialog} className="publish-community-resource">
                <header>
                    <h3>Publish {shader.uuid ? name : "new texture"}</h3>
                    <button className="button icon" onClick={close}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M11.6464 3.64645C11.8417 3.45118 12.1583 3.45118 12.3536 3.64645C12.5488 3.84171 12.5488 4.15829 12.3536 4.35355L8.70711 8L12.3536 11.6464C12.5488 11.8417 12.5488 12.1583 12.3536 12.3536C12.1583 12.5488 11.8417 12.5488 11.6464 12.3536L8 8.70711L4.35355 12.3536C4.15829 12.5488 3.84171 12.5488 3.64645 12.3536C3.45118 12.1583 3.45118 11.8417 3.64645 11.6464L7.29289 8L3.64645 4.35355C3.45118 4.15829 3.45118 3.84171 3.64645 3.64645C3.84171 3.45118 4.15829 3.45118 4.35355 3.64645L8 7.29289L11.6464 3.64645Z" fill="currentColor" />
                        </svg>
                    </button>
                </header>
                <main>

                    <div className="community-resource-thumbnail">
                        {thumbnail && <img src={thumbnail.src} />}
                    </div>
                    <div className="publish-community-resource-form">
                        <div className="field field--horizontal field--text">
                            <label>Name</label>
                            <input type="text" placeholder="Name your texture" value={name} required autoFocus={true} onInput={e => setName(e.target.value)} />
                        </div>
                        <div className="field field--horizontal field--textarea">
                            <label>Description</label>
                            <textarea
                                placeholder="Describe your texture"
                                required
                                rows={8}
                                autoFocus={true}
                                value={description}
                                onInput={e => setDescription(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="field field--horizontal field--text">
                            <label>Tags</label>
                            <input type="text" placeholder="Add, tags, here" value={tags} onInput={e => setTags(e.target.value)} />
                        </div>
                    </div>
                </main>
                <footer>
                    <button className="button button--small button--secondary button--small" onClick={close}>Cancel</button>
                    <Signin onSigninOut={onSigninOut} supabase={supabase} />
                    {session && session.profile && session.profile.publisher === true && <button className="button button--small" onClick={publish}>Publish</button>}
                </footer>
            </dialog >,
            document.getElementById('root')
        )
        ]
    )
}
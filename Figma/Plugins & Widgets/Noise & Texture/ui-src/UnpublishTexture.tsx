import React, { useCallback, useState, useRef, useEffect } from "react"
import ReactDOM from "react-dom";
import FigmaScene from './figma-scene';
import { ReactComponent as IconClose } from "./icons/close.svg";
import { ReactComponent as IconTrash } from "./icons/trash.svg";

export default function (props) {

    let { resource, session, supabase, onUnpublish = () => { } } = props

    const dialog = useRef<HTMLDialogElement>(null)
    const isOwner = resource.user_id === session?.user?.id

    function thumbnailUrl(resource) {
        return resource.thumbnail_id ? `${supabase.storageUrl}/object/public/textures/thumbnails/${resource.thumbnail_id}.png` : resource.data.thumbnail
    }

    const open = async (e) => {
        if (dialog.current?.showModal) {
            dialog.current?.showModal()
        } else {
            dialog.current.setAttribute('open', '')
        }
    }

    const unpublish = async () => {

        const { error } = await supabase
            .from('textures')
            .delete()
            .eq('user_id', resource.user_id)
            .eq('id', resource.id)

        onUnpublish(resource)
        if (error) {
            FigmaScene.notify(error, { error: true, timeout: 2000 })
        } else {
            FigmaScene.notify(`Unpublished ${resource.name} from community textures`)
            close()
        }
    }

    const close = () => {
        if (dialog.current?.close) {
            dialog.current?.close()
        } else {
            dialog.current.removeAttribute('open', '')
        }
    }

    return (
        [isOwner && <button className="button button--small button--secondary icon" onClick={open}>
            <IconTrash />
        </button>,
        ReactDOM.createPortal(
            <dialog ref={dialog}>
                <header>
                    <h3>Unpublish from community?</h3>
                    <button className="button icon" onClick={close}>
                        <IconClose />
                    </button>
                </header>
                <main>
                    <div className="shader-list-item">
                        <img src={thumbnailUrl(resource)} className="shader-thumbnail" />
                        <label>{resource.name}</label>
                    </div>
                </main>
                <footer>
                    <button className="button button--small button--secondary" onClick={close}>Cancel</button>
                    <button className="button button--small" onClick={unpublish}>Unpublish</button>
                </footer>
            </dialog>,
            document.getElementById('root')
        )
        ]
    )
}
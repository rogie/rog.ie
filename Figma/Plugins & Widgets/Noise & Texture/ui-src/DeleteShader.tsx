import React, { useCallback, useState, useRef } from "react"
import ReactDOM from "react-dom";
import { removeShader } from './manage-saved-shaders'
import { ReactComponent as IconClose } from "./icons/close.svg";
import { ReactComponent as IconTrash } from "./icons/trash.svg";

export default function (props) {

    let { options, onRemove, className } = props

    const dialog = useRef<HTMLDialogElement>(null)

    const open = async (e) => {
        if (dialog.current?.showModal) {
            dialog.current?.showModal()
        } else {
            dialog.current.setAttribute('open', '')
        }
    }

    const remove = async (e) => {
        let { removed, all } = await removeShader(options.noise ? options.noise : options)
        onRemove(removed, all)
        close()
    }

    const close = () => {
        if (dialog.current?.close) {
            dialog.current?.close()
        } else {
            dialog.current.removeAttribute('open', '')
        }
    }

    return ([
        options.noise.uuid && <div className={className} onClick={open}>Delete texture</div>,
        ReactDOM.createPortal(
            <dialog ref={dialog}>
                <header>
                    <h3>Delete texture?</h3>
                    <button className="button icon" onClick={close}>
                        <IconClose />
                    </button>
                </header>
                <main>
                    <div className="shader-list-item">
                        <img src={options.noise.thumbnail} className="shader-thumbnail" />
                        <label>{options.noise.label}</label>
                    </div>
                </main>
                <footer>
                    <button className="button button--small button--secondary" onClick={remove}>Delete</button>
                </footer>
            </dialog>,
            document.getElementById('root')
        )])
}
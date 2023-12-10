import React, { useCallback, useState, useRef, useEffect, useLayoutEffect, cloneElement, useImperativeHandle, forwardRef } from "react"
import ReactDOM from "react-dom"
import './DynamicDialog.css'
import useClickOutside from "./useClickOutside"
import Spinner from "./Spinner";


export default forwardRef(function (props, ref) {
    let {
        className = '',
        open = false,
        clickOutsideToClose = true,
        children,
        anchor = null,
        offset = 8,
        modal = false,
        loading = false,
        closeButton = false,
        title = null,
        trigger = null,
        autofocus = true,
        contentProps = {},
        onOpen = () => { },
        onClose = () => { },
        pin = "bottom"
    } = props

    let [history, setHistory] = useState([])
    const [isOpen, setIsOpen] = useState(open)
    const dialog = useRef<HTMLDialogElement>(null)
    const dialogContent = useRef<HTMLDivElement>(null)
    const [style, setStyle] = useState({
        position: "fixed",
        height: "auto",
        transform: "translate(0, 100vh)",
        borderBottomLeftRadius: pin == "bottom" ? 0 : null,
        borderBottomRightRadius: pin == "bottom" ? 0 : null,
    })

    useImperativeHandle(ref, () => {
        return {
            close() {
                toggleDialog(false)
            },
            open() {
                toggleDialog(true)
            }
        };
    }, []);

    function getDialogLayout() {
        let contentBox = dialogContent.current?.getBoundingClientRect()
        let winBox = document.documentElement?.getBoundingClientRect()
        if (!contentBox || !winBox) return

        let layout = {
            height: contentBox.height,
            width: contentBox.width
        }
        let anchorBox = document.documentElement?.getBoundingClientRect()
        if (anchor && anchor.current) {
            anchorBox = anchor.current?.getBoundingClientRect()
        }
        let top = anchorBox.bottom - contentBox.height - (pin == "bottom" ? 0 : offset)
        if (top < winBox.top) {
            top = winBox.top + (pin == "top" ? 0 : offset)
        }
        layout.transform = `translate(0,${top}px)`
        return layout
    }

    let reLayout = () => {
        setStyle({
            ...style,
            ...getDialogLayout()
        })
        window.removeEventListener('resize', reLayout)
        window.addEventListener('resize', reLayout)
    }

    useLayoutEffect(() => {
        /*if (open) {
            history.push({
                title: title,
                children: children
            })
            setHistory([...history])
        }*/
        reLayout()
    }, [children])

    useClickOutside(dialog, () => {
        if (isOpen && clickOutsideToClose) {
            toggleDialog(false)
        }
    })

    const onCancel = (event) => {
        if (isOpen && modal) {
            event.preventDefault()
        }
    }

    /*const getDialogContent = () => {
        return history.length === 0 ? children : history[history.length - 1].children
    }

    const back = () => {
        history.pop()
        setHistory([...history])
    }*/

    const toggleDialog = (on = isOpen) => {
        if (on) {
            if (modal) {
                dialog.current.close()
                dialog.current.showModal()
            } else {
                dialog.current.show()
            }
            onOpen()
        } else {
            dialog.current.close()
            onClose()
        }
        setIsOpen(on)
    }

    useEffect(() => {
        toggleDialog(open)
    }, [open, modal])

    /*
    let portal = document.getElementById(id)
    if (!portal) {
        portal = document.createElement('div')
        portal.setAttribute('id', id)
        document.body.appendChild(portal)
    }
    */
    let Trigger = <></>
    if (trigger) {
        Trigger = cloneElement(
            trigger,
            {
                onClick: () => toggleDialog(true)
            }
        )
    }

    return ([
        Trigger,
        ReactDOM.createPortal(
            <dialog
                ref={dialog}
                style={style}
                className={`dynamic-dialog ${className} dynamic-dialog--pin-${pin}`}
                autofocus={autofocus}
                onCancel={onCancel}
                open={isOpen}>
                <div
                    ref={dialogContent}
                    className="dynamic-dialog-content"
                    {...contentProps}>
                    {title &&
                        <header>
                            <h3>{title}</h3>
                            {!loading && closeButton &&
                                <button className="button icon button--small" onClick={() => toggleDialog(false)}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M11.6464 3.64645C11.8417 3.45118 12.1583 3.45118 12.3536 3.64645C12.5488 3.84171 12.5488 4.15829 12.3536 4.35355L8.70711 8L12.3536 11.6464C12.5488 11.8417 12.5488 12.1583 12.3536 12.3536C12.1583 12.5488 11.8417 12.5488 11.6464 12.3536L8 8.70711L4.35355 12.3536C4.15829 12.5488 3.84171 12.5488 3.64645 12.3536C3.45118 12.1583 3.45118 11.8417 3.64645 11.6464L7.29289 8L3.64645 4.35355C3.45118 4.15829 3.45118 3.84171 3.64645 3.64645C3.84171 3.45118 4.15829 3.45118 4.35355 3.64645L8 7.29289L11.6464 3.64645Z" fill="currentColor" />
                                    </svg>
                                </button>}
                            {loading && <Spinner />}
                        </header>}
                    {children}
                </div>
            </dialog>,
            document.body
        )
    ])
})
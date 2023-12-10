import React, { useState, useRef, useLayoutEffect, cloneElement } from "react";
import ReactDOM from "react-dom";
import './Tooltip.css'

export default function (props) {

    let { text, align = "top", offset = 4 } = props

    const tooltip = useRef<HTMLDivElement>(null)
    const [shown, setShown] = useState(false)
    const [target, setTarget] = useState(null)
    const [style, setStyle] = useState({})

    const show = (e) => {
        setTarget(e.currentTarget)
        setShown(true)
    }

    const hide = () => {
        setShown(false)
    }

    const clone = cloneElement(
        props.children,
        {
            onMouseOver: show,
            onMouseOut: hide,
            title: null
        }
    )

    useLayoutEffect(() => {
        if (shown && tooltip.current) {
            let box = target.getBoundingClientRect()
            let tipBox = tooltip.current.getBoundingClientRect()
            let windowBox = document.documentElement.getBoundingClientRect()
            let x = box.left + box.width / 2 - tipBox.width / 2
            let xOverlap = x + tipBox.width
            let xMax = windowBox.width - 8
            x = xOverlap <= xMax ? x : x + (xMax - xOverlap)
            x = Math.max(8, x)

            let tooltipStyle = {
                position: 'fixed'
            }
            if (align === "right") {
                tooltipStyle.left = box.left + box.width + offset
                tooltipStyle.top = box.top + box.height / 2
            } else if (align === "top") {
                tooltipStyle.left = x
                tooltipStyle.top = box.top - offset - tipBox.height
            } else if (align === "bottom") {
                tooltipStyle.left = x
                tooltipStyle.top = box.bottom + offset
            }
            setStyle(tooltipStyle)
        }
    }, [shown])

    return ([
        clone,
        ReactDOM.createPortal(
            <>{shown && <div className={`tooltip ${shown ? 'tooltip--shown' : 'tooltip--hidden'} tooltip--${align}`} style={style} ref={tooltip}>{text}</div>}</>,
            document.getElementById('root')
        )
    ])
}
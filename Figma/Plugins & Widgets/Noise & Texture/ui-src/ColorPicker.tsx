import React, { useCallback, useRef, useState, useEffect, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { HexAlphaColorPicker, HexColorPicker } from "react-colorful";
import useClickOutside from "./useClickOutside";

export default function (props) {
    let { color, onChange, alpha = true } = props
    const popover = useRef();
    const picker = useRef();
    const [isOpen, toggle] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState({})
    const close = useCallback(() => toggle(false), []);

    function getOpaqueColor() {
        return color.substring(0, 7)
    }

    useClickOutside(popover, close);

    useLayoutEffect(() => {
        if (isOpen) {
            if (picker.current) {

                let box = picker.current.getBoundingClientRect()
                let pBox = popover.current.getBoundingClientRect()
                let wBox = document.documentElement.getBoundingClientRect()
                let xOverlap = wBox.width - 8 - (box.left + pBox.width)
                let popoverStyle = {
                    position: 'fixed'
                }
                let pad = 16
                let top = box.top - pBox.height
                if (top < pad) {
                    top = box.top + box.height + pad
                }
                popoverStyle.top = top
                popoverStyle.left = box.left - 4 + (xOverlap < 0 ? xOverlap : 0)

                setPopoverStyle(popoverStyle)
            }
        }
    }, [isOpen]);

    useEffect(() => {
        window.removeEventListener('blur', close)
        window.addEventListener('blur', close)
    }, [])

    return (
        <div className="picker" ref={picker}>
            <div
                className="swatch"
                title="Choose a color"
                onClick={() => toggle(true)}>
                <div className="swatch-color-opaque" style={{ backgroundColor: getOpaqueColor() }}></div>
                <div
                    className="swatch-color"
                    style={{ backgroundColor: color }}></div>
            </div>

            {isOpen && ReactDOM.createPortal(
                <div className="popover color-picker" ref={popover} style={popoverStyle}>
                    {alpha === true && <HexAlphaColorPicker color={color} onChange={onChange} />}
                    {alpha === false && <HexColorPicker color={color} onChange={onChange} />}
                    {props.children}
                </div>,
                document.getElementById('root')
            )}
        </div>
    )
}

import React, { useCallback, useEffect, useRef, useState } from "react"
import { capitalize } from "./utils"
import './Range.css'
import Tooltip from "./Tooltip"

export default function (props) {

    let { value, max, min, step, disabled, showLabels = false, units, name, transform = (val) => { return val; } } = props
    const [editingInput, setEditingInput] = useState(false)
    const [focused, setFocused] = useState(false)
    const textInput = useRef<HTMLInputElement>(null)
    const textValue = useRef<HTMLSpanElement>(null)

    const label = props.label || props.name.replace(/u_/, '').replace(/_/, ' ')

    const getRangeStyle = (value: number, max: number, min: number = 0) => {
        let percent = (value - min) / (max - min)
        let style = {
            ['--percent' as any]: percent,
            ['--value' as any]: value
        }
        return style
    }
    const onInput = (e) => {
        let v = Number(e.target.value)
        //setValue(v)
        value = v
        props.onInput(e)
    }

    const getInputValue = () => {
        let val = transform(value)
        val = val.toFixed(2).replace(/\.0+$/, '')
        if (props.tip) {
            val = props.tip
        }
        return val
    }

    const onTextInput = (e) => {
        let val = e.target.valueAsNumber
        let transformed = (val / transform(max)) * max
        transformed = transformed > max ? max : (transformed < min ? min : transformed)
        props.onInput({ target: { value: transformed, name: name } })
        //textInput.current?.innerText = value
    }

    const onDoubleClick = (e) => {
        e.preventDefault()
        setEditingInput(true)
    }

    const getTextValueWidth = () => {
        let width = ''
        if (editingInput && textValue.current) {
            width = textValue.current?.clientWidth
        }
        return width
    }

    const keyPress = (e) => {
        if (focused) {

        }
    }

    useEffect(() => {
        if (editingInput) {
            textInput.current?.focus()
            textInput.current?.select()
        }
    }, [editingInput])

    useEffect(() => {
        if (focused) {
            document.addEventListener('keypress', keyPress)
        } else {
            document.removeEventListener('keypress', keyPress)
        }
    }, [focused])



    return (<div className={`field field--horizontal ${disabled ? "disabled" : ""}`}>
        {props.before}
        <label>{capitalize(label)}</label>
        <div className={`range ${editingInput ? "range--editing" : ""} ${showLabels ? "range--show-labels" : ""}`} onDoubleClickCapture={onDoubleClick}>
            <input
                type="range"
                style={getRangeStyle(value, max, min)}
                {...props}
                onFocus={(e) => setFocused(true)}
                onBlur={(e) => setFocused(false)}
                onInput={onInput}
                onClick={e => e.preventDefault()}
            />
            <div className="range-number-tip">
                <span className="range-number-value" ref={textValue}>{getInputValue()}</span>
                <input ref={textInput}
                    type="number"
                    className="range-number-input"
                    min={min}
                    max={max}
                    step={step}
                    onInput={onTextInput}
                    defaultValue={getInputValue()}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => setEditingInput(false)}
                />
                <span className="range-number-units">{units || props["data-units"]}</span>
            </div>
        </div>
        {props.after}
    </div >)
}
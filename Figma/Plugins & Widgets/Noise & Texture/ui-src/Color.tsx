import React, { useCallback, useState } from "react"
import ColorPicker from "./ColorPicker";
import { capitalize } from "./utils"
import { HexColorInput } from "react-colorful";

export default function (props) {

    let { value, disabled, alpha = true } = props

    const label = props.label || props.name.replace(/u_/, '').replace(/_/, ' ')

    const onColorPickerInput = (color) => {
        props.onInput({ target: { name: props.name, type: "color", value: color } })
    }

    return (<div className={`field field--horizontal field--color ${disabled ? "disabled" : ""}`}>
        {props.before}
        <label>{capitalize(label)}</label>
        <label className="color">
            {Array.isArray(value) && <>
                {value.map((val, i) => <ColorPicker
                    color={val}
                    alpha={alpha}
                    onChange={(color) => {
                        value[i] = color
                        onColorPickerInput(value)
                    }}>
                    <HexColorInput
                        color={val}
                        alpha={alpha}
                        prefixed={true}
                        type={"text"}
                        onChange={(color) => {
                            value[i] = color
                            onColorPickerInput(value)
                        }} />
                </ColorPicker>
                )}
            </>}
            {value.constructor.name === 'String' && <>
                <ColorPicker
                    color={value}
                    alpha={alpha}
                    onChange={onColorPickerInput} />
                <HexColorInput
                    color={value}
                    alpha={alpha}
                    prefixed={true}
                    type={"text"}
                    onChange={onColorPickerInput} />
            </>}
        </label>
        {props.after}
    </div>)
}
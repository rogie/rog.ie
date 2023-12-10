import React, { useCallback, useEffect, useRef, useState } from "react"
import { capitalize } from "./utils"
import './Toggle.css'

export default function (props) {

    let { checked, disabled, name } = props

    const label = props.label || props.name.replace(/u_/, '').replace(/_/, ' ')

    const onChange = (e) => {
        let v = e.target.valueAsNumber
        props.onChange(e)
    }

    return (<div className={`field field--horizontal ${disabled ? "disabled" : ""}`}>
        <label>
            {capitalize(label)}
        </label>
        <div className="toggle">
            <input type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange} />
            <div className="toggle-thumb" />
        </div>
    </div>)
}



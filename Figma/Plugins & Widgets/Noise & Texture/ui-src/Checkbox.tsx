import React, { useCallback, useEffect, useRef, useState } from "react"

export default function (props) {

    let { checked, disabled, name } = props

    const label = props.label || props.name.replace(/u_/, '').replace(/_/, ' ')

    const onChange = (e) => {
        let v = e.target.valueAsNumber
        props.onChange(e)
    }

    return (<div className={`field field--horizontal ${disabled ? "disabled" : ""}`}>
        <label>
            {label}
        </label>
        <input type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange} />
    </div>)
}



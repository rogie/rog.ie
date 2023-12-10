import React, { useCallback, useState, useRef, useEffect, useLayoutEffect } from "react"
import './SegmentedControl.css'

export default function (props) {

    let { className = '', choices = [], name, style = {}, sizing = "auto" } = props

    let [focusStyle, setFocusStyle] = useState({})
    let control = useRef()

    let choiceClick = (e, choice) => {
        let target = e.currentTarget;
        setFocusRect(target)
        if (choice.props && choice.props.onClick) {
            choice.props.onClick(e)
        }
    }

    let setFocusRect = (target) => {
        let box = target.getBoundingClientRect();
        setFocusStyle({
            width: box.width,
            transform: `translateX(${target.offsetLeft}px)`
        })
    }

    useLayoutEffect(() => {
        if (control.current) {
            let index = choices.indexOf(choices.find(choice => choice.selected))
            let label = control.current.querySelector(`label[for="${name}-${index}"]`)
            setFocusRect(label)
        }
    }, [choices])

    return (<div className={`segmented-control ${className} segmented-control--${sizing}`} style={style} ref={control}>
        {choices.map((choice, index) => <>
            <input id={`${name}-${index}`} type="radio" name={name} defaultChecked={choice.selected} checked={choice.selected} />
            <label for={`${name}-${index}`} {...choice.props} onClick={e => choiceClick(e, choice)}>{choice.label}</label>
        </>)}
        <div className="segmented-control-focus" style={focusStyle} />
    </div>)
}
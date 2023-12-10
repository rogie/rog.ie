import React, { useCallback, useState, useRef, useEffect } from "react"
import ReactDOM from "react-dom";
import './Dropdown.css'
import useClickOutside from "./useClickOutside";

export default function (props) {

    let { choices, label, className = '', buttonClass = '', menuClass = '', direction = "down", align = "left", onChoose = () => { }, showCaret = true, offset = 0 } = props
    const [isOpen, toggle] = useState(false)
    const menu = useRef<HTMLDivElement>(null)
    const choiceList = useRef<HTMLMenuElement>(null)
    const [choiceListStyle, setChoiceListStyle] = useState(null)

    const clickChoice = (choice) => {
        onChoose(choice)
        toggle(false)
        if (choice.href) {
            window.open(choice.href, "_blank")
        }
        if (choice.function) {
            choice.function(choice)
        }
    }

    const close = useCallback(() => {
        toggle(false)
    }, []);
    useClickOutside(menu, close);

    useEffect(() => {
        window.removeEventListener('blur', close)
        window.addEventListener('blur', close)
    }, [])

    useEffect(() => {
        if (isOpen && menu.current) {
            let box = menu.current.getBoundingClientRect()
            let list = choiceList.current?.getBoundingClientRect()

            let choiceListStyle = {
                position: 'fixed'
            }
            if (align === "right") {
                choiceListStyle.right = document.documentElement.clientWidth - box.right
                choiceListStyle.left = "auto"
            } else if (align === "top") {
                choiceListStyle.right = "auto"
                choiceListStyle.left = box.left
            }

            if (direction === "up") {
                choiceListStyle.top = "auto"
                choiceListStyle.bottom = document.documentElement.clientHeight - box.bottom + offset
            } else {
                choiceListStyle.top = box.bottom + offset
                choiceListStyle.bottom = "auto"
            }

            setChoiceListStyle(choiceListStyle)

            if (choiceList.current) {
                let selectedMode = choiceList.current.querySelector('.dropdown-item.checked')
                if (selectedMode) {
                    setTimeout(() => selectedMode.scrollIntoView(), 100)
                }
            }
        }



    }, [isOpen])


    return ([<div ref={menu} className={`dropdown ${className} ${isOpen ? 'dropdown--open' : ''} dropdown--${direction} dropdown--${align}`}>
        <button className={`dropdown-trigger ${buttonClass}`} onClick={() => toggle(!isOpen)}>
            <span className="dropdown-label">{label}</span>
            {showCaret && <svg className="dropdown-chevron" width="8" height="7" viewBox="0 0 8 7" xmlns="http://www.w3.org/2000/svg"><path d="M3.646 5.354l-3-3 .708-.708L4 4.293l2.646-2.647.708.708-3 3L4 5.707l-.354-.353z" fill-rule="evenodd" fill-opacity="1" fill="currentColor" stroke="none"></path></svg>}
        </button>
    </div>,
    ReactDOM.createPortal(
        <>{<menu ref={choiceList} className={`dropdown-choices ${menuClass} ${isOpen && choiceListStyle ? 'open' : 'closed'}`} style={choiceListStyle}>
            <ul>
                {choices.map(choice => (choice.label || choice.separator) && <li
                    onClick={e => {
                        clickChoice(choice);
                    }}
                    className={choice.separator ? "dropdown-separator" : choice.className ? choice.className : `dropdown-item ${choice.checked ? 'checked' : ''}`}>
                    {choice.checked && <svg className="dropdown-item-check" width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.176 2.824L3.06 4.706 6.824.941 8 2.118 3.059 7.059 0 4l1.176-1.176z" fill-rule="evenodd" fill-opacity="1" fill="currentColor" stroke="none"></path></svg>}
                    {choice.icon && <span className="dropdown-item-icon">{choice.icon}</span>}
                    {choice.label}
                </li>)}
            </ul>
        </menu>}</>,
        document.getElementById('root')
    )
    ])
}

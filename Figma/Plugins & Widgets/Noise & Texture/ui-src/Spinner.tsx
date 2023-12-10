import React from "react"
import './Spinner.css'

export default function (props) {

    let { play = true, size = 16, className = '' } = props

    return (<svg className={`spinner ${play ? 'spinner--play' : 'spinner--stop'} ${className}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <clipPath id="spinner-clip">
            <circle cx={size / 2} cy={size / 2} r={size / 2} fill="white" />
        </clipPath>
        <foreignObject width={size} height={size} clip-path="url(#spinner-clip)">
            <div className={`spinner-div`} />
        </foreignObject>
    </svg>)
}
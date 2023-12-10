import React, { useCallback, useState, useRef, useEffect } from "react"
import FigmaScene from './figma-scene';

export default function (props) {

    const { paymentInfo } = props
    const [statusText, setStatusText] = useState('')

    const parsePaymentInfo = async () => {
        if (paymentInfo && paymentInfo.status !== "NOT_SUPPORTED") {
            const daysRemaining = 10 - paymentInfo.daysSinceFirstRun
            if (daysRemaining < 0) {
                setStatusText(`Trial over`)
            } else {
                setStatusText(`Trial ends in ${daysRemaining} days`)
            }
        }
    }

    useEffect(() => {
        parsePaymentInfo()
    }, paymentInfo)

    return (<span>{statusText}</span>)
}
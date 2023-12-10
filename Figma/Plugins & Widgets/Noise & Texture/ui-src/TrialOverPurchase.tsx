import React, { useCallback, useState, useRef, useEffect } from "react"
import ReactDOM from "react-dom";
import FigmaScene from './figma-scene';

export default function (props) {

    const { paymentInfo } = props
    const [trialOver, setTrialOver] = useState(false)
    const dialog = useRef<HTMLDialogElement>(null)

    const parsePaymentInfo = async () => {
        if (paymentInfo && paymentInfo.status !== "NOT_SUPPORTED") {
            const daysRemaining = 10 - paymentInfo.daysSinceFirstRun
            setTrialOver(daysRemaining < 0)
        }
    }

    const buy = async () => {
        FigmaScene.run(
            async () => {
                await figma.payments.initiateCheckoutAsync({ skipInterstitial: true })
                return figma.payments.status.type === "PAID"
            },
            (success) => {
            }
        )
    }

    useEffect(() => {
        if (trialOver) {
            dialog.current?.showModal()
        }

    }, [trialOver])

    useEffect(() => {
        parsePaymentInfo()
    }, [paymentInfo])

    return (ReactDOM.createPortal(
        <dialog ref={dialog} onCancel={e => e.preventDefault()} className="dialog--hide-ui">
            <header>
                <h3>Trial over</h3>
            </header>
            <main>
                <section>
                    Your trial is over. If you're loving this plugin, purchase it to unlock it forever!


                </section>
            </main>
            <footer>
                <button className="button button--small" onClick={buy}>Buy now</button>
            </footer>
        </dialog >,
        document.getElementById('root')
    ))
}
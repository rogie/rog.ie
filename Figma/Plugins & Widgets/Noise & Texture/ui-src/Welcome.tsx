import React, { useCallback, useState, useRef, useEffect } from "react";
import DynamicDialog from "./DynamicDialog";
import './Welcome.css'
import rogieAvatar from "./images/avatar.png";
import FigmaScene from '../ui-src/figma-scene';
import { ReactComponent as Signature } from "./icons/sig.svg";


export default function (props) {

    let { onFinish = () => { } } = props
    const [step, setSteps] = useState('intro')
    const [user, setUser] = useState()
    const dialog = useRef(null)

    const finish = () => {
        if (dialog.current) {
            dialog.current.close()
        }
        onFinish()
    }

    useEffect(() => {
        const getUser = async () => {
            let user = await FigmaScene.getCurrentUser()
            var firstName = user.name.split(' ').slice(0, -1).join(' ')
            var lastName = user.name.split(' ').slice(-1).join(' ')
            setUser({ ...user, firstName, lastName })
        }
        getUser()
    }, [])

    return ([
        <DynamicDialog
            modal={true}
            open={true}
            ref={dialog}
            className={"welcome"}
            clickOutsideToClose={false}>
            <main>
                {step === 'intro' && <>
                    {user && <h3>Yo, {user.firstName}&hellip;</h3>}
                    <p>
                        What initially started as a simple plugin has expanded into full web embeds, video export,
                        awesome animated gradients, effects and more. If you dig this, buying me a drink is a rad way to
                        keep me building! Enjoy!
                    </p>
                    <p>
                        <a
                            className="button button--small"
                            target="_blank"
                            href="https://www.buymeacoffee.com/rogie">
                            Buy me a drink
                        </a>
                    </p>
                    <footer>
                        <a className="signature" href="https://twitter.com/intent/follow?screen_name=rogie" target="_blank">
                            <img src={rogieAvatar} style={{ width: 40, height: 40 }} />
                            <Signature style={{ marginTop: 5 }} />
                        </a>
                        <button className="button button--small button--secondary" onClick={finish}>Cool</button>
                    </footer>
                </>}

            </main>
        </DynamicDialog>])
}
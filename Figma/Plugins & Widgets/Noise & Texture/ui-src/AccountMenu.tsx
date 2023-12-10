import React, { useCallback, useState, useRef, useEffect } from "react"
import Dropdown from "./Dropdown";
import FigmaScene from './figma-scene';
import Avatar from './Avatar';
import Signin from './Signin';

export default function (props) {

    let { onChoose = () => { }, figmaScene } = props

    const [user, setUser] = useState(null)
    const accountMenuChoices = [{
        label: <Signin />, value: "signin"
    }]

    useEffect(async () => {
        let figmaUser = await FigmaScene.getCurrentUser()
        setUser(figmaUser)
    }, [])

    return (<Dropdown
        className="account-menu"
        label={<Avatar user={user} />}
        choices={accountMenuChoices}
        onChoose={onChoose}
    />)
}


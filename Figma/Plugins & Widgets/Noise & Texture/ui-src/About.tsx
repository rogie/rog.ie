import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import DynamicDialog from "./DynamicDialog";
import './About.css'
import rogieAvatar from "./images/avatar.png";
import Avatar from "./Avatar";

export default function (props) {


    return ([
        <DynamicDialog
            modal={false}
            trigger={<div><span>About this plugin</span></div >}
            className={"about"}
            clickOutsideToClose={true}>
            <main>
                <h3>About this plugin</h3>
                <Avatar
                    user={{
                        avatar_url: rogieAvatar,
                        name: "Rogie King"
                    }}
                    attributes={{
                        style: {
                            width: 48,
                            height: 48,
                            margin: "0 0.5rem 0.5rem 0",
                            background: "#fff"
                        }
                    }}
                />
                <p>
                    This plugin was developed and designed by me, <a href="https://twitter.com/intent/follow?screen_name=rogie" target="_blank">Rogie</a>.
                    It was coded using React, Three.js, React Three Fiber and WebGL, using GLSL shaders
                    and Noise and randomization functions created by <a href="https://twitter.com/patriciogv" target="_blank">Patricio Gonzalez Vivo</a>.
                </p>
                <h3>Support me</h3>
                <p>
                    <a
                        className="button button--small"
                        style={{ marginBottom: "0.5rem" }}
                        target="_blank"
                        href="https://www.buymeacoffee.com/rogie">Buy me a cocktail</a>
                    <a
                        href="https://twitter.com/intent/follow?screen_name=rogie"
                        target="_blank"
                        className="button button--small">Follow me on x.com</a>
                </p>
            </main>
        </DynamicDialog>])
}
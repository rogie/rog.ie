import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import DynamicDialog from "./DynamicDialog";
import Dropdown from "./Dropdown";
import Toggle from "./Toggle";
import FigmaScene from '../ui-src/figma-scene';

export default function (props) {

    let { value, onChange = () => { } } = props

    const [preferences, setPreferences] = useState(value)
    const resolutions = [512, 1024, 2048]

    const savePreferences = async (prefs) => {
        await FigmaScene.setClientStorage('preferences', prefs)
        setPreferences(prefs)
        onChange(prefs)
    }

    const onResolutionChange = (res) => {
        preferences.resolution = res
        savePreferences({ ...preferences })
    }

    const onBlendChange = (e) => {
        preferences.blend = !preferences.blend
        savePreferences({ ...preferences })
    }
    const onOpacityChange = (e) => {
        preferences.opacity = !preferences.opacity
        savePreferences({ ...preferences })
    }
    const onStrokesChange = (e) => {
        preferences.strokes = !preferences.strokes
        savePreferences({ ...preferences })
    }

    useEffect(() => {
        setPreferences({ ...value })
    }, [value])

    return ([
        <DynamicDialog
            modal={false}
            trigger={<div>Preferences</div >}
            className={"preferenes"}
            title={"Preferences"}
            clickOutsideToClose={true}>
            <main>
                <div className="field field--horizontal">
                    <label>Resolution</label>
                    <Dropdown
                        buttonClass="button button--small button--secondary"
                        direction="up"
                        align="right"
                        onChoose={(res) => onResolutionChange(res.value)}
                        label={`${preferences.resolution}×${preferences.resolution}`}
                        choices={resolutions.map(res => {
                            return {
                                value: res,
                                checked: preferences.resolution === res,
                                label: res < 2048 ? `${res}×${res}` : `${res}×${res} (laggy)`
                            }
                        })}
                    />
                </div>
                <Toggle label="Show blend" name={"show_blend"} checked={preferences.blend} onChange={onBlendChange} />
                <Toggle label="Show opacity" name={"show_opacity"} checked={preferences.opacity} onChange={onOpacityChange} />
                <Toggle label="Add to strokes" name={"apply_strokes"} checked={preferences.strokes} onChange={onStrokesChange} />

            </main>
        </DynamicDialog>])
}
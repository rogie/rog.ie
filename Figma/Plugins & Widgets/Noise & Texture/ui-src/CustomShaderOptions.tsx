import React, { useCallback, useState } from "react"
import FieldRange from "./FieldRange";
import FigmaLayerImage from "./FigmaLayerImage";
import Color from "./Color";
import Toggle from "./Toggle";
import { getUniforms, getUniformOptions } from "./shader-utils";

export default function (props) {
    let controls = []
    let { options, onOptionInput } = props
    let uniforms = getUniforms(options.shader)

    function shouldDisplay(name) {
        options.find()
    }
    let priorOption = null



    Object.keys(options).forEach(name => {
        let val = options[name]
        let uniform = uniforms.find(uniform => uniform.name === name)
        let uniformOptions = {}
        if (uniform && uniform.meta) {
            uniformOptions = { ...uniform.meta }
            if (uniform.meta && uniform.meta.units === "%") {
                uniformOptions.transform = (value: Number) => { return Math.floor(value * 100) }
            }
        }

        if (val !== null && val !== undefined) {
            let shouldDisplay = priorOption && name.startsWith(priorOption.name) && priorOption.value.constructor.name === 'Boolean' ? priorOption.value === true : true
            if (shouldDisplay) {
                switch ((val).constructor.name) {
                    case 'Number':
                        controls.push(<FieldRange
                            name={name}
                            min={0}
                            step={uniform.type === "int" ? 1 : 0.001}
                            max={1}
                            value={Number(val)}
                            onInput={onOptionInput}
                            {...uniformOptions}
                        />)
                        break;
                    case 'String':
                        if (val.startsWith('data:image/png;base64')) {
                            controls.push(<FigmaLayerImage name={name} value={val} onInput={onOptionInput} />)
                        } else if ((/^#[0-9a-f]{2,8}$/i).test(val)) {
                            controls.push(<Color
                                name={name}
                                value={val}
                                alpha={uniform.type === 'vec4'}
                                onInput={onOptionInput}
                                {...uniformOptions}
                            />)
                        }
                        break;
                    case 'Array':
                        controls.push(<Color
                            name={name}
                            value={val}
                            onInput={onOptionInput}
                            {...uniformOptions}
                        />)
                        break;
                    case 'Boolean':
                        controls.push(<Toggle name={name} checked={val} onChange={onOptionInput} />)
                        break;
                }
            }
        }
        priorOption = { name: name, value: val }
    })
    return controls
}
import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import ExportVideo from './ExportVideo';
import { exportThumbnail, exportTile, downloadPng } from "./canvas-export";
import Embed from './Embed';
import SegmentedControl from "./SegmentedControl";
import DynamicDialog from "./DynamicDialog";

export default function (props) {

    let { canvas, options } = props

    async function downloadImage() {
        if (canvas.current) {
            let htmlCanvas = canvas.current?.querySelector('canvas')
            downloadPng(htmlCanvas, options.noise.label)
        }
    }

    const [exportType, setExportType] = useState('embed')
    const [dialogTitle, setDialogTitle] = useState('Export to...')

    return ([
        <DynamicDialog
            modal={false}
            className={"export"}
            clickOutsideToClose={true}
            trigger={<button className={"button button--small button--secondary"}>Export</button>}>
            <SegmentedControl
                name={"export-type"}
                sizing={"full"}
                className={"segmented-control-export"}
                choices={[
                    {
                        label: 'Code',
                        selected: exportType === 'embed',
                        props: {
                            onClick: () => {
                                setExportType('embed')
                                setDialogTitle('Embed code')
                            }
                        }
                    },
                    {
                        label: 'Video',
                        selected: exportType === 'video',
                        props: {
                            onClick: () => {
                                setExportType('video')
                                setDialogTitle('Embed video')
                            }
                        }
                    },
                    {
                        label: 'Image',
                        selected: exportType === 'image',
                        props: {
                            onClick: () => {
                                setExportType('image')
                                setDialogTitle('Export image')
                            }
                        }
                    }
                ]} />
            {exportType === 'image' && <button className={"button button--small"} onClick={downloadImage}>Download PNG</button>}
            {exportType === 'video' && <ExportVideo canvasContainer={canvas.current} texture={options.noise} />}
            {exportType === 'embed' && <Embed texture={options} />}

        </DynamicDialog>
    ])
}
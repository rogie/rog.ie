import React, { useCallback, useState, useRef, useEffect } from "react"
import FigmaScene from './figma-scene';
import './Community.css'
import CommunityResource from './CommunityResource'
import { saveShader } from './manage-saved-shaders'
import Spinner from "./Spinner";
import { resizeImageFromSrc } from './canvas-export'

export default function (props) {

    const { session, supabase } = props

    const [resources, setResources] = useState([])
    const [selected, setSelected] = useState(null)
    const resourcesList = useRef<HTMLDivElement>(null);


    const getResources = async () => {

        const { data, error } = await supabase
            .from('textures')
            .select(`
                *,
                profiles(
                    *
                )
            `)
            .order('updated_at', { ascending: false })

        if (data) {
            setResources(data)
        } else if (error) {
            FigmaScene.notify(error.message, { error: true, timeout: 2000 })
        }
    }

    function thumbnailUrl(resource) {
        return resource.thumbnail_id ? `${supabase.storageUrl}/object/public/textures/thumbnails/${resource.thumbnail_id}.png` : resource.data.thumbnail
    }

    const onSelect = (resource) => {
        if (resource !== selected) {
            setSelected(resource)
            if (props.onSelect) {
                props.onSelect(resource)
            }
        }
    }

    const onUnpublish = () => {
        getResources()
    }


    const onSave = async (resource) => {

        let shader = resource.data

        // save a smaller, local copy of the thumbnail
        if (resource.thumbnail_id) {
            let thumbUrl = thumbnailUrl(resource)
            let img = await resizeImageFromSrc(thumbUrl, 64)
            shader.thumbnail = img.src
        }

        // do not conflict with local uuids (save a new copy)
        if (shader.uuid) {
            delete shader.uuid;
        }
        if (resource.user_id === session?.user?.id) {
            shader.resource_id = resource.id
        } else {
            delete shader.resource_id
        }
        let { saved, all } = await saveShader(shader)
        if (props.onSave) {
            props.onSave(saved, all)
        }
    }

    useEffect(() => {
        getResources()
    }, [])

    useEffect(() => {
        resourcesList.current?.querySelectorAll('.community-resource').forEach(res => {
            res.addEventListener("pointermove", (e) => {
                res.style.setProperty('--x', e.layerX / res.clientWidth)
                res.style.setProperty('--y', e.layerY / res.clientHeight)
            })
        })
    }, [resources])

    return (<section className="community">
        <header className="community-header">
            <h3>Community textures</h3>
            {resources.length === 0 && <Spinner />}
        </header>
        <main>
            <div className="community-resources" ref={resourcesList}>
                {resources && resources.map(resource =>
                    <CommunityResource
                        resource={resource}
                        selected={selected === resource}
                        {...props}
                        onSelect={onSelect}
                        onSave={onSave}
                        supabase={supabase}
                        onUnpublish={onUnpublish} />
                )}
            </div>
        </main>
    </section >)
}
import React, { useCallback, useState, useRef, useEffect } from "react"
import './Community.css'
import Avatar from "./Avatar"

export default function (props) {

    let { resource, detail = false, onView = () => { } } = props

    return (<div className={`community-resource-detail`}>
        <div className="community-resource-body">
            <div className="community-resource-thumbnail">
                <img src={resource.data.noise.thumbnail} />
            </div>
            <div className="community-resource-details">
                <h3 className="community-resource-title">{resource.name}</h3>
                <button className="button button--secondary button--small">Save</button>
                <div className="community-resource-description">
                    {resource.description}
                </div>
                {resource.tags && <div className="community-resource-tags">
                    {resource.tags.map(tag => <a href={`#${tag}`} className="tag">{tag}</a>)}
                </div>}
                <div className="community-creator">
                    <Avatar className="community-avatar" user={resource.data.noise.user} />
                    <label className="community-creator-username">{resource.data.noise.user.name}</label>
                </div>
            </div>
        </div>
    </div>)
}
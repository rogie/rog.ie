import React, { useCallback, useState, useRef, useEffect } from "react"
import './Community.css'
import Avatar from "./Avatar"
import Dropdown from "./Dropdown"
import UnpublishTexture from "./UnpublishTexture"
import Linkify from 'linkify-react';
import Tooltip from "./Tooltip";

export default function (props) {

    let { resource, onSelect = () => { }, onSave = () => { }, onUnpublish = () => { }, selected, session, supabase } = props

    function thumbnailUrl(resource) {
        return resource.thumbnail_id ? `${supabase.storageUrl}/object/public/textures/thumbnails/${resource.thumbnail_id}.png` : resource.data.thumbnail
    }

    return (<div className={`community-resource ${selected ? 'community-resource--selected' : ''}`}
        onClick={e => onSelect(resource)}>
        <div className="community-resource-body">
            <div className="community-resource-thumbnail">
                <img src={thumbnailUrl(resource)} />
            </div>
            <div className="community-resource-details">
                <h3 className="community-resource-title">{resource.name}</h3>
                <div className="community-resource-description">
                    <Linkify as="div" options={{ attributes: { target: "_blank" } }} >{resource.description}</Linkify>
                </div>
                {resource.tags && <div className="community-resource-tags">
                    {resource.tags.map(tag => <a href={`#${tag}`} className="tag">{tag}</a>)}
                </div>}
                {resource.profiles.twitter_handle && <Tooltip text={`@${resource.profiles.twitter_handle} on Twitter`} align="top"><a className="community-creator" href={`https://twitter.com/${resource.profiles.twitter_handle}`} target="_blank">
                    <Avatar className="community-avatar" user={resource.profiles} />
                    <span className="community-creator-username">{resource.profiles.full_name}</span>
                </a></Tooltip>}
                {!resource.profiles.twitter_handle && <div className="community-creator">
                    <Avatar className="community-avatar" user={resource.profiles} />
                    <span className="community-creator-username">{resource.profiles.full_name}</span>
                </div>}
            </div>
            <div className="community-resource-actions">
                <UnpublishTexture session={session} resource={resource} onUnpublish={onUnpublish} supabase={supabase} />
                <button className="button button--small" onClick={e => onSave(resource)}>Save</button>
            </div>
        </div>
    </div>)
}
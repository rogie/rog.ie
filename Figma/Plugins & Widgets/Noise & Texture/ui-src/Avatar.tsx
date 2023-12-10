import React, { useCallback, useState, useRef, useEffect } from "react"
import "./Avatar.css"

export default function (props) {

    let { user, className = '', attributes = {} } = props

    return (user &&
        <div className={`avatar ${className}`} {...attributes}>
            <img
                src={user.avatar_url || user.photoUrl || user.user_metadata?.avatar_url}
                alt={user.full_name || user.name || user.user_metadata?.name} />
        </div>)
}

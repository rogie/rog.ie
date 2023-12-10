import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import FigmaUser from './FigmaUser';
import FigmaScene from './figma-scene';
import TabBar from "./Tabbar";
import Avatar from "./Avatar";

export default function (props) {

    let { onSigninOut = () => { }, className = '', supabase } = props

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [session, setSession] = useState(null)
    const [location, setLocation] = useState('signin')

    const dialog = useRef<HTMLDialogElement>(null)

    const open = async (e) => {
        if (dialog.current?.showModal) {
            dialog.current?.showModal()
        } else {
            dialog.current.setAttribute('open', '')
        }
    }

    const getProfile = async (user) => {
        const { data, error } = await supabase
            .from('profiles')
            .select()
            .eq('id', user.id)

        let p

        if (!error) {
            p = data[0]
        }

        return p
    }

    const signIn = async (e) => {
        e.preventDefault()
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        })


        /* if (password.trim() !== '') {
             const { data, error } = await supabase.auth.verifyOtp({
                 email: email,
                 token: password.trim(),
                 type: "signup"
             })
         } else {
             const { data, error } = await supabase.auth.signInWithOtp({
                 email: email,
                 emailRedirectTo: null,
             });
         }*/
        if (error) {
            FigmaScene.notify(error.message, { error: true, timeout: 2000 })
        } else {
            if (data.session && data.session.user) {
                let p = await getProfile(data.session.user)
                if (p) {
                    data.session.profile = p
                }
            }
            setSession(data.session)
            close()
        }
    }

    const signUp = async (e) => {
        e.preventDefault()
        if (password == passwordConfirm) {

            const figmaUser = await FigmaUser.get()
            const { user, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        avatar_url: figmaUser.photoUrl,
                        full_name: figmaUser.name,
                        figma_user_id: figmaUser.id
                    }
                }
            })

            if (error) {
                FigmaScene.notify(error.message, { error: true, timeout: 2000 })
            } else {
                FigmaScene.notify(`Great, you're signed up!`, { timeout: Infinity })
                signIn()
                close()
            }
        } else {
            FigmaScene.notify('Passwords and confirmation do not match', { error: true })
        }
    }

    const close = () => {
        if (dialog.current?.close) {
            dialog.current?.close()
        } else {
            dialog.current.removeAttribute('open', '')
        }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            FigmaScene.notify(error.message, { error: true, timeout: 2000 })
        } else {
            setSession(null)
        }
    }
    async function getSession() {
        const { data, error } = await supabase.auth.getSession()
        if (error === null) {
            if (data.session && data.session.user) {
                let p = await getProfile(data.session.user)
                if (p) {
                    data.session.profile = p
                }
            }
            setSession(data.session)
        }
    }

    useEffect(() => {
        getSession()
    }, [])

    useEffect(() => {
        onSigninOut(session)
    }, [session])

    const Action = () => {
        let action = <button onClick={signOut} className="button button--secondary button--small">Log out</button>
        if (!session) {
            action = <button className="button button--secondary button--small" onClick={open}>Log in</button>
        }
        return action
    }

    return ([<Action />,
    ReactDOM.createPortal(<dialog ref={dialog}>
        <header>
            <TabBar
                className="tabs"
                options={[
                    { label: 'Log in', value: 'signin' },
                    { label: 'Create account', value: 'signup' }
                ]}
                onClick={(type) => setLocation(type)}
            />
            <button className="button icon" onClick={close}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M11.6464 3.64645C11.8417 3.45118 12.1583 3.45118 12.3536 3.64645C12.5488 3.84171 12.5488 4.15829 12.3536 4.35355L8.70711 8L12.3536 11.6464C12.5488 11.8417 12.5488 12.1583 12.3536 12.3536C12.1583 12.5488 11.8417 12.5488 11.6464 12.3536L8 8.70711L4.35355 12.3536C4.15829 12.5488 3.84171 12.5488 3.64645 12.3536C3.45118 12.1583 3.45118 11.8417 3.64645 11.6464L7.29289 8L3.64645 4.35355C3.45118 4.15829 3.45118 3.84171 3.64645 3.64645C3.84171 3.45118 4.15829 3.45118 4.35355 3.64645L8 7.29289L11.6464 3.64645Z" fill="currentColor" />
                </svg>
            </button>
        </header>
        <form onSubmit={location === 'signup' ? signUp : signIn}>
            <main>
                <div className="field field--horizontal">
                    <label>Email</label>
                    <input type="text" placeholder="Email" name="email" required autoFocus={true} onInput={(e) => setEmail(e.target.value)} />
                </div>
                <div className="field field--horizontal">
                    <label>Password</label>
                    <input type="password" placeholder="Password" name="password" required onInput={(e) => setPassword(e.target.value)} />
                </div>
                {location === 'signup' &&
                    <div className="field field--horizontal">
                        <label>Confirm</label>
                        <input type="password" placeholder="Password" name="password_confirm" required onInput={(e) => setPasswordConfirm(e.target.value)} />
                    </div>
                }
            </main>
            <footer>
                {location === 'signup' && <button className="button button--small" type="submit" onClick={signUp}>Create</button>}
                {location === 'signin' && <button className="button button--small" type="submit" onClick={signIn}>Log in</button>}
            </footer>
        </form>
    </dialog>,
        document.getElementById('root')
    )
    ])
}
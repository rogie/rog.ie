const CALLBACKS = {}
const PROMISES = {}
let INITIALIZED = false
let FigmaScene = {}

async function on(event, f, c) {
    let functionString = f.toString()
    CALLBACKS[functionString] = c
    parent.postMessage({
        pluginMessage: {
            action: "figma-scene-on",
            event: event,
            function: functionString,
        }
    }, "*");
}

async function run(func, callback, args = {}) {
    let functionString = func.toString()
    CALLBACKS[functionString] = callback
    parent.postMessage({
        pluginMessage: {
            action: "figma-scene-run",
            function: functionString,
            args: args
        }
    }, "*");
}

async function runWithPromise(func, args = {}) {
    return new Promise((resolve, reject) => {
        let functionString = func.toString()
        PROMISES[functionString] = { resolve, reject }
        parent.postMessage({
            pluginMessage: {
                action: "figma-scene-run",
                function: functionString,
                args: args
            }
        }, "*");
    })
}

async function notify(message, options = {}) {
    return await runWithPromise(
        (args) => {
            figma.notify(args.message, args.options)
        },
        // Args
        { message: message.toString(), options: options }
    )
}

async function getCurrentUser() {
    return await runWithPromise(
        (args) => {
            return { id: figma.currentUser.id, photoUrl: figma.currentUser.photoUrl, name: figma.currentUser.name }
        }
    )
}

async function getClientStorage(key) {
    return await runWithPromise(
        async (key) => {
            return await figma.clientStorage.getAsync(key);
        },
        key
    )
}

async function setClientStorage(key, value) {
    return await runWithPromise(
        // Function to run
        async (args) => {
            return await figma.clientStorage.setAsync(args.key, args.value);
        },
        // Args
        { key, value }
    )
}

async function deleteClientStorage(key) {
    return await runWithPromise(
        // Function to run
        async (key) => {
            return await figma.clientStorage.deleteAsync(key);
        },
        key
    )
}

function initUI() {
    parent.postMessage({
        pluginMessage: {
            action: "figma-scene-init"
        }
    }, "*");
}

function init() {

    if (!INITIALIZED) {
        INITIALIZED = true

        // plugin window
        if (window) {

            initUI()

            window.addEventListener("message", async (event) => {
                let msg = event.data.pluginMessage
                if (msg && msg.action) {
                    switch (msg.action) {
                        case "figma-scene-return":
                            // legacy callback based 
                            if (CALLBACKS[msg.function]) {
                                await CALLBACKS[msg.function](msg.return)

                                // new promised based
                            } else if (PROMISES[msg.function]) {
                                PROMISES[msg.function].resolve(msg.return)
                            }
                            break;
                        case "figma-scene-init":

                            let { functions } = msg
                            functions.forEach(name => {
                                FigmaScene[name] = function () {
                                    let args = []
                                    for (var i in arguments) {
                                        args[i] = arguments[i]
                                    }
                                    FigmaScene.runWithPromise((args) => {
                                        if (figma[args.name]) {
                                            figma[args.name].apply(null, args.args)
                                        }
                                    }, {
                                        name: name,
                                        args: args
                                    })
                                }
                            })
                            break;
                    }
                }
            });
        } else {
            globalThis.scene = this

            figma.ui.on("message", async (msg) => {
                if (msg && msg.action) {
                    let f;
                    switch (msg.action) {
                        case "figma-scene-run":
                            f = new Function(`return ${msg.function}`)();
                            //let f = eval(msg.function);
                            let r = await f(msg.args);
                            figma.ui.postMessage({
                                action: "figma-scene-return",
                                id: msg.id,
                                return: r,
                                function: msg.function
                            })
                            break;
                        case "figma-scene-on":
                            f = new Function(`return ${msg.function}`)();
                            figma.on(msg.event, async function () {
                                let r = await f(...arguments);
                                figma.ui.postMessage({
                                    action: "figma-scene-return",
                                    id: msg.id,
                                    return: r,
                                    function: msg.function
                                })
                            })
                            break;
                        case "figma-scene-init":
                            let props = Object.getOwnPropertyNames(figma)
                            let functions = []
                            props.forEach(prop => {
                                try {
                                    if (typeof figma[prop] === 'function') {
                                        functions.push(prop)
                                    }
                                } catch (e) {

                                }
                            })
                            figma.ui.postMessage({
                                action: "figma-scene-init",
                                functions: functions
                            })
                            break;
                    }
                }
            })
        }
    }
}

FigmaScene = { on, run, notify, getCurrentUser, init, getClientStorage, setClientStorage, deleteClientStorage, runWithPromise };

export default FigmaScene;

import FigmaScene from './figma-scene';
import { uuidv4 } from './utils'

async function saveShader(shader) {

    return new Promise((resolve, reject) => {
        if (!shader.uuid) {
            shader.uuid = uuidv4()
        }
        FigmaScene.run(
            // Function to run
            async (args) => {

                let previousShaders = await figma.clientStorage.getAsync("saved-shaders");
                let shaders = (previousShaders || []).filter(shader => shader.uuid !== args.uuid || shader.noise?.uuid === args.uuid)
                shaders.unshift(args)

                try {
                    await figma.clientStorage.setAsync("saved-shaders", shaders)
                    figma.notify(`Saved texture: ${args.label}`)
                    return shaders
                }
                catch (err) {
                    figma.notify(err, { error: true })
                    return previousShaders
                }

            },
            // Callback
            async (savedShaders) => {
                resolve({ saved: shader, all: savedShaders })
            },
            // Args
            shader
        )
    })

}

async function removeShader(shader) {
    return new Promise((resolve, reject) => {
        FigmaScene.run(
            // Function to run
            async (args) => {
                let shaders = await figma.clientStorage.getAsync("saved-shaders");
                shaders = shaders || []
                shaders = shaders.filter(shader => shader.uuid !== args.uuid || shader.noise?.uuid === args.uuid)
                await figma.clientStorage.setAsync("saved-shaders", shaders)
                figma.notify(`Removed texture: ${args.label}`)
                return shaders
            },
            // Callback
            async (savedShaders) => {
                resolve({ removed: shader, all: savedShaders })
            },
            // Args
            shader
        )
    })
}

export { saveShader, removeShader };
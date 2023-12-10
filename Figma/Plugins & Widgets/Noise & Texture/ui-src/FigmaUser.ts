import FigmaScene from './figma-scene';

export default {
    user: null,
    async get() {
        return new Promise((resolve, reject) => {
            if (this.user) {
                resolve(this.user)
            } else {
                FigmaScene.run(
                    // Function to run
                    async () => {
                        return { id: figma.currentUser.id, photoUrl: figma.currentUser.photoUrl, name: figma.currentUser.name }
                    },
                    // Callback
                    async (user) => {
                        this.user = user
                        resolve(user)
                    }
                )
            }
        })
    }
}
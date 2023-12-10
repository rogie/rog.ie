import FigmaScene from './figma-scene';

const store = {}

export default {
    async setItem(key, value) {
        store[key] = value
        return await FigmaScene.setClientStorage(key, value)
    },
    async getItem(key) {
        let value = store[key]
        if (!value) {
            let value = await FigmaScene.getClientStorage(key);
            store[key] = value
        }
        return value
    },
    async removeItem(key) {
        delete store[key]
        return await FigmaScene.deleteClientStorage(key)
    }
}


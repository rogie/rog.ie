function downloadJSON(json, name = 'download.json') {
    let link = document.createElement('a')
    let stringified = JSON.stringify(json, null, 4)
    link.setAttribute('href', `data:text/json;charset=utf-8,${encodeURIComponent(stringified)}`)
    link.setAttribute('download', name)
    link.click()
    return;
}
export default downloadJSON;
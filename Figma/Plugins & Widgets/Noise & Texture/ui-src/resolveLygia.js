import lygia from "./lygia.js";

function getFile(url) {
    if (!getFile._cache) {
        getFile._cache = {}
    }
    if (getFile._cache[url] !== undefined) {
        return getFile._cache[url]
    } else {
        let httpRequest = new XMLHttpRequest();
        let result = "";
        httpRequest.open("GET", url, false);
        httpRequest.send();

        if (httpRequest.status == 200) {
            result = httpRequest.responseText;
        }
        getFile._cache[url] = result;
        return result;
    }
}

function getFromObject(path) {
    let parts = path.trim().replace(".glsl", "").split("/")
    return lygia[parts[0]][parts[1]]
}

function resolveLygia(lines) {
    if (!Array.isArray(lines)) {
        lines = lines.split(/\r?\n/);
    }

    let src = "";
    lines.forEach((line, i) => {
        const line_trim = line.trim();
        if (line_trim.startsWith('#include \"lygia')) {
            let include_url = line_trim.substring(16);
            src += getFromObject(include_url.replace(/\"|\;|\s/g, ''))

            //let include_url = line_trim.substring(15);
            //include_url = "https://lygia.xyz" + include_url.replace(/\"|\;|\s/g, '');
            //src += getFile(include_url) + '\n';
        }
        else {
            src += line + '\n';
        }
    });

    return src;
}

async function resolveLygiaAsync(lines) {
    if (!Array.isArray(lines))
        lines = lines.split(/\r?\n/);

    let src = "";
    const response = await Promise.all(
        lines.map(async (line, i) => {
            const line_trim = line.trim();
            if (line_trim.startsWith('#include "lygia')) {
                let include_url = line_trim.substring(15);
                include_url = "https://lygia.xyz" + include_url.replace(/\"|\;|\s/g, "");
                return fetch(include_url).then((res) => res.text());
            }
            else
                return line;
        })
    );

    return response.join("\n");
}
export { resolveLygia as default };
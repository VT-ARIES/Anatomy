import * as THREE from "./modules/three.js";

function html_to_xml(html) {
    var doc = document.implementation.createHTMLDocument('');
    doc.write(html);
}

// var canvas = document.createElement("canvas");
// canvas.width = 1000;
// canvas.height = 1000;
// canvas.style.background = "none";
// var ctx = canvas.getContext("2d");
// document.body.appendChild(canvas)

let stylesheet = "";
await fetch("./main.css").then(async(r)=>{stylesheet = "*{font-family:helvetica;}"+await r.text();});

export default function HTMLtoSVG(html, width, height, onload) {
    
    var data = /*"data:image/svg+xml;charset=utf-8," + */'<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
        '<foreignObject width="100%" height="100%">' +
        html_to_xml(html) +
        '</foreignObject>' +
        '</svg>';

    const scale_factor = 4;

    const tempImg = document.createElement('img')
    tempImg.addEventListener('load', onTempImageLoad)
    tempImg.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + (width*scale_factor) + '" height="' + (height*scale_factor) + '"><style>'+stylesheet+'</style><foreignObject width="'+(100 / scale_factor)+'%" height="'+(100 / scale_factor) +'%" style="transform:scale('+scale_factor+');background:rgba(0,0,0,0.001)"><div xmlns="http://www.w3.org/1999/xhtml">'+html+'</div></foreignObject></svg>')

    function onTempImageLoad(e) {
        var canvas = document.createElement("canvas");
        canvas.style.background = "none";
        var ctx = canvas.getContext("2d");
        canvas.width = width * scale_factor;
        canvas.height = height * scale_factor;
        ctx.drawImage(e.target, 0, 0);
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.repeat.set(1,1);
        var material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1 });
        material.map.minFilter = THREE.LinearFilter;
        onload(material);
    }
    // img.src = data;
}
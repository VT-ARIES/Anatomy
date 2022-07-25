import * as THREE from "../../modules/three.js";
import UIElement from "./uielem.js";

// Load fonts
const loader = new THREE.FontLoader();

let font_files = [
    "Arial_Regular"
];

let fonts = new Map();

font_files.forEach(font_name=>{
    loader.load( './fonts/' + font_name + ".json", font=>{
        fonts.set(font_name, font);
    });
})

export default class Text2D extends UIElement {
    constructor(font_name, parameters) {

        super();

        let font = fonts.get(font_name);

        let geometry = new THREE.TextGeometry( 'Hello three.js!', {
            font: font,
            size: .80 * parameters.font_scale,
            height: .05 * parameters.font_scale,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: .0010 * parameters.font_scale,
            bevelSize: .008 * parameters.font_scale,
            bevelOffset: 0,
            bevelSegments: 5
        } );
        let material = new THREE.MeshBasicMaterial( {color: parameters.font_color} );
        let mesh = new THREE.Mesh( geometry, material );

        this.bindMesh(this, mesh);
    }

    setColor(val) {
        this.mesh.material.color.set(val);
    }

    getColor() {
        return this.mesh.material.color.getHex();
    }
}
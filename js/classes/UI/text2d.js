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
    constructor(text, parameters) {

        super();

        this.font_name = "Arial_Regular";
        this.font_scale = 1.0;
        this.font_color = 0xffffff;

        if (parameters.font_name)
            this.font_name = parameters.font_name;
        if (parameters.font_scale)
            this.font_scale = parameters.font_scale;
        if (parameters.font_color)
            this.font_color = parameters.font_color;

        this.init(text);
    }

    init(text) {
        let font = fonts.get(this.font_name);

        let geometry = new THREE.TextGeometry( text, {
            font: font,
            size: .80 * this.font_scale,
            height: .05 * this.font_scale,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: .0010 * this.font_scale,
            bevelSize: .008 * this.font_scale,
            bevelOffset: 0,
            bevelSegments: 5
        } );
        let material = new THREE.MeshBasicMaterial( {color: this.font_color} );
        let mesh = new THREE.Mesh( geometry, material );

        this.bindMesh(this, mesh);
    }

    setColor(val) {
        this.mesh.material.color.set(val);
    }

    getColor() {
        return this.mesh.material.color.getHex();
    }

    updateText(string) {

        // Save parent because we need to add it back
        let parent = this.mesh.parent;

        // save 3d components
        let pos = this.mesh.position.clone();
        let scale = this.mesh.scale.clone();
        let rotation = this.mesh.rotation.clone();

        parent.remove(this.mesh);

        this.init(string);

        // restore 3d components
        this.mesh.position.copy(pos);
        this.mesh.scale.copy(scale);
        this.mesh.rotation.copy(rotation);

        parent.add(this.mesh);

    }
}
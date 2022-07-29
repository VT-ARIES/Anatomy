import * as THREE from "../../modules/three.js";
import UIElement from "./uielem.js";
import HTMLtoSVG from "../../htmltosvg.js";


export default class HTML2D extends UIElement {
    constructor(domElem, parameters) {

        super();

        if (!parameters)
            parameters = {};

        this.position = parameters.position ? parameters.position : new THREE.Vector3(0,0,0);
        this.width = parameters.width ? parameters.width : 1;
        this.height = parameters.height ? parameters.height : 1;
        this.style = parameters.style ? parameters.style : "";

        let geometry = new THREE.BoxGeometry( this.width, this.height, 0.00 );
        let mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { transparent: true } ) );
        mesh.position.set(this.position.x,this.position.y,this.position.z+0.06);

        this.domElem = domElem;

        // this.html = "<p style='color:white;font-size:26px;font-family:Arial;white-space:pre;'>hello</p>";

        this.resetMaterial();


        this.bindMesh(this, mesh);
    }

    async getComputedStyle() {
        let clone = this.domElem.cloneNode(true);
        clone.setAttribute("style", clone.getAttribute("style") + ";" + this.style);
        this.html = clone.outerHTML;
    }

    resetMaterial() {

        this.getComputedStyle();

        let t = this;
        HTMLtoSVG(this.html, this.width * 100, this.height * 100, function(material) {
            t.mesh.material = material;

        });
    }

    setColor(val) {
        this.mesh.material.color.set(val);
    }

    getColor() {
        return this.mesh.material.color.getHex();
    }

    async update() {
        
        this.resetMaterial();

    }
}

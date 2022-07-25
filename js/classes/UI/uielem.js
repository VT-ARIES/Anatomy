export default class UIElement {

    constructor() {
        this.eventsEnabled = true;
        this.connectedEvents = [];
    }

    addConnectedEventUIElement(elem) {
        this.connectedEvents.push(elem);
        elem.connectedEvents.push(this);
    }

    bindMesh(ui, mesh) {
        this.mesh = mesh;
        mesh.uiElement = ui;
    }

    _onClick(e) {
        if (this.eventsEnabled && this.onClick) {
            this.onClick(e);
        }
        this.connectedEvents.forEach(elem=>{
            if (elem.eventsEnabled && elem.onClick)
                elem.onClick(e);
        });
    }

    _onHover(e) {
        if (this.eventsEnabled && this.onHover) {
            this.onHover(e);
        }
        this.connectedEvents.forEach(elem=>{
            if (elem.eventsEnabled && elem.onHover)
                elem.onHover(e);
        });
    }

    _onEndHover(e) {
        if (this.eventsEnabled && this.onEndHover) {
            this.onEndHover(e);
        }
        this.connectedEvents.forEach(elem=>{
            if (elem.eventsEnabled && elem.onEndHover)
                elem.onEndHover(e);
        });
    }

    _onPointerDown(e) {
        if (this.eventsEnabled && this.onPointerDown) {
            this.onPointerDown(e);
        }
        this.connectedEvents.forEach(elem=>{
            if (elem.eventsEnabled && elem.onPointerDown)
                elem.onPointerDown(e);
        });
    }

    _onPointerUp(e) {
        if (this.eventsEnabled && this.onPointerUp) {
            this.onPointerUp(e);
        }
        this.connectedEvents.forEach(elem=>{
            if (elem.eventsEnabled && elem.onPointerUp)
                elem.onPointerUp(e);
        });
    }
}
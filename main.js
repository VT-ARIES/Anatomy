// For dynamic loading (comment out if you want static loading)
/* import {
    Raycaster,
    Vector2,
    Vector3,
    Quaternion,
    Group,
    PerspectiveCamera,
    Scene,
    Object3D,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    sRGBEncoding,
    PMREMGenerator,
    Color,
    Line,
    LineBasicMaterial,
    BufferGeometry,
    Matrix4,
    Box3
} from 'https://unpkg.com/three@0.119.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js?module';
import { GLTFLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/GLTFLoader.js?module';
import { VRButton } from 'https://unpkg.com/three@0.127.0/examples/jsm/webxr/VRButton.js?module';
*/
// For static loading (comment out for dynamic loading and make sure up to date)
// Also update the import statements in orbitcontrols.js and gltfloader.js
import {
    Raycaster,
    Vector2,
    Vector3,
    Quaternion,
    Group,
    PerspectiveCamera,
    Scene,
    Object3D,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    sRGBEncoding,
    PMREMGenerator,
    Color,
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Matrix4,
    Box3
} from './js/modules/three.js';
import { OrbitControls } from './js/modules/OrbitControls.js';
import { GLTFLoader } from './js/modules/GLTFLoader.js';
import { VRButton } from './js/modules/VRButton.js';

// SHW - Updated and outsourced modeling code to "/js/classes/models/models.js"
import {LoadModels} from "./js/classes/models/models.js";

// For the bg paws
import generatePaws from "./js/bgpawgenerator.js";
import Text2D from './js/classes/UI/text2d.js';
import Block2D from './js/classes/UI/block2d.js';

// Global definitions/variables
let camera, scene, renderer;
let raycaster = new Raycaster();
let container;
let controls;

// XR controllers
var controller1, controller2;
var tempMatrix = new Matrix4();

let INTERSECTED = '';
let INTERSECTED_BONES = null;

let IN_XR = false;
let MOUSE_IS_DOWN = false;
let INTERSECTED_XR_CONTROLS = null;
let LAST_XR_CONTROLS = null;

let SELECTED = false;
let SELECTED_BONES = null;
let FOCUS_MODE = false;

let Loading_String = 'Loading';

let glow_intensity = 0;
renderer = new WebGLRenderer( { antialias: true } );

/// Set the bg color
renderer.setClearColor(0x181B21);

let delight;
let delight_target;
let mouse = new Vector2(-100, -100);
let bone = new Group();
let root_bone;
let currentTime = new Date();
let lastMouseDownTime = new Date();

// Our model atlas
var model_atlas = new Map();

// Will contain all of the model components
var model_container = {};


var loader = new GLTFLoader(); // WebGL model gltf loader
var selected_model; // Selected model

// XR controls
var xr_controls;


// navigation
class Page {
    constructor(name, page_div_ids, start_hidden) {
        this.name = name;
        // list of ids to show/hide
        this.page_div_ids = page_div_ids;

        if (start_hidden)
            this.hide();

    }
    show(speed) {
        for (var page_div of this.page_div_ids) {
            $("#"+page_div).show(speed);
            $("#"+page_div)[0].style.setProperty("display", "auto");
        }
    }
    hide(speed) {
        for (var page_div of this.page_div_ids) {
            $("#"+page_div).hide(speed);
            $("#"+page_div)[0].style.setProperty("display", "none");
        }        
    }
};

var page_directory = [];

page_directory.push(new Page("about", ["about"], true));
page_directory.push(new Page("home", ["modal", "home"], false));
page_directory.push(new Page("loading", ["loading-frame"], true));
page_directory.push(new Page("vr_explorer", ["sidebar", "vr_explorer", "vr_button_frame"], true));
page_directory.push(new Page("contact", ["contact"], true));

function navigate(page_name) {

    page_directory.forEach(page=>{
        
        if (page.name == page_name) {
            page.show();
        }
        else {
            page.hide();
        }
    });

    // eye candy
    generatePaws(3, 40, 0, 30, 0.3, 0.3);
}

$("#page_about").on("click", ()=>navigate("about"));
$("#page_home").on("click", ()=>navigate("home"));
$("#page_contact").on("click", ()=>navigate("contact"));

// Navigate home first
$("#page_home").click();

// Set up artwork style
function rs (e) {
    let w_ratio = Math.min(1, window.innerWidth / 1280);
    let h_ratio = Math.min(1, window.innerHeight / 600);

    document.documentElement.style.setProperty("--art-scale", 
        w_ratio * h_ratio);
}
window.addEventListener("resize", rs);
rs();


// On page ready
$(document).ready(function(){
    
    // Load models
    LoadModels(model_atlas).then(() => {

        for (const model in model_atlas) {

            const modelObj = model_atlas[model];

            // Create a card-thing
            let model_card = document.createElement("model-card");

            // We are doing it in reverse due to css quirks

            // Add some info text
            model_card.innerHTML += ("<span class='model-info-text'>" + modelObj.modelInfo + "</span>");
            
            // Add a button
            model_card.innerHTML += ("<button id='" + model + "' class='model-selection-button'>" + model + "</button>");

            // Add an image
            model_card.innerHTML += ("<img src='" + "." + modelObj.modelImageURL + "' class='model-image'/>");

            // Add the card to the model select
            $("#model-select").append(model_card.outerHTML);

            // Convert center position to Vector3
            modelObj.center = new Vector3(...modelObj.center);

            // Add click loading behavior
            $("#"+ model).click(async function(){

                // navigate to loading
                navigate("loading");
                
                // Initialize
                selected_model = modelObj;
                await init();

                // show the page
                navigate("vr_explorer");
            });
        }

        // Eye candy
        generatePaws(3, 90, 0, 30, 0.3, 0.3);
    });

});

// On bone selection
function selectBone(clicked_bone, clicked_canvas) {

    let centerOfMesh = getCenterPoint(clicked_bone);

    // Focus on the selected bone (or rather, the central point of it)
    controls.target.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
    delight_target.position.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
    delight.target = delight_target;
    controls.update();
    
    // Change Globals state to selected
    SELECTED = true;

    $('#hide-toggle').removeClass('sidebar-button-active');
    
    let bone_group = clicked_bone.parent.parent.parent.parent;
    clicked_bone.traverseAncestors(function(curr){
        if(curr.type != "Scene" && curr.parent.type == "Scene"){
            bone_group = curr;
        }
    });

    SELECTED_BONES = bone_group;
    let debug_str = "Selected the " + bone_group.name + " by " + (clicked_canvas ? "clicking" : "list selection");

    console.log(debug_str);

    INTERSECTED = bone_group.name;
    INTERSECTED_BONES = bone_group;
    $("#selected").text(INTERSECTED);

    // Scroll into view if we clicked the canvas
    setBoneListComponentActive(INTERSECTED, clicked_canvas);

    // Changed from always selected to browsing
    $("#selected-info").text("Selected:");

    // If it is hidden show this
    if (clicked_bone.material.transparent)
        $('#hide-toggle').addClass('sidebar-button-active');

    // Callback
    onSelectedBone();
}

// List of bones
// Will allow user to click on a specific bone from the bones list
// and trigger a selection
var model_components = new Map();
function addModelComponent(name, mesh) {
    let li = document.createElement("li");

    let eye = document.createElement("div");
    eye.classList.add("eye");

    let nameDiv = document.createElement("span");
    nameDiv.innerText = name;

    li.appendChild(eye);
    li.appendChild(nameDiv);

    if (mesh) {
        nameDiv.addEventListener("click", ()=>{
            deselectBone();
            selectBone(mesh, false);
            
        });
        eye.addEventListener("click", ()=>{
            eye.classList.toggle("eye-closed");

            // toggle visibiltiy of mesh (hide)
            mesh.material.transparent = !mesh.material.transparent;
            mesh.material.opacity = .2;

            // toggle hide button if selected
            if (INTERSECTED == name)
                $('#hide-toggle').toggleClass('sidebar-button-active');
        })
    }

    $("#bones-list")[0].appendChild(li);

    model_components.set(name, li);
}

// For the bones search bar:
// Allows the user to enter key words and will filter results
function onBoneSearchEdit(e) {
    let qry = $("#search-bones").val().toLowerCase();
    let keys = Array.from(model_components.keys());


    for (var key of keys) {
        if (key.toLowerCase().includes(qry)) {
            model_components.get(key).style.removeProperty("display", "revert");
        }
        else {
            model_components.get(key).style.setProperty("display", "none");
        }
    }
}
$("#search-bones").on("input", onBoneSearchEdit);
$("#clear-search").on("click", ()=>{
    $("#search-bones")[0].value = "";
    onBoneSearchEdit();
});


var last_selected_bone = null;
function setBoneListComponentActive(name, should_scroll) {

    if (name == last_selected_bone)
        return;

    if (name == null) {
        // Disable the style of the last selected bone
        if (last_selected_bone != null)
            model_components.get(last_selected_bone).classList.remove("selected-component");

        // Set its status to null
        last_selected_bone = null;

        return;
    }

    // Add selected style to new component
    model_components.get(name).classList.add("selected-component");

    if (should_scroll)
        model_components.get(name).scrollIntoView();

    // Remove selected style from old component
    if (last_selected_bone != null)
            model_components.get(last_selected_bone).classList.remove("selected-component");

    // Set the last selected to the new one
    last_selected_bone = name;
}

// Initialize WebGL Model
async function init() {
    
    container = $("#vr_explorer")[0];
    container.innerHTML = "";
    $("#vr_button_frame")[0].innerHTML = "";
    $("#vr_button_frame")[0].appendChild( VRButton.createButton( renderer ) );

    //initialize camera 
    camera = new PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
    //set its position centered on the model

    camera.position.set( 0.0, 1.18, 0 );
    
    //initialize the scene and a few lights
    scene = new Scene();
    const light = new AmbientLight( 0x404040 ); // soft white light
    scene.add( light );
    delight = new DirectionalLight( 0xffffff, 1);  //additional lighting
    delight_target = new Object3D();
    delight_target.position.set(selected_model.center.x, selected_model.center.y, selected_model.center.z);
    scene.add(delight_target);
    delight.position.set(camera.position.x, camera.position.y, camera.position.z);
    delight.target = delight_target;
    scene.add(delight);    

    $("#bones-list-header").text("In " + selected_model.name)

    //begin loading in models and add them to an array for storage.
    loader.setPath('./models/' + selected_model.name + '/');

    //container object for models
    function Model_Component(name, scene) {
        this.name = name;
        this.object = scene;
    }

    
    let last_loaded = '';

    // What is this?
    let num_loaded = 0;

    // Instead show percentage loaded
    let num_bones_loaded = 0;
    let num_bones = selected_model.components.length;

    root_bone = bone;
    root_bone.position.set(-4,0,0);
    // The scale is too big, divide it by 10
    root_bone.scale.setScalar(0.1);
    root_bone.name = "Root";
    root_bone.type = "Scene";
    scene.add(root_bone);
    bone = new Group();
    root_bone.add(bone);

    for (const model of selected_model.components){
        
        
        let result = await loader.loadAsync( model + '.glb');
        
        const object = result.scene;

        object.scale.set(selected_model.scale, selected_model.scale, selected_model.scale);
        object.position.set(0, 0, 0);

        //save model name for later under object.name
        let path_index = model.indexOf('/') + 1;
        let parsed_name = model.substring(path_index).replaceAll("/", " ").replaceAll("_", " ");

        // if a bone has multiple files, lump those together into one group otherwise just add it to the scene
        if (parsed_name.substring(0, parsed_name.length - 1) === last_loaded + num_loaded || parsed_name.substring(0, parsed_name.length - 2) === last_loaded  + num_loaded){
            bone.add(object);
            num_loaded++;
        }
        else {

            // scene.add(bone);
            root_bone.add(bone);
            //Save all model object here
            let mc = new Model_Component(parsed_name, object)
            model_container[parsed_name] = mc;

            // Get the mesh
            let mesh;
            object.traverse( function(object) {                
                if(object.type == 'Mesh' && !object.material.transparent){
                    mesh = object;
                }                
            });

            addModelComponent(parsed_name, mesh);
            
            bone = new Group();
            bone.name = parsed_name;
            bone.add(object);
            last_loaded = parsed_name;
            num_loaded = 1;
        }
    
        // For loading animation
        num_bones_loaded++;
        // Loading_String = "Loading... " + ( (num_bones_loaded / num_bones) * 100 ).toFixed(0) + "%";
        let pct = ( (num_bones_loaded / num_bones) * 100 ).toFixed(0);
        // dividing by 8 adds a smoothness otherwise if it loads quick it looks chaotic
        Loading_String = "Loading" + ".".repeat(((num_bones_loaded / 8) % 3) + 1);
        $("#loading-text").text(Loading_String);
        $("#loading-bar")[0].style.setProperty("width", pct + "%");
        
    }

    // What hides the loading section
    $("#loading-frame").hide();   


    // TODO Add the controls to the XR world
    
    function createXRControls() {
        xr_controls = new Block2D({
            width:3, 
            height:5,
            x:0,
            y:0,
            z:0,
            color:0x010002
        });
        // When xr is loaded
        // scene.add( xr_controls.mesh );
    }
    function createXRText() {
        // Text
        let t = new Text2D("Arial_Regular", {font_scale:0.4, font_color:0xffffff});
        let tm = t.mesh;
        let boundingBox = new Box3().setFromObject(tm);
        let scale = new Vector3();
        boundingBox.getSize(scale);
        tm.position.set(
            -scale.x/2,
            1,
            0.1);

        xr_controls.mesh.add(tm);

        // Background
        let bg = new Block2D({
            width:3, 
            height:1,
            x:0,
            y:1,
            z:0.0001,
            color:0x010002
        })
        xr_controls.mesh.add(bg.mesh);

        // add hover events
        t.onHover = (e)=>{
            t.setColor(~t.getColor());
        }
        bg.onHover = (e)=>{
            bg.setColor(~bg.getColor());
        }
        t.onEndHover = (e)=>{
            t.setColor(~t.getColor());
        }
        bg.onEndHover = (e)=>{
            bg.setColor(~bg.getColor());
        }
        let last_color;
        bg.onPointerDown = e=>{
            last_color = bg.getColor();
            bg.setColor(0xff00ff);
        }
        bg.onPointerUp = e=>{
            bg.setColor(last_color);
        }
        bg.onClick = e=>{
            xr_controls.mesh.remove(t.mesh);
        }

        // sync events
        bg.addConnectedEventUIElement(t);
    }
    createXRControls();
    createXRText();
    
    /*
     * Below is the rendering section
     */
    
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = sRGBEncoding;
    renderer.xr.enabled = true;
    renderer.xr.setFramebufferScaleFactor(2.0);

    // XR controllers
    // Just one for now
    // controller1 = renderer.xr.getController(0);
    // controller1.name="left";    
    // controller1.addEventListener("selectstart", onCanvasPointerDown);
    // controller1.addEventListener("selectend", onCanvasPointerUp);
    // scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.name="right";  
    controller2.addEventListener("selectstart", onCanvasPointerDown);
    controller2.addEventListener("selectend", onCanvasPointerUp);
    scene.add(controller2);

    // Raycaster line
    var geometry = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, 0),
        new Vector3(0, 0, -1)
    ]);

    var line = new Line(geometry, new LineBasicMaterial());
    line.name = "line";
    line.scale.z = 50;   //MODIFIED FOR LARGER SCENE

    // controller1.add(line.clone());
    controller2.add(line.clone());


    // Add the canvas
    container.appendChild( renderer.domElement );
    const pmremGenerator = new PMREMGenerator( renderer );
    pmremGenerator.compileEquirectangularShader();

    // Add offset to models
    let offsetX = 0;//-25;
    camera.setViewOffset( window.innerWidth, window.innerHeight, 0, 0, window.innerWidth - offsetX, window.innerHeight );
    camera.updateProjectionMatrix();

    scene.updateMatrixWorld(true);

    // Create controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render ); // use if there is no animation loop
    controls.minDistance = .5;
    controls.maxDistance = 7.0;

    //this is where the camera will be pointing at
    controls.target.set(selected_model.center.x / 10 - 4, selected_model.center.y / 10, selected_model.center.z / 10);

    //alternate controll scheme
    //controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    //controls.mouseButtons.RIGHT = THREE.MOUSE.DOLLY;
    controls.update();
    

    // Window events
    window.addEventListener( 'resize', onWindowResize );
    // AHA!!
    window.addEventListener( 'pointermove', onMouseMove, false );
    // window.addEventListener( 'mousemove', onMouseMove, false );
    window.addEventListener( 'touchmove', onMouseMove, false);
    
    // Canvas events
    // $('canvas').click(onCanvasClick);
    $('canvas').on('touchstart', onCanvasTouchStart);
    $('canvas').on('pointerdown', onCanvasPointerDown);
    $('canvas').on('pointerup', onCanvasPointerUp);

    // Buttons / Clicks
    $('#deselect').click(onClickDeselect);
    $('#focus-toggle').click(onClickFocus);
    $('#hide-toggle').click(onClickHide);
    $('#show-all').click(onClickShowAll);

    // Call resize once to ensure proper initial formatting
    onWindowResize();

    // Set the render function as the animation loop (update function)
    renderer.setAnimationLoop( render );
}

// -- Important Action Functions (select, deselect)
function deselectBone() {   

    // check if we have selected anything
    if (!SELECTED)
        return;

    let last_selected = SELECTED_BONES;
    SELECTED = false;
    SELECTED_BONES = null;
    $('#focus-toggle').click();
    INTERSECTED = '';
    INTERSECTED_BONES = null;
    $("#selected-info").text('Browsing');
    $("#selected").text('No Bone Selected');

    setBoneListComponentActive(null);
    $('#hide-toggle').removeClass('sidebar-button-active');

    onDeselectedBone(last_selected);
}


// -- Events

// Window
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    let scale = 1.25 * window.innerHeight / 1080;
    document.documentElement.style.setProperty("--sidebar-scale", scale);
}

function onMouseMove( e ) {
    
    if(e.touches){
        //mouse.x = (event.touches[0].pageX / window.innerWidth ) * 2 - 1;
        //mouse.y = - (event.touches[0].pageY / window.innerHeight ) * 2 + 1;
    }
    else {
        e.preventDefault();
        mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    }
    
}

function clickFunction( e ) {

    raycaster.setFromCamera( mouse, camera );
    //for caching bone intersected with mouse
    const intersects = raycaster.intersectObjects( scene.children, true );

    // Added check to see if INTERSECTED BONES is null because tools is not a bone
    if (intersects.length > 0) {
        if(INTERSECTED_BONES) {
            getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;
            deselectBone();   

            let clicked_index = null;
            for(const intersect in intersects){
                let boneFound = false;
                let mesh = getMeshFromBoneGroup(intersects[intersect].object);
                if (mesh && !mesh.material.transparent) {
                    clicked_index = intersect;
                    boneFound = true;
                    break;
                }
            }
            
            if(clicked_index != null){
                // console.log(intersects[ clicked_index ].object)
                let clicked_bone = intersects[ clicked_index ].object;//.object.parent.parent.parent.parent;
                selectBone(clicked_bone, true);
            }            
        }
        else if (INTERSECTED_XR_CONTROLS) {
            // This is a click (mouse up and down in a short amount of time)
            // console.log("clicked")
            // INTERSECTED_XR_CONTROLS._onPointerUp();
            // INTERSECTED_XR_CONTROLS._onClick();

            // For now, we handle this seperately in onCanvasPointerDown and up
        }
    }
}

// Canvas
function onCanvasPointerDown(e) {

    MOUSE_IS_DOWN = true;

    // set the last mouse down time for click notice
    lastMouseDownTime = new Date();

    if (INTERSECTED_XR_CONTROLS) {
        INTERSECTED_XR_CONTROLS._onPointerDown(e);
        LAST_XR_CONTROLS = INTERSECTED_XR_CONTROLS;

        // stop orbit
        controls.enabled = false;
    }
}
function onCanvasPointerUp(e) {

    let was_click = new Date().getTime() - lastMouseDownTime.getTime() < 200;

    if (LAST_XR_CONTROLS) {
        LAST_XR_CONTROLS._onPointerUp(e);

        // see if click
        if (was_click) {
            LAST_XR_CONTROLS._onClick(e);
        }

        LAST_XR_CONTROLS = null;

        controls.enabled = true;
    }
    else if (was_click)
        onCanvasClick(e);

    MOUSE_IS_DOWN = false;
}
function onCanvasClick(e) {

    // Check if we have released in a timely manner
    // console.log("Canvas Click");
    let newTime = new Date();

    // Record last selected
    let last_selected_bone = null;

    // Check for double click
    if(mouse.x < 0.6 && SELECTED && (newTime.getTime() - currentTime.getTime()) < 500){              

        last_selected_bone = INTERSECTED_BONES;
        getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;

        // Reset global state to deselected
        deselectBone();

    }
    else if (newTime.getTime() - lastMouseDownTime.getTime() > 200) {
        // If the release is a lot later that mousedown, don't do anything
    }
    else {
        // We have neither double clicked nor waited too long between mouse up and down
        clickFunction();   
    }

    currentTime = new Date();
}

function onCanvasTouchStart(e){
    console.log("Canvas Touch");
    // mouse.x = (e.touches[0].pageX / window.innerWidth ) * 2 - 1;
    // mouse.y = - (e.touches[0].pageY / window.innerHeight ) * 2 + 1;
    // clickFunction();
    // mouse.x = -100;
    // mouse.y = -100;
}

// Buttons (clicks)
function onClickDeselect() {

    // Check if we are currently selecting something
    if (!SELECTED)
        return; 

    getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;
    deselectBone();

}

function onClickFocus() {
        
    if(SELECTED && !FOCUS_MODE){

        // if hidden, show
        let current_mesh = getMeshFromBoneGroup(SELECTED_BONES);
        if (current_mesh.material.transparent) {
            $("#hide-toggle").click();
            current_mesh.material.should_be_hidden = false;
        }

        for(const model in model_container){
            
            if(model != INTERSECTED){
                model_container[model].object.parent.traverse( function(object) {
                    if(object.type == 'Mesh'){
                        // remember state
                        object.material.should_be_hidden = object.material.transparent;
                        object.material.transparent = true;
                        object.material.opacity = .4;
                    }
                });
            }
        }
        FOCUS_MODE = true;
        $('#focus-toggle').addClass('sidebar-button-active');
    }
    else if(FOCUS_MODE){
        for(const model in model_container){
            model_container[model].object.parent.traverse( function(object) {
                if(object.type == 'Mesh'){
                    // Remember state
                    // object.material.transparent = false;
                    object.material.transparent = object.material.should_be_hidden;
                }
            });
        }
        FOCUS_MODE = false;
        $('#focus-toggle').removeClass('sidebar-button-active');
    }
    else
        $('#focus-toggle').removeClass('sidebar-button-active');
}

function onClickHide() {

    // Don't work if focus mode
    if (FOCUS_MODE)
        return;

    if(SELECTED) {
        model_container[INTERSECTED].object.parent.traverse( function(object) {
            if(object.type == 'Mesh'){
                object.material.transparent = !object.material.transparent;
                object.material.opacity = .2;
            }
        });

        // Also now show the hide icon
        model_components.forEach(c=>{
            if (c.getElementsByTagName("span")[0].innerText == INTERSECTED) {
                c.getElementsByTagName("div")[0].classList.toggle("eye-closed");
                return;
            }
        });

        $('#hide-toggle').toggleClass('sidebar-button-active');
    }
    
}

function onClickShowAll() {
    for(const model in model_container){
        model_container[model].object.parent.traverse( function(object) {
            if(object.type == 'Mesh'){
                object.material.transparent = false;
            }
        });
    }

    // Also now clear the bones list hiddens
    model_components.forEach(c=>{
        c.getElementsByTagName("div")[0].classList.remove("eye-closed");
    })
    $('#focus-toggle').removeClass('sidebar-button-active');
    $('#hide-toggle').removeClass('sidebar-button-active');
}

// Bone selection
function onSelectedBone() {

}

function onDeselectedBone(last_selected) {

    if (last_selected)
        console.log("Deselected " + last_selected.name);
}

// -- Animation and rendering
function animate() {
    requestAnimationFrame( animate );
    render();
}

let last_scale = 1;
let vr_scale = 0.1;
function render() {

    // See if we are in xr
    // Potential fix for scaling issue in VR
    if (renderer.xr.isPresenting) {
        if (last_scale != vr_scale) {
            // scene.scale.set( vr_scale, vr_scale, vr_scale );
            last_scale = vr_scale;

            onStartXR();
        }
    }
    else {
        if (last_scale != 1) {
            // scene.scale.set( 1, 1, 1 );
            last_scale = 1;

            onLeaveXR();
        }
    }

    // TODO update the xr contrls

    // Set starting local position (relative to camera, (0,0,0))
    // let x = 0, y = 0, z = 0;
    let x = -4, y = 0, z = -10;

    if (!IN_XR) {
        // account for zoom
        z += controls.target.distanceTo(camera.position);
    }

    xr_controls.mesh.position.set(
        x, 
        y,  
        z  
    );

    // Rotate around origin

    // 1. Get vector and distance from origin
    let direction = xr_controls.mesh.position.clone();
    let d = xr_controls.mesh.position.distanceTo(new Vector3(0,0,0));
    direction.normalize();

    // 2. translate to origin
    xr_controls.mesh.position.set(0,0,0);

    // 3. rotate
    let rotation = camera.rotation.clone();
    xr_controls.mesh.setRotationFromEuler(rotation); 

    // 4. add back
    xr_controls.mesh.translateOnAxis(direction, d);

    // add the target
    if (!IN_XR)
        xr_controls.mesh.position.add(controls.target);
    else
        xr_controls.mesh.position.add(camera.position);

    //sin function for glowing red animation
    const time = Date.now() * 0.0014;
    glow_intensity = (Math.abs(Math.sin(time * 0.7)) * 0.2) + 0.1;

    //function to have spotlight track and trail behind the camera position
    if(delight.position != camera.position){
        let difference = 0.7;
        if(delight.position.x > camera.position.x){
            delight.position.x -= difference ;
            if(delight.position.x < camera.position.x){
                delight.position.x = camera.position.x;
                
            }
        }
        else if(delight.position.x < camera.position.x){
            delight.position.x += difference ;
            if(delight.position.x > camera.position.x){
                delight.position.x = camera.position.x;
            }
        }
    
        if(delight.position.y > camera.position.y){
            delight.position.y -= difference ;
            if(delight.position.y < camera.position.y){
                delight.position.y = camera.position.y;
            }
        }
        else if(delight.position.y < camera.position.y){
            delight.position.y += difference ;
            if(delight.position.y > camera.position.y){
                delight.position.y = camera.position.y;
            }
        }
    
        if(delight.position.z > camera.position.z){
            delight.position.z -= difference ;
            if(delight.position.z < camera.position.z){
                delight.position.z = camera.position.z;
            }
        }
        else if(delight.position.z < camera.position.z){
            delight.position.z += difference;
            if(delight.position.z > camera.position.z){
                delight.position.z = camera.position.z;
            }
        }
    }

    // TODO why is this here?
    // renderer.render( scene, camera );
    if (!IN_XR)
        raycaster.setFromCamera( mouse, camera );
    else {
        tempMatrix.identity().extractRotation(controller2.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    }

    //for caching bone intersected with mouse
    const intersects = raycaster.intersectObjects( scene.children, true );

    //if we have one keep animating untill another is selected
    if(INTERSECTED_BONES != null){

        let mesh = getMeshFromBoneGroup(INTERSECTED_BONES);
        mesh.material.emissive = new Color( 0xff0000 );
        mesh.material.emissiveIntensity = glow_intensity;
    }
    

    if ( intersects.length > 0) {
            let bone_group = null;
            let xr_controls_mesh = null;
            // Traverse all intersected bones that arent hidden or if we select menu item
            for (var i = 0; i < intersects.length && bone_group == null && xr_controls_mesh == null; i++) {

                // Check to see if this is an xr control mesh first
                if (intersects[i].object.uiElement)
                    xr_controls_mesh = intersects[i].object;
                else if (!SELECTED) {
                    intersects[i].object.traverseAncestors(function(curr){
                        // Check to make sure raycasted bone is not hidden too
                        if(curr.type != "Scene" && curr.parent.type == "Scene" && !getMeshFromBoneGroup(curr).material.transparent){
                            bone_group = curr;
                        }
                    });
                }
            }            
            
            //check for new mouse target
            if(bone_group && !MOUSE_IS_DOWN) {

                // Check if we were selecting an old bone group
                if (INTERSECTED_XR_CONTROLS) {
                    // We were selecting menu controls
                    INTERSECTED_XR_CONTROLS._onEndHover();
                    INTERSECTED_XR_CONTROLS = null;
                }
                else if (INTERSECTED != bone_group.name) {

                    if(INTERSECTED_BONES != null){
                        //remove glowing from old selected bone
                        getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;
                    }           

                    INTERSECTED = bone_group.name;
                    //add bone name text to sidebar
                    $("#selected").text(INTERSECTED);
                    INTERSECTED_BONES = bone_group;
                    // console.log("We intersected something new: " + INTERSECTED);
                }
                else {
                    // We are selecting the same thing
                }
                
            }
            else if (xr_controls_mesh) {
                // console.log(xr_controls_mesh.uuid)
                // We are on an xr control

                if (INTERSECTED_XR_CONTROLS != xr_controls_mesh.uiElement || LAST_XR_CONTROLS) {
                    
                    // Here we also see if we currently are hovering over
                    // another UI Elem before
                    if (INTERSECTED_XR_CONTROLS)
                        INTERSECTED_XR_CONTROLS._onEndHover();
                    
                    INTERSECTED_XR_CONTROLS = xr_controls_mesh.uiElement;

                    // remove intersected
                    INTERSECTED_BONES = null;
                    INTERSECTED = "";
                    $("#selected").text("No Bone Selected");

                    INTERSECTED_XR_CONTROLS._onHover();
                }
                else {
                    // We are selecting the same thing
                    // console.log("Goodbye")
                }
            }
    }
    else if (INTERSECTED_BONES) {
        // For when we are not selected and we have no intersects
        if (!SELECTED) {
            // No longer hovering over a bone, change to no bone selected
            // console.log("Stopped hovering over the " + INTERSECTED + ", now not hovering over anything");

            // First remove emissive
            getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;

            // Reset state
            INTERSECTED = "";
            INTERSECTED_BONES = null;
            $("#selected").text("No Bone Selected");
        }
    }
    else if (INTERSECTED_XR_CONTROLS) {
        // When we no longer hover over any UI (a case, another)
        INTERSECTED_XR_CONTROLS._onEndHover();
        INTERSECTED_XR_CONTROLS = null;
    }

    renderer.render( scene, camera );

}

// Callbacks for when we enter/leave VR
function onStartXR() {
    
    IN_XR = true;
    scene.add( xr_controls.mesh );
}
function onLeaveXR() {
    IN_XR = false;
    scene.remove( xr_controls.mesh );
}

// -- Misc/Helper functions
function getCenterPoint(mesh) {
    var middle = new Vector3();
    var geometry = mesh.geometry;

    geometry.computeBoundingBox();

    middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
    middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
    middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;

    mesh.localToWorld( middle );
    return middle;
}

function getMeshFromBoneGroup(bone_group) {

    if (!bone_group || (bone_group.type != 'Mesh' && bone_group.type != 'Group')) {
        // create a fake obj that is transparent
        return {material:{transparent:true}};
    }

    let mesh = null;

    if (bone_group.type == 'Mesh')
        return bone_group;

    bone_group.traverse( function(object) {
        if(object.type == 'Mesh'){
            mesh = object;
        }
    });

    if (!mesh) 
        return {material:{transparent:true}};

    return mesh;
}
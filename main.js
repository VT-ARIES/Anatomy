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
var controllerL, controllerR;
var tempMatrix = new Matrix4();

let INTERSECTED = '';
let INTERSECTED_BONES = null;

let IN_XR = false;
let MOUSE_IS_DOWN = false;
let INTERSECTED_XR_CONTROLS = null;
let LAST_XR_CONTROLS = null;

let SELECTED = false;
let SELECTED_BONES = null;
var LAST_SELECTED_BONES = null;

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
let MODEL_SCALE = 0.1;
let MODEL_POSITION_WEB = new Vector3(-4, 0, 0);
let MODEL_POSITION_XR = new Vector3(-1, 0, 0);
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
var xr_controls_ui = {
    browsing: {text:null},
    bone: {text:null},
};


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


function setBoneListComponentActive(name, should_scroll) {


    // Occurs initially
    if (!LAST_SELECTED_BONES)
        LAST_SELECTED_BONES = SELECTED_BONES;

    if (name == null) {
        // Disable the style of the last selected bone
        if (LAST_SELECTED_BONES != null)
            model_components.get(LAST_SELECTED_BONES.name).classList.remove("selected-component");

        return;
    }

    // Add selected style to new component
    model_components.get(name).classList.add("selected-component");

    if (should_scroll)
        model_components.get(name).scrollIntoView();

    // Remove selected style from old component
    if (LAST_SELECTED_BONES && LAST_SELECTED_BONES.name !== name)
            model_components.get(LAST_SELECTED_BONES.name).classList.remove("selected-component");

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

    // We can actually set a target for the directional light
    delight_target = new Object3D();
    delight_target.position.set(
        selected_model.center.x * MODEL_SCALE + MODEL_POSITION_WEB.x, 
        selected_model.center.y * MODEL_SCALE + MODEL_POSITION_WEB.y, 
        selected_model.center.z * MODEL_SCALE + MODEL_POSITION_WEB.z);
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
    root_bone.position.copy(MODEL_POSITION_WEB);
    // root_bone.position.set(-4,0,0);
    // The scale is too big, divide it by 10
    root_bone.scale.setScalar(MODEL_SCALE);
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
        
        // Browsing Text
        xr_controls_ui.browsing.text = new Text2D("Browsing", {font_scale:0.23, font_color:0x6495ed});
        let tm = xr_controls_ui.browsing.text.mesh;
        let boundingBox = new Box3().setFromObject(tm);
        let scale = new Vector3();
        boundingBox.getSize(scale);
        tm.position.set(
            -1.3,
            1.8,
            0.1
        );
        xr_controls.mesh.add(tm);

        // Bone text
        xr_controls_ui.bone.text = new Text2D("Bone", {font_scale:0.15, font_color:0xffffff});
        tm = xr_controls_ui.bone.text.mesh;
        boundingBox = new Box3().setFromObject(tm);
        boundingBox.getSize(scale);
        tm.position.set(
            -1.3,
            1.5,
            0.1
        );
        xr_controls.mesh.add(tm);

        // Buttons

        // Focus button
        let t3 = new Text2D("Focus", {font_scale:0.3, font_color:0xffffff});
        tm = t3.mesh;
        boundingBox = new Box3().setFromObject(tm);
        boundingBox.getSize(scale);
        tm.position.set(
            -1.0,
            0.7,
            0.1
        );
        xr_controls.mesh.add(tm);

        // Background
        let bg = new Block2D({
            width:1.2, 
            height:0.5,
            x:-0.6,
            y:0.8,
            z:0.01,
            color:0x010002
        });

        // Events
        t3.onHover = (e)=>{
            t3.setColor(~t3.getColor());
        }
        bg.onHover = (e)=>{
            bg.setColor(~bg.getColor());
        }
        t3.onEndHover = (e)=>{
            t3.setColor(~t3.getColor());
        }
        bg.onEndHover = (e)=>{
            bg.setColor(~bg.getColor());
        }
        bg.onClick = e=>{
            //xr_controls.mesh.remove(t.mesh);
            onClickFocus();
        }

        xr_controls.mesh.add(tm);
        xr_controls.mesh.add(bg.mesh);
        bg.addConnectedEventUIElement(t3);

        // Hide button

        let t4 = new Text2D("Hide", {font_scale:0.3, font_color:0xffffff});
        tm = t4.mesh;
        boundingBox = new Box3().setFromObject(tm);
        boundingBox.getSize(scale);
        tm.position.set(
            0.3,
            0.7,
            0.1
        );

        // Background
        let bg2 = new Block2D({
            width:1.0, 
            height:0.5,
            x:0.6,
            y:0.8,
            z:0.01,
            color:0x010002
        });

        // Events
        t4.onHover = (e)=>{
           t4.setColor(~t4.getColor());
        }
        bg2.onHover = (e)=>{
            bg2.setColor(~bg2.getColor());
        }
        t4.onEndHover = (e)=>{
            t4.setColor(~t4.getColor());
        }
        bg2.onEndHover = (e)=>{
            bg2.setColor(~bg2.getColor());
        }
        bg2.onClick = e=>{
            //xr_controls.mesh.remove(t.mesh);
            onClickHide();
        }

        xr_controls.mesh.add(tm);
        xr_controls.mesh.add(bg2.mesh);
        bg2.addConnectedEventUIElement(t4);

        // Deselect button

        // Text
        let t5 = new Text2D("Deselect", {font_scale:0.3, font_color:0xffffff});
        tm = t5.mesh;
        boundingBox = new Box3().setFromObject(tm);
        boundingBox.getSize(scale);
        tm.position.set(
            -scale.x / 2,
            0.05,
            0.1
        );

        let bg3 = new Block2D({
            width:2.0, 
            height:0.5,
            x:0,
            y:0.15,
            z:0.01,
            color:0x010002
        });

        // Events
        t5.onHover = (e)=>{
           t5.setColor(~t5.getColor());
        }
        bg3.onHover = (e)=>{
            bg3.setColor(~bg3.getColor());
        }
        t5.onEndHover = (e)=>{
            t5.setColor(~t5.getColor());
        }
        bg3.onEndHover = (e)=>{
            bg3.setColor(~bg3.getColor());
        }
        bg3.onClick = e=>{
            //xr_controls.mesh.remove(t.mesh);
            onClickDeselect();
        }

        xr_controls.mesh.add(tm);
        xr_controls.mesh.add(bg3.mesh);
        bg3.addConnectedEventUIElement(t5);

        // Show all Button

        // Text

        let t6 = new Text2D("Show all", {font_scale:0.3, font_color:0xffffff});
        tm = t6.mesh;
        boundingBox = new Box3().setFromObject(tm);
        boundingBox.getSize(scale);
        tm.position.set(
            -scale.x / 2,
            -0.6,
            0.1
        );
        
        let bg4 = new Block2D({
            width:2.0, 
            height:0.5,
            x:0.0,
            y:-0.5,
            z:0.01,
            color:0x010002
        });

        // Events
        t6.onHover = (e)=>{
           t6.setColor(~t6.getColor());
        }
        bg4.onHover = (e)=>{
            bg4.setColor(~bg4.getColor());
        }
        t6.onEndHover = (e)=>{
            t6.setColor(~t6.getColor());
        }
        bg4.onEndHover = (e)=>{
            bg4.setColor(~bg4.getColor());
        }
        bg4.onClick = e=>{
            //xr_controls.mesh.remove(t.mesh);
            onClickShowAll();
        }

        xr_controls.mesh.add(tm);
        xr_controls.mesh.add(bg4.mesh);
        bg4.addConnectedEventUIElement(t6);

    }
    createXRControls();
    
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
    controllerR = renderer.xr.getController(0);
    controllerR.name="right";  
    controllerR.addEventListener("selectstart", onCanvasPointerDown);
    controllerR.addEventListener("selectend", onCanvasPointerUp);
    scene.add(controllerR);

    controllerL = renderer.xr.getController(1);
    controllerL.name="left";    
    // controllerL.addEventListener("selectstart", onCanvasPointerDown);
    // controllerL.addEventListener("selectend", onCanvasPointerUp);
    scene.add(controllerL);

    // Raycaster line
    var geometry = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, 0),
        new Vector3(0, 0, -1)
    ]);

    var line = new Line(geometry, new LineBasicMaterial());
    line.name = "line";
    line.scale.z = 50;   //MODIFIED FOR LARGER SCENE

    // controllerL.add(line.clone());
    controllerR.add(line.clone());


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
    controls.target.set(selected_model.center.x * MODEL_SCALE - 4, selected_model.center.y * MODEL_SCALE, selected_model.center.z * MODEL_SCALE);

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

    // TODO Log errors
    // var log = document.querySelector('#log');
    // ['log','debug','info','warn','error'].forEach(function (verb) {
    //     console[verb] = (function (method, verb, log) {
    //         return function () {
    //             method.apply(console, arguments);
    //             var msg = document.createElement('div');
    //             msg.classList.add(verb);
    //             msg.textContent = verb + ': ' + Array.prototype.slice.call(arguments).join(' ');
    //             log.appendChild(msg);
    //         };
    //     })(console[verb], verb, log);
    // });
}

// -- Important Action Functions (select, deselect)
function deselectBone() {   

    // check if we have selected anything
    if (!SELECTED || FOCUS_MODE)
        return;

    LAST_SELECTED_BONES = SELECTED_BONES;
    getMeshFromBoneGroup(SELECTED_BONES).material.emissiveIntensity = 0;

    SELECTED = false;
    SELECTED_BONES = null;
    // $('#focus-toggle').click();
    // INTERSECTED = '';
    // INTERSECTED_BONES = null;
    $("#selected-info").text('Browsing');
    $("#selected").text('No Bone Selected');

    setBoneListComponentActive(null);
    $('#hide-toggle').removeClass('sidebar-button-active');

    onDeselectedBone(LAST_SELECTED_BONES);
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
        mouse.x = (e.touches[0].pageX / window.innerWidth ) * 2 - 1;
        mouse.y = - (e.touches[0].pageY / window.innerHeight ) * 2 + 1;
    }
    else {
        e.preventDefault();
        mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    }
    
}

function clickFunction( e ) {



    // Updated for xr gui interaction

    // Check if we are intersecting bones or a menu
    if (INTERSECTED_BONES) {

        let mesh = getMeshFromBoneGroup(INTERSECTED_BONES);

        // If we aren't selecting bones, select these
        if (!SELECTED_BONES) {
            selectBone(mesh, true);
        }
        // Select the new bones if not currently selected
        else if (INTERSECTED_BONES.name !== SELECTED_BONES.name) {
            deselectBone();

            selectBone(mesh, true);
        }
    }
    else if (INTERSECTED_XR_CONTROLS) {

        // Trigger an onclick event
        INTERSECTED_XR_CONTROLS._onClick(e);
    }

    return;
    raycaster.setFromCamera( mouse, camera );
    //for caching bone intersected with mouse
    const intersects = raycaster.intersectObjects( scene.children, true );

    // Added check to see if INTERSECTED BONES is null because tools is not a bone
    if (intersects.length > 0) {
        if(INTERSECTED_BONES) {
            getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;
            // deselectBone();   

            let clicked_index = null;
            for(const intersect in intersects){
                let boneFound = false;
                let mesh = getMeshFromBoneGroup(intersects[intersect].object);
                if (mesh && !mesh.material.transparent) {
                    clicked_index = intersect;
                    boneFound = true;
                    // TODO
                    deselectBone();
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

    // Check for double click
    if(mouse.x < 0.6 && SELECTED && (newTime.getTime() - currentTime.getTime()) < 500){              

        // Reset global state to deselected
        if (!FOCUS_MODE)
            deselectBone();

    }
    else if (newTime.getTime() - lastMouseDownTime.getTime() > 200) {
        // If the release is a lot later that mousedown, don't do anything
    }
    else {
        // We have neither double clicked nor waited too long between mouse up and down
        clickFunction(e);   
    }

    currentTime = new Date();
}

function onCanvasTouchStart(e){
    console.log("Canvas Touch");
    mouse.x = (e.touches[0].pageX / window.innerWidth ) * 2 - 1;
    mouse.y = - (e.touches[0].pageY / window.innerHeight ) * 2 + 1;
    clickFunction();
    mouse.x = -100;
    mouse.y = -100;
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
            
            if(model !== SELECTED_BONES.name){

                let mesh = getMeshFromBoneGroup(model_container[model].object);
                mesh.material.should_be_hidden = mesh.material.transparent ? true : false;
                mesh.material.transparent = true;
                mesh.material.opacity = 0.2;

                // model_container[model].object.parent.traverse( function(object) {
                //     if(object.type == 'Mesh'){
                //         // remember state
                //         object.material.should_be_hidden = object.material.transparent;
                //         object.material.transparent = true;
                //         object.material.opacity = .4;
                //     }
                // });
            }
            else {
                let mesh = getMeshFromBoneGroup(SELECTED_BONES);
                mesh.material.should_be_hidden = false;
                mesh.material.transparent = false;
                mesh.material.opacity = 1.0;
            }
        }
        FOCUS_MODE = true;
        $('#focus-toggle').addClass('sidebar-button-active');
    }
    else if(FOCUS_MODE){
        for(const model in model_container){

            if (model !== SELECTED_BONES.name) {

                let mesh = getMeshFromBoneGroup(model_container[model].object);

                let should_be_hidden = mesh.material.should_be_hidden;
                mesh.material.transparent = should_be_hidden;

                // Check if the opacity should be restored
                if (!should_be_hidden)
                    mesh.material.opacity = 1.0;

                mesh.material.should_be_hidden = false;

            }
            // model_container[model].object.parent.traverse( function(object) {
            //     if(object.type == 'Mesh'){
            //         // Remember state
            //         // object.material.transparent = false;
            //         object.material.transparent = object.material.should_be_hidden;
            //     }
            // });
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
        let mesh = getMeshFromBoneGroup(SELECTED_BONES);

        mesh.material.transparent = !mesh.material.transparent;

        if (mesh.material.opacity == 1.0)
            mesh.material.opacity = .2;
        else
            mesh.material.opacity = 1.0;

        // model_container[INTERSECTED].object.parent.traverse( function(object) {
        //     if(object.type == 'Mesh'){
        //         object.material.transparent = !object.material.transparent;
        //         object.material.opacity = .2;
        //     }
        // });

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
    xr_controls_ui.browsing.text.updateText("Selected:");
    xr_controls_ui.bone.text.updateText(SELECTED_BONES.name);
}

function onDeselectedBone(last_selected) {

    if (last_selected)
        console.log("Deselected " + last_selected.name);

    xr_controls_ui.browsing.text.updateText("Browsing");
    xr_controls_ui.bone.text.updateText("No Bone Selected");
}

function onEnterHoverBone(bone_group) {
    xr_controls_ui.bone.text.updateText(bone_group.name);
}
function onLeaveHoverBone(bone_group) {
    xr_controls_ui.bone.text.updateText("No Bone Selected");
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
    let x = -3, y = 0, z = -10;

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
    function updateDelightPosition() {

        if(!delight.position.equals(camera.position)){
            let difference = 0.07;
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
    }
    updateDelightPosition();

    // TODO why is this here?
    // renderer.render( scene, camera );
    if (!IN_XR)
        raycaster.setFromCamera( mouse, camera );
    else {
        tempMatrix.identity().extractRotation(controllerR.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controllerR.matrixWorld);
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
                else if (!MOUSE_IS_DOWN && INTERSECTED != bone_group.name) {
                    // shw added mouse down check
                    if(INTERSECTED_BONES != null){
                        //remove glowing from old selected bone
                        getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;
                    }           

                    INTERSECTED = bone_group.name;
                    //add bone name text to sidebar
                    $("#selected").text(INTERSECTED);
                    INTERSECTED_BONES = bone_group;

                    onEnterHoverBone(INTERSECTED_BONES);
                    // console.log("We intersected something new: " + INTERSECTED);
                }
                else {
                    // We are selecting the same thing
                }
                
            }
            else if (xr_controls_mesh) {
                // We are on an xr control

                if (INTERSECTED_XR_CONTROLS != xr_controls_mesh.uiElement || LAST_XR_CONTROLS) {
                    
                    // Here we also see if we currently are hovering over
                    // another UI Elem before
                    if (INTERSECTED_XR_CONTROLS)
                        INTERSECTED_XR_CONTROLS._onEndHover();
                    
                    INTERSECTED_XR_CONTROLS = xr_controls_mesh.uiElement;

                    // remove intersected IFF not selecting bones
                    if (!SELECTED_BONES) {
                        INTERSECTED_BONES = null;
                        INTERSECTED = "";
                        $("#selected").text("No Bone Selected");
                    }

                    INTERSECTED_XR_CONTROLS._onHover();
                }
                else {
                    // We are selecting the same thing
                }
            }
    }
    else if (INTERSECTED_BONES) {
        // For when we are not selected and we have no intersects
        if (!SELECTED) {
            // No longer hovering over a bone, change to no bone selected
            // console.log("Stopped hovering over the " + INTERSECTED + ", now not hovering over anything");
            onLeaveHoverBone(INTERSECTED_BONES);

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

    // move the model closer
    root_bone.position.copy(MODEL_POSITION_XR);

    // Move the directional light target
    delight_target.position.copy(MODEL_POSITION_XR.clone().sub(MODEL_POSITION_WEB));
}
function onLeaveXR() {
    IN_XR = false;
    scene.remove( xr_controls.mesh );
    root_bone.position.copy(MODEL_POSITION_WEB);

    // Move the directional light target
    delight_target.position.copy(MODEL_POSITION_WEB.clone().sub(MODEL_POSITION_XR));
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
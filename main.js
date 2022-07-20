import {
    Raycaster,
    Vector2,
    Vector3,
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
    BoxGeometry,
    MeshBasicMaterial,
    Mesh
} from 'https://unpkg.com/three@0.119.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js?module';
import { GLTFLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/GLTFLoader.js?module';
import { VRButton } from 'https://unpkg.com/three@0.127.0/examples/jsm/webxr/VRButton.js?module';
//import { Object3D } from 'three';

// SHW - Updated and outsourced modeling code to "/js/classes/models/models.js"
import {LoadModels} from "./js/classes/models/models.js";

// For the bg paws
import generatePaws from "./js/bgpawgenerator.js";

// Global definitions/variables
let camera, scene, renderer;
let raycaster = new Raycaster();
let container;
let controls;

let INTERSECTED = '';
let INTERSECTED_BONES = null;
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
let mouseDown; 
let bone = new Group();
let currentTime = new Date();

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
page_directory.push(new Page("loading", ["loading-text"], true));
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
            model_components.get(key).style.setProperty("display", "block");
        }
        else {
            model_components.get(key).style.setProperty("display", "none");
        }
    }
}
$("#search-bones").on("input", onBoneSearchEdit)


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
    
    mouseDown = 0;

    //initialize camera 
    camera = new PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
    //set its position centered on the model
    camera.position.set( 40, 11.8, 0 );
    
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
            
            scene.add(bone);
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
        Loading_String = "Loading... " + ( (num_bones_loaded / num_bones) * 100 ).toFixed(0) + "%";
        $("#loading-text").text(Loading_String);
        
    }

    // What hides the loading section
    $("#loading-text").hide();
    
    // Add the root to the scene
    scene.add(bone);


    // TODO Add the controls to the XR world
    /*
    let geometry1 = new BoxGeometry( 3, 5, 0.1 );
    let material1 = new MeshBasicMaterial( {color: 0x010002} );
    xr_controls = new Mesh( geometry1, material1 );
    xr_controls.position.set(0,3,0);
    xr_controls.rotation.set(0,Math.PI/2,0);
    scene.add( xr_controls );
    */
    /*
     * Below is the rendering section
     */
    
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = sRGBEncoding;
    renderer.xr.enabled = true;

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
    controls.minDistance = 5;
    controls.maxDistance = 70;

    //this is where the camera will be pointing at
    controls.target.set(selected_model.center.x, selected_model.center.y, selected_model.center.z);

    //alternate controll scheme
    //controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    //controls.mouseButtons.RIGHT = THREE.MOUSE.DOLLY;
    controls.update();
    

    // Window events
    window.addEventListener( 'resize', onWindowResize );
    window.addEventListener( 'mousemove', onMouseMove, false );
    window.addEventListener( 'touchmove', onMouseMove, false);
    
    // Canvas events
    $('canvas').click(onCanvasClick);
    $('canvas').on('touchstart', onCanvasTouchStart);

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

function mouseDownFunction( e ) {
    
    raycaster.setFromCamera( mouse, camera );
    //for caching bone intersected with mouse
    const intersects = raycaster.intersectObjects( scene.children, true );

    // Added check to see if INTERSECTED BONES is null because tools is not a bone
    if(INTERSECTED_BONES && intersects.length > 0) {
        INTERSECTED_BONES.traverse( function(object) {
            if(object.type == 'Mesh'){
                object.material.emissiveIntensity = 0;
            }
        });
        deselectBone();   

        let clicked_index = null;
        for(const intersect in intersects){
            let boneFound = false;
            intersects[intersect].object.parent.traverse( function(object) {                
                if(object.type == 'Mesh' && !object.material.transparent){
                    clicked_index = intersect;
                    boneFound = true;
                }                
            });
            if(boneFound){
                break;
            }
        }
        
        if(clicked_index != null){
            // console.log(intersects[ clicked_index ].object)
            let clicked_bone = intersects[ clicked_index ].object;//.object.parent.parent.parent.parent;
            selectBone(clicked_bone, true);
        }            
    }
}

// Canvas
function onCanvasClick() {
    console.log("Canvas Click");
    let newTime = new Date();

    // Record last selected
    let last_selected_bone = null;

    // Methinks this is checking for a double click
    if(mouse.x < 0.6 && SELECTED && (newTime.getTime() - currentTime.getTime()) < 500){               
        INTERSECTED_BONES.traverse( function(object) {
            if(object.type == 'Mesh'){
                object.material.emissiveIntensity = 0;
            }
        });

        last_selected_bone = INTERSECTED_BONES;
        getMeshFromBoneGroup(INTERSECTED_BONES).material.emissiveIntensity = 0;

        $("#selected-info").text("Browsing:");

        // Reset global state to deselected
        deselectBone();

    }

    mouseDownFunction();   
    currentTime = new Date();
}

function onCanvasTouchStart(e){
    console.log("Canvas Touch");
    mouse.x = (e.touches[0].pageX / window.innerWidth ) * 2 - 1;
    mouse.y = - (e.touches[0].pageY / window.innerHeight ) * 2 + 1;
    mouseDownFunction();
    mouse.x = -100;
    mouse.y = -100;
}

// Buttons (clicks)
function onClickDeselect() {

    // Check if we are currently selecting something
    if (!SELECTED)
        return; 
        
    INTERSECTED_BONES.traverse( function(object) {
        if(object.type == 'Mesh'){
            object.material.emissiveIntensity = 0;
        }
    })
    deselectBone();

}

function onClickFocus() {
        
    if(SELECTED && !FOCUS_MODE){
        for(const model in model_container){
            
            if(model != INTERSECTED){
                model_container[model].object.parent.traverse( function(object) {
                    if(object.type == 'Mesh'){
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
                    object.material.transparent = false;
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
            scene.scale.set( vr_scale, vr_scale, vr_scale );
            last_scale = vr_scale;

            onStartXR();
        }
    }
    else {
        if (last_scale != 1) {
            scene.scale.set( 1, 1, 1 );
            last_scale = 1;

            onLeaveXR();
        }
    }

    // TODO update the xr contrls

    /*
    // Will be the starting point
    let camera_pos = [camera.position.x, camera.position.y, camera.position.z];
    // Get the target unit vector
    let camera_rotation = [camera.rotation.x, camera.rotation.y, camera.rotation.z];
    let mag = Math.sqrt(camera_rotation[0]*camera_rotation[0]+camera_rotation[1]*camera_rotation[1]+camera_rotation[2]*camera_rotation[2]);
    if (mag == 0) mag = 1;
    camera_rotation[0] /= mag;
    camera_rotation[1] /= mag;
    camera_rotation[2] /= mag;
    // Then push in the camera directions
    xr_controls.position.set(
        camera_pos[0] + camera_rotation[0],
        camera_pos[1] + camera_rotation[1],
        (camera_pos[2] + camera_rotation[2])
    )

    // console.log(camera_pos[0]);
    // xr_controls.position.set(camera.position.x)
    */

    //sin function for glowing red animation
    const time = Date.now() * 0.0014;
    glow_intensity = (Math.abs(Math.sin(time * 0.7)) * 0.2) + 0.1;

    renderer.render( scene, camera );
    raycaster.setFromCamera( mouse, camera );
    
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

    //for caching bone intersected with mouse
    const intersects = raycaster.intersectObjects( scene.children, true );
    //if we have one keep animating untill another is selected
    if(INTERSECTED_BONES != null){
        INTERSECTED_BONES.traverse( function(object) {
            if(object.type == 'Mesh'){ 
                object.material.emissive = new Color( 0xff0000 );;
                object.material.emissiveIntensity = glow_intensity;
            }
        })
    }
    
    if ( intersects.length > 0 && !SELECTED ) {
            let bone_group;
            intersects[0].object.traverseAncestors(function(curr){
                if(curr.type != "Scene" && curr.parent.type == "Scene"){
                    bone_group = curr;
                }
            });
            
            //check for new mouse target
            if(bone_group && INTERSECTED != bone_group.name){

                let obj;
                if(INTERSECTED_BONES != null){
                    //remove glowing from old selected bone
                    INTERSECTED_BONES.traverse( function(object) {
                        if(object.type == 'Mesh'){
                            obj = object;
                            object.material.emissiveIntensity = 0;
                        }
                    })
                }
                

                INTERSECTED = bone_group.name;
                //add bone name text to sidebar
                $("#selected").text(INTERSECTED);
                INTERSECTED_BONES = bone_group;
                
            }        
    }
    else if (!SELECTED && INTERSECTED != "") {
        // SHW stop cacheing and when not hovering over bone change to no bone selected
        INTERSECTED = "";
        INTERSECTED_BONES = null;
        $("#selected").text("No Bone Selected");
    }

    // camera.position.z = -5;//Math.sin(2*0.005*performance.now());

    renderer.render( scene, camera );

}

// Callbacks for when we enter/leave VR
function onStartXR() {

}
function onLeaveXR() {

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

    let mesh = null;

    bone_group.traverse( function(object) {
        if(object.type == 'Mesh'){
            mesh = object;
        }
    });

    return mesh;
}
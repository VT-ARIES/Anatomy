// For static loading (comment out for dynamic loading and make sure up to date)
import  * as THREE from './js/modules/three.js';
import { OrbitControls } from './js/modules/OrbitControls.js';
import { GLTFLoader } from './js/modules/GLTFLoader.js';
import { VRButton } from './js/modules/VRButton.js';

// Maybe used later
// import { XRControllerModelFactory } from './js/modules/XRController.js';

// SHW - Updated and outsourced modeling code to "/js/classes/models/models.js"
import {LoadModels} from "./js/classes/models/models.js";

// For the bg paws
import generatePaws from "./js/bgpawgenerator.js";

// My own libraries
import Block2D from './js/classes/UI/block2d.js';
import HTML2D from './js/classes/UI/html2d.js';
import QuizManager from './js/classes/assessment/quizmanager.js';



// -- Global definitions/variables

// Basic scene stuff
let camera, scene, renderer;
let player; // used to hold camera

// Used for hovering and selecting bones and ui items
let raycaster = new THREE.Raycaster();
let container;

// The OrbitControls used for web viewer
let controls;

// XR controllers
// var XR_CONTROLLER_FACTORY; -- used later possibly
var controllers = [];
var controllerL, controllerR;
var tempMatrix = new THREE.Matrix4(); // Used in some calculations


// -- State macros 

// options
let DEMO_XR_IN_WEB = false;
let USE_PORTABLE_XR_UI = !DEMO_XR_IN_WEB;

// State of bone we are hovered over
let INTERSECTED = ''; // name
let INTERSECTED_BONES = null; // bone object
let SELECTED = false; // Used for some logic
let SELECTED_BONES = null; // bone object
var LAST_SELECTED_BONES = null; 
let FOCUS_MODE = false; // Used for some button logic

let INTERSECTED_XR_CONTROLS = null;  // intersected controls object
let LAST_XR_CONTROLS = null; // used for some logic

let LOADING = false; // This is for loading when starting XR
let IN_XR = false; // checks if we are in XR
let CURRENT_MODE = 0; // explore = 0, quiz = 1
let MOUSE_IS_DOWN = false; // Used for some mouse logic
let XR_HAS_2_CONTROLLERS = false; // Used for xr controller logic

// XR UI controls
var xr_controls; // left hand
var xr_nav_tooltip; // right hand
var xr_controls_ui = { // preset object that will hold left hand UI
    browsing: {text:null},
    bone: {text:null},
}; // ... is accessed during usage

// Raycast line guide for xr
var xr_line;

// The loading string we start with (changes to Loading...) while loading
let Loading_String = 'Loading';

let glow_intensity = 0;

// The webgl renderer we will be using
renderer = new THREE.WebGLRenderer( { antialias: true } );
// Set the bg color
renderer.setClearColor(0x181B21);

// Some Variables in the 3D scene
let delight; // directional light
let delight_target; // ... and its target
let bone = new THREE.Group(); // TODO move this out of globals, used in model generation
let root_bone; // The root bone of the model we can play around with size, rotation, position
let MODEL_SCALE = 0.1; // Scale the model (they are huge by default)
let MODEL_CENTER = new THREE.Vector3(); // The positional center of the model
let MODEL_POSITION_WEB = new THREE.Vector3(-4, 0, 0); // The default web position of the model
let MODEL_POSITION_XR = new THREE.Vector3(-1, 0, 0); // The default position in XR of the model
let currentTime = new Date(); // Used in mouse logic
let lastMouseDownTime = new Date(); // ^

// Our model atlas
var model_atlas = new Map();

// Holds the mouse coordinates
let mouse = new THREE.Vector2(-100, -100); 

// Will contain all of the model components
var model_container = {};

var loader = new GLTFLoader(); // WebGL model gltf loader
var selected_model; // Selected model

// Assessment Mangager
var quizManager = new QuizManager();

// Pages used for navigation
// Just hide and show divs with jquery
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

// Holds all of our pages
var page_directory = [];

// Created our "pages"
page_directory.push(new Page("about", ["about"], true));
page_directory.push(new Page("home", ["modal", "home"], false));
page_directory.push(new Page("loading", ["loading-frame"], true));
page_directory.push(new Page("vr_explorer", ["quizbar", "sidebar", "vr_explorer", "vr_button_frame"], true));
page_directory.push(new Page("contact", ["contact"], true));

// This function is how we navigate from page to page
// Hide the last and show the new
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

// Add click events to the header page titles
$("#page_about").on("click", ()=>navigate("about"));
$("#page_home").on("click", ()=>navigate("home"));
$("#page_contact").on("click", ()=>navigate("contact"));

// Set up artwork style
// Changes some css variables for very flexible styling
function rs (e) {
    let w_ratio = Math.min(1, window.innerWidth / 1280);
    let h_ratio = Math.min(1, window.innerHeight / 600);

    document.documentElement.style.setProperty("--art-scale",
        w_ratio * h_ratio);
}
window.addEventListener("resize", rs);
rs();

// Go to loading screen
navigate("loading");

// On page ready
$(document).ready(function(){

    // Hide initialize
    $("#initialize").hide();

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

            // Convert center position to THREE.Vector3
            modelObj.center = new THREE.Vector3(...modelObj.center);

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

        navigate("home");

        // Eye candy
        generatePaws(3, 90, 0, 30, 0.3, 0.3);
    });

});

// On bone selection
function selectBone(clicked_bone, clicked_canvas) {

    let centerOfMesh = getCenterPoint(clicked_bone);

    // Focus on the selected bone (or rather, the central point of it)
    controls.target.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
    // delight_target.position.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
    // delight.target = delight_target;
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

    // An eye user can click to toggle visibility of the bone on the model
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

// When we select a bone either by clicking on the list component or the model,
// we should highlight the tab and possibly scroll to it
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
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
    //set its position centered on the model

    // Our player for the camera
    // Otherwise we can't move and rotate the camera
    player = new THREE.Group();
    player.add(camera);

    camera.position.set( 0.0, 1.18, 0 );

    //initialize the scene and a few lights
    scene = new THREE.Scene();
    const light = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( light );
    scene.add(player);

    delight = new THREE.DirectionalLight( 0xffffff, 1);  //additional lighting

    // We can actually set a target for the directional light
    delight_target = new THREE.Object3D();
    delight_target.position.set(
        selected_model.center.x * MODEL_SCALE + MODEL_POSITION_WEB.x,
        selected_model.center.y * MODEL_SCALE + MODEL_POSITION_WEB.y,
        selected_model.center.z * MODEL_SCALE + MODEL_POSITION_WEB.z);
    scene.add(delight_target);

    delight.position.set(camera.position.x, camera.position.y, camera.position.z);
    delight.target = delight_target;
    scene.add(delight);

    // Shows "In Equine" for example in the bones list
    $("#bones-list-header").text("In " + selected_model.name)

    //begin loading in models and add them to an array for storage.
    loader.setPath('./models/' + selected_model.name + '/');

    //container object for models
    function Model_Component(name, scene) {
        this.name = name;
        this.object = scene;
    }

    let last_loaded = '';

    // TODO What is this? 
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
    bone = new THREE.Group();
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

            bone = new THREE.Group();
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
        // Update loading bar
        $("#loading-bar")[0].style.setProperty("width", pct + "%");

    }

    // What hides the loading section
    $("#loading-frame").hide();

    // model center
    const box = new THREE.Box3( ).setFromObject( root_bone );
	MODEL_CENTER = box.getCenter( new THREE.Vector3( ) );

    // Create the XR Control Panels
    // See ./js/classes/UI for some insight into constructors and how it works
    function createXRControls() {

        function createLeftXRControls() {
            xr_controls = new Block2D({
                width:3,
                height:5,
                x:1.4,
                y:0,
                z:0,
                color:0x010002,
                transparent:true,
                opacity:0.5
            });

            xr_controls_ui.log = new HTML2D($("#log")[0], {position:new THREE.Vector3(.1,2,0), width:2.8, height:0.44});

            xr_controls_ui.browsing.text = new HTML2D($("#selected-info")[0], {position:new THREE.Vector3(.1,1.8,0), width:2.8, height:0.44});
            xr_controls_ui.bone.text = new HTML2D($("#selected")[0], {style:"font-size:24px", position:new THREE.Vector3(.1,1.2,0), width:2.8, height:0.65});
            xr_controls_ui.focus = new HTML2D($("#focus-toggle")[0], {style:"width:90%;", position:new THREE.Vector3(-.6,.6,0), width:1.3, height:0.5});
            xr_controls_ui.hide = new HTML2D($("#hide-toggle")[0], {style:"width:90%;", position:new THREE.Vector3(.7,.6,0), width:1.3, height:0.5});
            xr_controls_ui.deselect = new HTML2D($("#deselect")[0], {style:"width:90%;", position:new THREE.Vector3(-.6,0.1,0), width:1.3, height:0.5});
            xr_controls_ui.show_all = new HTML2D($("#show-all")[0], {style:"width:90%;", position:new THREE.Vector3(.7,0.1,0), width:1.3, height:0.5});

            xr_controls_ui.explore_mode = new HTML2D($("#explore-mode")[0], {style:"width:90%;", position:new THREE.Vector3(-.6,-0.4,0), width:1.3, height:0.5});
            xr_controls_ui.quiz_mode = new HTML2D($("#quiz-mode")[0], {style:"width:90%;", position:new THREE.Vector3(.7,-0.4,0), width:1.3, height:0.5});

            xr_controls_ui.quiz = {};
            xr_controls_ui.quiz.question = new HTML2D($("#xr-quiz-wrapper")[0], {style:"color:white; font-size:20px;padding-top:0px!important", position:new THREE.Vector3(.1,-1.1,0), width:2.7, height:1});
            xr_controls_ui.quiz.submit = new HTML2D($("#quiz-submit")[0], {style:"font-size:16px;", position:new THREE.Vector3(.1,-1.9,0), width:2.0, height:0.5});
            xr_controls_ui.quiz.see_bone_info = new HTML2D($("#xr-toggle-see-bone-wrapper")[0], {style:"",  position:new THREE.Vector3(.7,-2.25,0), width:1.75, height: 0.2});
            xr_controls_ui.quiz.num_correct = new HTML2D($("#numcorrect")[0], {style:"font-size:14px;", position:new THREE.Vector3(-.85,-2.22,0), width:1.1, height:0.3});

            function addBasicHoverEvent(uiElement) {
                uiElement.onHover = e=>{ uiElement.mesh.material.opacity = 0.8};
                uiElement.onEndHover = e=>{ uiElement.mesh.material.opacity = 1.0};
            }

            addBasicHoverEvent(xr_controls_ui.focus);
            addBasicHoverEvent(xr_controls_ui.hide);
            addBasicHoverEvent(xr_controls_ui.deselect);
            addBasicHoverEvent(xr_controls_ui.show_all);
            addBasicHoverEvent(xr_controls_ui.explore_mode);
            addBasicHoverEvent(xr_controls_ui.quiz_mode);
            addBasicHoverEvent(xr_controls_ui.quiz.submit);
            addBasicHoverEvent(xr_controls_ui.quiz.see_bone_info);

            xr_controls_ui.focus.onClick = e=>{onClickFocus(e)};
            xr_controls_ui.hide.onClick = e=>{onClickHide(e)};
            xr_controls_ui.deselect.onClick = e=>{onClickDeselect(e)};
            xr_controls_ui.show_all.onClick = e=>{onClickShowAll(e)};

            xr_controls_ui.explore_mode.onClick = e=>{onStartExploreMode()};
            xr_controls_ui.quiz_mode.onClick = e=>{onStartQuizMode()};
            xr_controls_ui.quiz.submit.onClick = e=>{onClickQuizSubmit()};
            xr_controls_ui.quiz.see_bone_info.onClick = e=>{onClickToggleBoneInfo()};

            xr_controls.mesh.add(xr_controls_ui.browsing.text.mesh)
            xr_controls.mesh.add(xr_controls_ui.bone.text.mesh)
            xr_controls.mesh.add(xr_controls_ui.focus.mesh)
            xr_controls.mesh.add(xr_controls_ui.hide.mesh)
            xr_controls.mesh.add(xr_controls_ui.deselect.mesh)
            xr_controls.mesh.add(xr_controls_ui.show_all.mesh)
            xr_controls.mesh.add(xr_controls_ui.explore_mode.mesh)
            xr_controls.mesh.add(xr_controls_ui.quiz_mode.mesh)
            xr_controls.mesh.add(xr_controls_ui.quiz.question.mesh)
            xr_controls.mesh.add(xr_controls_ui.quiz.submit.mesh)
            xr_controls.mesh.add(xr_controls_ui.quiz.num_correct.mesh)
            xr_controls.mesh.add(xr_controls_ui.quiz.see_bone_info.mesh)

            xr_controls.mesh.add(xr_controls_ui.log.mesh);
        }
        function createRightXRControls() {
            xr_nav_tooltip = new Block2D({
                width:5,
                height:3,
                x:1.4,
                y:0,
                z:0,
                color:0x010002,
                transparent:true,
                opacity:0.5
            });

            const nav_ctrls = new Block2D({
                width:5*0.8,
                height:3*0.8,
                x:0,
                y:0,
                z:0.01,
                src:"./img/nav_ctrls_white.png",
                transparent:true,
                opacity:1
            });
            xr_nav_tooltip.mesh.add(nav_ctrls.mesh);
        }

        createLeftXRControls();
        createRightXRControls();
        
        // When xr is loaded
        if (DEMO_XR_IN_WEB)
            showXRControls(true);
    }
    createXRControls();

    // The renderer is used for rendering. Set some options and optimizations
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;

    // XR sessions are controlled from here too
    renderer.xr.enabled = true;
    renderer.xr.setFramebufferScaleFactor(2.0);

    // Create on xr start and end callbacks
    renderer.xr.addEventListener("sessionstart", onStartXR);
    renderer.xr.addEventListener("sessionend", onLeaveXR);
    renderer.xr.addEventListener("inputsourceschange", onXRInputSourcesChange);

    // May add later
    // XR_CONTROLLER_FACTORY = new XRControllerModelFactory();

    // Setup the controllers initially
    function getControllers() {

        for (var i = 0; i < 2; i++) {

            const controllerGrip = renderer.xr.getControllerGrip(i);

            controllerGrip.addEventListener("connected", event=>onRegisterXRController(event.data));
            controllerGrip.addEventListener( 'disconnected', event=>onRemoveXRController(event.data));

        }
    }
    getControllers();


    // Add the canvas
    container.appendChild( renderer.domElement );
    const pmremGenerator = new THREE.PMREMGenerator( renderer );
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

    // this is where the camera will be pointing at
    controls.target.set(selected_model.center.x * MODEL_SCALE - 4, selected_model.center.y * MODEL_SCALE, selected_model.center.z * MODEL_SCALE);

    // alternate controll scheme
    //controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    //controls.mouseButtons.RIGHT = THREE.MOUSE.DOLLY;
    controls.update();


    // Set Up Assessment
    // For insight, see files in ./js/classes/assessment
    function setUpAssessment() {

        // Create questions for each bone
        let questions = [];
        for (const model in model_container) {
            let q = quizManager.createQuestion(
                "Select the " + model,
                model
            );

            questions.push(q)
        }

        quizManager.setQuestions(questions);
        quizManager.setAssessment(quizManager.createAssessmentFromQuestions({
            options:{score:true, shuffle_questions:true},

        }));

        quizManager.onUpdateQuestion = (id,q)=>{
            $("#qnum").text(id);
            $("#qtext").text(q.question);
            $("#numcorrect").text(quizManager.assessment.num_questions_correct + "/" + questions.length + " Correct");

            // update the gui
            if (IN_XR || DEMO_XR_IN_WEB) {
                xr_controls_ui.quiz.question.update();
                xr_controls_ui.quiz.submit.update();
                xr_controls_ui.quiz.num_correct.update();
            }
        }
    }
    setUpAssessment();


    // Window events
    window.addEventListener( 'resize', onWindowResize );
    // use pointer instead of mouse move, better reliability on more devices
    window.addEventListener( 'pointermove', onMouseMove, false );
    // window.addEventListener( 'mousemove', onMouseMove, false );
    window.addEventListener( 'touchmove', onMouseMove, false);

    // Canvas events
    // We control clicking ourselves, so no the following
    // $('canvas').click(onCanvasClick);

    $('canvas').on('touchstart', onCanvasTouchStart);
    $('canvas').on('pointerdown', onCanvasPointerDown);
    $('canvas').on('pointerup', onCanvasPointerUp);

    // Buttons / Clicks
    $('#deselect').click(onClickDeselect);
    $('#focus-toggle').click(onClickFocus);
    $('#hide-toggle').click(onClickHide);
    $('#show-all').click(onClickShowAll);

    $('#quiz-mode').click(onStartQuizMode);
    $('#explore-mode').click(onStartExploreMode);
    $('#quiz-submit').click(onClickQuizSubmit);

    $('#see-bone-info').click(()=>{
        //$('#see-bone-info').toggleClass(".see-bone-info-selected")
        onClickToggleBoneInfo();
    })

    // Start in explore mode
    onStartExploreMode();

    // Call resize once to ensure proper initial formatting
    onWindowResize();

    // Set the render function as the animation loop (update function)
    renderer.setAnimationLoop( render );

    // TODO Log errors, this will log all console logs, warnings and errors YOU make
    // to the div id'd "log"
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

    $("#selected-info").text('Browsing');
    $("#selected").text('No Bone Selected');

    setBoneListComponentActive(null);
    $('#hide-toggle').removeClass('sidebar-button-active');

    onDeselectedBone(LAST_SELECTED_BONES);
}


// -- Events

// Window resize, do some more calculations, i.e. camera and more css variables
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    let scale = 1.25 * window.innerHeight / 1080;
    document.documentElement.style.setProperty("--sidebar-scale", scale);
}

// Update the mouse variable
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

// This is called when we click 
function clickFunction( e ) {

    // Updated for xr gui interaction

    // Check if we are intersecting bones or a menu
    if (INTERSECTED_BONES) {

        let mesh = getMeshFromBoneGroup(INTERSECTED_BONES);

        // If we aren't selecting bones, select these
        if (!SELECTED_BONES) {
            selectBone(mesh, true);
        }
    }
    else if (INTERSECTED_XR_CONTROLS) {

        // Trigger an onclick event on the UI element
        INTERSECTED_XR_CONTROLS._onClick(e);
    }
}

// on Pointer (mouse or touch) down
function onCanvasPointerDown(e) {

    MOUSE_IS_DOWN = true;

    // set the last mouse down time for click notice
    lastMouseDownTime = new Date();

    if (INTERSECTED_XR_CONTROLS) {
        INTERSECTED_XR_CONTROLS._onPointerDown(e);
        LAST_XR_CONTROLS = INTERSECTED_XR_CONTROLS;

        // stop orbit
        // controls.enabled = false;
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

// Since some devices may only allow touching
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

    if (FOCUS_MODE)
        onClickFocus();
    else if (getMeshFromBoneGroup(SELECTED_BONES).material.transparent) {
        $('#hide-toggle').removeClass('sidebar-button-active');

        if (IN_XR || DEMO_XR_IN_WEB)
            xr_controls_ui.hide.update();
    }

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
        }
        FOCUS_MODE = false;
        $('#focus-toggle').removeClass('sidebar-button-active');
    }
    else
        $('#focus-toggle').removeClass('sidebar-button-active');

    if (IN_XR || DEMO_XR_IN_WEB)
        xr_controls_ui.focus.update();
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

        // Also now show the hide icon
        model_components.forEach(c=>{
            if (c.getElementsByTagName("span")[0].innerText == SELECTED_BONES.name) {
                c.getElementsByTagName("div")[0].classList.toggle("eye-closed");
                return;
            }
        });

        $('#hide-toggle').toggleClass('sidebar-button-active');
    }

    if (IN_XR || DEMO_XR_IN_WEB)
        xr_controls_ui.hide.update();

}
function onClickShowAll() {

    // Check if we are hiding
    if (FOCUS_MODE) {
        return;
    }
    else if (SELECTED_BONES) {
        let current_mesh = getMeshFromBoneGroup(SELECTED_BONES);

        if (current_mesh.material.transparent) {
            onClickHide();
        }
    }

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

// GUI Web Controls (unused for now, may do later)
function createGUIWebControls() {
    let mouseDownId = -1;
    function onClickRotate(dir) {
        if (!camera) return;

        function rotate(dir) {

            let newPoint = camera.position.clone();

            let v = controls.target.clone().sub(newPoint);
            let d = controls.target.distanceTo(newPoint);

            newPoint.copy(controls.target);

            let vc = v.clone();
            vc.normalize();
            var axis = new THREE.Vector3( 0, 1, 0 );
            var angle = dir * -0.02;//Math.PI / 2;

            vc.applyAxisAngle( axis, angle );
            vc.multiplyScalar(d);
            vc.multiplyScalar(-1);

            newPoint.add(vc);

            camera.position.copy(newPoint);

            controls.update();
        }

        mouseDownId = setInterval(()=>rotate(dir), 10);

    }
    function onRotateUp() {
        clearInterval(mouseDownId);
    }
    window.onClickRotate = onClickRotate;
    window.onRotateUp = onRotateUp;

    function onClickZoom(dir) {
        if (!camera) return;

        function zoom(dir) {

            if (dir == 1)
                controls.dollyOut(1.01);
            else
                controls.dollyIn(1.01);

            controls.update();
        }

        mouseDownId = setInterval(()=>zoom(dir), 10);

    }
    function onZoomUp() {
        clearInterval(mouseDownId);
    }
    window.onClickZoom = onClickZoom;
    window.onZoomUp = onZoomUp;

    function onClickPan(dir) {
        if (!camera) return;

        function pan(dir) {

            if (dir == 1)
                controls.domElement.dispatchEvent(new Event("mousedown", {button:2, clientX:window.innerWidth / 2 + 1, clientY:window.innerHeight / 2}));
            else
                controls.domElement.dispatchEvent(new Event("mousedown", {button:2, clientX:window.innerWidth / 2 - 1, clientY:window.innerHeight / 2}));


            controls.update();
        }

        mouseDownId = setInterval(()=>pan(dir), 10);

    }
    function onPanUp() {
        clearInterval(mouseDownId);
    }
    window.onClickPan = onClickPan;
    window.onPanUp = onPanUp;
}
//createGUIWebControls();

// XR events
function xrRotate(amt) {

    if (IN_XR)
    {
        player.rotation.y += 0.04 * amt;
    }
}
function xrTranslate(dx, dz) {
    player.position.x += 0.04 * dx;
    player.position.z += 0.04 * dz;
}

// Assessment
function onStartExploreMode() {

    // First highlight the button
    $("#explore-mode").addClass("sidebar-button-active");
    $("#quiz-mode").removeClass("sidebar-button-active");

    // Make the quizbar inactive
    $("#quizbar").removeClass("quizbar-active");

    // Show the search bar
    $("#bones-list-frame").show("slow");

    // hide quiz panel
    $("#quiz-panel").hide("slow");

    // Stop the assessment
    quizManager.stop();

    // Show the bone info incase it was turned off
    $('#bone-info').show("slow");
    toggleBoneInfoCheckBox(true);
    $('#see-bone-info').addClass("see-bone-info-selected");

    if (IN_XR || DEMO_XR_IN_WEB) {
        // Update all HTML2D ui elements
        xr_controls_ui.explore_mode.update();
        xr_controls_ui.quiz_mode.update();

        xr_controls_ui.quiz.question.update();
        xr_controls_ui.quiz.submit.update();
        xr_controls_ui.quiz.num_correct.update();
        xr_controls_ui.quiz.see_bone_info.update();

        xr_controls_ui.quiz.question.mesh.visible = false;
        xr_controls_ui.quiz.submit.mesh.visible = false;
        xr_controls_ui.quiz.num_correct.mesh.visible = false;
        xr_controls_ui.quiz.see_bone_info.mesh.visible = false;

        // In case was shutoff in quiz
        xr_controls_ui.bone.text.mesh.visible = true;
    }

    CURRENT_MODE = 0; // explorer
}
function onStartQuizMode() {

    // First highlight the button
    $("#quiz-mode").addClass("sidebar-button-active");
    $("#explore-mode").removeClass("sidebar-button-active");

    // Make the quizbar active
    $("#quizbar").addClass("quizbar-active");


    // Hide the search bar
    $("#bones-list-frame").hide("slow");

    // show quiz panel
    $("#quiz-panel").show("slow");

    // Start the assessment
    quizManager.start();

    quizManager.nextQuestion();
    quizManager.update();

    if (IN_XR || DEMO_XR_IN_WEB) {
        // Update all HTML2D ui elements
        xr_controls_ui.explore_mode.update();
        xr_controls_ui.quiz_mode.update();

        xr_controls_ui.quiz.question.update();
        xr_controls_ui.quiz.submit.update();
        xr_controls_ui.quiz.num_correct.update();
        xr_controls_ui.quiz.see_bone_info.update();

        xr_controls_ui.quiz.question.mesh.visible = true;
        xr_controls_ui.quiz.submit.mesh.visible = true;
        xr_controls_ui.quiz.num_correct.mesh.visible = true;
        xr_controls_ui.quiz.see_bone_info.mesh.visible = true;
    }

    CURRENT_MODE = 1; // quiz mode
}
function onClickQuizSubmit() {
    // quiz
    if (quizManager.is_assessing && SELECTED_BONES) {

        let ans = SELECTED_BONES.name;

        let result = quizManager.answer(ans);
        if (result)
            quizManager.nextQuestion();
        quizManager.update();
    }
}
// I had to make my own checkbox since my HTML2D renderer doesn't render inputs for
// some odd reason
function toggleBoneInfoCheckBox(should) {

    if (should) {
        $('#see-bone-info').text("x");
        return;
    }

    if ($('#see-bone-info').hasClass("see-bone-info-selected"))
        $('#see-bone-info').text(" ");
    else
        $('#see-bone-info').text("x");

    $('#see-bone-info').toggleClass("see-bone-info-selected");
}
function onClickToggleBoneInfo() {

    $('#bone-info').toggle("slow");

    toggleBoneInfoCheckBox();


    if (IN_XR || DEMO_XR_IN_WEB) {

        xr_controls_ui.quiz.see_bone_info.update();

        xr_controls_ui.bone.text.mesh.visible = !xr_controls_ui.bone.text.mesh.visible;
    }
}

// Bone selection
function onSelectedBone() {

    if (IN_XR || DEMO_XR_IN_WEB) {
        xr_controls_ui.browsing.text.update();
        xr_controls_ui.bone.text.update();
    }
}

function onDeselectedBone(last_selected) {

    if (last_selected)
        console.log("Deselected " + last_selected.name);

    if (IN_XR || DEMO_XR_IN_WEB) {
        xr_controls_ui.browsing.text.update();
        xr_controls_ui.bone.text.update();
    }
}

function onEnterHoverBone(bone_group) {

    // Set global intersected name
    INTERSECTED = bone_group.name;
    INTERSECTED_BONES = bone_group;

    //add bone name text to sidebar
    if (!SELECTED)
        $("#selected").text(INTERSECTED);

    if (IN_XR || DEMO_XR_IN_WEB) {
        xr_controls_ui.bone.text.update();
    }
}
function onLeaveHoverBone(bone_group) {

    // Remove emissive
    if (!SELECTED || bone_group.name !== SELECTED_BONES.name)
        getMeshFromBoneGroup(bone_group).material.emissiveIntensity = 0;

    // Reset state
    INTERSECTED = "";
    INTERSECTED_BONES = null;

    if (!SELECTED) {
        $("#selected").text("No Bone Selected");
    }

    if (IN_XR || DEMO_XR_IN_WEB) {
        xr_controls_ui.bone.text.update();
    }
}

// -- Animation and rendering
function animate(t,frame) {
    requestAnimationFrame( animate );
    render(frame);
}

function render(frame) {

    // If we are loading in XR (looking for controllers)
    // Don't do (render) anything
    if (LOADING) return;

    //sin function for glowing red animation
    const time = Date.now() * 0.004;
    glow_intensity = 0.6 * ((Math.sin(time) + 1) / 2) + 0.2;

    // function to have spotlight track and trail behind the camera position
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

    // Figure out if we should raycase or not
    // And we should if we have are in web viewer (!IN_XR)
    // or we have 2 controllers
    let should_raycast = true;
    let raycast_distance = 0;

    if (!IN_XR)
        raycaster.setFromCamera( mouse, camera );
    else if (XR_HAS_2_CONTROLLERS) {
        tempMatrix.identity().extractRotation(controllerR.controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controllerR.controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    }
    else
        should_raycast = false;

    if (should_raycast) {
        // for collecting bones intersected with mouse
        const intersects = raycaster.intersectObjects( scene.children, true );

        // If we are selecting an object, glow it, otherwise glow the intersected object
        if(SELECTED || INTERSECTED_BONES){

            let bones = SELECTED ? SELECTED_BONES : INTERSECTED_BONES;
            let mesh = getMeshFromBoneGroup(bones);
            mesh.material.emissive = new THREE.Color( 0xff0000 );
            mesh.material.emissiveIntensity = glow_intensity;
        }

        // If we are in xr we are always intersecting the guide, so pop it out
        if (IN_XR) {

            if (intersects.length > 0)
            {
                // Flickering fix
                if (intersects[0].object.name == "rg")
                    intersects.shift();
            }

        }

        if ( intersects.length > 0) {
            let bone_group = null;
            let xr_controls_mesh = null;
            // Traverse all intersected bones that arent hidden or if we select menu item
            for (var i = 0; i < intersects.length && bone_group == null && xr_controls_mesh == null; i++) {

                let obj = intersects[i].object;

                // Check to see if this is an xr control mesh
                if (obj.uiElement) {
                    xr_controls_mesh = intersects[i].object;
                    raycast_distance = intersects[i].distance;
                }
                // Otherwise see if this is a bone
                else {
                    obj.traverseAncestors(function(curr){
                        // Check to make sure raycasted bone is not hidden too
                        if(curr.type != "Scene" && curr.parent.type == "Scene"){
                            let mesh = getMeshFromBoneGroup(curr);

                            // Check to see it is not the guidelines nor any transparent mesh
                            if (!mesh.material.transparent) {
                                bone_group = curr;
                                raycast_distance = intersects[i].distance;
                            }
                        }

                    });
                }
            }

            // Check for bone group or UI element
            if(bone_group && !MOUSE_IS_DOWN) {

                // We are hovering over a bone group and the mouse is not down

                // See if we came from hovering over xr controls
                if (INTERSECTED_XR_CONTROLS) {
                    // We were selecting menu controls
                    INTERSECTED_XR_CONTROLS._onEndHover();
                    INTERSECTED_XR_CONTROLS = null;
                }
                else if (!MOUSE_IS_DOWN && INTERSECTED != bone_group.name) {

                    // We are hovering over a bone group that is not equal to the last intersected
                    if(INTERSECTED_BONES != null){
                        onLeaveHoverBone(INTERSECTED_BONES);
                    }

                    onEnterHoverBone(bone_group);
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

                    if (INTERSECTED_BONES)
                        onLeaveHoverBone(INTERSECTED_BONES);

                    INTERSECTED_XR_CONTROLS._onHover();
                }
                else {
                    // We are selecting the same thing
                }
            }
            else if (!MOUSE_IS_DOWN && INTERSECTED_BONES) {
                // We are over a hidden bone
                onLeaveHoverBone(INTERSECTED_BONES);
            }
        }
        else if (INTERSECTED_BONES) {
            // For when we are not selected and we have no intersects

            // No longer hovering over a bone, change to no bone selected

            // console.log("Stopped hovering over the " + INTERSECTED + ", now not hovering over anything");

            onLeaveHoverBone(INTERSECTED_BONES);
        }
        else if (INTERSECTED_XR_CONTROLS) {
            // When we no longer hover over any UI (a case, another)
            INTERSECTED_XR_CONTROLS._onEndHover();
            INTERSECTED_XR_CONTROLS = null;
        }


        // update line
        if (IN_XR && XR_HAS_2_CONTROLLERS) {
            if (INTERSECTED_BONES || INTERSECTED_XR_CONTROLS) {
                xr_line.material.color.set(0xffff00);
                xr_line.scale.z = raycast_distance;
            }
            else {
                xr_line.material.color.set(0xffffff);
                xr_line.scale.z = 50;
            }
        }
    }

    if (IN_XR && XR_HAS_2_CONTROLLERS) {

        // Completely unrelated
        let r = controllerL.getRotation();
        if (r != 0)
            xrRotate(-r);

        let dx = controllerR.getTranslateX();
        let dz = controllerR.getTranslateZ();

        if (dx != 0 || dz != 0) {
            // convert to directional left and forward

            let dir = new THREE.Quaternion();
            player.getWorldQuaternion(dir);

            let v = new THREE.Vector3(dx, 0, dz);
            v = v.applyQuaternion(dir);
	
// 	    let dy = camera.getTranslateY();
// 	    let pcam = new THREE.Quaternion();
// 	    pcam.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );
	
	    // v = Quaternion.Euler(0, camera.rotation.y, 0) * v;
            v = v.applyQuaternion(camera.quaternion)

            // let axis_temp = new THREE.Vector3(0,1,0)
            // v.applyAxisAngle(axis_temp, angle)

// 	    let camR = new THREE.Vector3(0, dy, 0);
//             v = v.applyQuaternion(camR);

            xrTranslate(v.x, v.z);
        }

    }

    renderer.render( scene, camera );

}

// Callbacks for when we enter/leave VR
function addXRControllerEvents(handedness) {
    if (handedness == "left") {
        //controllerL = controller;

        if (controllerL.gamepad.axes.length < 3)
            controllerL.getRotation = ()=>{return controllerL.gamepad.axes[0]};
        else
            controllerL.getRotation = ()=>{return controllerL.gamepad.axes[2]};
    }
    else {
        //controllerR = controller;

        controllerR.controller.addEventListener("selectstart", onCanvasPointerDown);
        controllerR.controller.addEventListener("selectend", onCanvasPointerUp);

        if (controllerR.gamepad.axes.length < 3) {
            controllerR.getTranslateX = ()=>{return controllerR.gamepad.axes[0]};
            controllerR.getTranslateZ = ()=>{return controllerR.gamepad.axes[1]};
        }
        else {
            controllerR.getTranslateX = ()=>{return controllerR.gamepad.axes[2]};
            controllerR.getTranslateZ = ()=>{return controllerR.gamepad.axes[3]};
        }


        if (controllerR.controller.getObjectByName("rg")) return;

        // Raycaster line
        var xr_line_geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);

        xr_line = new THREE.Line(xr_line_geometry, new THREE.LineBasicMaterial());
        xr_line.name = "rg";
        xr_line.scale.z = 50;

        controllerR.controller.add(xr_line);
    }
}

// Async because we have to do some waiting for controllers to load
async function onStartXR(e) {

    controls.enabled = false;

    const wait_time = 2500; // 2.5 s

    LOADING = true;

    // I know it's janky, but can't find a better way that works
    // I've tried a few. So wait wait_time seconds for 2 controllers
    // to load, otherwise we say we do not have 2 controllers
    await new Promise(resolve=>{
        let t = 0;
        setInterval(()=>{
            if ((controllerL && controllerR) || t > wait_time) {
                resolve();
            }

            t += 10;
        }, 10)
    });

    if (controllers.length != 2) 
        XR_HAS_2_CONTROLLERS = false;
    else {

        for (var i = 0; i < 2; i++) {

            let controller = controllers[i];

            if (controller.handedness == "left")
            {
                addXRControllerEvents("left");
            }
            else
            {
                addXRControllerEvents("right")
            }
        }

        XR_HAS_2_CONTROLLERS = true;
    }

    LOADING = false;

    IN_XR = true;
    showXRControls(true);

    // move the model closer
    root_bone.position.copy(MODEL_POSITION_XR);

    // Move the directional light target
    delight_target.position.copy(MODEL_POSITION_XR.clone().sub(MODEL_POSITION_WEB));
    delight.position.copy(MODEL_POSITION_XR.clone().sub(MODEL_POSITION_WEB));

    // Hide the Quiz controls
    switch (CURRENT_MODE) {
        case 0:
            onStartExploreMode();
            break;
        case 1:
            // Do nothing because we might reset current quiz
            break;
        default:
            break;
    }

    console.log("Started XR Session");

}
function onLeaveXR() {
    IN_XR = false;
    showXRControls(false);

    root_bone.position.copy(MODEL_POSITION_WEB);

    // Move the directional light target
    delight_target.position.copy(MODEL_POSITION_WEB.clone().sub(MODEL_POSITION_XR));
    delight.position.copy(MODEL_POSITION_WEB.clone().sub(MODEL_POSITION_XR));

    // Reset player position so the orbit controls works correctly, as
    // the camera is a child of player and player thus should be set with
    // zero rotation and at the origin
    player.position.multiplyScalar(0);
    player.rotation.x = 0;
    player.rotation.y = 0;
    player.rotation.z = 0;

    console.log("Left XR Session");

    controls.enabled = true;
    controls.update();
}
function onRegisterXRController(xrInputSource) {

    if ( xrInputSource.targetRayMode !== 'tracked-pointer' || ! xrInputSource.gamepad ) return;

    let controller_num = controllers.length;
    const controller = renderer.xr.getController(controller_num);

    
    const controllerGrip = renderer.xr.getControllerGrip(controller_num);
    // Maybe add the controller models later
    // const model = XR_CONTROLLER_FACTORY.createControllerModel( controllerGrip );
    // controllerGrip.add( model );
    
    player.add(controller);
    player.add( controllerGrip );

    xrInputSource.controller = controller;
    xrInputSource.controllerGrip = controllerGrip;

    controllers.push(xrInputSource);

    if (xrInputSource.handedness == "left") {
        controllerL = xrInputSource;
        addXRControllerEvents("left");
    }
    else {
        controllerR = xrInputSource;
        addXRControllerEvents("right");
    }

    if (controllers.length >= 2)
        XR_HAS_2_CONTROLLERS = true;
    else
        XR_HAS_2_CONTROLLERS = false;

    console.log("Connected a controller: " + xrInputSource.handedness);
}
function onRemoveXRController(xrInputSource) {

    // Sometimes null
    if (!xrInputSource)
        return;

    let handedness = xrInputSource.handedness;

    for (var i = 0; i < controllers.length; i++) {
        let c = controllers[i];
        if (c.handedness == handedness) {
            controllers.splice(i, 1);

            player.remove(xrInputSource.controller);
            player.remove( xrInputSource.controllerGrip );

            xrInputSource.controller = null;
            xrInputSource.controllerGrip = null;

            if (handedness == "left")
                controllerL = null;
            else
                controllerR = null;

            break;
        }

    }

    if (controllers.length >= 2)
        XR_HAS_2_CONTROLLERS = true;
    else
        XR_HAS_2_CONTROLLERS = false;

    console.log("Disconnected a controller: " + handedness)
}
function onXRInputSourcesChange(event) {

    for (let input of event.added) {
          
        onRegisterXRController(input);
    }
    for (let input of event.removed) {

        onRemoveXRController(input);
    }
}

// -- Misc/Helper functions
function getCenterPoint(mesh) {
    var middle = new THREE.Vector3();
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
// Show or Hide the xr controls (should or should not)
// Different approaches depending on if we have 2 controllers
function showXRControls(should) {
    if (should) {
        if (IN_XR && USE_PORTABLE_XR_UI && XR_HAS_2_CONTROLLERS) {
            let scale = 0.07;
            let offset = 0.6;

            xr_controls.mesh.rotation.y = 0;
            xr_controls.mesh.position.setScalar(0);
            xr_controls.mesh.position.y += (2.5 + offset) * scale;
            xr_controls.mesh.scale.setScalar(scale);

            xr_nav_tooltip.mesh.rotation.y = 0;
            xr_nav_tooltip.mesh.position.setScalar(0);
            xr_nav_tooltip.mesh.position.y -= (1+offset) * scale;
            xr_nav_tooltip.mesh.scale.setScalar(scale);

            controllerL.controller.add( xr_controls.mesh );
            controllerR.controller.add( xr_nav_tooltip.mesh );
        }
        else {
            xr_controls.mesh.scale.setScalar(0.5);
            // setInterval(()=>{xr_controls.mesh.rotation.y += 0.04}, 2);
            xr_controls.mesh.position.setScalar(0);
            xr_controls.mesh.rotation.y = -Math.PI / 2;
            xr_controls.mesh.position.x = 1;
            xr_controls.mesh.position.y = 1;

            xr_nav_tooltip.mesh.scale.setScalar(0.5);
            xr_nav_tooltip.mesh.position.setScalar(0);
            xr_nav_tooltip.mesh.rotation.y = -Math.PI / 2;
            xr_nav_tooltip.mesh.position.x = 1;
            xr_nav_tooltip.mesh.position.y = 1;
            xr_nav_tooltip.mesh.position.z = -2;

            scene.add( xr_controls.mesh );
            scene.add( xr_nav_tooltip.mesh );
        }
    }
    else {
        if (IN_XR && USE_PORTABLE_XR_UI && XR_HAS_2_CONTROLLERS) {
            controllerL.controller.remove( xr_controls.mesh );
            controllerR.controller.remove( xr_nav_tooltip.mesh );
        }
        else {
            scene.remove( xr_controls.mesh );
            scene.remove( xr_nav_tooltip.mesh );
        }
    }
}
// TODO README This is a very helpful logging function for XR Dev, 
// just type log(str) and str will be shown in XR and the web page
function log(text) {
    console.log(text)
    $("#log").text(text);
    xr_controls_ui.log.update();
}

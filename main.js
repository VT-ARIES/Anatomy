// For static loading (comment out for dynamic loading and make sure up to date)
import {
    Raycaster,
    Vector2,
    Vector3,
    Quaternion,
    Box3,
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
    Euler
} from './js/modules/three.js';
import { OrbitControls } from './js/modules/OrbitControls.js';
import { GLTFLoader } from './js/modules/GLTFLoader.js';
import { VRButton } from './js/modules/VRButton.js';
import { XRControllerModelFactory } from './js/modules/XRController.js';

// SHW - Updated and outsourced modeling code to "/js/classes/models/models.js"
import {LoadModels} from "./js/classes/models/models.js";

// For the bg paws
import generatePaws from "./js/bgpawgenerator.js";
import Block2D from './js/classes/UI/block2d.js';
import HTML2D from './js/classes/UI/html2d.js';
import QuizManager from './js/classes/assessment/quizmanager.js';

// Global definitions/variables
let camera, scene, renderer;
let player; // used to hold camera
let raycaster = new Raycaster();
let container;
let controls;

// XR controllers
var controllerL, controllerR;
var tempMatrix = new Matrix4();

let INTERSECTED = '';
let INTERSECTED_BONES = null;

// options
let DEMO_XR_IN_WEB = false;
let USE_PORTABLE_XR_UI = !DEMO_XR_IN_WEB;

let LOADING = false; // This is for loading when starting XR
let IN_XR = false;
let CURRENT_MODE = 0; // explore = 0, quiz = 1
let MOUSE_IS_DOWN = false;
let INTERSECTED_XR_CONTROLS = null;
let LAST_XR_CONTROLS = null;
let XR_HAS_2_CONTROLLERS = false;

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
let MODEL_CENTER;
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

// Raycast line guide for xr
var xr_line;

// Assessment Mangager
var quizManager = new QuizManager();

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
page_directory.push(new Page("vr_explorer", ["quizbar", "sidebar", "vr_explorer", "vr_button_frame"], true));
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

    player = new Group();
    player.add(camera);

    camera.position.set( 0.0, 1.18, 0 );

    //initialize the scene and a few lights
    scene = new Scene();
    const light = new AmbientLight( 0x404040 ); // soft white light
    scene.add( light );
    scene.add(player);

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

    // model center
    const box = new Box3( ).setFromObject( root_bone );
	MODEL_CENTER = box.getCenter( new Vector3( ) );


    // TODO Add the controls to the XR world

    function createXRControls() {
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

        // When xr is loaded
        if (DEMO_XR_IN_WEB)
            showXRControls(true);

        xr_controls_ui.log = new HTML2D($("#log")[0], {position:new Vector3(.1,2,0), width:2.8, height:0.44});

        xr_controls_ui.browsing.text = new HTML2D($("#selected-info")[0], {position:new Vector3(.1,1.8,0), width:2.8, height:0.44});
        xr_controls_ui.bone.text = new HTML2D($("#selected")[0], {style:"font-size:24px", position:new Vector3(.1,1.2,0), width:2.8, height:0.65});
        xr_controls_ui.focus = new HTML2D($("#focus-toggle")[0], {style:"width:90%;", position:new Vector3(-.6,.6,0), width:1.3, height:0.5});
        xr_controls_ui.hide = new HTML2D($("#hide-toggle")[0], {style:"width:90%;", position:new Vector3(.7,.6,0), width:1.3, height:0.5});
        xr_controls_ui.deselect = new HTML2D($("#deselect")[0], {style:"width:90%;", position:new Vector3(-.6,0.1,0), width:1.3, height:0.5});
        xr_controls_ui.show_all = new HTML2D($("#show-all")[0], {style:"width:90%;", position:new Vector3(.7,0.1,0), width:1.3, height:0.5});

        xr_controls_ui.explore_mode = new HTML2D($("#explore-mode")[0], {style:"width:90%;", position:new Vector3(-.6,-0.4,0), width:1.3, height:0.5});
        xr_controls_ui.quiz_mode = new HTML2D($("#quiz-mode")[0], {style:"width:90%;", position:new Vector3(.7,-0.4,0), width:1.3, height:0.5});

        xr_controls_ui.quiz = {};
        xr_controls_ui.quiz.question = new HTML2D($("#xr-quiz-wrapper")[0], {style:"color:white; font-size:20px;padding-top:0px!important", position:new Vector3(.1,-1.1,0), width:2.7, height:1});
        xr_controls_ui.quiz.submit = new HTML2D($("#quiz-submit")[0], {style:"font-size:16px;", position:new Vector3(.1,-1.9,0), width:2.0, height:0.5});
        xr_controls_ui.quiz.see_bone_info = new HTML2D($("#xr-toggle-see-bone-wrapper")[0], {style:"",  position:new Vector3(.7,-2.25,0), width:1.75, height: 0.2});
        xr_controls_ui.quiz.num_correct = new HTML2D($("#numcorrect")[0], {style:"font-size:14px;", position:new Vector3(-.85,-2.22,0), width:1.1, height:0.3});

        xr_controls_ui.focus.onHover = e=>{xr_controls_ui.focus.mesh.material.opacity = 0.8};
        xr_controls_ui.focus.onEndHover = e=>{xr_controls_ui.focus.mesh.material.opacity = 1.0};
        xr_controls_ui.hide.onHover = e=>{xr_controls_ui.hide.mesh.material.opacity = 0.8};
        xr_controls_ui.hide.onEndHover = e=>{xr_controls_ui.hide.mesh.material.opacity = 1.0};
        xr_controls_ui.deselect.onHover = e=>{xr_controls_ui.deselect.mesh.material.opacity = 0.8};
        xr_controls_ui.deselect.onEndHover = e=>{xr_controls_ui.deselect.mesh.material.opacity = 1.0};
        xr_controls_ui.show_all.onHover = e=>{xr_controls_ui.show_all.mesh.material.opacity = 0.8};
        xr_controls_ui.show_all.onEndHover = e=>{xr_controls_ui.show_all.mesh.material.opacity = 1.0};

        xr_controls_ui.explore_mode.onHover = e=>{xr_controls_ui.explore_mode.mesh.material.opacity = 0.8};
        xr_controls_ui.explore_mode.onEndHover = e=>{xr_controls_ui.explore_mode.mesh.material.opacity = 1.0};
        xr_controls_ui.quiz_mode.onHover = e=>{xr_controls_ui.quiz_mode.mesh.material.opacity = 0.8};
        xr_controls_ui.quiz_mode.onEndHover = e=>{xr_controls_ui.quiz_mode.mesh.material.opacity = 1.0};
        xr_controls_ui.quiz.submit.onHover = e=>{xr_controls_ui.quiz.submit.mesh.material.opacity = 0.8};
        xr_controls_ui.quiz.submit.onEndHover = e=>{xr_controls_ui.quiz.submit.mesh.material.opacity = 1.0};
        xr_controls_ui.quiz.see_bone_info.onHover = e=>{xr_controls_ui.quiz.see_bone_info.mesh.material.opacity = 0.8};
        xr_controls_ui.quiz.see_bone_info.onEndHover = e=>{xr_controls_ui.quiz.see_bone_info.mesh.material.opacity = 1.0};

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

        xr_controls.mesh.add(xr_controls_ui.log.mesh)

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

    // Create on xr start and end callbacks
    renderer.xr.addEventListener("sessionstart", onStartXR);
    renderer.xr.addEventListener("sessionend", onLeaveXR);


    function setupXRControllers() {
        // XR controllers
        let factory = new XRControllerModelFactory();

        // For reference:
        // https://www.w3.org/TR/webxr-gamepads-module-1/
        // Axes[2] : joystick x axis
        // Axis[3] : joystick y axis
        // ctrl k and ctrl q takes me back

        function assignControllerEventsFromHandedness(controller) {

            if (controller.is_setup) return;

            if (controller.gamepad.hand == "left") {
                controller.name="left";

                // controller.addEventListener("selectstart", onXRRotateStart);
                // controller.addEventListener("selectend", onXRRotateStop);
                if (!controller.gamepad.axes[2])
                    controller.getRotation = ()=>{return controller.gamepad.axes[0]};
                else
                    controller.getRotation = ()=>{return controller.gamepad.axes[2]};

                //controller.gamepad.axes[2].addEventListener("change", e=>xrRotate(e.data.value));
                //controller.addEventListener("selectend", xrRotate);

                controllerL = controller;
            }
            else {
                controller.name="right";
                controller.addEventListener("selectstart", onCanvasPointerDown);
                controller.addEventListener("selectend", onCanvasPointerUp);

                if (!controller.gamepad.axes[2]) {
                    controller.getTranslateX = ()=>{return controller.gamepad.axes[0]};
                    controller.getTranslateZ = ()=>{return controller.gamepad.axes[1]};
                }
                else {
                    controller.getTranslateX = ()=>{return controller.gamepad.axes[2]};
                    controller.getTranslateZ = ()=>{return controller.gamepad.axes[3]};
                }

                // Raycaster line
                var xr_line_geometry = new BufferGeometry().setFromPoints([
                    new Vector3(0, 0, 0),
                    new Vector3(0, 0, -1)
                ]);

                xr_line = new Line(xr_line_geometry, new LineBasicMaterial());
                xr_line.name = "rg";
                xr_line.scale.z = 50;

                controller.add(xr_line);

                controllerR = controller;
            }

            controller.is_setup = true;
        }

        function getControllers() {

            let str = "s";

            for (var i = 0; i < 2; i++) {

                const j = i;

                const controller = renderer.xr.getController(j);

                controller.addEventListener("connected", e=>{

                    str += j;
                    log(str);

                    let weird_gamepad = e.data.gamepad;

                    if (!weird_gamepad.hand)
                        controller.gamepad = weird_gamepad[Object.getOwnPropertySymbols(weird_gamepad)[0]].gamepad;
                    else
                        controller.gamepad = weird_gamepad;
        
                    assignControllerEventsFromHandedness(controller);
                });

                const controllerGrip = renderer.xr.getControllerGrip(j);
                const model = factory.createControllerModel( controllerGrip );
                controllerGrip.add( model );
                
                player.add(controller);
                player.add( controllerGrip );


            }
        }
        getControllers();

    }
    setupXRControllers();

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


    // Set Up Assessment
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

    $('#quiz-mode').click(onStartQuizMode);
    $('#explore-mode').click(onStartExploreMode);
    $('#quiz-submit').click(onClickQuizSubmit);

    $('#see-bone-info').click(()=>{
        //$('#see-bone-info').toggleClass(".see-bone-info-selected")
        onClickToggleBoneInfo();
    })

    // Start in explore mode
    // $('#explore-mode').addClass("sidebar-button-active");
    // onStartExploreMode();
    // xr_controls_ui.explore_mode.update();
    onStartExploreMode();

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
        // else if (INTERSECTED_BONES.name !== SELECTED_BONES.name) {
        //     deselectBone();

        //     selectBone(mesh, true);
        // }
    }
    else if (INTERSECTED_XR_CONTROLS) {

        // Trigger an onclick event
        INTERSECTED_XR_CONTROLS._onClick(e);
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

        // model_container[INTERSECTED].object.parent.traverse( function(object) {
        //     if(object.type == 'Mesh'){
        //         object.material.transparent = !object.material.transparent;
        //         object.material.opacity = .2;
        //     }
        // });

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

// GUI Web Controls (unused)
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
            var axis = new Vector3( 0, 1, 0 );
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
function onXRRotateStart() {

    //start_x = controller1.rotation.x;
    xr_rotate_start_y = controllerL.rotation.clone();

    XR_SHOULD_ROTATE = true;
}
function xrRotate(amt) {


    // if (!IN_XR || !XR_SHOULD_ROTATE) return;

    // //let start_x_r = start_x - controllerL.rotation.x;
    // let curr_rot = controllerL.rotation.clone();

    // //console.log(curr_rot.y, xr_rotate_start_y.y, (curr_rot.y-xr_rotate_start_y.y))

    // let f = 1;
    // if (curr_rot.x < 0)
    // {
    //     f *= -1;
    // }

    // let start_y_r = f * xr_rotate_start_y.y - f * curr_rot.y;
    // // let start_y_r = xr_rotate_start_y.angleTo(curr_rot);//xr_rotate_start_y - curr_rot;
    
    
    // let p = MODEL_CENTER.clone().sub(MODEL_POSITION_XR.clone().multiplyScalar(1.4));
    // let v = p.sub(player.position);
    // let d = v.length();

    // v.normalize();

    // player.translateOnAxis(v, d);
    // // player.position.copy(controls.target);
    // player.rotation.y += 0.4 * start_y_r;

    // v.multiplyScalar(-1);
    // player.translateOnAxis(v, d);
    // //start_x = controllerL.rotation.x;

    // xr_rotate_start_y = controllerL.rotation.clone();

    if (IN_XR)
    {
        // console.log(amt)
        // let p = MODEL_CENTER.clone().sub(MODEL_POSITION_XR.clone().multiplyScalar(1.4));
        // let v = p.sub(player.position);
        // let d = v.length();

        // v.normalize();

        // player.translateOnAxis(v, d);
        // player.position.copy(controls.target);
        player.rotation.y += 0.4 * amt;

        // v.multiplyScalar(-1);
        // player.translateOnAxis(v, d);
    }
}
function xrTranslate(dx, dz) {
    player.position.x += dx;
    player.position.z += dz;
}
function onXRRotateStop() {
    XR_SHOULD_ROTATE = false;
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

    CURRENT_MODE = 0;
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

    CURRENT_MODE = 1;
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

let last_scale = 1;
let vr_scale = 0.1;
function render(frame) {

    // See if we are in xr
    function checkIfXR() {
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
    }
    // checkIfXR();

    if (LOADING) return;


    if (!USE_PORTABLE_XR_UI)
        xr_controls.mesh.rotation.y = Math.atan2( ( camera.position.x - xr_controls.mesh.position.x ), ( camera.position.z - xr_controls.mesh.position.z ) );

    //sin function for glowing red animation
    const time = Date.now() * 0.004;
    glow_intensity = 0.6 * ((Math.sin(time) + 1) / 2) + 0.2;

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
    let should_raycast = true;
    let raycast_distance = 0;
    if (!IN_XR)
        raycaster.setFromCamera( mouse, camera );
    else if (XR_HAS_2_CONTROLLERS) {
        tempMatrix.identity().extractRotation(controllerR.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controllerR.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    }
    else
        should_raycast = false;

    if (should_raycast) {
        //for caching bone intersected with mouse
        const intersects = raycaster.intersectObjects( scene.children, true );

        // If we are selecting an object, glow it, otherwise glow the intersected object
        if(SELECTED || INTERSECTED_BONES){

            let bones = SELECTED ? SELECTED_BONES : INTERSECTED_BONES;
            let mesh = getMeshFromBoneGroup(bones);
            mesh.material.emissive = new Color( 0xff0000 );
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
        if (IN_XR) {
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
            xrRotate(r);

        let dx = controllerR.getTranslateX();
        let dz = controllerR.getTranslateZ();

        if (dx != 0 || dz != 0)
            xrTranslate(dx, dz);

    }

    renderer.render( scene, camera );

}

// Callbacks for when we enter/leave VR
async function onStartXR(e) {

    controls.enabled = false;

    const wait_time = 2500; // 2.5 s

    LOADING = true;

    // Dont start callback until controllers are loaded
    await new Promise(resolve=>{
        let t = 0;
        setInterval(()=>{
            if ((controllerL && controllerR) || t > wait_time)
            {
                // If we are above 1 second then we don't have 2 controllers
                if (t > wait_time)
                    XR_HAS_2_CONTROLLERS = false;
                else
                    XR_HAS_2_CONTROLLERS = true;
                
                resolve();
            }
            else
                t += 10;
        }, 10);
    });

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
function showXRControls(should) {
    if (should) {
        if (IN_XR && USE_PORTABLE_XR_UI && XR_HAS_2_CONTROLLERS) {
            let scale = 0.07;
            let offset = 0.6;
            xr_controls.mesh.position.setScalar(0);
            xr_controls.mesh.position.y += (2.5 + offset) * scale;
            xr_controls.mesh.scale.setScalar(scale);
            controllerL.add( xr_controls.mesh );
        }
        else {
            xr_controls.mesh.scale.setScalar(0.5);
            // setInterval(()=>{xr_controls.mesh.rotation.y += 0.04}, 2);
            xr_controls.mesh.rotation.y = Math.PI / 2;
            xr_controls.mesh.position.y = 1;
            scene.add( xr_controls.mesh );
        }
    }
    else {
        if (IN_XR && USE_PORTABLE_XR_UI && XR_HAS_2_CONTROLLERS)
            controllerL.remove( xr_controls.mesh );
        else
            scene.remove( xr_controls.mesh );
    }
}
function log(text) {
    $("#log").text(text);
    xr_controls_ui.log.update();
}
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
    Color
} from 'https://unpkg.com/three@0.119.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js?module';
import { GLTFLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/GLTFLoader.js?module';
//import { Object3D } from 'three';

let camera, scene, renderer;
let raycaster = new Raycaster();
let container;
let controls;

let INTERSECTED = '';
let INTERSECTED_BONES = null;
let SELECTED = false;
let FOCUS_MODE = false;

let Loading_String = 'Loading';

let glow_intensity = 0;
renderer = new WebGLRenderer( { antialias: true } );
let delight;
let delight_target;
let mouse = new Vector2(-100, -100);
let mouseDown;
let bone = new Group();

function Model(name, components, scale, center){
    this.name = name;
    this.components = components;
    this.scale = scale;
    this.center = center;
}
let equine = [ 
    'Neck/Cervical_Vertebrae',
    'Neck/Cervical_Vertebrae1',
    'Neck/Cervical_Vertebrae2',
    'Neck/Cervical_Vertebrae3',
    'Neck/Cervical_Vertebrae4',
    'Neck/Cervical_Vertebrae5',
    'Neck/Cervical_Vertebrae6',

    'Skull/Cranium',

    'Skull/Mandible',

    'Spine/Lumbar_Vertebrae',
    'Spine/Lumbar_Vertebrae1',
    'Spine/Lumbar_Vertebrae2',
    'Spine/Lumbar_Vertebrae3',
    'Spine/Lumbar_Vertebrae4',
    'Spine/Lumbar_Vertebrae5',

    'Spine/Thoracic_Vertebrae',
    'Spine/Thoracic_Vertebrae1',
    'Spine/Thoracic_Vertebrae2',
    'Spine/Thoracic_Vertebrae3',
    'Spine/Thoracic_Vertebrae4',
    'Spine/Thoracic_Vertebrae5',
    'Spine/Thoracic_Vertebrae6',
    'Spine/Thoracic_Vertebrae7',
    'Spine/Thoracic_Vertebrae8',
    'Spine/Thoracic_Vertebrae9',
    'Spine/Thoracic_Vertebrae10',
    'Spine/Thoracic_Vertebrae11',
    'Spine/Thoracic_Vertebrae12',
    'Spine/Thoracic_Vertebrae13',
    'Spine/Thoracic_Vertebrae14',
    'Spine/Thoracic_Vertebrae15',
    'Spine/Thoracic_Vertebrae16',
    'Spine/Thoracic_Vertebrae17',

    'Teeth/Lower_Incisor',
    'Teeth/Lower_Incisor1',
    'Teeth/Lower_Incisor2',
    'Teeth/Lower_Incisor3',
    'Teeth/Lower_Incisor4',

    'Teeth/Mandibular_Molar',
    'Teeth/Mandibular_Molar1',
    'Teeth/Mandibular_Molar2',
    'Teeth/Mandibular_Molar3',
    
    'Teeth/Mandibular_Premolar',
    'Teeth/Mandibular_Premolar1',
    'Teeth/Mandibular_Premolar2',
    'Teeth/Mandibular_Premolar3',
    'Teeth/Mandibular_Premolar4',
    'Teeth/Mandibular_Premolar5',
    
    'Teeth/Maxilary_Molar',
    'Teeth/Maxilary_Molar1',
    'Teeth/Maxilary_Molar2',
    'Teeth/Maxilary_Molar3',
    'Teeth/Maxilary_Molar4',
    'Teeth/Maxilary_Molar5',
    
    'Teeth/Maxilary_Premolar',
    'Teeth/Maxilary_Premolar1',
    'Teeth/Maxilary_Premolar2',
    'Teeth/Maxilary_Premolar3',
    'Teeth/Maxilary_Premolar4',
    'Teeth/Maxilary_Premolar5',
    
    'Teeth/Upper_Incisor',
    'Teeth/Upper_Incisor1',
    'Teeth/Upper_Incisor2',
    'Teeth/Upper_Incisor3',
    'Teeth/Upper_Incisor4',
    'Teeth/Upper_Incisor5',

    'Pelvis_Tail/Caudal_Vertebrae',
    'Pelvis_Tail/Caudal_Vertebrae1',
    'Pelvis_Tail/Caudal_Vertebrae2',
    'Pelvis_Tail/Caudal_Vertebrae3',
    'Pelvis_Tail/Caudal_Vertebrae4',
    'Pelvis_Tail/Caudal_Vertebrae5',
    'Pelvis_Tail/Caudal_Vertebrae6',
    'Pelvis_Tail/Pelvis',
    'Pelvis_Tail/Sacral_Vertebrae',

    'Legs/Left_Back/Calcaneus',
    'Legs/Left_Back/Cannon',
    'Legs/Left_Back/Central_Tarsal',
    'Legs/Left_Back/Coffin',
    'Legs/Left_Back/Femur',
    'Legs/Left_Back/Fibula',
    'Legs/Left_Back/Fourth_Tarsal',
    'Legs/Left_Back/Long_Pastern',
    'Legs/Left_Back/Navicular',
    'Legs/Left_Back/Patella',
    'Legs/Left_Back/Sesamoids',
    'Legs/Left_Back/Short_Pastern',
    'Legs/Left_Back/Splint_Fourth_Metatarsal',
    'Legs/Left_Back/Splint_Second_Metatarsal',
    'Legs/Left_Back/Talus',
    'Legs/Left_Back/Third_Tarsal',
    'Legs/Left_Back/Tibia',
    
    'Legs/Right_Back/Calcaneus',
    'Legs/Right_Back/Cannon',
    'Legs/Right_Back/Central_Tarsal',
    'Legs/Right_Back/Coffin',
    'Legs/Right_Back/Femur',
    'Legs/Right_Back/Fibula',
    'Legs/Right_Back/Fourth_Tarsal',
    'Legs/Right_Back/Long_Pastern',
    'Legs/Right_Back/Navicular',
    'Legs/Right_Back/Patella',
    'Legs/Right_Back/Sesamoids',
    'Legs/Right_Back/Short_Pastern',
    'Legs/Right_Back/Splint_Fourth_Metatarsal',
    'Legs/Right_Back/Splint_Second_Metatarsal',
    'Legs/Right_Back/Talus',
    'Legs/Right_Back/Third_Tarsal',
    'Legs/Right_Back/Tibia',

    'Legs/Left_Front/Cannon',
    'Legs/Left_Front/Coffin',
    'Legs/Left_Front/Fourth_Carpal',
    'Legs/Left_Front/Humerus',
    'Legs/Left_Front/Intermediate_Carpal',
    'Legs/Left_Front/Long_Pastern',
    'Legs/Left_Front/Navicular',
    'Legs/Left_Front/Radial_Carpal',
    'Legs/Left_Front/Radius',
    'Legs/Left_Front/Scapula',
    'Legs/Left_Front/Second_Carpal',
    'Legs/Left_Front/Sesamoids',
    'Legs/Left_Front/Short_Pastern',
    'Legs/Left_Front/Splints',
    'Legs/Left_Front/Third_Carpal',
    'Legs/Left_Front/Ulnar_Accessory_Carpal',

    'Legs/Right_Front/Cannon',
    'Legs/Right_Front/Coffin',
    'Legs/Right_Front/Fourth_Carpal',
    'Legs/Right_Front/Humerus',
    'Legs/Right_Front/Intermediate_Carpal',
    'Legs/Right_Front/Long_Pastern',
    'Legs/Right_Front/Navicular',
    'Legs/Right_Front/Radial_Carpal',
    'Legs/Right_Front/Radius',
    'Legs/Right_Front/Scapula',
    'Legs/Right_Front/Second_Carpal',
    'Legs/Right_Front/Sesamoids',
    'Legs/Right_Front/Short_Pastern',
    'Legs/Right_Front/Splints',
    'Legs/Right_Front/Third_Carpal',
    'Legs/Right_Front/Ulnar_Accessory_Carpal',

    'Ribs/Rib_Cartilage',
    'Ribs/Rib_Cartilage1',
    'Ribs/Rib_Cartilage2',
    'Ribs/Ribs',
    'Ribs/Sternum'
    ];
let canine = [
    'Neck/Basihyoid',
    'Neck/C1_Atlas',
    'Neck/C2_Axis',
    'Neck/C3',
    'Neck/C4',
    'Neck/C5',
    'Neck/C6',
    'Neck/C7',
    'Neck/Ceratohyoid',
    'Neck/Epihyoid',
    'Neck/Stylohyoid',
    'Neck/Thyrohyoid',
    
    'Skull/Mandible',
    'Skull/Skull',
    
    'Spine/Anticlinical_Vertebra',
    'Spine/Lumbar_Vertebrae',
    'Spine/Thoracic_Vertebrae',

    'Pelvis_Tail/Caudal_Vertebrae',
    'Pelvis_Tail/Caudal_Vertebrae1',
    'Pelvis_Tail/Caudal_Vertebrae2',
    'Pelvis_Tail/Caudal_Vertebrae3',
    'Pelvis_Tail/Caudal_Vertebrae4',
    'Pelvis_Tail/Caudal_Vertebrae5',
    'Pelvis_Tail/Caudal_Vertebrae6',
    'Pelvis_Tail/Caudal_Vertebrae7',
    'Pelvis_Tail/Caudal_Vertebrae8',
    'Pelvis_Tail/Caudal_Vertebrae9',
    'Pelvis_Tail/Caudal_Vertebrae10',
    'Pelvis_Tail/Caudal_Vertebrae11',
    'Pelvis_Tail/Caudal_Vertebrae12',
    'Pelvis_Tail/Caudal_Vertebrae13',
    'Pelvis_Tail/Caudal_Vertebrae14',
    'Pelvis_Tail/Caudal_Vertebrae15',
    'Pelvis_Tail/Caudal_Vertebrae16',
    'Pelvis_Tail/Caudal_Vertebrae17',
    'Pelvis_Tail/Caudal_Vertebrae18',
    'Pelvis_Tail/Os_Coxae_Left',
    'Pelvis_Tail/Sacrum',
    
    'Legs/Left_Back/Calcaneus',
    'Legs/Left_Back/Central_Tarsal',
    'Legs/Left_Back/Femur',
    'Legs/Left_Back/Fibula',
    'Legs/Left_Back/Distal_Phalanges',
    'Legs/Left_Back/Middle_Phalanges',
    'Legs/Left_Back/Proximal_Phalanges',
    'Legs/Left_Back/Proximal_Sesamoid',
    'Legs/Left_Back/Metatarsal_I',
    'Legs/Left_Back/Metatarsal_II',
    'Legs/Left_Back/Metatarsal_III',
    'Legs/Left_Back/Metatarsal_IV',
    'Legs/Left_Back/Metatarsal_V',
    'Legs/Left_Back/Patella',
    'Legs/Left_Back/Tarsal_I',
    'Legs/Left_Back/Tarsal_II',
    'Legs/Left_Back/Tarsal_III',
    'Legs/Left_Back/Tarsal_IV',
    'Legs/Left_Back/Tibia',
    'Legs/Left_Back/Trochlea',

    'Legs/Right_Back/Calcaneus',
    'Legs/Right_Back/Central_Tarsal',
    'Legs/Right_Back/Femur',
    'Legs/Right_Back/Fibula',
    'Legs/Right_Back/Distal_Phalanges',
    'Legs/Right_Back/Middle_Phalanges',
    'Legs/Right_Back/Proximal_Phalanges',
    'Legs/Right_Back/Proximal_Sesamoid',
    'Legs/Right_Back/Metatarsal_I',
    'Legs/Right_Back/Metatarsal_II',
    'Legs/Right_Back/Metatarsal_III',
    'Legs/Right_Back/Metatarsal_IV',
    'Legs/Right_Back/Metatarsal_V',
    'Legs/Right_Back/Patella',
    'Legs/Right_Back/Tarsal_I',
    'Legs/Right_Back/Tarsal_II',
    'Legs/Right_Back/Tarsal_III',
    'Legs/Right_Back/Tarsal_IV',
    'Legs/Right_Back/Tibia',
    'Legs/Right_Back/Trochlea',
    
    'Legs/Left_Front/Accessory_Carpal',
    'Legs/Left_Front/Distal_Carpal_I',
    'Legs/Left_Front/Distal_Carpal_II',
    'Legs/Left_Front/Distal_Carpal_III',
    'Legs/Left_Front/Distal_Carpal_IV',
    'Legs/Left_Front/Ulnar',
    'Legs/Left_Front/Distal_Phalanges',
    'Legs/Left_Front/Middle_Phalanges',
    'Legs/Left_Front/Proximal_Phalanges',
    'Legs/Left_Front/Proximal_Sesamoid',
    'Legs/Left_Front/Humerus',
    'Legs/Left_Front/Metacarpal_I',
    'Legs/Left_Front/Metacarpal_II',
    'Legs/Left_Front/Metacarpal_III',
    'Legs/Left_Front/Metacarpal_IV',
    'Legs/Left_Front/Metacarpal_V',
    'Legs/Left_Front/Radial',
    'Legs/Left_Front/Radius',
    'Legs/Left_Front/Scapula',

    'Legs/Right_Front/Accessory_Carpal',
    'Legs/Right_Front/Distal_Carpal_I',
    'Legs/Right_Front/Distal_Carpal_II',
    'Legs/Right_Front/Distal_Carpal_III',
    'Legs/Right_Front/Distal_Carpal_IV',
    'Legs/Right_Front/Ulnar',
    'Legs/Right_Front/Distal_Phalanges',
    'Legs/Right_Front/Middle_Phalanges',
    'Legs/Right_Front/Proximal_Phalanges',
    'Legs/Right_Front/Proximal_Sesamoid',
    'Legs/Right_Front/Humerus',
    'Legs/Right_Front/Metacarpal_I',
    'Legs/Right_Front/Metacarpal_II',
    'Legs/Right_Front/Metacarpal_III',
    'Legs/Right_Front/Metacarpal_IV',
    'Legs/Right_Front/Metacarpal_V',
    'Legs/Right_Front/Radial',
    'Legs/Right_Front/Radius',
    'Legs/Right_Front/Scapula',

    'Ribs/Ribs',
    'Ribs/Sternebrae',
    'Ribs/Xiphoid_Process',
    
    'Organs/Bladder',
    'Organs/Duodenom',
    'Organs/Heart',
    'Organs/Kidneys',
    'Organs/Large Intestine',
    'Organs/Liver',
    'Organs/Lungs',
    'Organs/Small Intestine',
    'Organs/Spleen',
    'Organs/Stomach',
    ];
let model_atlas = {};
model_atlas["Canine"] = new Model("Canine", canine, .04, new Vector3(0, 8, 0));
model_atlas["Equine"] = new Model("Equine", equine, 11, new Vector3(0, 10, -1));
    
$(document).ready(function(){
    for(const model in model_atlas){
        $("#model-select").append("<button id='" + model + "' class='sidebar-button'>" + model + "</button>");
        $("#"+ model).click(function(){
            init(model_atlas[model]).then(animate());
        });
    }
});


async function init(selected_model) {
    $("#modal").css({"pointer-events": "none", "opacity": "0"});
    for(const model in model_atlas){
        $("#"+model).css("pointer-events", "none")
    }
    //get a copy of the document
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    
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


    //begin loading in models and add them to an array for storage.
    const loader = new GLTFLoader().setPath('./models/' + selected_model.name + '/');
    let model_container = {};
    //container object for models
    function Model_Component(name, scene) {
        this.name = name;
        this.object = scene;
    }

    
    let last_loaded = '';
    let num_loaded = 0;
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
            model_container[parsed_name] = new Model_Component(parsed_name, object);
            
            bone = new Group();
            bone.name = parsed_name;
            bone.add(object);
            last_loaded = parsed_name;
            num_loaded = 1;
        }
        
        
        //for loading animation
        $("#info").text(Loading_String);
        Loading_String = Loading_String + ".";
        
    }
    $("#info").hide();
    
    scene.add(bone);
    

    /*
     * Below is the rendering section
     */
    
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = sRGBEncoding;


    container.appendChild( renderer.domElement );
    const pmremGenerator = new PMREMGenerator( renderer );
    pmremGenerator.compileEquirectangularShader();

    scene.updateMatrixWorld(true);
    
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
    

    window.addEventListener( 'resize', onWindowResize );
    window.addEventListener( 'mousemove', onMouseMove, false );
    window.addEventListener( 'touchmove', onMouseMove, false);
    
    $('canvas').click(function() {
        mouseDownFunction();
    });
    $('canvas').on('touchstart', function(e){

        mouse.x = (e.touches[0].pageX / window.innerWidth ) * 2 - 1;
        mouse.y = - (e.touches[0].pageY / window.innerHeight ) * 2 + 1;
        mouseDownFunction();
        mouse.x = -100;
        mouse.y = -100;
    });
    $('#deselect').click(function() {
        
        INTERSECTED_BONES.traverse( function(object) {
            if(object.type == 'Mesh'){
                object.material.emissiveIntensity = 0;
            }
        })
        SELECTED = false;
        $('#focus-toggle').click();
        INTERSECTED = '';
        INTERSECTED_BONES = null;
        
        //camera.position.set( 40, 11.8, 0 );
        //controls.target.set(selected_model.center.x, selected_model.center.y, selected_model.center.z);
        //controls.update();
        //delight_target.position.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
        //delight.target = delight_target;
        
        

        $("#selected").text('No Bone Selected');
        $('#deselect').removeClass('ui-btn-active');
    });

    $('#focus-toggle').click(function() {
        
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
        }
        $('#focus-toggle').removeClass('ui-btn-active');
    });
    camera.position.set( 50, 11, 0);
    controls.update();
}


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onMouseMove( event ) {

    
    if(event.touches){
        //mouse.x = (event.touches[0].pageX / window.innerWidth ) * 2 - 1;
        //mouse.y = - (event.touches[0].pageY / window.innerHeight ) * 2 + 1;
    }
    else {
        event.preventDefault();
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }
    
}

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

function mouseDownFunction( event ) {
    if(!SELECTED){
        raycaster.setFromCamera( mouse, camera );
        //for caching bone intersected with mouse
        const intersects = raycaster.intersectObjects( scene.children, true );
        if(intersects.length > 0) {
            let clicked_bone = intersects[ 0 ].object;//.object.parent.parent.parent.parent;
            let centerOfMesh = getCenterPoint(clicked_bone);
            controls.target.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
            delight_target.position.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
            delight.target = delight_target;
            controls.update();
            
            SELECTED = true;
            
            let bone_group = clicked_bone.parent.parent.parent.parent;
            intersects[0].object.traverseAncestors(function(curr){
                if(curr.type != "Scene" && curr.parent.type == "Scene"){
                    bone_group = curr;
                }
            });
            console.log(bone_group);
            INTERSECTED = bone_group.name;
            INTERSECTED_BONES = bone_group;
            $("#selected").text(INTERSECTED);
            
        }
    }
}
//
function animate() {
    requestAnimationFrame( animate );
    render();
}
function render() {
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
            if(INTERSECTED != bone_group.name){

                if(INTERSECTED_BONES != null){
                    //remove glowing from old selected bone
                    INTERSECTED_BONES.traverse( function(object) {
                        if(object.type == 'Mesh'){
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

    renderer.render( scene, camera );

}

$(document).ready(function() {
    if($(window).width() < $(window).height() && $(window).width < 900){
        
    }

});

import * as THREE from './node_modules/three/src/Three.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let raycaster = new THREE.Raycaster();
let container;
let controls;

let INTERSECTED = '';
let INTERSECTED_BONES = null;
let SELECTED = false;

let Loading_String = 'Loading';

let glow_intensity = 0;
renderer = new THREE.WebGLRenderer( { antialias: true } );
let mouse = new THREE.Vector2(-100, -100);
let mouseDown;
let bone = new THREE.Group();
/* In order for models of a group to be grouped together in bone selection
 * Be sure to follow the naming convention seen below of having the first in
 * the group to have no number, and the preceeding bones to have a number directly
 * following the name starting at 1.
 */
let models= [ 
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

init().then(animate());


async function init() {
    
    //get a copy of the document
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    
    mouseDown = 0;

    //initialize camera 
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
    //set its position centered on the model
    camera.position.set( 40, 11.8, 0 );
    
    //initialize the scene and a few lights
    scene = new THREE.Scene();
    const light = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( light );
    const delight = new THREE.DirectionalLight( 0xffffff, 1);  //additional lighting
    delight.position.set(20, 6, 27);
    scene.add(delight);


    //begin loading in models and add them to an array for storage.
    const loader = new GLTFLoader().setPath( '/models/glb/');
    let model_container = {};
    //container object for models
    function Model(name, group_name, scene) {
        this.name = name;
        this.group = group_name;
        this.object = scene;
    }

    
    let last_loaded = '';
    for (const model of models){
        
        
        let result = await loader.loadAsync( model + '.glb');
        
        const object = result.scene;

        object.scale.set(11, 11, 11);
        object.position.set(0, 0, 0);

        //save model name for later under object.name
        let path_index = model.indexOf('/') + 1;
        let parsed_name = model.substring(path_index).replaceAll("/", " ").replaceAll("_", " ");
        

        // if a bone has multiple files, lump those together into one group otherwise just add it to the scene
        if (parsed_name.substring(0, parsed_name.length - 1) === last_loaded || parsed_name.substring(0, parsed_name.length - 2) === last_loaded){
            bone.add(object);
        }
        else {
            if (last_loaded != ''){
                scene.add(bone);
            }
            
            bone = new THREE.Group();
            bone.name = parsed_name;
            //console.log(bone.name);
            bone.add(object);
            last_loaded = parsed_name;
        }
        
        //Save all model object here
        model_container[parsed_name] = new Model(parsed_name, last_loaded, object);
        //for loading animation
        $("#info").text(Loading_String);
        Loading_String = Loading_String + ".";
        
    }
    $("#info").hide();
    
    scene.add(bone);
    
    
    //referance cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.set(0, 11.8, 1);
    //scene.add( cube );

    /*
     * Below is the rendering section
     */
    
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;


    container.appendChild( renderer.domElement );
    //$('canvas').click(onMouseDownCheck());
    const pmremGenerator = new THREE.PMREMGenerator( renderer );
    pmremGenerator.compileEquirectangularShader();

    scene.updateMatrixWorld(true);
    
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render ); // use if there is no animation loop
    controls.minDistance = 5;
    controls.maxDistance = 30;
    //this is where the camera will be pointing at
    controls.target.set(0, 11.8, 1);
    //alternate controll scheme
    //controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    //controls.mouseButtons.RIGHT = THREE.MOUSE.DOLLY;
    controls.update();
    

    window.addEventListener( 'resize', onWindowResize );
    window.addEventListener( 'mousemove', onMouseMove, false );
    $('canvas').click(function() {
        console.log("uh oh thats the canvas");
        mouseDownFunction();
    });
    $('#deselect').onclick = function () {
        console.log("deselected");
        SELECTED = false;
        INTERSECTED = '';
        INTERSECTED_BONES = null;
        $("#selected").text('No Bone Selected');
    }

}


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onMouseMove( event ) {

    event.preventDefault();

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

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

function mouseDownFunction( event ) {
    if(!SELECTED){
        raycaster.setFromCamera( mouse, camera );
        //for caching bone intersected with mouse
        const intersects = raycaster.intersectObjects( scene.children, true );
        if(intersects.length > 0) {
            let clicked_bone = intersects[ 0 ].object;//.object.parent.parent.parent.parent;
            console.log(clicked_bone);
            let centerOfMesh = getCenterPoint(clicked_bone);
            //console.log(centerOfMesh);
            controls.target.set(centerOfMesh.x, centerOfMesh.y, centerOfMesh.z);
            controls.update();
            SELECTED = true;

            let bone_group = clicked_bone.parent.parent.parent.parent;
            INTERSECTED = bone_group.name;
            INTERSECTED_BONES = bone_group;
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
    glow_intensity = Math.abs(Math.sin(time * 0.5)) * 0.2;


    renderer.render( scene, camera );
    raycaster.setFromCamera( mouse, camera );
    //for caching bone intersected with mouse
    const intersects = raycaster.intersectObjects( scene.children, true );
    //if we have one keep animating untill another is selected
    if(INTERSECTED_BONES != null){
        INTERSECTED_BONES.traverse( function(object) {
            if(object.type == 'Mesh'){
                object.material.emissive = new THREE.Color( 0xff0000 );;
                object.material.emissiveIntensity = glow_intensity;
            }
        })
    }
    
    if ( intersects.length > 0 && !SELECTED ) {
            let bone_group = intersects[ 0 ].object.parent.parent.parent.parent;
            if(bone_group.name == "Scene"){
                bone_group = bone_group.parent;
            }
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
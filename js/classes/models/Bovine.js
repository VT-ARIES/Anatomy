import {Model} from "./models.js";

let bonesList = [

    'Ribs_Spine/Ribs',
    
    'Ribs_Spine/L1',
    'Ribs_Spine/L2',
    'Ribs_Spine/L3',
    'Ribs_Spine/L4',
    'Ribs_Spine/L5',
    'Ribs_Spine/L6',

    'Ribs_Spine/T1',
    'Ribs_Spine/T2',
    'Ribs_Spine/T3',
    'Ribs_Spine/T4',
    'Ribs_Spine/T5',
    'Ribs_Spine/T6',
    'Ribs_Spine/T7',
    'Ribs_Spine/T8',
    'Ribs_Spine/T9',
    'Ribs_Spine/T10',
    'Ribs_Spine/T11',
    'Ribs_Spine/T12',
    'Ribs_Spine/T13',

    'Ribs_Spine/Caudal Vertebrae',

    'Skull_Cervical/Mandible Bits',
    'Skull_Cervical/Mandible',
    'Skull_Cervical/Skull',

    'Skull_Cervical/Atlas C1',
    'Skull_Cervical/C2',
    'Skull_Cervical/C3',
    'Skull_Cervical/C4',
    'Skull_Cervical/C5',
    'Skull_Cervical/C6',
    'Skull_Cervical/C7',

    'Back Legs/Distal Sesamoids',
    'Back Legs/Body of Illium',
    'Back Legs/Fused 3rd-4th Metatarsals',
    'Back Legs/Unknown_Tibia',
    'Back Legs/Patella',
    'Back Legs/Proximal Phalanges',
    'Back Legs/Proximal_Sesamoids',
    'Back Legs/Femur',
    'Back Legs/Calcaneus',
    'Back Legs/Tibia',
    'Back Legs/Middle_Phalanges',
    'Back Legs/Tarsals',
    'Back Legs/Talus',
    'Back Legs/Distal Phalanges',

    'Front_Legs/Fifth Metacarpals',
    'Front_Legs/Carpals',
    'Front_Legs/Fused third fourth metacarpals',
    'Front_Legs/Humerus',
    'Front_Legs/Phalanges',
    'Front_Legs/Radius',
    'Front_Legs/Scalpula',
    'Front_Legs/Sesamoids',
    'Front_Legs/Ulna',
    'Front_Legs/empty',


];

export default new Model(
    "Bovine",
    bonesList,
    .032,
    [0, -5, 0],
    "This is a model of Bovine",
    "/img/models/preview/bovine.png"
);
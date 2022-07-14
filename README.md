
## Making Changes

Please make all new changes on the working branch, with detailed commit information

## Importing New Models 

In order to add the option for a new model, you must complete a series of steps.

First, import the .glb files for this model. Do this in the /models folder, and create a new folder named after your model. Create subfolders within your new models folder following the convention used in the Equine model. In this system I will refer to "sub-models" such as the individual bones of the whole model as **Components**.

Next go into the directory at js/classes/models. Create a new file named after your model with the extension ".js" Copy all of the code and text from "Daniel.js" (a template file that is in the same directory). 

In the middle of the file, you will see this sequence of lines:

let bonesList = [
    "Daniel"
];

In place of Daniel, you will add a list of strings that contain the directory paths to all of the components of your model. For example, for the Canine model, one would put "Skull/Mandible" to indicate that the file Mandible.glb should be loaded. See the /model/Canine directory and Canine.js and see how the files correspond. You may also want to see the 'Importing Components' section at the bottom of this page for more help.

At the very bottom of the file, you will notice a sequence of lines that appears as follows:

export default new Model(
    "Daniel",
    bonesList,
    11,
    [0, 10, -1],
    "This is a model of Daniel",
    "/img/models/preview/daniel.png"
);

You should update the fields according to the following guidelines:

export default new Model(
    "Name of your model",
    bonesList, <do not change>
    <scale of your model as a decimal number>,
    [x, y, z], <-- where x, y and z are the center points of the model>
    "An optional brief description of the model",
    "An optional path to a preview icon of your model for the homepage"
);

Next, you must go to the file /js/models/models.js and append the name of your model to this list:

var model_list = [
    "Canine",
    "Equine",
    ...
    "Your model name here"
];

And you are done. Please contact Sam Williams for more information or if you are stuck.

## Importing New Components

Component are imported sequentially from the models coinciding array using exclusively the .glb format.

To add new components simply add the .glb file to the coinciding folder created for the model and add the path to the models array in the code. The naming convention is Firstword_Secondword where multi word names are seperated by an underscore in the file name. This is used for display in the UI.

To use multiple files for a single component or bone to be displayed in the UI, start numbering the additional files with the same name as the first file starting at one. It is encouraged that components are stored in sub-folders within the ./models/"YourModel" folder, following the convention used in the Equine model. These path of these sub-folders must be prepended to the path string. Finally add these names to the models array in the code. For Example:
```
'Toy/Buzz_Lightyear',
'Toy/Buzz_Lightyear1',
'Toy/Buzz_Lightyear2',
'Toy/Buzz_Lightyear3'
```

## Changelog (updated July 14, 2022)

This is a bulk update with many changes as follows:

Many UI Updates
- Implementing Karina's UI -> changes to main.css e.g. backgrounds, button styles, etc.
- Added a navigation (page) system to main.js:
	- div elements on index.html with attribute id="id" can be added to a "page"
		that is shown/hidden when navigated to/from
- Added a search/filtering functionality:
	- A Bones list contains all bones found in a model
		- When clicked on, that bone will be selected and list element will change styles
	- User can type into search bar that will dynamically filter bones depending on query
- Added a random paw generator (See /js/bgpawgenerator.js)

Organized and modularized (is that a word?) Model Class and imports (see /js/classes/models)
- Added dynamic fields like picture URL and description
- See new section in ReadMe for adding models:
	- See /js/classes/models/Daniel.js for demo model
	- See /js/classes/models/models.js for how to add model
	- Actual GLB Models still added the same way (in /models/<model_name>), again see Daniel.js

Modified some rendering and event code, including:
- "Browsing" vs "Selected" states, shown in UI sidebar tool
- When browsing and mouse is not over a bone, instead of showing "last hovered" bone now shows no bone selected
- Different types of selection (clicking on bone vs clicking on bone list item)

Changed loading screen to be percentage based

Found potential fix for scaling in VR:
    if (renderer.xr.isPresenting)
        scene.scale.set( 0.01, 0.01, 0.01 ); Scale needs to be fine-tuned

Deleted z-brush files (Zac)


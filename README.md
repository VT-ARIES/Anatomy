# Equine-Online

## Making Changes

Please make all new changes on the working branch, with detailed commit information

## Importing New Models 

In order to add the option for a new model, you must first import the .glb files for this model. Do this in the ./Models folder, and create a new folder named after your model. Create subfolders within your new models folder following the convention used in the Equine model. In this system I will refer to "sub-models" such as the individual bones of the whole model as **Components**.

Next go into the code at main.js and create a new array under the other models arrays, named after the new model you are importing. Strings containing the components of the model will be placed here, see the below section for details on formatting.

Finally create a new Model() object in the model_atlas following the format used for the Equine model.

```
model_atlas["Equine"] = new Model("Equine", equine, 11, new Vector3(0, 11.8, 1));
```
Where the parameters follow the following format.
```
model_atlas["NameOfModel"] = new Model("NameOfModel", name_of_component_array, scale_size_of_model, vector3_centerpoint_of_model);
```

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




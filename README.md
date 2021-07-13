# Equine-Online

## Making Changes

Please make all new changes on the working branch, with detailed commit information

## Importing New Models 

Models are imported sequentially from the models[] array using exclusively the .glb format.

To add new model simply add the .glb file to the models/glb folder and add the path to the models array in the code.
The naming convention for display in the UI is Firstword_Secondword where multi word names are seperated by an underscore in the file name.

To use multiple models for a single component or bone to be displayed in the UI, start numbering the additional files with the same underscore seperated name as the first file at the second file, starting at one. Then add these names to the models array in the code. It is encouraged that mdoels are store in sub-folders within the models/glb/ folders, just be sure to prepend the file path in the models array. For instance:

'Toy/Buzz_Lightyear',

'Toy/Buzz_Lightyear1',

'Toy/Buzz_Lightyear2',

'Toy/Buzz_Lightyear3'


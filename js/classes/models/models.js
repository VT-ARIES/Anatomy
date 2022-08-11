// IMPORTANT -- When Adding a model, please add the name of it here
var model_list = [
    "Canine",
    "Equine",
    "Daniel"
];

// Ok, that's all you have to do here

// Model class, dynamic because maybe it will be interactable later
class Model {

    constructor(
        modelName,
        modelBonesList,
        modelScale,
        modelCenterPosition,
        modelInfo,
        modelImageURL
    ) {
        this.modelName = modelName;
        this.modelBonesList = modelBonesList;
        this.modelScale = modelScale;
        this.modelCenterPosition = modelCenterPosition;
        this.modelInfo = modelInfo;
        this.modelImageURL = modelImageURL;

        // Backwards compatability (for now)
        this.name = modelName;
        this.components = modelBonesList;
        this.scale = modelScale;
        this.center = modelCenterPosition;
    }

}

// Import all models (in current directory, see e.g. Canine.js)

// Use a promise to send the resulting model list as a parameter
async function LoadModels(model_atlas) {
    
    return new Promise(async (resolve, reject) => {

        for (var i = 0; i < model_list.length; i++) {

            const model_name = model_list[i];

            // First, import the model
            const module = await import("./" + model_name + ".js");

            let current_model = module.default;

            // Add to import list (map)
            model_atlas[model_name] = current_model;
        }

        // Finish the async process
        resolve();

    });
}

export {Model, LoadModels};


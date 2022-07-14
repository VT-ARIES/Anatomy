var paw_list = [];

// returns randomly generated number from 1 to -1
function rand() {
    return 2 * Math.random() - 1;
}

export default function generatePaws(depth, var_pos, rotation, var_rotation, scale, var_scale) {

    // if depth is 1 then 1 paw will be made (somewhere in center)
    // if depth is 2 then 4 paws will be made (in quadrants)
    // if depth is 3 then 9 paws will be made (screen divided into 9 parts)
    // etc

    // first remove all paw elements if there are any
    while (paw_list.length > 0) {
        let curr_paw = paw_list.pop();

        // remove the element
        document.body.removeChild(curr_paw);
    }

    // if 0, we don't want anything
    if (depth == 0)
        return;

    // --- Add the elements

    // Calculate size of x and y separation
    let x_separation = window.innerWidth / depth; 
    let y_separation = window.innerHeight / depth; 

    // 2 dimensions, 2 for loops
    for (var y = 0; y < depth; y++) {
        for (var x = 0; x < depth; x++) {

            let x_pos = (x * x_separation) + (x_separation / 2) + (var_pos * rand());
            let y_pos = (y * y_separation) + (y_separation / 2) + (var_pos * rand());

            scale = scale + var_scale * rand() / 10; 

            rotation = rotation + var_rotation * rand(); 

            let new_paw_elem = document.createElement("img");
            // z index should be very low so it is behind everything
            new_paw_elem.style.setProperty("z-index", -999);
            new_paw_elem.style.setProperty("position", "absolute");

            // Also disable interactivity (selection and highlighting)
            new_paw_elem.style.setProperty("pointer-events", "none");

            new_paw_elem.style.setProperty("left", x_pos + "px");
            new_paw_elem.style.setProperty("top", y_pos + "px");

            new_paw_elem.style.setProperty("transform", "scale(" + scale + ") rotate(" + rotation + "deg)");

            // Add the image
            new_paw_elem.setAttribute("src", "./img/bg_paw.png");
            new_paw_elem.style.setProperty("background-repeat", "no-repeat");

            // Add it to our list
            paw_list.push(new_paw_elem);

            // Add it to the body
            document.body.appendChild(new_paw_elem);

            // This is tricky, now we have to subtract mid points of the images since
            // the current coordinates are based off of the top left

            // This must be defered until image is loaded
            new_paw_elem.addEventListener("load", ()=> {
                new_paw_elem.style.left = (parseInt(new_paw_elem.style.left.slice(0,-2)) - new_paw_elem.clientWidth / 2) + "px";
                new_paw_elem.style.top = (parseInt(new_paw_elem.style.top.slice(0,-2)) - new_paw_elem.clientHeight / 2) + "px";
            });

            // Now we just 
        }
    }
}
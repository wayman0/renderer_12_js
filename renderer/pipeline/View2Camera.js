/*
 * Renderer 10. The MIT License.
 * Copyright (c) 2022 rlkraft@pnw.edu
 * See LICENSE for details.
*/

/**
   Transform each {@link Vertex} of a {@link Model} from
   view coordinates to normalized camera coordinates.
<p>
   This stage transforms the {@link Camera}'s view volume from a
   user defined shape (in the view coordinate system) into the
   standard normalized view volume (in the camera coordinate system)
   used by the {@link Clip} pipeline stage.
<p>
   There are two standard normalized view volumes, one for perspective
   projection and one for orthographic projection.
<p>
   The standard normalized perspective view volume is the infinitely
   long pyramid with its apex at the origin and intersecting the plane
   {@code z = -1} at the corners {@code (-1, -1, -1)} and
   {@code (+1, +1, -1)}.
<p>
   The standard normalized orthographic view volume is the infinitely
   long parallelepiped centered on the z-axis and intersecting the
   xy-plane at the corners {@code (-1, -1, 0)} and {@code (+1, +1, 0)}.
<p>
   The user defined view volume (determined by the {@link Scene}'s
   {@link Camera} object) is either the infinitely long pyramid with its
   apex at the origin and intersecting the plane {@code z = -near} at the
   corners {@code (left, bottom, -near)} and {@code (right, top, -near)},
   or it is the infinitely long parallelepiped parallel to the z-axis and
   intersecting the xy-plane at the corners {@code (left, bottom, 0)}
   and {@code (right, top, 0)}.
<p>
   The view coordinate system is relative to the user defined view volume.
<p>
   The normalized camera coordinate system is relative to the normalized
   view volume.
<p>
   The transformation formulas that transform the user defined view volume
   into the normalized view volume also transforms the view coordinate
   system into the normalized camera coordinate system.
*/

//@ts-check
import {Model, Camera, Vertex, Position} from "../scene/SceneExport.js";
import { logColorList, logMessage, logPrimitiveList, logVertexList } from "./PipelineLogger.js";

/**
 *  Use the {@link Camera}'s view volume data to transform each
    {@link Vertex} from the {@link Camera}'s view coordinate system
    to the normalized camera coordinate system.

 * @param {Model} model model wiht the vertexes in the cameras view coordinate system
 * @param {Camera} camera camera with the view volume data
 * @returns {Model} a new model with the vertexes in the normalized camera coordinate system
 */
export function view2cameraModel(model, camera)
{
   const normalizeMatrix = camera.getNormalizeMatrix();
   const newVertexList = new Array();

   // replace each vertex object with one that contains normalized camera coordinates
   for(const v of model.vertexList)
      newVertexList.push(normalizeMatrix.timesVertex(v));

   /*
    const l = camera.left;
    const r = camera.right;
    const b = camera.bottom;
    const t = camera.top;
    const near = -camera.n;

    const newVertexList = new Array();
    for (let x = 0; x < model.vertexList.length; x += 1)
    {
        const v = model.vertexList[x];

        let v_x = undefined;
        let v_y = undefined;
        let v_z = undefined;

        if (camera.perspective)
        {
            v_z = v.z;
            v_x = v.x - v_z * (r + l)/(2 * near);
            v_y = v.y - v_z * (t + b)/(2 * near);

            v_x = (2 * near * v_x)/(r - l);
            v_y = (2 * near * v_y)/(t - b);
        }
        else
        {
            v_z = v.z;
            v_x = v.x - (r + l)/2;
            v_y = v.y - (t + b)/2;

            v_x = (2 * v_x)/(r - l);
            v_y = (2 * v_y)/(t - b);
        }

        newVertexList[x] = new Vertex(v_x, v_y, v_z);
    }
    */
    // use map because we are 'mapping' from view space to camera space and it is non mutative
    /*
    // this method is slower
    const newVertexList = model.vertexList.map(
                          (v) => {
                                    let v_x = undefined;
                                    let v_y = undefined;
                                    let v_z = undefined;

                                    if (camera.perspective)
                                    {
                                        v_z = v.z;
                                        v_x = v.x - v_z * (r + l)/(2 * near);
                                        v_y = v.y - v_z * (t + b)/(2 * near);
                                        v_x = (2 * near * v_x)/(r - l);
                                        v_y = (2 * near * v_y)/(t - b);
                                    }
                                    else
                                    {
                                        v_z = v.z;
                                        v_x = v.x - (r + l)/2;
                                        v_y = v.y - (t + b)/2;
                                        v_x = (2 * v_x)/(r - l);
                                        v_y = (2 * v_y)/(t - b);
                                    }

                                    return new Vertex(v_x, v_y, v_z);
                           });
    */

    return new Model(newVertexList,
                     model.primitiveList,
                     model.colorList,
                     model.matrix, 
                     model.nestedModels,
                     model.name,
                     model.visible);
}

/**
 * Recursively transform a {@link Position}.
 * <p>
 * This method does a pre-order, depth-first-traversal of the tree of
 * {@link Position}'s rooted at the parameter {@code position}.
 * 
 * @param {Position} position the curretn {@link Position} object to recursively transform
 * @param {Camera} camera the {@link Scene}'s {@link Camera} with the view volume data
 * @return {Positon} a tree of transformed {@link Position} objects
 */
export function view2cameraPosition(position, camera)
{
   logMessage("==== 3. Render Position: " + position.name);
   
   // create a new position to hold the newly rendered model and the newly rendered subpositions
   const pos2 = Position.buildFromModelName(position.model, position.name);
   if(position.model.visible)
      pos2.model = view2cameraNestedModel(position.model, camera);
   else
      logMessage("====== 3. Hidden model: " + position.model.name + " ======");

   // do a preorder depth first traversal from this nested position
   for(const pos of position.nestedPositions)
      pos2.addNestedPosition(view2cameraPosition(pos, camera));

   logMessage("==== 3. End position: " + position.name + " ====");

   return pos2;
}

/**
 * Recursively transform a {@link Model}.
 * <p>
 * This method does a pre-order, depth-first-traversal of the tree of
 * {@link Model}'s rooted at the parameter {@code model}.
 * 
 * @param {Model} model the current {@link Model} object to recursively transform
 * @param {Camera} camera the {@link Scene}'s {@link Camera} with the view volume data
 * @return {Model} a tree of transformed {@link Model} objects
 */
function view2cameraNestedModel(model, camera)
{
   logMessage("==== 3. View-to-Camera transformation of: " + model.name + " ====");

   const mod2 = view2cameraModel(model, camera);

   logVertexList("3. Camera    ", mod2);
   logColorList("3. Camera    ", mod2);
   logPrimitiveList("3. Camera    ", mod2);

   // recursively transform every nested model of this model

   // a new model list to hold the transformed nested models
   const newNestedModelList = new Array();

   // do a pre order depth first traversal from this model
   for(const m of model.nestedModels)
      newNestedModelList.push(view2cameraNestedModel(m, camera));

   logMessage("==== 3. End Model: " + mod2.name + " ====");

   return new Model(mod2.vertexList, 
                    mod2.primitiveList, 
                    mod2.colorList, 
                    mod2.matrix, 
                    newNestedModelList,
                    mod2.name,
                    mod2.visible);
}
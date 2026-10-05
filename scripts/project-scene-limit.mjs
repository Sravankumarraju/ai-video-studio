import assert from 'node:assert/strict';

export const PROJECT_SCENE_LIMIT=200;

export function replaceNarrationSourcesWithFinalScenes(existingScenes,narrationSourceIds,finalScenes,limit=PROJECT_SCENE_LIMIT){
 const sourceIds=new Set(narrationSourceIds);
 const retained=existingScenes.filter(scene=>!sourceIds.has(scene.id));
 const scenes=[...retained,...finalScenes];
 assert(scenes.length<=limit,`Final project has ${scenes.length} scenes; limit is ${limit}`);
 return scenes;
}

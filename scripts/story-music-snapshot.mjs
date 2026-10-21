import assert from 'node:assert/strict';

export async function saveMusicSnapshot(client, project, musicId, persist) {
  const result = await client.callTool({name:'get_project', arguments:{projectId:project.id}});
  assert(!result.isError);
  const current = JSON.parse(result.content.find(c=>c.type==='text').text);
  assert.equal(current.document.musicId, musicId);
  assert.equal(current.document.ducking, true);
  assert.equal(current.document.musicVolume, .22);
  assert.deepEqual(current.document.scenes, project.document.scenes, 'Music update changed scenes');
  await persist(current);
}

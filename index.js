const core = require("@actions/core");
const yaml = require('js-yaml');
const { promises: fs } = require("fs");
const child_process = require("child_process");

const getQuestId = async () => {
  const questFile = await fs.readFile('quest.yml', 'utf8');
  const doc = yaml.load(questFile);
  return doc.id;
}

const zipQuest = async () => {
  const zipFile = "quest.zip"
  await child_process.execSync(`zip -r ${zipFile} .`);
  return zipFile;
}

const uploadQuest = async (questId, zipFile) => {
  const fileName = 'quest.zip';

  const url = `${core.getInput('wilco-engine-url')}/api/v1/editor/quest/${questId}?isPrimaryId=true`
  try {    
    const res = await fetch(url, { 
      method: 'PUT', 
      headers: {
        "x-editor-user-token": core.getInput('quest-editor-user-token'),
        "x-editor-user-email": core.getInput('quest-editor-user-email'),
      },
      formData: {
        file: fs.createReadStream('quest.zip'),
        filetype: 'zip',
        filename: 'quest.zip',
    },
    });
    core.setOutput("response", res.json());
  } catch (error) {
    console.log({error});
    core.setFailed(error.message);
  }
}

const main = async () => {
  try {
    const questId = await getQuestId();
    const zipFile = await zipQuest();
    await uploadQuest(questId, zipFile);
  } catch (error) {
    console.log({error});
    core.setFailed(error.message);
  }
};

main();

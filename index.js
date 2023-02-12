const core = require("@actions/core");
const yaml = require('js-yaml');
const fs = require("fs");
const child_process = require("child_process");
const fetch = require("node-fetch");
const FormData = require("form-data");

const getQuestId = async () => {
  console.log("Getting quest id");
  const questFile = fs.readFileSync('quest.yml', 'utf8');
  const doc = yaml.load(questFile);
  return doc.id;
}

const zipQuest = async () => {
  console.log("Zipping quest files");
  const zipFile = "quest.zip"
  await child_process.execSync(`zip -r ${zipFile} .`);
  return zipFile;
}

const callEditorApi = async (url, questId, zipFile) => {
  const body = new FormData();
  body.append('file', fs.readFileSync(zipFile), {
    contentType: 'application/x-zip-compressed',
    name: zipFile,
    filename: zipFile,
  });

  return await fetch(url, {
    method: 'PUT',
    headers: {
      "x-editor-user-token": core.getInput('quest-editor-user-token'),
      "x-editor-user-email": core.getInput('quest-editor-user-email'),
    },
    body,
  });
}

const createDraft = async (questId, zipFile) => {
  console.log(`Uploading ${questId}`);
  const url = `${core.getInput('wilco-engine-url')}/api/v1/editor/quest/${questId}?isPrimaryId=true`
  const res = await callEditorApi(url, questId, zipFile);
  if (!res.ok) {
    console.log("Failed to create draft");
    const resJson = await res.json();
    console.log(resJson.error?.message);
    throw new Error(resJson.message);
  } else {
    console.log("Draft was created successfully")
    console.log(await res.json());
  }
}

const validateQuest = async (questId, zipFile) => {
  console.log(`Validating ${questId}`);
  const url = `${core.getInput('wilco-engine-url')}/api/v1/editor/quest/${questId}/validate`
  const res = await callEditorApi(url, questId, zipFile);
  if (!res.ok) {
    console.log("Quest is not valid");
    const resJson = await res.json();
    if (resJson.error?.message) {
      console.log(resJson.error?.message);
    }
    if (resJson?.filePath) {
      core.error(resJson.error?.message || resJson?.message, {
        file: resJson.filePath,
        startLine: resJson.line,
        title: "Validation error"
      });
    }
    throw new Error(resJson.message);
  } else {
    console.log("Quest was validated successfully")
    console.log(await res.json());
  }
}

const main = async () => {
  try {
    const questId = await getQuestId();
    const zipFile = await zipQuest();
    const onlyValidate = core.getInput('only-validate');
    if (onlyValidate) {
      await validateQuest(questId, zipFile);
    } else {
      await createDraft(questId, zipFile);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();

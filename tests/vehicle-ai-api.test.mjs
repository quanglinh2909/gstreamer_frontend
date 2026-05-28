import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const faceSource = readFileSync("src/backend-api/face-recognition-api.ts", "utf8");
const plateSource = readFileSync("src/backend-api/plate-recognition-api.ts", "utf8");

test("recognition APIs expose upsert post methods", () => {
    assert.match(faceSource, /faceRecognition/);
    assert.match(faceSource, /post\("face-recognition", data\)/);
    assert.match(plateSource, /plateRecognition/);
    assert.match(plateSource, /post\("plate-recognition", data\)/);
});

test("recognition payloads send polygons as one serialized string", () => {
    const faceInterfaceSource = readFileSync("src/interface/face-recognition.ts", "utf8");
    const plateInterfaceSource = readFileSync("src/interface/plate-recognition.ts", "utf8");

    assert.match(faceInterfaceSource, /polygons:\s*string;/);
    assert.doesNotMatch(faceInterfaceSource, /polygons:\s*string\[\];/);
    assert.match(plateInterfaceSource, /polygons:\s*string;/);
    assert.doesNotMatch(plateInterfaceSource, /polygons:\s*string\[\];/);
});

test("face and plate recognition payloads type overlap threshold and tracker options", () => {
    const faceInterfaceSource = readFileSync("src/interface/face-recognition.ts", "utf8");
    const plateInterfaceSource = readFileSync("src/interface/plate-recognition.ts", "utf8");
    const aiConfigInterfaceSource = readFileSync("src/interface/ai-config.ts", "utf8");

    assert.match(faceInterfaceSource, /overlap_threshold:\s*number;/);
    assert.match(faceInterfaceSource, /tracker:\s*AiTracker;/);
    assert.match(plateInterfaceSource, /overlap_threshold:\s*number;/);
    assert.match(plateInterfaceSource, /tracker:\s*AiTracker;/);
    assert.match(aiConfigInterfaceSource, /"ocsort"/);
});

test("backend AI config response types include recognition debug job ids", () => {
    const aiConfigInterfaceSource = readFileSync("src/interface/ai-config.ts", "utf8");

    assert.match(aiConfigInterfaceSource, /job_id\?:\s*string\s*\|\s*number\s*\|\s*null;/);
    assert.match(aiConfigInterfaceSource, /"restricted_area"/);
});

test("restricted area exposes its typed POST configuration API", () => {
    const apiPath = "src/backend-api/restricted-area-api.ts";
    const interfacePath = "src/interface/restricted-area.ts";

    assert.equal(existsSync(apiPath), true);
    assert.equal(existsSync(interfacePath), true);

    const apiSource = readFileSync(apiPath, "utf8");
    const interfaceSource = readFileSync(interfacePath, "utf8");

    assert.match(apiSource, /restrictedArea/);
    assert.match(apiSource, /post\("restricted-area", data\)/);
    assert.match(interfaceSource, /interface IRestrictedArea/);
    assert.match(interfaceSource, /overlap_threshold:\s*number;/);
    assert.match(interfaceSource, /tracker:\s*AiTracker;/);
    assert.match(interfaceSource, /polygons:\s*string;/);
    assert.doesNotMatch(interfaceSource, /secondaryConf/);
});

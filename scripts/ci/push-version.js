const fs = require("fs");
const path = require("path");

const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE || "";
const MATCH = COMMIT_MESSAGE.match(/push-ver:([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)/);

if (!MATCH) {
  process.exit(0);
}

const nextVersion = MATCH[1];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
};

const updatePackageVersion = (filePath) => {
  const json = readJson(filePath);
  if (!json.version) return false;
  if (json.version === nextVersion) return false;
  json.version = nextVersion;
  writeJson(filePath, json);
  return true;
};

const root = process.cwd();

const packageFiles = [
  path.join(root, "package.json"),
  path.join(root, "packages", "admin", "package.json"),
  path.join(root, "packages", "api", "package.json"),
  path.join(root, "packages", "front-store", "package.json"),
  path.join(root, "packages", "mobile-front-v2", "package.json"),
  path.join(root, "packages", "tests", "package.json")
];

let changed = false;

for (const filePath of packageFiles) {
  if (fs.existsSync(filePath)) {
    changed = updatePackageVersion(filePath) || changed;
  }
}

const appJsonPath = path.join(root, "packages", "mobile-front-v2", "app.json");
let currentBuild = 0;
let appJson;
if (fs.existsSync(appJsonPath)) {
  appJson = readJson(appJsonPath);
  const currentBuildRaw = appJson?.expo?.ios?.buildNumber;
  const parsedBuild = Number(currentBuildRaw);
  if (Number.isFinite(parsedBuild)) {
    currentBuild = parsedBuild;
  }
}

const androidGradlePath = path.join(
  root,
  "packages",
  "mobile-front-v2",
  "android",
  "app",
  "build.gradle"
);
if (fs.existsSync(androidGradlePath)) {
  const gradle = fs.readFileSync(androidGradlePath, "utf8");
  const match = gradle.match(/versionCode\s+(\d+)/);
  if (match) {
    const code = Number(match[1]);
    if (Number.isFinite(code)) {
      currentBuild = Math.max(currentBuild, code);
    }
  }
}

const infoPlistPath = path.join(
  root,
  "packages",
  "mobile-front-v2",
  "ios",
  "ChromaMobileStore",
  "Info.plist"
);
if (fs.existsSync(infoPlistPath)) {
  const plist = fs.readFileSync(infoPlistPath, "utf8");
  const match = plist.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
  if (match) {
    const code = Number(match[1]);
    if (Number.isFinite(code)) {
      currentBuild = Math.max(currentBuild, code);
    }
  }
}

const nextBuild = Math.max(1, currentBuild + 1);

if (appJson) {
  appJson.expo = appJson.expo || {};
  appJson.expo.version = nextVersion;
  appJson.expo.ios = appJson.expo.ios || {};
  appJson.expo.ios.buildNumber = String(nextBuild);
  writeJson(appJsonPath, appJson);
  changed = true;
}

if (fs.existsSync(androidGradlePath)) {
  let gradle = fs.readFileSync(androidGradlePath, "utf8");
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${nextBuild}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${nextVersion}"`);
  fs.writeFileSync(androidGradlePath, gradle);
  changed = true;
}

if (fs.existsSync(infoPlistPath)) {
  let plist = fs.readFileSync(infoPlistPath, "utf8");
  plist = plist.replace(
    /<key>CFBundleShortVersionString<\/key>\s*<string>[^<]*<\/string>/,
    `<key>CFBundleShortVersionString</key>\n\t<string>${nextVersion}</string>`
  );
  plist = plist.replace(
    /<key>CFBundleVersion<\/key>\s*<string>[^<]*<\/string>/,
    `<key>CFBundleVersion</key>\n\t<string>${nextBuild}</string>`
  );
  fs.writeFileSync(infoPlistPath, plist);
  changed = true;
}

const pbxprojPath = path.join(
  root,
  "packages",
  "mobile-front-v2",
  "ios",
  "ChromaMobileStore.xcodeproj",
  "project.pbxproj"
);
if (fs.existsSync(pbxprojPath)) {
  let pbxproj = fs.readFileSync(pbxprojPath, "utf8");
  pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${nextVersion};`);
  pbxproj = pbxproj.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${nextBuild};`);
  fs.writeFileSync(pbxprojPath, pbxproj);
  changed = true;
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `build=${nextBuild}\n`);
}

if (!changed) {
  process.exit(0);
}

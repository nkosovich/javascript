import chokidar from "chokidar";
import fs from "fs";
import spauth from "node-sp-auth";
import got from "got";

const { folders, credentials, url } = JSON.parse(
  fs.readFileSync("./config.json")
);

const getFileName = (path) => path.split(/\\/).at(-1);

const bodyNames = ["FC76", "GA76", "SCouncil_MAMS"];

const languages = [
  "Arabic",
  "Chinese",
  "English",
  "Floor",
  "French",
  "Russian",
  "Spanish",
];

const watcher = chokidar.watch(folders, {
  ignored: /(^|[\/\\])\../, // ignore dot files
  ignoreInitial: true,
  persistent: true,
  usePolling: true,
  interval: 600,
  depth: 0,
});

watcher.on("add", (mp3FilePath) => {
  uploadToSharePoint(
    mp3FilePath,
    getFolder(mp3FilePath),
    getFileName(mp3FilePath)
  );
});

function getFolder(mp3FilePath) {
  let body = bodyNames.find((body) => mp3FilePath.includes(body));
  let language = languages.find((language) => mp3FilePath.includes(language));
  return `${body}/${language}`;
}

function uploadToSharePoint(path, sharePointFolder, fileName) {
  console.log(`UPLOADING: ${path}    <----->    ${sharePointFolder}     <----->     ${fileName}`);
  spauth.getAuth(url, credentials).then(async (digest) => {
    const headers = digest.headers;
    headers["accept"] = "application/json;odata=verbose";

    const fileContent = fs.readFileSync(path, { encoding: "" });
    try {
      const data = await got
        .post(
          `${url}_api/Web/GetFolderByServerRelativeUrl('/sites/DGACM-MPD-VRS/MAMS/${sharePointFolder}')/Files/add(url='${fileName}',overwrite=true)')`,
          {
            headers: {
              ...headers,
              'Connection': 'keep-alive',
              ContentType: "audio/mpeg",
              json: true,
            },
            body: fileContent,
            timeout: {
              connect: 5000,
              secureConnect: 5000,
              send: 10000,
              response: 10000
            }
          }
        )
        .json();
      console.log(
        `   SUCCESS:   ${path}   <--->   ${new Date().toLocaleString("en-US", {
          timeZone: "EST",
        })}`
      );
    } catch (e) {
      console.log(`ERROR: ${e}`);
    }
  });
}

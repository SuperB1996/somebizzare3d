const { Octokit } = require("@octokit/rest");
const Busboy = require("busboy");
const streamToBuffer = require("stream-to-buffer");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = "your-github-username";
  const REPO_NAME = "your-repo-name";
  const BRANCH = "main";

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });
    const formData = {};

    busboy.on("field", (fieldname, val) => {
      formData[fieldname] = val;
    });

    const files = {};

    busboy.on("file", (fieldname, file, filename) => {
      streamToBuffer(file, async (err, buffer) => {
        if (err) return reject(err);
        files[fieldname] = { filename, buffer };

        if (Object.keys(files).length === 2) {
          try {
            // Upload .zip
            await octokit.repos.createOrUpdateFileContents({
              owner: REPO_OWNER,
              repo: REPO_NAME,
              branch: BRANCH,
              path: `pending/${formData.slug}.zip`,
              message: `Upload room zip for ${formData.slug}`,
              content: bufferToBase64(files.roomzip.buffer),
            });

            // Upload thumbnail
            await octokit.repos.createOrUpdateFileContents({
              owner: REPO_OWNER,
              repo: REPO_NAME,
              branch: BRANCH,
              path: `pending/${formData.slug}-thumbnail.jpg`,
              message: `Upload thumbnail for ${formData.slug}`,
              content: bufferToBase64(files.thumbnail.buffer),
            });

            resolve({
              statusCode: 200,
              body: `Room "${formData.slug}" uploaded to GitHub!`,
            });
          } catch (uploadErr) {
            console.error(uploadErr);
            reject({ statusCode: 500, body: "Upload failed." });
          }
        }
      });
    });

    busboy.end(Buffer.from(event.body, "base64"));
  });
};

function bufferToBase64(buffer) {
  return buffer.toString("base64");
}
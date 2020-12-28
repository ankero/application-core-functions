import * as admin from "firebase-admin";
import { STORAGE, STORAGE_PREFIX } from "../constants";
import { Parser } from "json2csv";
import { Document, DocumentType } from "../interfaces";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const bucket = admin.storage().bucket();

export async function deleteUserBucket(userId: string) {
  try {
    // Delete user public files
    await bucket.deleteFiles({
      force: true,
      prefix: STORAGE.userPublicFiles.replace("{entityId}", userId),
    });

    // Delete user private files
    await bucket.deleteFiles({
      force: true,
      prefix: STORAGE.userPrivateFiles.replace("{entityId}", userId),
    });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function deleteDocumentFiles(document: Document): Promise<void> {
  try {
    const { type, url } = document;
    if (type !== DocumentType.FILE) return;
    if (!url || !url.startsWith(STORAGE_PREFIX)) return;
    const filePath = url.replace(STORAGE_PREFIX, "");
    console.log(`DELETE file from path: ${filePath}`);
    await bucket.deleteFiles({
      force: true,
      prefix: filePath,
    });
  } catch (error) {
    throw error;
  }
}

export async function saveJSONToStorage(
  filePath: string,
  fileName: string,
  data: any
): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const tempFilePath = path.join(os.tmpdir(), `${filePath}${fileName}`);

    const parser = new Parser({ fields: Object.keys(data) });
    const csv = parser.parse(data);

    await fs.outputFile(tempFilePath, csv);
    bucket.upload(
      tempFilePath,
      { destination: `${filePath}${fileName}` },
      async (error, file) => {
        if (error) {
          reject(error);
        }

        try {
          const now = new Date();
          const nowPlus5 = new Date(now.setMinutes(now.getMinutes() + 5));
          const signedUrl = await file?.getSignedUrl({
            action: "read",
            expires: nowPlus5,
          });

          resolve(signedUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

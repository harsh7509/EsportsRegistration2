// scripts/migrate-image-urls.js
import 'dotenv/config.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import User from '../backend/src/models/User.js';
import Promotion from '../backend/src/models/Promotion.js';
import Scrim from '../backend/src/models/Scrim.js';
import Tournament from '../backend/src/models/Tournament.js';
import { cloudinaryEnabled, uploadBufferToCloudinary } from '../backend/src/utils/cloudinary.js';

async function fixOneDoc(doc, fields) {
  let changed = false;

  for (const f of fields) {
    const url = doc[f];
    if (!url || typeof url !== 'string') continue;

    if (/^http:\/\/localhost(:\d+)?\/uploads\/images\//i.test(url)) {
      if (!cloudinaryEnabled) {
        // no cloudinary; just drop so UI shows placeholder
        doc[f] = undefined;
        changed = true;
        continue;
      }
      // try to read local file & re-upload
      try {
        const rel = url.replace(/^http:\/\/localhost(:\d+)?/i, '');
        const abs = path.join(process.cwd(), rel);
        const buf = await fs.promises.readFile(abs);
        const up = await uploadBufferToCloudinary(buf, { folder: 'esports/migrated' });
        doc[f] = up.secure_url;
        changed = true;
      } catch (e) {
        // file not found; clear
        doc[f] = undefined;
        changed = true;
      }
    }
  }

  if (changed) await doc.save();
  return changed;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  let total = 0, updated = 0;

  const jobs = [
    { M: User, fields: ['avatarUrl', 'organizationInfo.logo', 'bannerUrl'] },
    { M: Promotion, fields: ['imageUrl'] },
    { M: Scrim, fields: ['bannerUrl', 'imageUrl'] },
    { M: Tournament, fields: ['bannerUrl', 'imageUrl'] },
  ];

  for (const { M, fields } of jobs) {
    const items = await M.find({});
    for (const doc of items) {
      total++;
      // resolve nested fields
      const flatFields = [];
      for (const f of fields) {
        if (!f.includes('.')) { flatFields.push(f); continue; }
        const [a, b] = f.split('.');
        if (doc[a] && typeof doc[a] === 'object' && doc[a][b]) {
          doc[f] = doc[a][b];
          flatFields.push(f);
        }
      }
      const changed = await fixOneDoc(doc, flatFields);
      if (changed) updated++;
    }
  }

  console.log(`Scanned: ${total}, Updated: ${updated}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });

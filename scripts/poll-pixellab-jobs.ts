#!/usr/bin/env node

/**
 * Pixellab Job Poller
 * Checkt Status der laufenden Assets und lädt sie herunter wenn fertig
 */

import https from "https";
import fs from "fs";
import path from "path";

const AUTH_TOKEN = process.env.PIXELLAB_TOKEN || "05993614-8bde-41d9-9c12-d2eeb198bcb1";

interface JobRecord {
  job_id: string | null;
  error?: string;
}

async function callPixellab(job_id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.pixellab.ai",
      port: 443,
      path: `/v2/background-jobs/${job_id}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function pollAllJobs() {
  const jobsFile = path.join(process.cwd(), ".claude", "pixellab-jobs.json");

  if (!fs.existsSync(jobsFile)) {
    console.error(`❌ Job file not found: ${jobsFile}`);
    console.error("First run: npx ts-node scripts/generate-pixellab-assets.ts");
    process.exit(1);
  }

  const jobsData = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
  console.log("🔄 Polling Pixellab for job status...\n");

  for (const [name, record] of Object.entries(jobsData.jobs as Record<string, JobRecord>)) {
    if (!record.job_id) {
      console.log(`⏭️  ${name}: Skipped (no job_id)\n`);
      continue;
    }

    try {
      const status = await callPixellab(record.job_id);

      console.log(`📦 ${name}`);
      console.log(`   Job ID: ${record.job_id}`);
      console.log(`   Status:`, JSON.stringify(status, null, 2));
      console.log();
    } catch (error) {
      console.error(`❌ ${name}: ${error}`);
    }
  }

  console.log("✅ Check complete. If all jobs show 'completed', assets are ready!");
}

pollAllJobs().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

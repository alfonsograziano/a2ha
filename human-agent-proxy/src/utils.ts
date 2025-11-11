import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getTeamInformation(): Promise<any> {
  const teamInfo = await fs.readFileSync(
    path.join(__dirname, "team.json"),
    "utf8"
  );
  return JSON.parse(teamInfo);
}

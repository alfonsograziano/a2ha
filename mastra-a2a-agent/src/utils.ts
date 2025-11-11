import { styleText } from "node:util";
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function promptUser(
  text: string,
  answerPrompt: string = "Answer here: "
): Promise<{
  command?: string;
  input: string;
}> {
  return new Promise((resolve) => {
    rl.question("\n" + text + "\n" + answerPrompt, (input) => {
      const inputSanitized = input.trim();

      resolve({
        input: inputSanitized,
      });
    });
  });
}

export const logo = ` 
 █████╗ ██████╗ ██╗  ██╗ █████╗ 
██╔══██╗╚════██╗██║  ██║██╔══██╗
███████║ █████╔╝███████║███████║
██╔══██║██╔═══╝ ██╔══██║██╔══██║
██║  ██║███████╗██║  ██║██║  ██║
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝`;

export const printLogo = () => {
  printSystemMessage(logo);
};

export const printSystemMessage = (message: string) => {
  console.log(styleText("blue", message));
};

export const printAgentMessage = (message: string) => {
  console.log(styleText("green", "Agent: " + message));
};

export const printToolMessage = (message: string) => {
  console.log(styleText("yellow", message));
};

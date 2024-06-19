import { run } from "hardhat";

async function verify<T>(address: string, constructorArguments: T) {
  console.log("Verifying contract...");

  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(error);
    }
  }
}

export { verify };

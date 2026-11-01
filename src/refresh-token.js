// Prints a refreshed 60-day token to stdout so the workflow can pipe it into `gh secret set`.
import { refreshToken } from "./instagram.js";

refreshToken()
  .then((token) => process.stdout.write(token))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });

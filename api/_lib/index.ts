import { validateEnv } from "./env.js";
import app from "./app.js";

validateEnv();

const port = parseInt(process.env.PORT || "3001", 10);

app.listen(port, () => {
  console.log(`Bookshelf API running on port ${port}`);
});

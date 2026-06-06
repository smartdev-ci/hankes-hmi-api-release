"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const port = config_1.config.port || 3000;
app_1.app.listen(port, () => {
    console.log(`🚀 HMIS API démarrée sur http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map
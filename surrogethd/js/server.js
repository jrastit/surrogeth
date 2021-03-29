const { surrogethPort } = require("./configSurrogeth");
const app = require("./app");
const { registerAllBroadcaster } = require("./eth/registerBroadcaster")
// Configure console logging statements
require("console-stamp")(console);
const port = surrogethPort || 8080;
registerAllBroadcaster().then(() => {
    app.listen(port, () => {
      console.info("surrogethd listening on port " + port);
    });
})

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  publicPath: "/build/",
  serverBuildPath: "api/index.js",
  serverMainFields: ["main", "module"],
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverMinify: false,
  ignoredRouteFiles: ["**/.*"],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "api/index.js",
  // publicPath: "/build/",
  serverDependenciesToBundle: ["@js-temporal/polyfill"],
  future: {
    // v2_routeConvention: true,
    // v2_errorBoundary: true,
    // v2_normalizeFormMethod: true,
    // v2_meta: true,
  },
};

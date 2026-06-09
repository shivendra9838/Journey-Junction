module.exports = {
  apps: [
    {
      name: "wandr-api",
      cwd: "./artifacts/backend",
      script: "./dist/index.mjs",
      interpreter: "node",
      node_args: "--enable-source-maps",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        API_PORT: "3001"
      }
    }
  ]
};

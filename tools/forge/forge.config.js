// Forge Configuration
const path = require('path');
const rootDir = process.cwd();
const fs = require('fs');
const { spawn } = require('child_process')

module.exports = {
  // Packager Config
  packagerConfig: {
    // Create asar archive for main, renderer process files
    asar: true,
    // Set executable name
    executableName: 'ERWT Boilerplate',
    // Set application copyright
    appCopyright: 'Copyright (C) 2021 Codesbiome, Guasam',
    // Set application icon
    icon: path.resolve('assets/images/appIcon.ico'),
  },
  // Forge Makers
  makers: [
    {
      // Squirrel.Windows is a no-prompt, no-hassle, no-admin method of installing
      // Windows applications and is therefore the most user friendly you can get.
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'electron-react-typescript-webpack-2022',
      },
    },
    {
      // The Zip target builds basic .zip files containing your packaged application.
      // There are no platform specific dependencies for using this maker and it will run on any platform.
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      // The deb target builds .deb packages, which are the standard package format for Debian-based
      // Linux distributions such as Ubuntu.
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      // The RPM target builds .rpm files, which is the standard package format for
      // RedHat-based Linux distributions such as Fedora.
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  // Forge Plugins
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        // Fix content-security-policy error when image or video src isn't same origin
        // Remove 'unsafe-eval' to get rid of console warning in development mode.
        devContentSecurityPolicy: `default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline' data:`,
        // Ports
        port: 3000, // Webpack Dev Server port
        loggerPort: 9000, // Logger port
        // Main process webpack configuration
        mainConfig: path.join(rootDir, 'tools/webpack/webpack.main.js'),
        // Renderer process webpack configuration
        renderer: {
          // Configuration file path
          config: path.join(rootDir, 'tools/webpack/webpack.renderer.js'),
          // Entrypoints of the application
          entryPoints: [
            {
              // Window process name
              name: 'app_window',
              // React Hot Module Replacement (HMR)
              rhmr: 'react-hot-loader/patch',
              // HTML index file template
              html: path.join(rootDir, 'src/renderer/app.html'),
              // Renderer
              js: path.join(rootDir, 'src/renderer/appRenderer.tsx'),
              // Main Window
              // Preload
              preload: {
                js: path.join(rootDir, 'src/renderer/appPreload.tsx'),
              },
            },
          ],
        },
        devServer: {
          liveReload: false,
        },
      },
    },
  ],
  // Forge Hooks
  hooks: {
    packageAfterPrune: async (_, buildPath, __, platform) => {
      const commands = [
        "install",
        "--no-package-lock",
        "--no-save",
        "serialport",
      ];

      return new Promise((resolve, reject) => {
        const oldPckgJson = path.join(buildPath, "package.json");
        const newPckgJson = path.join(buildPath, "_package.json");

        fs.renameSync(oldPckgJson, newPckgJson);

        const npmInstall = spawn("npm", commands, {
          cwd: buildPath,
          stdio: "inherit",
          shell: true,
        });

        npmInstall.on("close", (code) => {
          if (code === 0) {
            fs.renameSync(newPckgJson, oldPckgJson);

            /**
             * On windows code signing fails for ARM binaries etc.,
             * we remove them here
             */
            if (platform === "win32") {
              const problematicPaths = [
                "android-arm",
                "android-arm64",
                "darwin-x64+arm64",
                "linux-arm",
                "linux-arm64",
                "linux-x64",
              ];

              problematicPaths.forEach((binaryFolder) => {
                fs.rmSync(
                  path.join(
                    buildPath,
                    "node_modules",
                    "@serialport",
                    "bindings-cpp",
                    "prebuilds",
                    binaryFolder
                  ),
                  { recursive: true, force: true }
                );
              });
            }

            resolve();
          } else {
            reject(new Error("process finished with error code " + code));
          }
        });

        npmInstall.on("error", (error) => {
          reject(error);
        });
      });
    },
  }
};

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcDir = path.join(__dirname, 'master-gym-player');
const distDir = path.join(__dirname, 'dist', 'master-gym-player');

console.log('Starting Player Build Process...');

// 1. Clean and recreate dist directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Helper to copy directory recursively
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 2. Copy CSS folder
const cssSrc = path.join(srcDir, 'css');
const cssDest = path.join(distDir, 'css');
if (fs.existsSync(cssSrc)) {
    copyDirSync(cssSrc, cssDest);
}

// 3. Copy HTML files and Netlify config
const filesToCopy = ['index.html', 'bot.html', 'netlify.toml'];
for (const file of filesToCopy) {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, path.join(distDir, file));
        console.log(`Copied: ${file}`);
    }
}

// 4. Create js directory in dist and obfuscate all JS files
const jsSrcDir = path.join(srcDir, 'js');
const jsDestDir = path.join(distDir, 'js');
fs.mkdirSync(jsDestDir, { recursive: true });

if (fs.existsSync(jsSrcDir)) {
    const jsFiles = fs.readdirSync(jsSrcDir);
    for (const jsFile of jsFiles) {
        if (path.extname(jsFile) === '.js') {
            const srcPath = path.join(jsSrcDir, jsFile);
            const destPath = path.join(jsDestDir, jsFile);
            
            console.log(`Obfuscating: ${jsFile}...`);
            const code = fs.readFileSync(srcPath, 'utf8');
            
            try {
                const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, {
                    compact: true,
                    controlFlowFlattening: true,
                    controlFlowFlatteningThreshold: 0.75,
                    numbersToExpressions: true,
                    simplify: true,
                    stringArray: true,
                    stringArrayCallsTransform: true,
                    stringArrayEncoding: ['base64'],
                    stringArrayThreshold: 0.75,
                    renameGlobals: false
                });
                
                fs.writeFileSync(destPath, obfuscatedResult.getObfuscatedCode(), 'utf8');
                console.log(`Obfuscated and saved: js/${jsFile}`);
            } catch (err) {
                console.error(`Error obfuscating ${jsFile}:`, err);
                process.exit(1);
            }
        }
    }
}

console.log('Player Build completed successfully! Output stored in: dist/master-gym-player');

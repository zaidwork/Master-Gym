const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const jsDir = path.join(__dirname, 'js');

console.log('Starting Admin In-Place Obfuscation Process...');

if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir);
    for (const jsFile of jsFiles) {
        if (path.extname(jsFile) === '.js') {
            const filePath = path.join(jsDir, jsFile);
            console.log(`Obfuscating: js/${jsFile}...`);
            const code = fs.readFileSync(filePath, 'utf8');
            
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
                
                fs.writeFileSync(filePath, obfuscatedResult.getObfuscatedCode(), 'utf8');
                console.log(`Obfuscated and saved in-place: js/${jsFile}`);
            } catch (err) {
                console.error(`Error obfuscating ${jsFile}:`, err);
                process.exit(1);
            }
        }
    }
} else {
    console.error('JS directory not found in master-gym-admin!');
    process.exit(1);
}

console.log('Admin Obfuscation completed successfully!');

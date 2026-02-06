const fs = require('fs');
const path = 'src/index.css';

try {
    // Read as UTF-16LE (which is what 'Unicode' usually means in Windows / what the error identified)
    const content = fs.readFileSync(path, 'utf16le');
    console.log('Read content length:', content.length);
    console.log('First 50 chars:', content.substring(0, 50));
    
    // Write back as UTF-8
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully converted to UTF-8');
} catch (e) {
    console.error('Error:', e);
}

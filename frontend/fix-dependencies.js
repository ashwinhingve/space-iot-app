const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(__dirname, 'package.json');

// Read the package.json file
fs.readFile(packageJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json:', err);
    return;
  }

  try {
    // Parse the JSON content
    const packageJson = JSON.parse(data);

    // Update React and React DOM dependencies to v18
    packageJson.dependencies.react = "^18.2.0";
    packageJson.dependencies["react-dom"] = "^18.2.0";
    
    // Also update Next.js if needed to be compatible with React 18
    if (packageJson.dependencies.next) {
      packageJson.dependencies.next = "^13.4.19";
    }

    // Check if we need to add @radix-ui/react-tabs
    if (!packageJson.dependencies["@radix-ui/react-tabs"]) {
      packageJson.dependencies["@radix-ui/react-tabs"] = "^1.0.4";
    }

    // Update devDependencies for React 18 types
    if (packageJson.devDependencies) {
      if (packageJson.devDependencies["@types/react"]) {
        packageJson.devDependencies["@types/react"] = "^18.2.0";
      }
      if (packageJson.devDependencies["@types/react-dom"]) {
        packageJson.devDependencies["@types/react-dom"] = "^18.2.0";
      }
    }

    // Write the updated package.json
    fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf8',
      (writeErr) => {
        if (writeErr) {
          console.error('Error writing to package.json:', writeErr);
          return;
        }
        console.log('Successfully updated package.json to use React 18');
        console.log('Please run "npm install" to apply these changes');
      }
    );
  } catch (parseErr) {
    console.error('Error parsing package.json:', parseErr);
  }
}); 
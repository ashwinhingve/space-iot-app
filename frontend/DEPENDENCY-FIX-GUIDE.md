# Dependency Fix Guide for IoT Space Frontend

## Issue

There's a compatibility issue between React 19 and the `react-beautiful-dnd` library used in the project. React-beautiful-dnd supports React versions 16-18, but not React 19 yet.

## Solution

We need to downgrade React to version 18, which is compatible with all the dependencies used in the project.

## Fix Steps

1. Run the provided fix script to update your package.json:

```bash
node fix-dependencies.js
```

2. Delete the node_modules folder and package-lock.json:

```bash
rm -rf node_modules
rm package-lock.json
```

3. Reinstall dependencies:

```bash
npm install
```

4. Restart your development server:

```bash
npm run dev
```

## Alternative Solution

If you prefer not to downgrade React, you could replace `react-beautiful-dnd` with a more modern alternative like `@dnd-kit/core` that supports React 19. However, this would require code changes in the drag-and-drop functionality throughout the project.

## Technical Details

The compatibility issue occurs because:
- The current project uses React 19
- `react-beautiful-dnd` has a peer dependency requiring React 16-18
- This creates an unresolvable dependency conflict

The fix script modifies:
- React from version 19 to 18.2.0
- React DOM from version 19 to 18.2.0
- Next.js to a version compatible with React 18
- React TypeScript definitions to match React 18

After applying these changes, both `react-beautiful-dnd` and the new `@radix-ui/react-tabs` component should work correctly. 
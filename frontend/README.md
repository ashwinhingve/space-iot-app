# IoT Space - Frontend

This repository contains the frontend application for the IoT Space platform, built with Next.js, React, and TypeScript.

## Getting Started

First, set up your environment variables:

1. Create a `.env.local` file in the root directory
2. Add the following variables:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Then, install the dependencies:

```bash
npm install
# or
yarn install
```

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Real-time IoT device monitoring and control
- Customizable dashboard with drag-and-drop widgets
- Secure user authentication
- Mobile-responsive design

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL for the backend API | `http://localhost:5000` |

## Technology Stack

- [Next.js](https://nextjs.org/) - React framework for production
- [TypeScript](https://www.typescriptlang.org/) - Strongly typed JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Socket.io](https://socket.io/) - Real-time communication
- [Redux Toolkit](https://redux-toolkit.js.org/) - State management

## Learn More

To learn more about the technologies used, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn React](https://react.dev/) - an interactive React tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

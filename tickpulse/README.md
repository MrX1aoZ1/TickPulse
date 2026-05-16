This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started
First, install all the required node modules:
```bash
npm install
```
Second, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```
tickpulse
├─ 📁.next
├─ 📁backend
│  ├─ 📁config
│  │  └─ 📄db.js
│  ├─ 📁controllers
│  │  ├─ 📄licenseKeyController.js
│  │  ├─ 📄taskController.js
│  │  └─ 📄timerController.js
│  ├─ 📁middleware
│  │  └─ 📄authMiddleware.js
│  ├─ 📁models
│  │  ├─ 📄Category.js
│  │  ├─ 📄Task.js
│  │  ├─ 📄Timer.js
│  │  └─ 📄User.js
│  ├─ 📁routes
│  │  ├─ 📄apiRoutes.js
│  │  ├─ 📄authRoutes.js
│  │  ├─ 📄licenseKeyRoutes.js
│  │  ├─ 📄taskRoutes.js
│  │  └─ 📄timerRoutes.js
│  ├─ 📁utils
│  │  ├─ 📄authUtils.js
│  │  └─ 📄response.js
│  ├─ 📄licenseKey.js
│  ├─ 📄passport-config.js
│  └─ 📄server.js
├─ 📁public
│  ├─ 📄alert.mp3
│  ├─ 📄file.svg
│  ├─ 📄globe.svg
│  ├─ 📄next.svg
│  ├─ 📄vercel.svg
│  └─ 📄window.svg
├─ 📁src
│  ├─ 📁app
│  │  ├─ 📁api
│  │  │  └─ 📁tasks
│  │  │     └─ 📄route.js
│  │  ├─ 📁calendar
│  │  │  └─ 📄page.jsx
│  │  ├─ 📁login
│  │  │  └─ 📄page.jsx
│  │  ├─ 📁sign-up
│  │  │  └─ 📄page.jsx
│  │  ├─ 📁timer
│  │  │  └─ 📄page.jsx
│  │  ├─ 📄favicon.ico
│  │  ├─ 📄layout.jsx
│  │  └─ 📄page.jsx
│  ├─ 📁components
│  │  ├─ 📁ui
│  │  │  ├─ 📄LoadingSpinner.jsx
│  │  │  └─ 📄Toast.jsx
│  │  ├─ 📄CalendarView.jsx
│  │  ├─ 📄CategoryList.jsx
│  │  ├─ 📄ErrorBoundary.jsx
│  │  ├─ 📄FilterSelector.jsx
│  │  ├─ 📄LicenseUpgradeModel.jsx
│  │  ├─ 📄NavigationBar.jsx
│  │  ├─ 📄ProjectList.jsx
│  │  ├─ 📄TaskCategories.jsx
│  │  ├─ 📄TaskDetail.jsx
│  │  ├─ 📄TaskFilter.jsx
│  │  ├─ 📄TaskList.jsx
│  │  ├─ 📄TaskModule.jsx
│  │  ├─ 📄Timer.jsx
│  │  └─ 📄WithAuth.jsx
│  ├─ 📁context
│  │  ├─ 📄AuthContext.jsx
│  │  ├─ 📄TaskContext.jsx
│  │  ├─ 📄ThemeContext.jsx
│  │  └─ 📄ToastContext.jsx
│  ├─ 📁hooks
│  │  └─ 📄useLocalStorage.js
│  ├─ 📁lib
│  │  ├─ 📄markdownSchema.js
│  │  └─ 📄taskUtils.js
│  ├─ 📁services
│  │  └─ 📄api.js
│  ├─ 📁styles
│  │  ├─ 📄globals.css
│  │  └─ 📄markdown.css
│  └─ 📁utils
│     └─ 📄errorHandling.js
├─ 📄.gitignore
├─ 📄eslint.config.mjs
├─ 📄jsconfig.json
├─ 📄next.config.mjs
├─ 📄package-lock.json
├─ 📄package.json
├─ 📄postcss.config.mjs
├─ 📄README.md
├─ 📄tailwind.config.js
├─ 📄testTask.rest
├─ 📄testTimer.rest
└─ 📄Untitled-1.txt
```
```
tickpulse
├─ 📁.next
├─ 📁backend
│  ├─ 📁config
│  │  └─ 📄db.js
│  ├─ 📁controllers
│  │  ├─ 📄licenseKeyController.js
│  │  ├─ 📄taskController.js
│  │  └─ 📄timerController.js
│  ├─ 📁middleware
│  │  └─ 📄authMiddleware.js
│  ├─ 📁models
│  │  ├─ 📄Category.js
│  │  ├─ 📄Task.js
│  │  ├─ 📄Timer.js
│  │  └─ 📄User.js
│  ├─ 📁routes
│  │  ├─ 📄apiRoutes.js
│  │  ├─ 📄authRoutes.js
│  │  ├─ 📄licenseKeyRoutes.js
│  │  ├─ 📄taskRoutes.js
│  │  └─ 📄timerRoutes.js
│  ├─ 📁utils
│  │  ├─ 📄authUtils.js
│  │  └─ 📄response.js
│  ├─ 📄licenseKey.js
│  ├─ 📄passport-config.js
│  └─ 📄server.js
├─ 📁public
│  ├─ 📄alert.mp3
│  ├─ 📄file.svg
│  ├─ 📄globe.svg
│  ├─ 📄next.svg
│  ├─ 📄vercel.svg
│  └─ 📄window.svg
├─ 📁src
│  ├─ 📁app
│  │  ├─ 📁api
│  │  │  └─ 📁tasks
│  │  │     └─ 📄route.js
│  │  ├─ 📁calendar
│  │  │  └─ 📄page.jsx
│  │  ├─ 📁login
│  │  │  └─ 📄page.jsx
│  │  ├─ 📁sign-up
│  │  │  └─ 📄page.jsx
│  │  ├─ 📁timer
│  │  │  └─ 📄page.jsx
│  │  ├─ 📄favicon.ico
│  │  ├─ 📄layout.jsx
│  │  └─ 📄page.jsx
│  ├─ 📁components
│  │  ├─ 📁ui
│  │  │  ├─ 📄LoadingSpinner.jsx
│  │  │  └─ 📄Toast.jsx
│  │  ├─ 📄CalendarView.jsx
│  │  ├─ 📄CategoryList.jsx
│  │  ├─ 📄ErrorBoundary.jsx
│  │  ├─ 📄FilterSelector.jsx
│  │  ├─ 📄LicenseUpgradeModel.jsx
│  │  ├─ 📄NavigationBar.jsx
│  │  ├─ 📄ProjectList.jsx
│  │  ├─ 📄TaskCategories.jsx
│  │  ├─ 📄TaskDetail.jsx
│  │  ├─ 📄TaskFilter.jsx
│  │  ├─ 📄TaskList.jsx
│  │  ├─ 📄TaskModule.jsx
│  │  ├─ 📄Timer.jsx
│  │  └─ 📄WithAuth.jsx
│  ├─ 📁context
│  │  ├─ 📄AuthContext.jsx
│  │  ├─ 📄TaskContext.jsx
│  │  ├─ 📄ThemeContext.jsx
│  │  └─ 📄ToastContext.jsx
│  ├─ 📁hooks
│  │  └─ 📄useLocalStorage.js
│  ├─ 📁lib
│  │  ├─ 📄markdownSchema.js
│  │  └─ 📄taskUtils.js
│  ├─ 📁services
│  │  └─ 📄api.js
│  ├─ 📁styles
│  │  ├─ 📄globals.css
│  │  └─ 📄markdown.css
│  └─ 📁utils
│     └─ 📄errorHandling.js
├─ 📄.gitignore
├─ 📄eslint.config.mjs
├─ 📄jsconfig.json
├─ 📄next.config.mjs
├─ 📄package-lock.json
├─ 📄package.json
├─ 📄postcss.config.mjs
├─ 📄README.md
├─ 📄tailwind.config.js
├─ 📄testTask.rest
├─ 📄testTimer.rest
└─ 📄Untitled-1.txt
```
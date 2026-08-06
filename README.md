# Pace CRM UI

Pace CRM UI is the robust, high-performance Angular frontend for the Pace Messenger platform. It provides a beautiful, modern interface for managing WhatsApp marketing campaigns, live chat interactions, automation flows, and contacts.

## 🚀 System Readiness

Before you can run the UI locally, ensure your machine meets the following prerequisites:
- **Node.js**: v18.x or higher (v20+ recommended)
- **npm**: v9.x or higher
- **Angular CLI**: Installed globally (`npm install -g @angular/cli`)

### Core Technologies Used
- **Framework**: Angular v21 (Standalone Components)
- **UI Library**: PrimeNG 21 & Custom Vanilla CSS
- **Animations**: GSAP (GreenSock)
- **Visual Node Editor**: Foblex Flow
- **Alerts/Modals**: SweetAlert2

---

## 🛠 Project Configuration (Environment)

If your backend is running locally, you must ensure the Angular application points to the correct local endpoint instead of the remote production endpoint.

By default, the `ApiService` (`src/app/shared/services/api.service.ts`) routes requests to your backend. 
- **Production URL**: `https://messengerapi.quotedesks.com/api/v1`
- **Local URL**: `http://localhost:3000/api/v1` (Update this inside `api.service.ts` or an `environment.ts` file if you are developing locally).

---

## 🏃 Running the UI Locally

Follow these steps to get the project up and running on your local machine:

### 1. Install Dependencies
Clone the repository, navigate into the `pace-crm-ui` directory, and install all required Node modules:
```bash
npm install
```

### 2. Start the Development Server
Use the Angular CLI to compile the application and spin up the local development server:
```bash
npm start
# or alternatively
ng serve
```

### 3. View in Browser
Once compilation completes, open your browser and navigate to:
```text
http://localhost:4200/
```
*(Note: If you have configured a custom port in your `angular.json`, navigate to that port instead).*

The app will automatically reload if you change any of the source files.

---

## 📦 Building for Production

When you are ready to deploy the UI to a production environment (like AWS S3, Vercel, or a standard web server), build the optimized production artifacts:

```bash
npm run build
# or
ng build
```

This will output the compiled, minified, and tree-shaken files into the `dist/pace-crmui/` directory. You can then serve those static files using Nginx, Apache, or upload them directly to your CDN.

---

## 🏗 Project Structure

- `src/app/features/` - Core routing modules and views (Auth, Dashboard, Campaigns, etc.)
- `src/app/layouts/` - Reusable wrapper components (Main Layout, Auth Layout)
- `src/app/shared/` - Shared services (`ApiService`, `AuthService`), interceptors, and common components (Sidebar, Header).
- `src/styles/` - Global SCSS variables and generic styles.

---

## 🧪 Testing

To execute unit tests via Karma:
```bash
npm run test
```
